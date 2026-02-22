"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Info, Leaf, Utensils } from "lucide-react";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";

export default function MobileCustomerManageSubscriptionPage() {
  const router = useRouter();
  const handleBack = () => {
    const idx = typeof window !== "undefined" ? (window.history.state as { idx?: number } | null)?.idx : undefined;
    if (typeof idx === "number" && idx > 0) {
      router.back();
      return;
    }
    router.push("/mobile/customer/home");
  };

  return (
    <main className={`${workSans.variable} ${playfairMobile.variable} min-h-screen pb-28`} style={{ backgroundColor: mobilePalette.background }}>
      <div className="mx-auto w-full max-w-[448px]">
        <header className="sticky top-0 z-20 border-b border-[rgba(141,73,37,0.1)] bg-[rgba(253,250,241,0.95)] px-4 py-4 backdrop-blur-md">
          <div className="relative flex items-center justify-between">
          <button type="button" onClick={handleBack} className="flex h-9 w-9 items-center justify-center rounded-full">
            <ArrowLeft size={20} color="#8D4925" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold text-[#8D4925]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>Manage Subscription</h1>
          <span className="h-9 w-9" />
          </div>
        </header>

        <section className="space-y-6 px-4 py-6">
          <div className="overflow-hidden rounded-2xl bg-[#8D4925] text-[#FDFAF1] shadow-lg">
            <div className="h-28 w-full bg-[url('/images/hero/thali.png')] bg-cover bg-center" />
            <div className="space-y-2 p-5">
              <span className="rounded-full bg-[#FDFAF1] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1B4332]">Plan Active</span>
              <h2 className="pt-2 text-lg font-bold" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>Standard South-Indian Homemade Plan</h2>
              <p className="text-sm text-[#FDFAF1]/85">12 days remaining • 1 Meal/Day</p>
              <p className="text-sm font-medium">Next delivery: Tomorrow, 12:30 PM</p>
            </div>
          </div>

          <div>
            <h3 className="px-1 text-base font-semibold text-[#8D4925]">Meal Preference</h3>
            <div className="mt-3 flex rounded-2xl bg-[#8D4925]/10 p-1">
              <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#8D4925] py-3 text-sm font-semibold text-[#FDFAF1]">
                <Leaf size={16} color="#1B4332" /> Veg
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-[#8D4925]/60">
                <Utensils size={16} /> Satvic
              </button>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between px-1">
              <h3 className="text-base font-semibold text-[#8D4925]">Pause Subscription</h3>
              <Info size={16} color="rgba(141,73,37,0.6)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-[#8D4925]/70">Pause From</span>
                <div className="relative">
                  <input defaultValue="Oct 24, 2023" className="h-12 w-full rounded-2xl border border-[#8D4925]/20 bg-white px-4 pl-10 text-sm text-[#3E2723]" />
                  <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D4925]" />
                </div>
              </label>

              <label className="space-y-2">
                <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-[#8D4925]/70">Resume On</span>
                <div className="relative">
                  <input defaultValue="Oct 30, 2023" className="h-12 w-full rounded-2xl border border-[#8D4925]/20 bg-white px-4 pl-10 text-sm text-[#3E2723]" />
                  <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D4925]" />
                </div>
              </label>
            </div>
            <p className="mt-2 px-1 text-[11px] italic text-[#8D4925]/60">*Deliveries resume automatically on the selected date.</p>
          </div>

          <button className="h-14 w-full rounded-2xl bg-[#8D4925] text-base font-bold text-[#FDFAF1] shadow-lg">Save Changes</button>
          <div className="text-center">
            <button className="text-sm font-medium text-[#8D4925]/70 underline underline-offset-4">Cancel Plan</button>
          </div>
        </section>
      </div>

      <MobileCustomerBottomNav active="plans" />
    </main>
  );
}
