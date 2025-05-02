"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Banknote,
  CircleGauge,
  HelpCircle,
  LayoutDashboard,
  LayoutPanelTop,
  Settings,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";

const navLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    Icon: LayoutDashboard,
  },
  {
    href: "/dashboard/extraction-config",
    label: "Extraction Config",
    Icon: LayoutPanelTop,
  },
  {
    href: "/dashboard/usage",
    label: "Usage",
    Icon: CircleGauge,
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    Icon: Banknote,
  },
  {
    href: "/dashboard/account",
    label: "Account",
    Icon: UserRound,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    Icon: Settings,
  },
  {
    href: "/dashboard/help",
    label: "Help & Support",
    Icon: HelpCircle,
  },
];

export const SideNav = () => {
  const pathname = usePathname();

  return (
    <>
      <div className="flex min-w-48 flex-col gap-3">
        <nav className="flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={buttonVariants({
                variant: pathname === link.href ? "secondary" : "ghost",
                className: "justify-start text-lg font-semibold select-none",
              })}
            >
              <link.Icon className="mr-2 size-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};
