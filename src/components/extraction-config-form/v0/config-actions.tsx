import { Button } from "@/ui/button";
import { Save, RotateCcw, Download } from "lucide-react";

interface ConfigActionsV0Props {
  onSave: () => void;
  onReset: () => void;
}

export function ConfigActions({ onSave, onReset }: ConfigActionsV0Props) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Reset</span>
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5">
        <Download className="h-3.5 w-3.5" />
        <span>Export</span>
      </Button>
      <Button size="sm" onClick={onSave} className="gap-1.5">
        <Save className="h-3.5 w-3.5" />
        <span>Deploy</span>
      </Button>
    </div>
  );
}
