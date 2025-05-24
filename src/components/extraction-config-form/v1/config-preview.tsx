import { useState } from "react";
import { Button } from "@/ui/button";
import { Copy, Check } from "lucide-react";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";
import { useFormContext } from "react-hook-form";

export function ConfigPreview() {
  const { watch } = useFormContext<ExtractionConfigV1FormType>();
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(watch(), null, 2);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-muted relative rounded-lg border">
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={copyToClipboard}
          className="bg-background/80 h-8 w-8 rounded-full backdrop-blur-sm"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <pre className="overflow-auto p-6 text-sm">{jsonString}</pre>
    </div>
  );
}
