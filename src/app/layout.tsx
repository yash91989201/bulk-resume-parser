import "@/styles/globals.css";

import {
  IBM_Plex_Sans,
  Source_Sans_3 as Source_Sans_Pro,
} from "next/font/google";
// UTILS
import { cn } from "@/lib/utils";
// PROVIDERS
import { TRPCReactProvider } from "@/trpc/react";
// TYPES
import { type Metadata } from "next";
import { Toaster } from "sonner";
import Script from "next/script";
import { env } from "@/env";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

const sourceSansPro = Source_Sans_Pro({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Home | Resume Parser",
  description:
    "Bulk parse resumes in multiple formats. Extract structured data instantly with AI-powered analysis.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(ibmPlexSans.className, sourceSansPro.className)}
    >
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster />
        <Script
          src="https://umami.bulk-resume-parser.yashraj-jaiswal.site/script.js"
          data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
        />
      </body>
    </html>
  );
}
