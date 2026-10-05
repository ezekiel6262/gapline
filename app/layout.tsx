import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import "./live.css";

export const metadata: Metadata = {
  title: "Gapline — Your broker sleeps. Your weekend does not.",
  description: "Weekend intelligence and spot protection for tokenized stock holders on BNB Smart Chain.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider><html lang="en">
      <body>{children}</body>
    </html></ClerkProvider>
  );
}
