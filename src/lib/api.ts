const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Access Requests
  getRequests: (userId?: string) =>
    apiFetch<{ items: AccessRequest[]; count: number }>(
      userId ? `/requests?userId=${userId}` : "/requests"
    ),
  createRequest: (data: CreateRequestInput) =>
    apiFetch<{ requestId: string; status: string; requestedAt: string }>(
      "/requests",
      { method: "POST", body: JSON.stringify(data) }
    ),
  updateRequestStatus: (requestId: string, status: "Approved" | "Rejected") =>
    apiFetch<{ requestId: string; status: string; generatedPolicy?: string }>(
      `/requests/${requestId}`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    ),

  // IAM Policy
  generatePolicy: (data: GeneratePolicyInput) =>
    apiFetch<{ policy: string }>("/policy", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // EC2
  getInstances: () =>
    apiFetch<{ instances: EC2Instance[] }>("/ec2/instances"),
  startInstance: (instanceId: string) =>
    apiFetch<{ instanceId: string; currentState: string }>("/ec2/start", {
      method: "POST",
      body: JSON.stringify({ instanceId }),
    }),
  stopInstance: (instanceId: string) =>
    apiFetch<{ instanceId: string; currentState: string }>("/ec2/stop", {
      method: "POST",
      body: JSON.stringify({ instanceId }),
    }),

  // S3
  getBuckets: () =>
    apiFetch<{ buckets: S3Bucket[] }>("/s3/buckets"),

  // CloudWatch
  getMetrics: () =>
    apiFetch<{ metrics: CloudWatchMetrics }>("/metrics"),

  // CloudTrail
  getCloudTrailEvents: () =>
    apiFetch<{ events: CloudTrailEvent[]; source: string }>("/cloudtrail/events"),

  // Lambda history
  getLambdaHistory: (functionName?: string) =>
    apiFetch<{ events: LambdaLogEvent[]; logGroupName: string }>(
      functionName ? `/lambda/history?functionName=${functionName}` : "/lambda/history"
    ),
};

// Types
export interface AccessRequest {
  requestId: string;
  userId: string;
  instanceId: string;
  purpose: string;
  duration: number;
  permissionLevel: "ReadOnly" | "PowerUser" | "Admin";
  status: "Pending" | "Approved" | "Rejected";
  requestedAt: string;
  approvedAt?: string;
  generatedPolicy?: string;
  ttl: number;
}

export interface CreateRequestInput {
  userId?: string;
  instanceId: string;
  purpose: string;
  duration: number;
  permissionLevel: "ReadOnly" | "PowerUser" | "Admin";
}

export interface GeneratePolicyInput {
  instanceId?: string;
  permissionLevel?: string;
  actions?: string[];
  resource?: string;
}

export interface EC2Instance {
  instanceId: string;
  state: string;
  type: string;
  publicIp?: string;
  privateIp?: string;
  name?: string;
  launchTime: string;
}

export interface S3Bucket {
  name: string;
  creationDate: string;
  publicAccessBlocked: boolean;
  policyExists: boolean;
}

export interface CloudWatchMetrics {
  lambdaInvocations: { timestamps: string[]; values: number[]; total: number };
  apiGwRequests: { timestamps: string[]; values: number[]; total: number };
}

export interface CloudTrailEvent {
  eventId: string;
  eventName: string;
  eventSource: string;
  userAgent?: string;
  sourceIPAddress?: string;
  eventTime: string;
  userName?: string;
}

export interface LambdaLogEvent {
  timestamp: number;
  message: string;
}
