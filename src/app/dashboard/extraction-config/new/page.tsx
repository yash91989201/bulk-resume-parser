import Link from "next/link";

export default function Page() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-bold">Create extraction config</h1>
      <Link href="/dashboard/extraction-config/new/v0">V0 Config Schema</Link>
      <Link href="/dashboard/extraction-config/new/v1">V1 Config Schema</Link>
    </div>
  );
}
