import Header from "@/components/layout/Header";
import AccessClient from "@/components/access/AccessClient";

export default function AccessPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="EC2 Access Management" />
      <AccessClient />
    </div>
  );
}
