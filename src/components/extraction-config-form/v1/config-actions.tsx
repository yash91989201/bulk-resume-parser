import { Button } from "@/ui/button";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";
import { Save, RotateCcw, Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";

export function ConfigActions() {
  const { formState } = useFormContext<ExtractionConfigV1FormType>();

  return (
    <div className="flex items-center gap-2">
      <Button type="reset" size="sm" variant="outline" className="gap-1.5">
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
      <Button size="sm" className="gap-1.5">
        {formState.isSubmitting ? (
          <Loader2 className="size-4" />
        ) : (
          <Save className="size-4" />
        )}
        Save
      </Button>
    </div>
  );
}
