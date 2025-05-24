import { Button } from "@/ui/button";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";
import { Save, RotateCcw } from "lucide-react";
import { useFormContext } from "react-hook-form";

export function ConfigActions() {
  const { reset } = useFormContext<ExtractionConfigV1FormType>();

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => reset()}
        className="gap-1.5"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Reset</span>
      </Button>
      <Button size="sm" type="submit" className="gap-1.5">
        <Save className="h-3.5 w-3.5" />
        <span>Save</span>
      </Button>
    </div>
  );
}
