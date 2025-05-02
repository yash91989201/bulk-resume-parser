import { ExtractionConfigCard } from "@/components/extraction-config-card";
import { buttonVariants } from "@/components/ui/button";
import { caller } from "@/trpc/server";
import Link from "next/link";

export default async function Page() {
  const extractionConfigs = await caller.extractionConfig.getAll();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between">
        <h1 className="text-xl font-bold">Extraction Config</h1>
        <Link
          href="/dashboard/extraction-config/new"
          className={buttonVariants({ variant: "secondary" })}
        >
          New Config
        </Link>
      </div>
      {extractionConfigs.map((config) => (
        <ExtractionConfigCard key={config.id} config={config.config} />
      ))}
    </div>
  );
}
