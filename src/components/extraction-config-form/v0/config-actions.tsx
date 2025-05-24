import { Button } from "@/ui/button";
import { Save, RotateCcw } from "lucide-react";

export const ConfigActions = ({
  onSave,
  onReset,
}: {
  onSave: () => void;
  onReset: () => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        className="gap-1.5"
      >
        <RotateCcw className="size-4" />
        <span>Reset</span>
      </Button>
      <Button size="sm" onClick={onSave} className="gap-1.5">
        <Save className="size-4" />
        <span>Save</span>
      </Button>
    </div>
  );
};
