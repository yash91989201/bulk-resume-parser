import { useState } from "react";
import { Button } from "@/ui/button";
import { Copy, Check } from "lucide-react";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";

export const ConfigPreview = ({
  formValues,
}: {
  formValues: ExtractionConfigV0FormType;
}) => {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(formValues, null, 2);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-muted relative rounded-lg border">
      <div className="absolute top-4 right-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copyToClipboard}
          className="bg-background/80 h-8 w-8 backdrop-blur-sm"
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
};
