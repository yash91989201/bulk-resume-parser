import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";
import { Button } from "@/ui/button";
import { Save, RotateCcw, Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";

export const ConfigActions = () => {
  const { formState } = useFormContext<ExtractionConfigV0FormType>();

  return (
    <div className="flex items-center gap-2">
      <Button type="reset" variant="outline" size="sm" className="gap-1.5">
        <RotateCcw className="size-4" />
        Reset
      </Button>
      <Button size="sm" type="submit" className="gap-1.5">
        {formState.isSubmitting ? (
          <Loader2 className="size-4" />
        ) : (
          <Save className="size-4" />
        )}
        Save
      </Button>
    </div>
  );
};
