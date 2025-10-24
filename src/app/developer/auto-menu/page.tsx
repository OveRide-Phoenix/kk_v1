"use client";

import { AutoMenuGenerator } from "@/components/developer/auto-menu-generator";
import { AdminLayout } from "@/components/admin-layout";

export default function DeveloperAutoMenuPage() {
  return (
    <AdminLayout activePage="dev-auto-menu">
      <AutoMenuGenerator />
    </AdminLayout>
  );
}
