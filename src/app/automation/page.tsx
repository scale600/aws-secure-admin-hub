import Header from "@/components/layout/Header";
import AutomationClient from "@/components/automation/AutomationClient";

export default function AutomationPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Automation Demo" />
      <AutomationClient />
    </div>
  );
}
