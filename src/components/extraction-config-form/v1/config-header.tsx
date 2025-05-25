import { FileJson } from "lucide-react";

export function ConfigHeader() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <FileJson className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Extraction Config Builder (V1)
        </h1>
      </div>
      <p className="text-muted-foreground max-w-3xl">
        Create and manage extraction configurations with detection, validation,
        and sanitization rules to extract structured data from unstructured
        content.
      </p>
    </div>
  );
}
