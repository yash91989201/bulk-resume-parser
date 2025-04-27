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
import { ThemeProvider } from "@/providers/theme-provider";

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
  title: "Bulk Resume Parser AI",
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
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
