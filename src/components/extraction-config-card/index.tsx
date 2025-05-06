import type { ExtractionConfigType } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";

export const ExtractionConfigCard = ({
  config,
}: {
  config: ExtractionConfigType;
}) => {
  const { name, version, description, fields } = config;

  return (
    <Card className="min-w-lg">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>
          {version} - {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Fields</p>
        <ul className="list-inside list-disc">
          {fields.map((field) => (
            <li key={field.key}>{field.label}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
