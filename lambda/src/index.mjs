import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  EC2Client,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
} from "@aws-sdk/client-ec2";
import {
  S3Client,
  GetBucketPolicyCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  DescribeLogGroupsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { randomUUID } from "crypto";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.DYNAMODB_TABLE || "AccessRequests";
const CLOUDTRAIL_BUCKET = process.env.CLOUDTRAIL_BUCKET || "";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://aws.techcloudup.com,https://main.d2paaciq0hy5p5.amplifyapp.com").split(",").map((s) => s.trim());
const ALLOWED_INSTANCE_PREFIX = process.env.ALLOWED_INSTANCE_PREFIX || "i-";

const dynamo = new DynamoDBClient({ region: REGION });
const ec2 = new EC2Client({ region: REGION });
const s3 = new S3Client({ region: REGION });
const cw = new CloudWatchClient({ region: REGION });
const cwLogs = new CloudWatchLogsClient({ region: REGION });

// ── Input Validation ──────────────────────────────────────────────

const MAX_PURPOSE_LENGTH = 500;
const MAX_STRING_LENGTH = 200;
const VALID_PERMISSION_LEVELS = ["ReadOnly", "PowerUser", "Admin"];
const VALID_REQUEST_STATUSES = ["Approved", "Rejected"];
const EC2_INSTANCE_ID_RE = /^i-[0-9a-f]{8,17}$/i;
const SAFE_STRING_RE = /^[\w\s\-.,;:!?@#&()[\]+=/']*$/;

function sanitizeString(str, maxLen = MAX_STRING_LENGTH) {
  if (typeof str !== "string") return "";
  return str.slice(0, maxLen).trim();
}

function validateInstanceId(id) {
  if (!id || typeof id !== "string" || !EC2_INSTANCE_ID_RE.test(id)) {
    return false;
  }
  if (ALLOWED_INSTANCE_PREFIX && !id.startsWith(ALLOWED_INSTANCE_PREFIX)) {
    return false;
  }
  return true;
}

function validateStringField(value, fieldName, maxLen = MAX_STRING_LENGTH) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  if (value.length > maxLen) {
    return `${fieldName} exceeds maximum length of ${maxLen}`;
  }
  if (!SAFE_STRING_RE.test(value)) {
    return `${fieldName} contains invalid characters`;
  }
  return null;
}

// ── Response Helpers ───────────────────────────────────────────────

function getCorsOrigin(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0] || "";
}

function response(statusCode, body, headers = {}, event = null) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": event ? getCorsOrigin(event) : (ALLOWED_ORIGINS[0] || "*"),
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function errorResponse(statusCode, message, event = null) {
  console.error(`[${statusCode}] ${message}`);
  return response(statusCode, { error: message }, {}, event);
}

function sanitizeError(err) {
  // Never leak internal error details to clients
  console.error("Internal error:", err);
  return "Internal server error";
}

// ── Access Requests ──────────────────────────────────────────────

