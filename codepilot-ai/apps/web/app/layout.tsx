import type { Metadata } from "next";
import type { JSX, ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "CodePilot AI",
  description: "Autonomous software engineering platform"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
