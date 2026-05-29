import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import { Construction } from "lucide-react";

export default function AccessPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="EC2 Access Management" />
      <main className="flex-1 p-6">
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 dark:text-gray-600">
          <Construction size={32} />
          <p className="text-sm">Phase 2 — Backend implementation in progress</p>
          <Badge type="live" />
        </div>
      </main>
    </div>
  );
}