async function createRequest(body, event) {
  const { userId, instanceId, purpose, duration, permissionLevel } = body;

  // Validate required fields
  const missing = [];
  if (!instanceId) missing.push("instanceId");
  if (!purpose) missing.push("purpose");
  if (duration == null) missing.push("duration");
  if (!permissionLevel) missing.push("permissionLevel");
  if (missing.length > 0) {
    return errorResponse(400, `Missing required fields: ${missing.join(", ")}`, event);
  }

  // Validate instanceId format
  if (!validateInstanceId(instanceId)) {
    return errorResponse(400, "Invalid instanceId format", event);
  }

  // Validate permissionLevel
  if (!VALID_PERMISSION_LEVELS.includes(permissionLevel)) {
    return errorResponse(400, `Invalid permissionLevel. Must be one of: ${VALID_PERMISSION_LEVELS.join(", ")}`, event);
  }

  // Validate purpose (prevent XSS, length check)
  const purposeErr = validateStringField(purpose, "purpose", MAX_PURPOSE_LENGTH);
  if (purposeErr) return errorResponse(400, purposeErr, event);

  // Validate duration
  const dur = Number(duration);
  if (!Number.isFinite(dur) || dur < 1 || dur > 1440) {
    return errorResponse(400, "duration must be between 1 and 1440 minutes", event);
  }

  const sanitizedUserId = sanitizeString(userId) || "guest";
  const sanitizedPurpose = sanitizeString(purpose, MAX_PURPOSE_LENGTH);
  const requestId = randomUUID();
  const requestedAt = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days

  await dynamo.send(
    new PutItemCommand({
      TableName: TABLE,
      Item: marshall({
        requestId,
        userId: sanitizedUserId,
        instanceId,
        purpose: sanitizedPurpose,
        duration: dur,
        permissionLevel,
        status: "Pending",
        requestedAt,
        approvedAt: null,
        generatedPolicy: null,
        ttl,
      }),
    })
  );

  return response(201, { requestId, status: "Pending", requestedAt }, {}, event);
}

async function listRequests(queryParams) {
  const userId = queryParams?.userId;
  let items;

  if (userId) {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "userId-requestedAt-index",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: marshall({ ":uid": userId }),
        ScanIndexForward: false,
        Limit: 50,
      })
    );
    items = result.Items?.map(unmarshall) || [];
  } else {
    const result = await dynamo.send(
      new ScanCommand({ TableName: TABLE, Limit: 50 })
    );
    items = result.Items?.map(unmarshall) || [];
    items.sort((a, b) => (b.requestedAt > a.requestedAt ? 1 : -1));
  }

  return response(200, { items, count: items.length });
}

async function updateRequestStatus(requestId, body, event) {
  const { status, approvedBy } = body;
  if (!VALID_REQUEST_STATUSES.includes(status)) {
    return errorResponse(400, `status must be one of: ${VALID_REQUEST_STATUSES.join(", ")}`, event);
  }

  const existing = await dynamo.send(
    new GetItemCommand({ TableName: TABLE, Key: marshall({ requestId }) })
  );
  if (!existing.Item) return errorResponse(404, "Request not found", event);

  const item = unmarshall(existing.Item);
  const approvedAt = new Date().toISOString();
  let generatedPolicy = item.generatedPolicy;

  if (status === "Approved") {
    generatedPolicy = generateIAMPolicy(item.instanceId, item.permissionLevel);
  }

  const sanitizedApprovedBy = sanitizeString(approvedBy) || "admin";

  await dynamo.send(
    new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall({ requestId }),
      UpdateExpression:
        "SET #s = :status, approvedAt = :approvedAt, approvedBy = :approvedBy, generatedPolicy = :policy",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: marshall({
        ":status": status,
        ":approvedAt": approvedAt,
        ":approvedBy": sanitizedApprovedBy,
        ":policy": generatedPolicy,
      }),
    })
  );

  return response(200, { requestId, status, approvedAt, generatedPolicy }, {}, event);
}

// ── IAM Policy Generator ──────────────────────────────────────────

function generateIAMPolicy(instanceId, permissionLevel) {
  const policies = {
    ReadOnly: {
      actions: ["ec2:DescribeInstances", "ec2:DescribeInstanceStatus"],
      effect: "Allow",
    },
    PowerUser: {
      actions: [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances",
      ],
      effect: "Allow",
    },
    Admin: {
      actions: ["ec2:*"],
      effect: "Allow",
    },
  };

  const perm = policies[permissionLevel] || policies.ReadOnly;
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: `EC2AccessFor${permissionLevel}`,
        Effect: perm.effect,
        Action: perm.actions,
        Resource: instanceId
          ? `arn:aws:ec2:${REGION}:*:instance/${instanceId}`
          : "*",
        Condition: {
          StringEquals: {
            "aws:RequestedRegion": REGION,
          },
        },
      },
    ],
  };

  return JSON.stringify(policy, null, 2);
}

