"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format as formatDate, isSameMonth } from "date-fns";
import { ArrowLeft, CalendarDays, Info, Loader2 } from "lucide-react";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";

type CustomerProfile = {
  customer_id: number;
  referred_by?: string | null;
  primary_mobile: string;
  alternative_mobile?: string | null;
  name: string;
  recipient_name: string;
  payment_frequency?: string | null;
  email?: string | null;
  house_apartment_no?: string | null;
  written_address: string;
  city: string;
  pin_code: string;
  latitude?: number | null;
  longitude?: number | null;
  address_type?: string | null;
  route_assignment?: string | null;
};

type OrderSummary = {
  order_id: number;
  created_at: string | null;
  total_price: number;
  status: string;
  payment_method: string;
  order_type?: string | null;
};

const PAYMENT_FREQUENCIES = ["Daily", "Weekly", "Monthly"] as const;

export default function MobileCustomerManageSubscriptionPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [paymentFrequency, setPaymentFrequency] = useState("Daily");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleBack = () => {
    const idx =
      typeof window !== "undefined"
        ? (window.history.state as { idx?: number } | null)?.idx
        : undefined;
    if (typeof idx === "number" && idx > 0) {
      router.back();
      return;
    }
    router.push("/mobile/customer/home");
  };

  useEffect(() => {
    if (user) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;
    (async () => {
      try {
        const response = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        setUser(await response.json());
      } catch {
        // ignore
      }
    })();
  }, [user, setUser]);

  useEffect(() => {
    const customerId = user?.customer_id;
    if (!customerId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, ordersRes] = await Promise.all([
          http.get(`/get-customer/${customerId}`),
          http.get(`/api/customers/${customerId}/orders`),
        ]);

        if (!profileRes.ok) throw new Error("Unable to load profile");
        const profileData = (await profileRes.json()) as CustomerProfile;
        const ordersData = ordersRes.ok ? ((await ordersRes.json()) as OrderSummary[]) : [];

        if (cancelled) return;
        setProfile(profileData);
        setPaymentFrequency(profileData.payment_frequency || "Daily");
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch {
        if (!cancelled) setError("Unable to load subscription details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.customer_id]);

  const monthlySubscriptions = useMemo(() => {
    const now = new Date();
    return orders
      .filter((order) => {
        if ((order.order_type ?? "").toLowerCase() !== "subscription") return false;
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        if (Number.isNaN(orderDate.getTime())) return false;
        return isSameMonth(orderDate, now);
      })
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [orders]);

  const activeSubscription = monthlySubscriptions[0] ?? null;

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setMessage(null);
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

      const response = await http.put(
        `/update-customer/${profile.customer_id}`,
        payload as Record<string, unknown>,
      );
      if (!response.ok) throw new Error("Unable to save");
      setProfile((prev) => (prev ? { ...prev, payment_frequency: paymentFrequency } : prev));
      setMessage("Changes saved.");
    } catch {
      setError("Unable to save subscription preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className={`${workSans.variable} ${playfairMobile.variable} min-h-screen pb-28`}
      style={{ backgroundColor: mobilePalette.background }}
    >
      <div className="mx-auto w-full max-w-[448px]">
        <header className="sticky top-0 z-20 border-b border-[rgba(141,73,37,0.1)] bg-[rgba(253,250,241,0.95)] px-4 py-4 backdrop-blur-md">
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
              Manage Subscription
            </h1>
            <span className="h-9 w-9" />
          </div>
        </header>

        <section className="space-y-6 px-4 py-6">
          <div className="overflow-hidden rounded-2xl bg-[#8D4925] text-[#FDFAF1] shadow-lg">
            <div className="h-28 w-full bg-[url('/images/hero/thali.png')] bg-cover bg-center" />
            <div className="space-y-2 p-5">
              {loading ? (
                <p className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading subscription...
                </p>
              ) : activeSubscription ? (
                <>
                  <span className="rounded-full bg-[#FDFAF1] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1B4332]">
                    Plan Active
                  </span>
                  <h2
                    className="pt-2 text-lg font-bold"
                    style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
                  >
                    Active Subscription • #{activeSubscription.order_id}
                  </h2>
                  <p className="text-sm text-[#FDFAF1]/85">
                    {monthlySubscriptions.length} deliveries this month
                  </p>
                  <p className="text-sm font-medium">
                    Last order:{" "}
                    {activeSubscription.created_at
                      ? formatDate(new Date(activeSubscription.created_at), "dd MMM yyyy • hh:mm a")
                      : "N/A"}
                  </p>
                </>
              ) : (
                <>
                  <span className="rounded-full bg-[#FDFAF1] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1B4332]">
                    No Active Plan
                  </span>
                  <h2
                    className="pt-2 text-lg font-bold"
                    style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
                  >
                    No subscription this month
                  </h2>
                  <p className="text-sm text-[#FDFAF1]/85">
                    Start a plan to get regular meal deliveries.
                  </p>
                  <Link
                    href="/mobile/customer/order"
                    className="mt-2 inline-flex rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#8D4925]"
                  >
                    Start Now
                  </Link>
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="px-1 text-base font-semibold text-[#8D4925]">Payment Frequency</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-[#8D4925]/10 p-2">
              {PAYMENT_FREQUENCIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPaymentFrequency(option)}
                  className={`rounded-xl py-3 text-sm font-semibold ${
                    paymentFrequency === option
                      ? "bg-[#8D4925] text-[#FDFAF1]"
                      : "bg-white text-[#8D4925]/70"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between px-1">
              <h3 className="text-base font-semibold text-[#8D4925]">Pause Subscription</h3>
              <Info size={16} color="rgba(141,73,37,0.6)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-[#8D4925]/70">
                  Pause From
                </span>
                <div className="relative">
                  <input
                    defaultValue="Oct 24, 2023"
                    className="h-12 w-full rounded-2xl border border-[#8D4925]/20 bg-white px-4 pl-10 text-sm text-[#3E2723]"
                  />
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D4925]"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-[#8D4925]/70">
                  Resume On
                </span>
                <div className="relative">
                  <input
                    defaultValue="Oct 30, 2023"
                    className="h-12 w-full rounded-2xl border border-[#8D4925]/20 bg-white px-4 pl-10 text-sm text-[#3E2723]"
                  />
                  <CalendarDays
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D4925]"
                  />
                </div>
              </label>
            </div>
            <p className="mt-2 px-1 text-[11px] italic text-[#8D4925]/60">
              *Deliveries resume automatically on the selected date.
            </p>
          </div>

          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
          {message ? (
            <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p>
          ) : null}

          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading || !profile}
            className="h-14 w-full rounded-2xl bg-[#8D4925] text-base font-bold text-[#FDFAF1] shadow-lg disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <div className="text-center">
            <button className="text-sm font-medium text-[#8D4925]/70 underline underline-offset-4">
              Cancel Plan
            </button>
          </div>
        </section>
      </div>

      <MobileCustomerBottomNav active="plans" />
    </main>
  );
}
