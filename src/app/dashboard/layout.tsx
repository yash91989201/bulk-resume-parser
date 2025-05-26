import { SideNav } from "@/components/side-nav";
import { TopNav } from "@/components/top-nav";
import type React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <TopNav />
      <main className="flex gap-6">
        <SideNav />
        <div className="mb-6 flex-1">{children}</div>
      </main>
    </div>
  );
}
