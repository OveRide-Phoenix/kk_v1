"use client";

import { GeistSans } from "geist/font/sans";
import AuthGuard from "@/components/auth/AuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={GeistSans.className}>
      <AuthGuard>{children}</AuthGuard>
    </div>
  );
}
