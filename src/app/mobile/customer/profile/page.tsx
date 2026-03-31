"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Leaf, LogOut } from "lucide-react";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";

type CustomerProfile = {
  customer_id: number;
  name: string;
  primary_mobile: string;
  payment_frequency?: string | null;
  created_at?: string | null;
};

const ACCOUNT_ITEMS = [
  { label: "Personal Info", href: "/mobile/customer/profile/personal-info" },
  { label: "Saved Addresses", href: "/mobile/customer/profile/saved-addresses" },
  { label: "Payment Methods", href: "/mobile/customer/profile/payment-methods" },
  { label: "Order History", href: "/mobile/customer/orders" },
] as const;

const SUPPORT_ITEMS = [
  { label: "Support Center", href: "#" },
  { label: "FAQs", href: "#" },
  { label: "Privacy Policy", href: "#" },
] as const;

export default function MobileCustomerProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const handleBack = () => {
    const canGoBack =
      typeof window !== "undefined" &&
      (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0 ||
        window.history.length > 1);
    if (canGoBack) {
      router.back();
      return;
    }
    router.push("/mobile/customer/home");
  };

  useHydrateAuthUser();

  useEffect(() => {
    if (!user?.customer_id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await http.get(`/get-customer/${user.customer_id}`);
        if (!response.ok) return;
        const data = (await response.json()) as CustomerProfile;
        if (!cancelled) setProfile(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.customer_id]);

  const displayName = useMemo(
    () => profile?.name || user?.name || "Customer",
    [profile?.name, user?.name],
  );
  const displayPhone = useMemo(() => {
    const raw = profile?.primary_mobile || user?.phone || "";
    if (!raw) return "";
    const digits = raw.replace(/\D/g, "");
    const value = digits.length > 10 ? digits.slice(-10) : digits;
    return value ? `+91 ${value}` : "";
  }, [profile?.primary_mobile, user?.phone]);

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/";
  };

  return (
    <main
      className={`${workSans.variable} ${playfairMobile.variable} min-h-screen pb-28`}
      style={{ backgroundColor: mobilePalette.background }}
    >
      <div className="mx-auto w-full max-w-[448px]">
        <header className="sticky top-0 z-20 bg-[rgba(253,250,241,0.95)] px-4 py-4 backdrop-blur-md">
          <div className="relative flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-full"
            >
              <ArrowLeft size={20} color="#8D4925" />
            </button>
            <h1
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold text-[#8D4925]"
              style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
            >
              Profile
            </h1>
            <span className="h-9 w-9" />
          </div>
        </header>

        <section className="mb-8 mt-6 flex flex-col items-center">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-[0_4px_20px_rgba(141,73,37,0.08)]">
            <img
              src="/icons/contact-card.png"
              alt="profile"
              className="h-full w-full object-cover"
            />
          </div>

          <h2
            className="mt-4 text-2xl font-bold text-[#3E2723]"
            style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
          >
            {loading ? "Loading..." : displayName}
          </h2>
          <p className="font-medium text-[#3E2723]/60">{displayPhone || "—"}</p>
          <div className="mt-4 flex items-center gap-2 rounded-full border border-[#1B4332]/20 bg-[#1B4332]/10 px-4 py-1.5">
            <Leaf size={14} color="#1B4332" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#1B4332]">
              {profile?.payment_frequency || "Daily"} Plan
            </span>
          </div>
        </section>

        <section className="space-y-6 px-4">
          <ProfileGroup title="Account Settings" items={ACCOUNT_ITEMS} />
          <ProfileGroup title="Support" items={SUPPORT_ITEMS} />

          <button
            onClick={handleLogout}
            className="mb-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#8D4925]/10 bg-white font-bold text-[#8D4925] shadow-[0_4px_20px_rgba(141,73,37,0.08)]"
          >
            <LogOut size={18} />
            Logout
          </button>
        </section>
      </div>

      <MobileCustomerBottomNav active="profile" />
    </main>
  );
}

function ProfileGroup({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h3 className="mb-2 px-4 text-[11px] font-bold uppercase tracking-widest text-[#3E2723]/40">
        {title}
      </h3>
      <div className="overflow-hidden rounded-2xl border border-[#8D4925]/5 bg-white/80 shadow-[0_4px_20px_rgba(141,73,37,0.08)]">
        {items.map((item, idx) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex w-full items-center justify-between px-4 py-4 text-left ${idx < items.length - 1 ? "border-b border-[#8D4925]/10" : ""}`}
          >
            <span className="font-medium text-[#3E2723]">{item.label}</span>
            <ChevronRight size={16} color="rgba(141,73,37,0.35)" />
          </Link>
        ))}
      </div>
    </div>
  );
}
