"use client";

import { useState } from "react";
import { useFormContext, type UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/ui/form";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { FileType, Plus, Trash2 } from "lucide-react";
import type { ExtractionConfigV1FormType } from "@/lib/extraction-config/types";

interface FormatRuleFormProps {
  fieldIndex: number;
  ruleIndex: number;
  onRemove: () => void;
}

export function FormatRuleForm({
  fieldIndex,
  ruleIndex,
  onRemove,
}: FormatRuleFormProps) {
  const { control, watch, setValue } =
    useFormContext<ExtractionConfigV1FormType>();
  const basePath =
    `config.fields.${fieldIndex}.sanitization_schema.rules.${ruleIndex}.rule` as const;
  const [newComponentKey, setNewComponentKey] = useState("");
  const [newComponentValue, setNewComponentValue] = useState("");

  const components = watch(`${basePath}.components`) || {};

  const addComponent = () => {
    if (!newComponentKey.trim()) return;

    const updatedComponents = {
      ...components,
      [newComponentKey]: newComponentValue,
    };

    setValue(`${basePath}.components`, updatedComponents, {
      shouldValidate: true,
    });
    setNewComponentKey("");
    setNewComponentValue("");
  };

  const removeComponent = (key: string) => {
    const updatedComponents = { ...components };
    delete updatedComponents[key];
    setValue(`${basePath}.components`, updatedComponents, {
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
            <FileType className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-sm font-medium">Format Rule</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <FormField
        name={`${basePath}.template`}
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Template</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter format template (e.g., {firstName} {lastName})"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Template string with placeholders in curly braces that will be
              replaced with component values
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <div>
          <h5 className="mb-2 text-sm font-medium">Components</h5>
          <div className="rounded-md border">
            {Object.keys(components).length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                No components added yet
              </div>
            ) : (
              <div className="divide-y">
                {Object.entries(components).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="font-medium">{key}:</span>
                      <span>{value}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeComponent(key)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            placeholder="Component key"
            value={newComponentKey}
            onChange={(e) => setNewComponentKey(e.target.value)}
          />
          <Input
            placeholder="Component value"
            value={newComponentValue}
            onChange={(e) => setNewComponentValue(e.target.value)}
          />
          <Button
            type="button"
            onClick={addComponent}
            size="icon"
            className="h-10 w-10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
