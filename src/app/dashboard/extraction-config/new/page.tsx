// UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
// CUSTOM COMPONENTS
import { ExtractionConfigV0Form } from "@/components/extraction-config-form/v0";
import { ExtractionConfigV1Form } from "@/components/extraction-config-form/v1";

export default function Page() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">Create extraction config</h1>
      <Tabs defaultValue="v0-config" className="w-[400px]">
        <TabsList>
          <TabsTrigger value="v0-config">V0 Config</TabsTrigger>
          <TabsTrigger value="v1-config">V1 Config</TabsTrigger>
        </TabsList>
        <TabsContent value="v0-config">
          <ExtractionConfigV0Form />
        </TabsContent>
        <TabsContent value="v1-config">
          <ExtractionConfigV1Form />
        </TabsContent>
      </Tabs>
    </div>
  );
}
