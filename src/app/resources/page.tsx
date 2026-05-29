import Header from "@/components/layout/Header";
import ResourcesClient from "@/components/resources/ResourcesClient";

export default function ResourcesPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Resource Management" />
      <ResourcesClient />
    </div>
  );
}
