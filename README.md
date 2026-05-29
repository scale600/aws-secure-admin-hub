# AWS Secure Admin Hub

**AWS Secure Admin Hub** is a live demo platform showcasing comprehensive AWS Cloud Administration — EC2 access control, IAM least-privilege policy generation, security monitoring, and resource management — built with Next.js 14, Lambda, DynamoDB, and AWS Amplify.

🔗 **Live Demo:** https://aws.techcloudup.com  
📦 **Staging:** https://main.d2paaciq0hy5p5.amplifyapp.com  
📄 **Project Planning:** [docs/planning.md](docs/planning.md)

---

## LIVE vs DEMO

This project distinguishes real AWS API calls from simulated data with UI badges:

| Badge | Meaning |
|-------|---------|
| 🟢 **LIVE** | Real AWS SDK call — actual data from your account |
| 🔵 **DEMO** | Simulated / mock data |

### Feature Breakdown

| Feature | Badge | AWS Service |
|---------|-------|-------------|
| Access Request workflow | 🟢 LIVE | DynamoDB |
| IAM Policy auto-generation | 🟢 LIVE | Lambda |
| EC2 Start / Stop | 🟢 LIVE | EC2 SDK `startInstances` |
| EC2 state polling | 🟢 LIVE | EC2 `describeInstances` |
| S3 bucket policy viewer | 🟢 LIVE | S3 `getBucketPolicy` |
| CloudWatch metric charts | 🟢 LIVE | CloudWatch `GetMetricData` |
| CloudTrail event log | 🟢 LIVE | CloudTrail → S3 → Lambda |
| Lambda execution history | 🟢 LIVE | CloudWatch Logs |
| GuardDuty findings | 🔵 DEMO | Simulated severity events |
| CPU / Network charts | 🔵 DEMO | Recharts mock data |
| SSM Patch compliance | 🔵 DEMO | Simulated patch baseline |

---

## Architecture

```
[Browser]
    │
    ▼
[Next.js 14 / TypeScript / Tailwind]  ← AWS Amplify Hosting (CI/CD)
    │
    ▼
[API Gateway HTTP API]  ──  [Amazon Cognito (JWT Auth)]
    │
    ▼
[AWS Lambda (Node.js 20)]
    │
    ├── [DynamoDB]      AccessRequests table — TTL, GSI
    ├── [S3]            CloudTrail log bucket
    ├── [CloudWatch]    Real Lambda / API GW metrics
    ├── [CloudTrail]    1 Trail → S3 → Lambda parser
    └── [EC2 t3.micro]  Stopped by default, Start/Stop demo
```

### AWS Services

| Service | Role |
|---------|------|
| Amplify Hosting | Next.js SSR/SSG hosting, CI/CD |
| API Gateway (HTTP) | REST endpoints, Lambda trigger |
| Lambda (Node.js 20) | Business logic, IAM policy generation, metrics |
| DynamoDB | AccessRequests table, TTL, GSI |
| Cognito User Pool | JWT auth, Guest Mode |
| S3 | Static files, CloudTrail log bucket |
| CloudTrail | 1 Trail — real API activity collection |
| CloudWatch | Real Lambda / API GW metric visualization |
| EC2 t3.micro | Demo instance (Stopped by default) |
| Route 53 | aws.techcloudup.com hosted zone |

---

## Local Development

```bash
# Clone
git clone https://github.com/scale600/aws-secure-admin-hub.git
cd aws-secure-admin-hub

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API Gateway URL and Cognito IDs

# Run dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API Gateway endpoint URL |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito App Client ID |
| `NEXT_PUBLIC_EC2_INSTANCE_ID` | Demo EC2 instance ID |

---

## AWS Well-Architected Principles Applied

- **Least Privilege** — IAM policies scoped to exact instance ID and required actions only
- **Secure Access** — Session Manager over SSH (no port 22, full CloudTrail audit trail)
- **Operational Excellence** — CloudTrail + CloudWatch for full observability

---

## Domain

AWS Cloud Administration — Security, Compute, Networking, Storage, Monitoring, Automation.

Built to demonstrate what a working Cloud Admin platform looks like end-to-end:
infrastructure provisioned, backend wired to real AWS APIs, frontend showing live data.
