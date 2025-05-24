import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/ui/button";
import { Plus } from "lucide-react";
import { FieldCardV0 } from "./field-card";
import { EmptyStateV0 } from "./empty-state";
import type { ExtractionConfigV0FormType } from "@/lib/extraction-config/types";

export function FieldsListV0() {
  const { control } = useFormContext<ExtractionConfigV0FormType>();
  const { fields, append, remove } = useFieldArray({
    name: "config.fields",
    control,
  });

  const addField = () => {
    append({
      key: "",
      label: "",
      prompt: "",
      example: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          Fields Configuration
        </h2>
        <Button onClick={addField} className="gap-2">
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <EmptyStateV0 onAdd={addField} />
      ) : (
        <div className="space-y-6">
          {fields.map((field, index) => (
            <FieldCardV0
              key={field.id}
              index={index}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