async function generatePolicy(body, event) {
  const { instanceId, permissionLevel, actions, resource } = body;

  let policy;
  if (actions && resource) {
    // Validate custom policy inputs
    if (!Array.isArray(actions) || actions.length === 0) {
      return errorResponse(400, "actions must be a non-empty array", event);
    }
    const actionErr = validateStringField(String(actions[0]), "actions[0]", MAX_STRING_LENGTH);
    if (actionErr) return errorResponse(400, actionErr, event);

    policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "LeastPrivilegePolicy",
          Effect: "Allow",
          Action: actions,
          Resource: resource,
        },
      ],
    };
  } else {
    const level = VALID_PERMISSION_LEVELS.includes(permissionLevel)
      ? permissionLevel
      : "ReadOnly";
    policy = JSON.parse(generateIAMPolicy(instanceId, level));
  }

  return response(200, { policy: JSON.stringify(policy, null, 2) }, {}, event);
}

// ── EC2 ───────────────────────────────────────────────────────────

async function describeInstances() {
  const result = await ec2.send(new DescribeInstancesCommand({}));
  const instances = result.Reservations?.flatMap((r) =>
    r.Instances?.map((i) => ({
      instanceId: i.InstanceId,
      state: i.State?.Name,
      type: i.InstanceType,
      publicIp: i.PublicIpAddress || null,
      privateIp: i.PrivateIpAddress || null,
      name: i.Tags?.find((t) => t.Key === "Name")?.Value || null,
      launchTime: i.LaunchTime,
    })) || []
  ) || [];

  return response(200, { instances });
}

async function startInstance(instanceId, event) {
  if (!validateInstanceId(instanceId)) {
    return errorResponse(400, "Invalid or unauthorized instanceId", event);
  }
  const result = await ec2.send(
    new StartInstancesCommand({ InstanceIds: [instanceId] })
  );
  const state = result.StartingInstances?.[0];
  return response(200, {
    instanceId,
    previousState: state?.PreviousState?.Name,
    currentState: state?.CurrentState?.Name,
  }, {}, event);
}

async function stopInstance(instanceId, event) {
  if (!validateInstanceId(instanceId)) {
    return errorResponse(400, "Invalid or unauthorized instanceId", event);
  }
  const result = await ec2.send(
    new StopInstancesCommand({ InstanceIds: [instanceId] })
  );
  const state = result.StoppingInstances?.[0];
  return response(200, {
    instanceId,
    previousState: state?.PreviousState?.Name,
    currentState: state?.CurrentState?.Name,
  }, {}, event);
}

// ── S3 ────────────────────────────────────────────────────────────

async function listBucketsInfo() {
  const result = await s3.send(new ListBucketsCommand({}));
  const buckets = await Promise.all(
    (result.Buckets || []).slice(0, 10).map(async (b) => {
      let publicAccessBlocked = null;
      let policyExists = false;
      try {
        const pab = await s3.send(
          new GetPublicAccessBlockCommand({ Bucket: b.Name })
        );
        const c = pab.PublicAccessBlockConfiguration;
        publicAccessBlocked =
          c.BlockPublicAcls && c.IgnorePublicAcls && c.BlockPublicPolicy && c.RestrictPublicBuckets;
      } catch (err) {
        console.error(`Failed to get public access block for bucket ${b.Name}:`, err.message);
      }
      try {
        await s3.send(new GetBucketPolicyCommand({ Bucket: b.Name }));
        policyExists = true;
      } catch (err) {
        console.error(`Failed to get bucket policy for ${b.Name}:`, err.message);
      }
      return {
        name: b.Name,
        creationDate: b.CreationDate,
        publicAccessBlocked,
        policyExists,
      };
    })
  );
  return response(200, { buckets });
}

// ── CloudWatch Metrics ────────────────────────────────────────────

