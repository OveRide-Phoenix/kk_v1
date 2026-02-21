"use client";

import { AdminLayout } from "@/components/admin-layout";

export default function AdminAccountPage() {
  return (
    <AdminLayout activePage="account">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Admin Account</h2>
        <p className="text-muted-foreground">
          Account details and preferences will live here soon.
        </p>
      </div>
    </AdminLayout>
  );
}
