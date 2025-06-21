import { ExtractionConfigCard } from "@/components/extraction-config-card";
import { auth } from "@/server/utils/auth";
import { caller } from "@/trpc/server";
import { buttonVariants } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/ui/dropdown-menu";
import { Separator } from "@/ui/separator";
import { ChevronDown, Plus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { unauthorized } from "next/navigation";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session == null) {
    unauthorized();
  }

  const extractionConfigs = await caller.extractionConfig.getAll();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between">
        <h1 className="text-xl font-bold">Extraction Config</h1>
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants()}>
            <Plus className="size-4" />
            New Config
            <Separator orientation="vertical" />
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/extraction-config/new/v0">V0 Config</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/extraction-config/new/v1">V1 Config</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {extractionConfigs.map((config) => (
        <ExtractionConfigCard
          key={config.id}
          id={config.id}
          name={config.name}
          config={config.config}
        />
      ))}
    </div>
  );
}