async function getCloudWatchMetrics() {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const result = await cw.send(
    new GetMetricDataCommand({
      StartTime: start,
      EndTime: now,
      MetricDataQueries: [
        {
          Id: "lambdaInvocations",
          MetricStat: {
            Metric: {
              Namespace: "AWS/Lambda",
              MetricName: "Invocations",
            },
            Period: 3600,
            Stat: "Sum",
          },
          ReturnData: true,
        },
        {
          Id: "apiGwRequests",
          MetricStat: {
            Metric: {
              Namespace: "AWS/ApiGateway",
              MetricName: "Count",
            },
            Period: 3600,
            Stat: "Sum",
          },
          ReturnData: true,
        },
      ],
    })
  );

  const metrics = {};
  for (const m of result.MetricDataResults || []) {
    metrics[m.Id] = {
      timestamps: m.Timestamps,
      values: m.Values,
      total: m.Values?.reduce((a, b) => a + b, 0) || 0,
    };
  }

  return response(200, { metrics });
}

// ── CloudTrail ────────────────────────────────────────────────────

async function listCloudTrailEvents() {
  // Read from DynamoDB (parsed by CloudTrail Lambda trigger) or return mock
  try {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: "CloudTrailEvents",
        Limit: 50,
      })
    );
    const events = result.Items?.map(unmarshall) || [];
    return response(200, { events, source: "dynamodb" });
  } catch (err) {
    console.error("CloudTrail events scan failed:", err.message);
    return response(200, { events: [], source: "pending" });
  }
}

// ── Lambda Execution History ──────────────────────────────────────

async function getLambdaHistory(functionName) {
  const logGroupName = `/aws/lambda/${functionName || "aws-secure-admin-hub"}`;
  try {
    const result = await cwLogs.send(
      new FilterLogEventsCommand({
        logGroupName,
        limit: 20,
        filterPattern: "REPORT",
      })
    );
    const events = result.events?.map((e) => ({
      timestamp: e.timestamp,
      message: e.message?.trim(),
    })) || [];
    return response(200, { events, logGroupName });
  } catch (err) {
    console.error(`Lambda history query failed for ${logGroupName}:`, err.message);
    return response(200, { events: [], logGroupName });
  }
}

// ── Main Handler ──────────────────────────────────────────────────

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = event.requestContext?.http?.path || event.path || "/";
  const body = event.body ? JSON.parse(event.body) : {};
  const query = event.queryStringParameters || {};
  const pathParts = path.split("/").filter(Boolean);

  if (method === "OPTIONS") return response(200, {}, {}, event);

  try {
    // POST /requests
    if (method === "POST" && path === "/requests") return createRequest(body, event);
    // GET /requests
    if (method === "GET" && path === "/requests") return listRequests(query);
    // PATCH /requests/{id}
    if (method === "PATCH" && pathParts[0] === "requests" && pathParts[1]) {
      return updateRequestStatus(pathParts[1], body, event);
    }
    // POST /policy
    if (method === "POST" && path === "/policy") return generatePolicy(body, event);
    // GET /ec2/instances
    if (method === "GET" && path === "/ec2/instances") return describeInstances();
    // POST /ec2/start
    if (method === "POST" && path === "/ec2/start") return startInstance(body.instanceId, event);
    // POST /ec2/stop
    if (method === "POST" && path === "/ec2/stop") return stopInstance(body.instanceId, event);
    // GET /s3/buckets
    if (method === "GET" && path === "/s3/buckets") return listBucketsInfo();
    // GET /metrics
    if (method === "GET" && path === "/metrics") return getCloudWatchMetrics();
    // GET /cloudtrail/events
    if (method === "GET" && path === "/cloudtrail/events") return listCloudTrailEvents();
    // GET /lambda/history
    if (method === "GET" && path === "/lambda/history") return getLambdaHistory(query.functionName);

    return errorResponse(404, `Not found: ${method} ${path}`, event);
  } catch (err) {
    return errorResponse(500, sanitizeError(err), event);
  }
};
