import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { DetectionRules } from "./detection-rules";
import { OutputSchema } from "./output-schema";
import { SanitizationRules } from "./sanitization-rules";
import { ValidationRules } from "./validation-rules";

export function RuleSection({ fieldIndex }: { fieldIndex: number }) {
  return (
    <Tabs defaultValue="detection" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="detection">Detection</TabsTrigger>
        <TabsTrigger value="validation">Validation</TabsTrigger>
        <TabsTrigger value="sanitization">Sanitization</TabsTrigger>
        <TabsTrigger value="output">Output</TabsTrigger>
      </TabsList>
      <TabsContent value="detection" className="mt-4 space-y-4">
        <DetectionRules fieldIndex={fieldIndex} />
      </TabsContent>
      <TabsContent value="validation" className="mt-4 space-y-4">
        <ValidationRules fieldIndex={fieldIndex} />
      </TabsContent>
      <TabsContent value="sanitization" className="mt-4 space-y-4">
        <SanitizationRules fieldIndex={fieldIndex} />
      </TabsContent>
      <TabsContent value="output" className="mt-4 space-y-4">
        <OutputSchema fieldIndex={fieldIndex} />
      </TabsContent>
    </Tabs>
  );
}
