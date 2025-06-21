import { useFieldArray, useFormContext } from "react-hook-form";
import { FieldCard } from "./field-card";
import { EmptyState } from "./empty-state";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";
import { Button } from "@/ui/button";
import { Plus } from "lucide-react";

export function FieldsList() {
  const { control, formState } = useFormContext<ExtractionConfigV1FormType>();
  const { fields, append, remove } = useFieldArray({
    name: "config.fields",
    control,
  });

  const addField = () => {
    append({
      key: "",
      label: "",
      description: "",
      note: "",
      required: false,
      default_value: "",
      detection_schema: {
        rules: [],
      },
      validation_schema: {
        rules: [],
      },
      sanitization_schema: {
        rules: [],
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          Fields Configuration
        </h2>
        <Button
          type="button"
          onClick={addField}
          className="gap-2"
          disabled={formState.isSubmitting}
        >
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <EmptyState onAdd={addField} />
      ) : (
        <div className="space-y-6">
          {fields.map((field, index) => (
            <FieldCard
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
