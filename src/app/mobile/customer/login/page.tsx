"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";

export default function MobileCustomerLoginLandingPage() {
  return (
    <main
      className={`${workSans.variable} ${playfairMobile.variable} min-h-dvh w-full`}
      style={{ backgroundColor: mobilePalette.background, fontFamily: "var(--font-mobile-work-sans), sans-serif" }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[448px] flex-col px-6 pb-10 pt-12">
        <header className="flex flex-col items-center pb-6">
          <div className="rounded-full bg-[#8D4A25]/10 p-3">
            <ShieldCheck size={34} color="#8D4A25" />
          </div>
          <h1 className="mt-2 text-4xl font-bold text-[#8D4A25]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>Kuteera Kitchen</h1>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center">
          <div className="relative mb-8 aspect-square w-full overflow-hidden rounded-[32px]">
            <Image
              src="/images/hero/thali.png"
              alt="Traditional kitchen"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#8D4A25]/5 to-transparent" />
          </div>

          <div className="mb-10 max-w-[320px] text-center">
            <h2 className="text-4xl font-bold leading-[1.1] text-[#0F172A]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>Home cooked meals, delivered to your doorstep.</h2>
            <p className="mt-3 text-base font-medium text-[#475569]">Authentic meals from our kitchen to your doorstep.</p>
          </div>

          <div className="w-full space-y-4">
            <Link
              href="/mobile/customer/login/phone"
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#8D4A25] text-lg font-bold text-white shadow-[0px_10px_15px_-3px_rgba(141,74,37,0.2),0px_4px_6px_-4px_rgba(141,74,37,0.2)]"
            >
              Login with Phone
            </Link>
            <Link
              href="/mobile/customer/register"
              className="flex h-14 w-full items-center justify-center rounded-full border-2 border-[#8D4A25] text-lg font-bold text-[#8D4A25]"
            >
              New? Create Account
            </Link>
          </div>
        </section>

        <footer className="pt-4">
          <div className="flex items-center justify-center gap-3 border-t border-[#8D4A25]/10 py-4">
            <div className="rounded-full bg-[#1B4332]/10 p-1.5">
              <ShieldCheck size={18} color="#1B4332" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#1B4332]">FSSAI Certified & Hygienic</p>
            <div className="h-2 w-2 rounded-full bg-[#1B4332]" />
          </div>
          <p className="text-center text-xs text-[#94A3B8]">By continuing, you agree to our Terms & Privacy Policy</p>
        </footer>
      </div>
    </main>
  );
}
