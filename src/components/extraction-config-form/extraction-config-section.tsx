import type { ExtractionConfigType } from "@/lib/types";
import { V0ConfigForm } from "./v0";
import { V1ConfigForm } from "./v1";

export const ExtractionConfigSection = ({
  configVersion,
}: {
  configVersion: ExtractionConfigType["version"];
}) => {
  switch (configVersion) {
    case "v0":
      return <V0ConfigForm />;
    case "v1":
      return <V1ConfigForm />;
    default:
      return <div>Unknown config version</div>;
  }
};
