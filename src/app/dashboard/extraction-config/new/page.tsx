import { ExtractionConfigForm } from "@/components/extraction-config-form";

export default function Page() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">Create extraction config</h1>
      <ExtractionConfigForm />
    </div>
  );
}
