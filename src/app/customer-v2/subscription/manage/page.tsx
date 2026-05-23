"use client";

import { useRouter } from "next/navigation";

export default function ManageSubscriptionPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#8D4925]/20 bg-white text-[#8D4925] transition-colors hover:bg-orange-50"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8D4925]/50">
            Subscriptions
          </p>
          <h1
            className="text-3xl font-bold text-[#8D4925]"
            style={{ fontFamily: "var(--font-v2-playfair)" }}
          >
            Manage Plans
          </h1>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-100 bg-white px-8 py-16 text-center shadow-sm">
        <span className="material-symbols-outlined mb-4 block text-5xl text-[#8D4925]/30">
          tune
        </span>
        <h2
          className="mb-2 text-xl font-bold text-[#8D4925]"
          style={{ fontFamily: "var(--font-v2-playfair)" }}
        >
          Plan management coming soon
        </h2>
        <p className="mx-auto max-w-sm text-sm text-gray-500">
          You&apos;ll be able to pause, modify, or cancel individual subscription plans here.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#8D4925] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#7a3f20] active:scale-95"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Subscriptions
        </button>
      </div>
    </main>
  );
}
