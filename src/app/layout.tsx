import type { Metadata } from "next";
import "./globals.css";
import { PRODUCT_NAME } from "@/lib/reference-data";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: "Internal command center for onboarding, payroll coordination, tickets, tasks, approvals, and manager accountability."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
