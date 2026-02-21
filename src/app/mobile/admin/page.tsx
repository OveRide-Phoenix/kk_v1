"use client";

import Link from "next/link";

export default function MobileAdminEntryPage() {
  return (
    <main className="min-h-screen bg-[#fdfaf1] p-6">
      <div className="mx-auto max-w-[448px] rounded-2xl border border-[#8D4925]/15 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#8D4925]">Admin Mobile</h1>
        <p className="mt-2 text-sm text-[#475569]">Admin login is successful. Admin mobile UI modules are the next step.</p>
        <div className="mt-4 flex gap-3">
          <Link href="/mobile/customer/login/phone" className="rounded-xl border border-[#8D4925]/20 px-4 py-2 text-sm font-semibold text-[#8D4925]">
            Back to Login
          </Link>
          <Link href="/admin" className="rounded-xl bg-[#8D4925] px-4 py-2 text-sm font-semibold text-white">
            Open Desktop Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
