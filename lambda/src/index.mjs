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
const CLOUDTRAIL_BUCKET = process.env.CLOUDTRAIL_BUCKET || "aws-secure-admin-hub-cloudtrail-753523452116";

const dynamo = new DynamoDBClient({ region: REGION });
const ec2 = new EC2Client({ region: REGION });
const s3 = new S3Client({ region: REGION });
const cw = new CloudWatchClient({ region: REGION });
const cwLogs = new CloudWatchLogsClient({ region: REGION });

function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

// ── Access Requests ──────────────────────────────────────────────

async function createRequest(body) {
  const { userId, instanceId, purpose, duration, permissionLevel } = body;
  if (!instanceId || !purpose || !duration || !permissionLevel) {
    return response(400, { error: "Missing required fields" });
  }
  const requestId = randomUUID();
  const requestedAt = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days

  await dynamo.send(
    new PutItemCommand({
      TableName: TABLE,
      Item: marshall({
        requestId,
        userId: userId || "guest",
        instanceId,
        purpose,
        duration: Number(duration),
        permissionLevel,
        status: "Pending",
        requestedAt,
        approvedAt: null,
        generatedPolicy: null,
        ttl,
      }),
    })
  );

  return response(201, { requestId, status: "Pending", requestedAt });
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

async function updateRequestStatus(requestId, body) {
  const { status, approvedBy } = body;
  if (!["Approved", "Rejected"].includes(status)) {
    return response(400, { error: "status must be Approved or Rejected" });
  }

  const existing = await dynamo.send(
    new GetItemCommand({ TableName: TABLE, Key: marshall({ requestId }) })
  );
  if (!existing.Item) return response(404, { error: "Request not found" });

  const item = unmarshall(existing.Item);
  const approvedAt = new Date().toISOString();
  let generatedPolicy = item.generatedPolicy;

  if (status === "Approved") {
    generatedPolicy = generateIAMPolicy(item.instanceId, item.permissionLevel);
  }

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
        ":approvedBy": approvedBy || "admin",
        ":policy": generatedPolicy,
      }),
    })
  );

  return response(200, { requestId, status, approvedAt, generatedPolicy });
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

async function generatePolicy(body) {
  const { instanceId, permissionLevel, actions, resource } = body;

  let policy;
  if (actions && resource) {
    policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "LeastPrivilegePolicy",
          Effect: "Allow",
          Action: Array.isArray(actions) ? actions : [actions],
          Resource: resource,
        },
      ],
    };
  } else {
    policy = JSON.parse(generateIAMPolicy(instanceId, permissionLevel || "ReadOnly"));
  }

  return response(200, { policy: JSON.stringify(policy, null, 2) });
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

async function startInstance(instanceId) {
  if (!instanceId) return response(400, { error: "instanceId required" });
  const result = await ec2.send(
    new StartInstancesCommand({ InstanceIds: [instanceId] })
  );
  const state = result.StartingInstances?.[0];
  return response(200, {
    instanceId,
    previousState: state?.PreviousState?.Name,
    currentState: state?.CurrentState?.Name,
  });
}

async function stopInstance(instanceId) {
  if (!instanceId) return response(400, { error: "instanceId required" });
  const result = await ec2.send(
    new StopInstancesCommand({ InstanceIds: [instanceId] })
  );
  const state = result.StoppingInstances?.[0];
  return response(200, {
    instanceId,
    previousState: state?.PreviousState?.Name,
    currentState: state?.CurrentState?.Name,
  });
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
      } catch {}
      try {
        await s3.send(new GetBucketPolicyCommand({ Bucket: b.Name }));
        policyExists = true;
      } catch {}
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
  } catch {
    // Table doesn't exist yet — return empty
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
  } catch {
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

  if (method === "OPTIONS") return response(200, {});

  try {
    // POST /requests
    if (method === "POST" && path === "/requests") return createRequest(body);
    // GET /requests
    if (method === "GET" && path === "/requests") return listRequests(query);
    // PATCH /requests/{id}
    if (method === "PATCH" && pathParts[0] === "requests" && pathParts[1]) {
      return updateRequestStatus(pathParts[1], body);
    }
    // POST /policy
    if (method === "POST" && path === "/policy") return generatePolicy(body);
    // GET /ec2/instances
    if (method === "GET" && path === "/ec2/instances") return describeInstances();
    // POST /ec2/start
    if (method === "POST" && path === "/ec2/start") return startInstance(body.instanceId);
    // POST /ec2/stop
    if (method === "POST" && path === "/ec2/stop") return stopInstance(body.instanceId);
    // GET /s3/buckets
    if (method === "GET" && path === "/s3/buckets") return listBucketsInfo();
    // GET /metrics
    if (method === "GET" && path === "/metrics") return getCloudWatchMetrics();
    // GET /cloudtrail/events
    if (method === "GET" && path === "/cloudtrail/events") return listCloudTrailEvents();
    // GET /lambda/history
    if (method === "GET" && path === "/lambda/history") return getLambdaHistory(query.functionName);

    return response(404, { error: `Not found: ${method} ${path}` });
  } catch (err) {
    console.error("Handler error:", err);
    return response(500, { error: err.message });
  }
};
