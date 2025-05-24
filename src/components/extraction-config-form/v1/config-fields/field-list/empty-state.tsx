import { Button } from "@/ui/button";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="bg-muted/20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
      <h3 className="mb-2 text-lg font-medium">No fields configured</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Start by adding fields to your extraction configuration. Each field
        defines what data to extract and how to process it.
      </p>
      <Button onClick={onAdd} size="lg" className="gap-2">
        <Plus className="h-4 w-4" /> Add Your First Field
      </Button>
    </div>
  );
}
