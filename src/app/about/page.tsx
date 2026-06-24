import Header from "@/components/layout/Header";
import { Cloud, Shield, Server, Activity, Code2, ExternalLink } from "lucide-react";

const skills = [
  { category: "Cloud", items: ["AWS (EC2, Lambda, S3, DynamoDB, CloudTrail, CloudWatch)", "AWS IAM, Cognito, API Gateway", "AWS Amplify, Route 53"] },
  { category: "IaC & Automation", items: ["Terraform", "AWS CDK", "CloudFormation"] },
  { category: "Application", items: ["Next.js 14 (App Router)", "TypeScript", "Node.js 20"] },
  { category: "Security", items: ["Least Privilege IAM", "CloudTrail Auditing", "Session Manager (no-SSH)"] },
];

const highlights = [
  { icon: Shield, label: "Secure by Default", desc: "Session Manager over SSH, IAM Least Privilege everywhere" },
  { icon: Activity, label: "Real Observability", desc: "CloudTrail → S3 → Lambda pipeline, CloudWatch real metrics" },
  { icon: Server, label: "Cost-Aware", desc: "Free Tier maximized, EC2 Stopped by default (~$1.14/mo)" },
  { icon: Code2, label: "Full-Stack IaC", desc: "Every resource reproducible via Terraform or CDK" },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="About" />

      <main className="flex-1 p-6 max-w-3xl space-y-8">
        {/* Intro */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20">
              <Cloud size={24} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                IAM Secure Access
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AWS Cloud Administration — Live Platform
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            A working platform built around real Cloud Admin workflows — not a mock UI.
            Every feature labelled{" "}
            <span className="text-green-600 dark:text-green-400 font-medium">🟢 LIVE</span>{" "}
            makes actual AWS API calls against a live account. Features labelled{" "}
            <span className="text-blue-500 font-medium">🔵 DEMO</span>{" "}
            use simulated data where real data would add cost or complexity
            without adding meaningful technical depth.
          </p>
          <a
            href="https://github.com/scale600/aws-secure-admin-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-orange-500 hover:underline"
          >
            <ExternalLink size={14} />
            github.com/scale600/aws-secure-admin-hub
          </a>
        </div>

        {/* Highlights */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Design Principles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highlights.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <Icon size={18} className="text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Tech Stack
          </h3>
          <div className="space-y-3">
            {skills.map(({ category, items }) => (
              <div
                key={category}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-2">
                  {category}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-gray-300 dark:text-gray-600 mt-0.5">›</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
