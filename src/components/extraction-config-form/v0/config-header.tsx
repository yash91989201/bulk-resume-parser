import { FileText } from "lucide-react";

export const ConfigHeader = () => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <FileText className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          V0 Extraction Configuration
        </h1>
      </div>
      <p className="text-muted-foreground max-w-3xl">
        Create a simple extraction configuration with basic field definitions.
        Perfect for straightforward document processing with label, prompt, and
        example-based extraction.
      </p>
    </div>
  );
};
