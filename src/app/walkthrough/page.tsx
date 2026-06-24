import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import {
  LayoutDashboard,
  KeyRound,
  Server,
  ShieldAlert,
  Zap,
  Shield,
  Eye,
  DollarSign,
  ArrowRight,
} from "lucide-react";

const sections = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Admin Dashboard",
    badge: "live" as const,
    summary: "The dashboard shows the current state of your AWS environment at a glance.",
    points: [
      {
        label: "Access Requests",
        badge: "live" as const,
        detail:
          "Pulls a real-time count from DynamoDB — every request submitted through this platform is stored and counted here.",
      },
      {
        label: "Lambda Invocations",
        badge: "live" as const,
        detail:
          "Queries the AWS/Lambda namespace in CloudWatch using GetMetricData, aggregated hourly over the last 24 hours.",
      },
      {
        label: "API Gateway Traffic",
        badge: "live" as const,
        detail:
          "The bar chart shows real request volume hitting this platform's API Gateway, rendered directly from CloudWatch metrics.",
      },
      {
        label: "EC2 count, Security Score",
        badge: "demo" as const,
        detail:
          "Simulated cards. Fetching real VPC topology or GuardDuty scores at this scale would add cost without meaningful depth.",
      },
    ],
  },
  {
    id: "access",
    icon: KeyRound,
    title: "EC2 Access Management",
    badge: "live" as const,
    summary:
      "The core of this platform. Models the real workflow a Cloud Admin follows when an engineer needs temporary EC2 access.",
    points: [
      {
        label: "Submit a request",
        badge: "live" as const,
        detail:
          "An engineer fills in the instance ID, purpose, duration, and permission level. Submitting writes directly to the DynamoDB AccessRequests table via Lambda.",
      },
      {
        label: "Three permission tiers",
        badge: "live" as const,
        detail:
          "ReadOnly allows Describe-only actions. PowerUser adds Start, Stop, and Reboot. Admin grants EC2:* — each maps to a different IAM Action set in the policy generator.",
      },
      {
        label: "Auto-generated IAM Policy",
        badge: "live" as const,
        detail:
          "On approval, Lambda generates a Least Privilege JSON policy scoped to the exact instance ARN, the minimum required actions, and a Region condition. Nothing broader than necessary.",
      },
      {
        label: "Why Session Manager, not SSH",
        badge: "live" as const,
        detail:
          "No inbound port 22 needed — the Security Group stays closed. Access is controlled purely by IAM, with no key pair to manage. Every session is automatically recorded in CloudTrail.",
      },
    ],
  },
  {
    id: "resources",
    icon: Server,
    title: "Resource Management",
    badge: "live" as const,
    summary: "Direct control over live AWS resources — EC2, S3, and CloudWatch metrics in one view.",
    points: [
      {
        label: "EC2 Start / Stop",
        badge: "live" as const,
        detail:
          "Calls ec2.startInstances() or ec2.stopInstances() against the real demo instance. The UI then polls describeInstances every 5 seconds, transitioning the state badge from pending → running in real time.",
      },
      {
        label: "S3 bucket security status",
        badge: "live" as const,
        detail:
          "For each bucket, the platform calls GetPublicAccessBlock and GetBucketPolicy. You can immediately see which buckets are publicly accessible and which have a resource policy attached.",
      },
      {
        label: "CloudWatch metric charts",
        badge: "live" as const,
        detail:
          "Lambda invocations and API Gateway request counts are rendered as bar charts using real GetMetricData responses — the same data the Dashboard cards use, just visualized over time.",
      },
      {
        label: "VPC overview",
        badge: "demo" as const,
        detail:
          "VPC topology is simulated. Rendering real subnet and security group relationships requires additional read permissions and adds complexity without changing the Cloud Admin narrative.",
      },
    ],
  },
  {
    id: "security",
    icon: ShieldAlert,
    title: "Security Center",
    badge: "live" as const,
    summary: "IAM policy generation, CloudTrail audit logs, and security posture in one place.",
    points: [
      {
        label: "IAM Policy Generator",
        badge: "live" as const,
        detail:
          "Enter a list of Actions and a Resource ARN. Lambda returns a Least Privilege JSON policy instantly. This is a direct implementation of the Security Pillar of the AWS Well-Architected Framework.",
      },
      {
        label: "CloudTrail event log",
        badge: "live" as const,
        detail:
          "The trail is active and shipping management events to S3 right now. The S3-trigger Lambda parser that writes events into DynamoDB is still in progress — once complete, every API call made on this platform will appear here.",
      },
      {
        label: "GuardDuty findings",
        badge: "demo" as const,
        detail:
          "Simulated findings with real Finding structure — UnauthorizedAccess, PortProbe, BucketBlockPublicAccessDisabled. GuardDuty is intentionally not enabled to avoid per-event cost.",
      },
      {
        label: "Security best practices checklist",
        badge: "demo" as const,
        detail:
          "A static checklist showing the current security posture: MFA, CloudTrail active, S3 blocked, no inbound SSH. Items marked incomplete are genuine gaps to address.",
      },
    ],
  },
  {
    id: "automation",
    icon: Zap,
    title: "Automation",
    badge: "live" as const,
    summary: "Lambda execution history and patch compliance — real operational data alongside a simulation.",
    points: [
      {
        label: "Lambda execution history",
        badge: "live" as const,
        detail:
          "Queries CloudWatch Logs for REPORT entries from the platform's own Lambda function. Duration and memory usage for every invocation are parsed and displayed — the history grows as you use this demo.",
      },
      {
        label: "SSM patch compliance",
        badge: "demo" as const,
        detail:
          "Simulated patch baseline report for the demo EC2 instance. The SSM Agent is installed and the instance is enrolled — running a real patch scan would modify system state, so compliance data is shown as simulated.",
      },
    ],
  },
];

const principles = [
  {
    icon: Eye,
    title: "LIVE / DEMO Transparency",
    body: "Every data source is labelled. Green means a real AWS SDK call; blue means simulated. This boundary is a design decision, not a limitation — it keeps cost minimal while keeping the technically meaningful parts real.",
  },
  {
    icon: Shield,
    title: "Least Privilege Everywhere",
    body: "The Lambda execution role has exactly the permissions it needs — no more. Generated IAM policies are scoped to a single instance ARN. Session Manager replaces SSH so no port ever opens.",
  },
  {
    icon: DollarSign,
    title: "Cost-Aware by Default",
    body: "EC2 stays Stopped between demos — EBS-only billing. CloudTrail's first trail is free for management events. Everything else runs on Free Tier. Total monthly cost: ~$1.14.",
  },
];

export default function WalkthroughPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="How It Works" />

      <main className="flex-1 p-6 max-w-3xl space-y-10 overflow-auto">

        {/* Intro */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            AWS IAM Secure Access Hub — Platform Walkthrough
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            A full walkthrough of every feature, what it connects to, and why it was built that way.
            Each section maps to a page in the sidebar.
          </p>
        </div>

        {/* Feature sections */}
        {sections.map(({ id, icon: Icon, title, badge, summary, points }) => (
          <section key={id} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <Icon size={16} className="text-orange-500" />
              </div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
              <Badge type={badge} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{summary}</p>
            <div className="space-y-2">
              {points.map((p) => (
                <div
                  key={p.label}
                  className="flex gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <ArrowRight size={14} className="text-orange-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {p.label}
                      </span>
                      <Badge type={p.badge} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {p.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Design principles */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Design Decisions
          </h2>
          <div className="space-y-3">
            {principles.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 shrink-0 h-fit">
                  <Icon size={16} className="text-orange-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
