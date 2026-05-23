"use client";

import { useRouter } from "next/navigation";
import { format as formatDate, isSameMonth } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusPill } from "@/components/order-status-pill";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";

type OrderItem = {
  item_name: string;
  quantity: number;
  price: number;
};

type OrderSummary = {
  order_id: number;
  created_at: string | null;
  total_price: number;
  status: string;
  payment_method: string;
  order_type?: string | null;
  address?: {
    label: string;
    line: string;
    city: string;
    pin_code: string;
  };
  items: OrderItem[];
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const MEAL_OPTIONS = [
  {
    meal: "breakfast",
    label: "Breakfast",
    icon: "wb_twilight",
    time: "7:30 – 9:00 AM",
    description: "Start your morning with fresh idlis, dosas, or upma — home-cooked every day.",
  },
  {
    meal: "lunch",
    label: "Lunch",
    icon: "wb_sunny",
    time: "12:30 – 2:00 PM",
    description: "Curry of the day, rice, rasam, and more — resolved fresh from our daily menu.",
  },
  {
    meal: "dinner",
    label: "Dinner",
    icon: "bedtime",
    time: "7:00 – 9:00 PM",
    description: "End your day with a comforting home-style dinner from Kuteera Kitchen.",
  },
] as const;

type TodayItem = {
  meal_type: string;
  group_name: string;
  quantity: number;
  resolved_item_name: string | null;
  resolved_picture_url: string | null;
  resolved_price: number | null;
  menu_released: boolean;
};

export default function SubscriptionHomePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [hydrated, setHydrated] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [showPlansDialog, setShowPlansDialog] = useState(false);
  const [todayItems, setTodayItems] = useState<TodayItem[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useHydrateAuthUser({ enabled: hydrated });

  const customerId = hydrated ? user?.customer_id : undefined;

  const customerName = useMemo(() => {
    if (!user?.name) return "there";
    const trimmed = user.name.trim();
    return trimmed ? trimmed.split(" ")[0] : "there";
  }, [user?.name]);

  useEffect(() => {
    if (!customerId) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    (async () => {
      try {
        const response = await http.get(`/api/customers/${customerId}/orders`);
        if (!response.ok) throw new Error();
        const data = (await response.json()) as OrderSummary[];
        if (cancelled) return;
        setOrders(
          data.map((order) => ({
            ...order,
            order_type: order.order_type ?? "one_time",
            items: Array.isArray((order as { items?: OrderItem[] }).items)
              ? ((order as { items?: OrderItem[] }).items ?? [])
              : [],
          })),
        );
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    setTodayLoading(true);
    (async () => {
      try {
        const cityCode =
          (typeof window !== "undefined" && localStorage.getItem("admin_city_code")) ||
          user?.city_code ||
          "";
        const qs = cityCode ? `?city_code=${encodeURIComponent(cityCode)}` : "";
        const res = await http.get(`/api/customers/${customerId}/subscription-today${qs}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as TodayItem[];
        if (!cancelled) setTodayItems(data);
      } catch {
        if (!cancelled) setTodayItems([]);
      } finally {
        if (!cancelled) setTodayLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, user?.city_code]);

  const activeSubscriptions = useMemo(() => {
    if (!orders.length) return [];
    const today = new Date();
    return orders
      .filter((o) => {
        if (!o.created_at) return false;
        if ((o.order_type ?? "").toLowerCase() !== "subscription") return false;
        const d = new Date(o.created_at);
        return !Number.isNaN(d.getTime()) && isSameMonth(d, today);
      })
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
  }, [orders]);

  const hasActivePlan = activeSubscriptions.length > 0;
  const latestSub = activeSubscriptions[0] ?? null;
  const subDeliveryCount = activeSubscriptions.length;
  const showHeroCard = ordersLoading || hasActivePlan;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .hero-pattern {
              background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            }
          `,
        }}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Hero row ─────────────────────────────────────────────── */}
        <div
          className={`mb-10 grid grid-cols-1 gap-6 ${showHeroCard ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}
        >
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div>
              <p className="mb-1 text-sm font-bold uppercase tracking-widest text-[#8D4925]/50">
                Hello, {customerName}
              </p>
              <h1
                className="mb-2 text-4xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                Meal Subscriptions
              </h1>
              <p className="text-gray-600">Subscribe once. Eat well every day.</p>
            </div>
          </div>

          {showHeroCard ? (
            <div className="lg:col-span-2">
              <div className="hero-pattern relative h-full overflow-hidden rounded-2xl bg-[#8D4925] p-8 text-white shadow-xl">
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                        Subscription Status
                      </p>
                      {ordersLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-56 bg-white/30" />
                          <Skeleton className="h-4 w-28 bg-white/25" />
                        </div>
                      ) : (
                        <h2
                          className="text-4xl font-bold"
                          style={{ fontFamily: "var(--font-v2-playfair)" }}
                        >
                          {subDeliveryCount} Active {subDeliveryCount === 1 ? "Plan" : "Plans"}
                        </h2>
                      )}
                    </div>
                    <span className="rounded-full bg-[#1b4332] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                      This Month
                    </span>
                  </div>

                  <div className="mt-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                    <div>
                      {ordersLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-36 bg-white/25" />
                          <Skeleton className="h-8 w-40 bg-white/30" />
                          <Skeleton className="h-3 w-48 bg-white/20" />
                        </div>
                      ) : latestSub ? (
                        <>
                          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                            Last Delivery
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl">schedule</span>
                            <span className="text-2xl font-bold italic">
                              {latestSub.created_at
                                ? formatDate(new Date(latestSub.created_at), "EEE, d MMM")
                                : "Scheduled"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-orange-100">
                            {subDeliveryCount} deliver
                            {subDeliveryCount === 1 ? "y" : "ies"} this month
                          </p>
                        </>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/customer-v2/subscription/manage")}
                      className="cursor-pointer rounded-xl bg-white px-8 py-3 font-bold text-[#8D4925] shadow-lg transition-all hover:bg-orange-50 active:scale-95"
                    >
                      Manage Plan
                    </button>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 opacity-20">
                  <span className="material-symbols-outlined select-none text-[200px]">eco</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Today's resolved menu ────────────────────────────────── */}
        {(todayLoading || todayItems.length > 0) && (
          <section className="mb-12">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-bold uppercase tracking-widest text-[#8D4925]/50">
                  {formatDate(new Date(), "EEE, d MMM")}
                </p>
                <h2
                  className="text-3xl font-bold text-[#8D4925]"
                  style={{ fontFamily: "var(--font-v2-playfair)" }}
                >
                  Today&apos;s Delivery
                </h2>
              </div>
            </div>

            {todayLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {todayItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm"
                  >
                    <div className="relative h-44 w-full bg-orange-50">
                      {item.resolved_picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.resolved_picture_url}
                          alt={item.resolved_item_name ?? item.group_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="material-symbols-outlined text-5xl text-[#8D4925]/20">
                            restaurant
                          </span>
                        </div>
                      )}
                      {!item.menu_released && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8D4925]/70 backdrop-blur-sm">
                          TBD
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#8D4925]/50">
                        {item.meal_type}
                      </p>
                      <p
                        className="text-base font-bold text-gray-900"
                        style={{ fontFamily: "var(--font-v2-playfair)" }}
                      >
                        {item.menu_released && item.resolved_item_name
                          ? item.resolved_item_name
                          : item.group_name}
                      </p>
                      {item.menu_released && item.resolved_item_name && (
                        <p className="mt-0.5 text-xs text-[#1b4332]">{item.group_name}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between border-t border-orange-50 pt-3">
                        <span className="text-xs text-gray-400">×{item.quantity}</span>
                        {item.menu_released && item.resolved_price != null && (
                          <span className="text-sm font-bold text-[#8D4925]">
                            {currency(item.resolved_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Meal picker ───────────────────────────────────────────── */}
        <section className="mb-12">
          {hasActivePlan && (
            <div className="mb-6 flex items-end justify-between">
              <h2
                className="text-3xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                Add Another Meal
              </h2>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {MEAL_OPTIONS.map(({ meal, label, icon, time, description }) => (
              <button
                key={meal}
                type="button"
                onClick={() => router.push(`/customer-v2/subscription/new-sub?meal=${meal}`)}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-orange-50 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
              >
                <span className="material-symbols-outlined mb-4 block text-3xl text-[#8D4925]">
                  {icon}
                </span>
                <h3
                  className="mb-1 text-lg font-bold text-gray-800"
                  style={{ fontFamily: "var(--font-v2-playfair)" }}
                >
                  {label}
                </h3>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8D4925]/60">
                  {time}
                </p>
                <p className="text-sm text-gray-500">{description}</p>
                <div className="mt-5 flex items-center gap-1 text-sm font-bold text-[#1b4332] transition-colors group-hover:text-[#0d3327]">
                  Subscribe{" "}
                  <span className="material-symbols-outlined text-base transition-transform duration-200 group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!ordersLoading && !hasActivePlan ? (
          <section className="mb-12">
            <div className="rounded-2xl border border-orange-100 bg-white px-8 py-12 text-center shadow-sm">
              <span className="material-symbols-outlined mb-4 block text-5xl text-[#8D4925]/30">
                eco
              </span>
              <h3
                className="mb-2 text-xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                No active subscriptions yet
              </h3>
              <p className="mb-6 text-sm text-gray-500">
                Pick a meal above to get started — we&apos;ll take care of the rest.
              </p>
              <button
                type="button"
                onClick={() => router.push("/customer-v2/subscription/new-sub")}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#8D4925] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#7a3f20] active:scale-95"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Start Your First Subscription
              </button>
            </div>
          </section>
        ) : null}
      </main>

      {/* ── Active Plans Dialog ───────────────────────────────────── */}
      {showPlansDialog ? (
        <>
          <button
            className="fixed inset-0 z-[60] bg-black/35"
            type="button"
            aria-label="Close active plans"
            onClick={() => setShowPlansDialog(false)}
          />
          <section className="fixed left-1/2 top-24 z-[70] flex max-h-[calc(100vh-7rem)] w-full max-w-4xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-[#FDFAF1] shadow-2xl">
            {/* drag handle */}
            <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-slate-300" />

            {/* header */}
            <div className="flex shrink-0 items-start justify-between px-5 pb-4 pt-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#8D4925]/60">
                  This Month
                </p>
                <h3
                  className="text-xl font-bold text-[#8D4925]"
                  style={{ fontFamily: "var(--font-v2-playfair)" }}
                >
                  Active Plans
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlansDialog(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#8D4925]/8 text-[#8D4925] transition-colors hover:bg-[#8D4925]/15"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {activeSubscriptions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    No active subscription orders this month.
                  </p>
                ) : (
                  activeSubscriptions.map((sub) => (
                    <div
                      key={sub.order_id}
                      className="overflow-hidden rounded-xl border border-[#8D4925]/10 bg-white"
                    >
                      {/* order header */}
                      <div className="flex items-start justify-between gap-2 border-b border-[#8D4925]/8 px-4 py-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-[#8D4925]/60">
                            Order ID
                          </p>
                          <h4
                            className="text-lg font-bold text-[#8D4925]"
                            style={{ fontFamily: "var(--font-v2-playfair)" }}
                          >
                            #{sub.order_id}
                          </h4>
                        </div>
                        <OrderStatusPill status={sub.status} />
                      </div>

                      {/* meta rows */}
                      <div className="space-y-2 px-4 py-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#64748b]">Date</span>
                          <span className="font-semibold text-[#1e293b]">
                            {sub.created_at
                              ? formatDate(new Date(sub.created_at), "dd MMM yyyy • hh:mm a")
                              : "Scheduled"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#64748b]">Payment</span>
                          <span className="font-semibold text-[#1e293b]">{sub.payment_method}</span>
                        </div>
                        {sub.address ? (
                          <div className="text-sm">
                            <span className="text-[#64748b]">Delivery address</span>
                            <p className="mt-0.5 font-semibold text-[#1e293b]">
                              {[sub.address.line, sub.address.city, sub.address.pin_code]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {/* items */}
                      <div className="border-t border-[#8D4925]/8 px-4 py-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8D4925]/70">
                          Items
                        </p>
                        <div className="space-y-1.5">
                          {sub.items.length > 0 ? (
                            sub.items.map((item, idx) => (
                              <div
                                key={`${sub.order_id}-item-${idx}`}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-[#1e293b]">
                                  {item.item_name} × {item.quantity}
                                </span>
                                <span className="font-semibold text-[#1e293b]">
                                  {currency(item.price * item.quantity)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-[#64748b]">No items available.</p>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                          <span className="text-sm text-[#64748b]">Total</span>
                          <span className="text-base font-bold text-[#0f172a]">
                            {currency(sub.total_price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* footer */}
            <div className="shrink-0 border-t border-orange-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowPlansDialog(false)}
                className="w-full cursor-pointer rounded-xl bg-[#1B4332] py-3 text-sm font-bold text-white transition-colors hover:bg-[#163829]"
              >
                Close
              </button>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
