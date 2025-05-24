import { useFieldArray, useFormContext } from "react-hook-form";
import { FieldCard } from "./field-card";
import { EmptyState } from "./empty-state";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

export function FieldsList() {
  const { control } = useFormContext<ExtractionConfigV1FormType>();
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
