import { Button } from "@/ui/button";
import { FileText, Plus } from "lucide-react";

interface EmptyStateV0Props {
  onAdd: () => void;
}

export function EmptyStateV0({ onAdd }: EmptyStateV0Props) {
  return (
    <div className="bg-muted/20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
      <div className="bg-primary/10 mb-4 rounded-full p-3">
        <FileText className="text-primary h-8 w-8" />
      </div>
      <h3 className="mb-2 text-lg font-medium">No fields configured</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Start by adding fields to your extraction configuration. Each field
        defines what data to extract using a simple label, prompt, and example
        approach.
      </p>
      <Button onClick={onAdd} size="lg" className="gap-2">
        <Plus className="h-4 w-4" /> Add Your First Field
      </Button>
    </div>
  );
}
