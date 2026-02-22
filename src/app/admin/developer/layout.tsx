"use client";

import DeveloperGuard from "@/components/auth/DeveloperGuard";

export default function AdminDeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DeveloperGuard>{children}</DeveloperGuard>;
}
