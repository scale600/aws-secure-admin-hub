import Header from "@/components/layout/Header";
import SecurityClient from "@/components/security/SecurityClient";

export default function SecurityPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Security Center" />
      <SecurityClient />
    </div>
  );
}
