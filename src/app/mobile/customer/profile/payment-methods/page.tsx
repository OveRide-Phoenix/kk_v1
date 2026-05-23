"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Banknote, CreditCard, Wallet } from "lucide-react";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";

type CustomerProfile = {
  customer_id: number;
  payment_frequency?: string | null;
  primary_mobile: string;
  alternative_mobile?: string | null;
  name: string;
  recipient_name: string;
  email?: string | null;
  referred_by?: string | null;
  house_apartment_no?: string | null;
  written_address: string;
  city: string;
  pin_code: string;
  latitude?: number | null;
  longitude?: number | null;
  address_type?: string | null;
  route_assignment?: string | null;
};

const PAYMENT_FREQUENCIES = ["Daily", "Weekly", "Monthly"] as const;

export default function MobileCustomerPaymentMethodsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [paymentFrequency, setPaymentFrequency] = useState("Daily");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      try {
        const response = await http.get(`/get-customer/${user.customer_id}`);
        if (!response.ok) throw new Error("Unable to load");
        const data = (await response.json()) as CustomerProfile;
        if (cancelled) return;
        setProfile(data);
        setPaymentFrequency(data.payment_frequency || "Daily");
      } catch {
        if (!cancelled) setError("Unable to load payment settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.customer_id]);

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        referred_by: profile.referred_by ?? null,
        primary_mobile: profile.primary_mobile,
        alternative_mobile: profile.alternative_mobile ?? null,
        name: profile.name.trim(),
        recipient_name: profile.recipient_name.trim(),
        payment_frequency: paymentFrequency,
        email: profile.email ?? null,
        house_apartment_no: profile.house_apartment_no ?? null,
        written_address: profile.written_address.trim(),
        city: profile.city.trim(),
        pin_code: profile.pin_code,
        latitude: profile.latitude ?? 0,
        longitude: profile.longitude ?? 0,
        address_type: profile.address_type ?? "Home",
        route_assignment: profile.route_assignment ?? null,
        is_default: true,
      };
      const response = await http.put(`/update-customer/${profile.customer_id}`, payload);
      if (!response.ok) throw new Error();
      setMessage("Payment preference saved.");
    } catch {
      setError("Unable to save payment settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className={`${workSans.variable} ${playfairMobile.variable} min-h-screen pb-28`}
      style={{ backgroundColor: mobilePalette.background }}
    >
      <div className="mx-auto w-full max-w-[448px] px-4">
        <header className="sticky top-0 z-20 bg-[rgba(253,250,241,0.95)] py-4 backdrop-blur-md">
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
              Payment Methods
            </h1>
            <span className="h-9 w-9" />
          </div>
        </header>

        {loading ? (
          <p className="rounded-xl bg-white p-4 text-sm text-[#64748b]">
            Loading payment settings...
          </p>
        ) : null}
        {error ? (
          <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
        ) : null}
        {message ? (
          <p className="mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p>
        ) : null}

        <section className="space-y-3">
          <article className="rounded-xl border border-[#8D4925]/10 bg-white p-4 shadow-[0_4px_12px_-1px_rgba(141,73,37,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#8D4925]/5 p-2.5 text-[#8D4925]">
                  <Wallet size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#8D4925]/60">Wallet Balance</p>
                  <p className="text-lg font-bold text-[#8D4925]">₹450.00</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-xl bg-[#8D4925] px-5 py-2 text-xs font-bold text-white"
              >
                Top Up
              </button>
            </div>
          </article>

          <article className="rounded-xl border border-[#8D4925]/10 bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8D4925]/70">
              Accepted Methods
            </p>
            <div className="space-y-2">
              <Method
                icon={<Wallet size={16} />}
                title="UPI Payments"
                hint="Google Pay, PhonePe, Paytm"
              />
              <Method
                icon={<CreditCard size={16} />}
                title="Credit / Debit Card"
                hint="Visa, Mastercard, RuPay"
              />
              <Method
                icon={<Banknote size={16} />}
                title="Cash on Delivery"
                hint="Pay at your doorstep"
              />
            </div>
          </article>

          <article className="rounded-xl border border-[#8D4925]/10 bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8D4925]/70">
              Payment Frequency
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_FREQUENCIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPaymentFrequency(option)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                    paymentFrequency === option
                      ? "border-[#8D4925] bg-[#8D4925]/10 text-[#8D4925]"
                      : "border-[#8D4925]/20 text-[#64748b]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </article>

          <button
            onClick={onSave}
            disabled={saving || !profile}
            className="h-12 w-full rounded-xl bg-[#8D4925] text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Preference"}
          </button>
        </section>
      </div>

      <MobileCustomerBottomNav active="profile" />
    </main>
  );
}

function Method({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#8D4925]/10 p-3">
      <div className="rounded-lg bg-[#FDFAF1] p-2 text-[#8D4925]">{icon}</div>
      <div>
        <p className="text-sm font-bold text-[#1e293b]">{title}</p>
        <p className="text-xs text-[#64748b]">{hint}</p>
      </div>
    </div>
  );
}
