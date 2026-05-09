"use client";

import { useRouter } from "next/navigation";
import { format as formatDate, isSameDay, isSameMonth } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusPill } from "@/components/order-status-pill";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";
import { getCurrentMeal } from "@/lib/meal-time";
import type { MealType } from "@/config/meal-types";
import { getDeliveryText } from "@/config/delivery-times";

const normalizeType = (value: string | null | undefined): "subscription" | "one_time" => {
  const normalized = (value ?? "one_time").toLowerCase().replace("-", "_");
  return normalized === "subscription" ? "subscription" : "one_time";
};

type MenuApiItem = {
  menu_item_id?: number;
  item_id?: number | null;
  combo_id?: number | null;
  item_name?: string;
  name?: string;
  rate?: number;
  price?: number;
  description?: string;
  picture_url?: string | null;
  available_qty?: number;
};

type MenuApiResponse = {
  is_released?: boolean;
  items?: MenuApiItem[];
  delivers_by?: string | null;
};

type MenuItem = {
  menu_item_id: number;
  item_id?: number | null;
  combo_id?: number | null;
  item_name: string;
  meal: MealType;
  rate: number;
  available_qty: number;
  description: string;
  picture_url: string | null;
};

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

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "condiments"];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  condiments: "Condiments",
};

const PLACEHOLDER_IMAGE = "/images/menu/idli-sambar.jpg";

const normalizeQty = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);

export default function CustomerHomeV2Page() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [hydrated, setHydrated] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [menuByMeal, setMenuByMeal] = useState<Record<MealType, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  });
  const [deliversByMeal, setDeliversByMeal] = useState<Record<MealType, string | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    condiments: null,
  });
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);

  const todayISO = useMemo(() => formatDate(new Date(), "yyyy-MM-dd"), []);
  const customerId = hydrated ? user?.customer_id : undefined;
  const cityCode = useMemo(() => {
    const raw = typeof user?.city_code === "string" ? user.city_code.trim().toUpperCase() : "";
    return raw.length ? raw : "MYS";
  }, [user?.city_code]);
  const userHasCityOverride = Boolean(user?.city_code && user.city_code.trim());

  useEffect(() => {
    setHydrated(true);
  }, []);

  useHydrateAuthUser({ enabled: hydrated });

  useEffect(() => {
    let cancelled = false;
    setMenuLoading(true);
    setMenuError(null);
    (async () => {
      try {
        const nextMenu: Partial<Record<MealType, MenuItem[]>> = {};
        const nextDeliversBy: Partial<Record<MealType, string | null>> = {};

        await Promise.all(
          MEAL_ORDER.map(async (meal) => {
            const params = new URLSearchParams({ bld_type: meal, include_combos: "1" });
            if (userHasCityOverride) {
              params.set("city_code", cityCode);
            }
            if (meal === "condiments") {
              params.set("menu_type", "CONDIMENTS");
            } else {
              params.set("date", todayISO);
              params.set("period_type", "one_day");
              params.set("menu_type", "ONE_DAY");
            }

            const response = await http.get(`/api/menu?${params}`);
            if (response.status === 404 || !response.ok) {
              nextMenu[meal] = [];
              nextDeliversBy[meal] = null;
              return;
            }

            const data = (await response.json()) as MenuApiResponse;
            const isReleased = Boolean(data.is_released);
            const items = (data.items ?? []) as MenuApiItem[];
            nextDeliversBy[meal] = data.delivers_by ?? null;
            nextMenu[meal] = isReleased
              ? items.map((item) => ({
                  menu_item_id: item.menu_item_id ?? 0,
                  item_id: item.item_id ?? null,
                  combo_id: item.combo_id ?? null,
                  item_name: item.item_name ?? item.name ?? "Item",
                  meal,
                  rate: item.rate ?? item.price ?? 0,
                  available_qty: normalizeQty(item.available_qty),
                  description: item.description ?? "",
                  picture_url: item.picture_url ?? null,
                }))
              : [];
          }),
        );

        if (cancelled) return;
        setMenuByMeal({
          breakfast: nextMenu.breakfast ?? [],
          lunch: nextMenu.lunch ?? [],
          dinner: nextMenu.dinner ?? [],
          condiments: nextMenu.condiments ?? [],
        });
        setDeliversByMeal({
          breakfast: nextDeliversBy.breakfast ?? null,
          lunch: nextDeliversBy.lunch ?? null,
          dinner: nextDeliversBy.dinner ?? null,
          condiments: nextDeliversBy.condiments ?? null,
        });
      } catch {
        if (cancelled) return;
        setMenuError("Unable to load today's menu.");
        setMenuByMeal({ breakfast: [], lunch: [], dinner: [], condiments: [] });
        setDeliversByMeal({ breakfast: null, lunch: null, dinner: null, condiments: null });
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todayISO, cityCode, userHasCityOverride]);

  useEffect(() => {
    if (!customerId) {
      setOrders([]);
      return;
    }
    let cancelled = false;

    (async () => {
      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const response = await http.get(`/api/customers/${customerId}/orders`);
        if (!response.ok) throw new Error("Unable to load your orders");
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
        if (cancelled) return;
        setOrders([]);
        setOrdersError("We couldn’t load your recent orders.");
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const customerName = useMemo(() => {
    if (!user?.name) return "Shashank";
    const trimmed = user.name.trim();
    return trimmed ? trimmed.split(" ")[0] : "Shashank";
  }, [user?.name]);

  const todaysBookings = useMemo(() => {
    if (!orders.length) return [];
    const today = new Date();
    const matches = orders.filter((order) => {
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at);
      if (Number.isNaN(orderDate.getTime())) return false;
      return isSameDay(orderDate, today);
    });
    if (!matches.length) return [];
    matches.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
    return matches;
  }, [orders]);

  const todaysBooking = todaysBookings[0] ?? null;
  const hasMultipleTodayOrders = todaysBookings.length > 1;
  const todaysItemsCount = useMemo(() => {
    if (!todaysBooking) return 0;
    return todaysBooking.items.reduce((total, item) => total + (item.quantity ?? 0), 0);
  }, [todaysBooking]);

  const currentSubscription = useMemo(() => {
    const today = new Date();
    const subscriptions = orders.filter((order) => {
      if (!order.created_at) return false;
      if ((order.order_type ?? "").toLowerCase() !== "subscription") return false;
      const orderDate = new Date(order.created_at);
      if (Number.isNaN(orderDate.getTime())) return false;
      return isSameMonth(orderDate, today);
    });
    if (!subscriptions.length) return null;
    subscriptions.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
    return subscriptions[0];
  }, [orders]);

  const subscriptionDeliveries = useMemo(() => {
    if (!orders.length) return 0;
    const today = new Date();
    return orders.filter((order) => {
      if (!order.created_at) return false;
      if ((order.order_type ?? "").toLowerCase() !== "subscription") return false;
      const orderDate = new Date(order.created_at);
      if (Number.isNaN(orderDate.getTime())) return false;
      return isSameMonth(orderDate, today);
    }).length;
  }, [orders]);

  const currentMeal = useMemo(() => getCurrentMeal(), []);
  const todayMenuItems = useMemo(
    () => menuByMeal[currentMeal].slice(0, 8),
    [menuByMeal, currentMeal],
  );

  const condimentItems = useMemo(() => menuByMeal.condiments.slice(0, 4), [menuByMeal.condiments]);
  const mealDeliveryText = useMemo(
    () => getDeliveryText(currentMeal, deliversByMeal[currentMeal]),
    [currentMeal, deliversByMeal],
  );
  const mealSectionTitle = useMemo(
    () => `Today's ${MEAL_LABELS[currentMeal] ?? "Menu"} Menu`,
    [currentMeal],
  );
  const showTopBookingCard = ordersLoading || Boolean(todaysBooking);
  const showTopSubscriptionCard = Boolean(currentSubscription);
  const showAnyTopHeroCard = showTopBookingCard || showTopSubscriptionCard;
  const showBothTopCards = showTopBookingCard && showTopSubscriptionCard;

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
        <div
          className={`mb-10 grid grid-cols-1 gap-6 ${showAnyTopHeroCard ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}
        >
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div>
              <h1
                className="mb-2 text-4xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                Good Morning, {customerName}!
              </h1>
              <p className="text-gray-600">Your healthy meals are ready for the day.</p>
            </div>
          </div>

          {showAnyTopHeroCard ? (
            <div
              className={`lg:col-span-2 grid gap-6 ${showBothTopCards ? "md:grid-cols-2" : "grid-cols-1"}`}
            >
              {showTopBookingCard ? (
                <div
                  className={`hero-pattern relative overflow-hidden rounded-2xl bg-[#8D4925] text-white shadow-xl ${showBothTopCards ? "p-6" : "p-8"}`}
                >
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                          Today&apos;s Booking
                        </p>
                        {ordersLoading ? (
                          <div className="space-y-2">
                            <Skeleton
                              className={`h-10 ${showBothTopCards ? "w-44" : "w-56"} bg-white/30`}
                            />
                            <Skeleton className="h-4 w-28 bg-white/25" />
                          </div>
                        ) : (
                          <h2
                            className={`${showBothTopCards ? "text-3xl" : "text-4xl"} font-bold`}
                            style={{ fontFamily: "var(--font-v2-playfair)" }}
                          >
                            {hasMultipleTodayOrders
                              ? `${todaysBookings.length} Active Orders`
                              : `Order #${todaysBooking?.order_id ?? "—"}`}
                          </h2>
                        )}
                      </div>
                      <span className="rounded-full bg-[#1b4332] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                        Today
                      </span>
                    </div>
                    <div
                      className={`${showBothTopCards ? "mt-8" : "mt-12"} flex flex-col justify-between gap-6 sm:flex-row sm:items-end`}
                    >
                      <div>
                        {ordersLoading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-4 w-36 bg-white/25" />
                            <Skeleton className="h-8 w-40 bg-white/30" />
                            <Skeleton className="h-3 w-64 bg-white/20" />
                          </div>
                        ) : todaysBooking ? (
                          <>
                            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                              Order Snapshot
                            </p>
                            <div className="flex items-center gap-3">
                              <span
                                className={`material-symbols-outlined ${showBothTopCards ? "text-2xl" : "text-3xl"}`}
                              >
                                schedule
                              </span>
                              <span
                                className={`${showBothTopCards ? "text-xl" : "text-2xl"} font-bold italic`}
                              >
                                {todaysBooking.created_at
                                  ? formatDate(new Date(todaysBooking.created_at), "EEE, h:mm a")
                                  : "Scheduled"}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-orange-100">
                              {todaysItemsCount} item{todaysItemsCount === 1 ? "" : "s"} •{" "}
                              {currency(todaysBooking.total_price)} • {todaysBooking.status}
                            </p>
                          </>
                        ) : null}
                      </div>
                      <button
                        onClick={() => {
                          if (hasMultipleTodayOrders) {
                            router.push("/customer-v2/account?section=orders");
                          } else if (todaysBooking) {
                            setSelectedOrder(todaysBooking);
                          }
                        }}
                        className={`rounded-xl bg-white ${showBothTopCards ? "px-6 py-2.5 text-sm" : "px-8 py-3"} font-bold text-[#8D4925] shadow-lg transition-all active:scale-95 hover:bg-orange-50`}
                      >
                        {hasMultipleTodayOrders ? "Manage Orders" : "View Order"}
                      </button>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 -right-10 opacity-20">
                    <span className="material-symbols-outlined select-none text-[200px]">
                      receipt_long
                    </span>
                  </div>
                </div>
              ) : null}

              {showTopSubscriptionCard ? (
                <div
                  className={`hero-pattern relative overflow-hidden rounded-2xl bg-[#8D4925] text-white shadow-xl ${showBothTopCards ? "p-6" : "p-8"}`}
                >
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                          Subscription Status
                        </p>
                        <h2
                          className={`${showBothTopCards ? "text-3xl" : "text-4xl"} font-bold`}
                          style={{ fontFamily: "var(--font-v2-playfair)" }}
                        >
                          Monthly Veg Plan
                        </h2>
                      </div>
                      <span className="rounded-full bg-[#1b4332] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                    <div
                      className={`${showBothTopCards ? "mt-8" : "mt-12"} flex flex-col justify-between gap-6 sm:flex-row sm:items-end`}
                    >
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">
                          Next Delivery
                        </p>
                        <div className="flex items-center gap-3">
                          <span
                            className={`material-symbols-outlined ${showBothTopCards ? "text-2xl" : "text-3xl"}`}
                          >
                            schedule
                          </span>
                          <span
                            className={`${showBothTopCards ? "text-xl" : "text-2xl"} font-bold italic`}
                          >
                            {currentSubscription?.created_at
                              ? formatDate(new Date(currentSubscription.created_at), "EEE, h:mm a")
                              : "Scheduled"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-orange-100">
                          {subscriptionDeliveries} deliver
                          {subscriptionDeliveries === 1 ? "y" : "ies"} this month
                        </p>
                      </div>
                      <button
                        onClick={() => router.push("/customer-v2/subscription")}
                        className={`rounded-xl bg-white ${showBothTopCards ? "px-6 py-2.5 text-sm" : "px-8 py-3"} font-bold text-[#8D4925] shadow-lg transition-all active:scale-95 hover:bg-orange-50`}
                      >
                        Manage Plan
                      </button>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 -right-10 opacity-20">
                    <span className="material-symbols-outlined select-none text-[200px]">eco</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {ordersError ? (
          <section className="mb-8">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {ordersError}
            </div>
          </section>
        ) : null}

        <section className="mb-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2
                className="text-3xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                {mealSectionTitle}
              </h2>
              <p className="mt-1.5 text-gray-500">{mealDeliveryText || "Timings unavailable"}</p>
            </div>
            <button
              onClick={() => router.push(`/customer-v2/new-order?meal=${currentMeal}`)}
              className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#1b4332] transition-colors hover:text-[#0d3327]"
            >
              View Today&apos;s Menu{" "}
              <span className="material-symbols-outlined text-lg transition-transform duration-200 group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </button>
          </div>

          {menuLoading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`menu-skeleton-${index}`}
                  className="overflow-hidden rounded-2xl border border-orange-50 bg-white shadow-sm"
                >
                  <Skeleton className="h-56 w-full rounded-none" />
                  <div className="space-y-3 p-6">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : menuError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {menuError}
            </div>
          ) : todayMenuItems.length === 0 ? (
            <div className="rounded-2xl border border-orange-100 bg-white px-4 py-10 text-center text-sm text-[#8D4925]">
              No items available in today&apos;s menu.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {todayMenuItems.map((item) => (
                <div
                  key={`${item.meal}-${item.menu_item_id}`}
                  className="group overflow-hidden rounded-2xl border border-orange-50 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative h-44 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={item.item_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={item.picture_url || PLACEHOLDER_IMAGE}
                    />
                  </div>
                  <div className="p-4">
                    <h3
                      className="mb-1 text-base font-bold text-gray-800"
                      style={{ fontFamily: "var(--font-v2-playfair)" }}
                    >
                      {item.item_name}
                    </h3>
                    <p className="line-clamp-2 text-xs text-gray-500">
                      {item.description || "Freshly prepared special from Kuteera Kitchen."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2
              className="text-3xl font-bold text-[#8D4925]"
              style={{ fontFamily: "var(--font-v2-playfair)" }}
            >
              Condiments
            </h2>
            <button
              onClick={() => router.push("/customer-v2/new-order?meal=condiments")}
              className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#1b4332] transition-colors hover:text-[#0d3327]"
            >
              View All{" "}
              <span className="material-symbols-outlined text-lg transition-transform duration-200 group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </button>
          </div>
          {menuLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`condiment-skeleton-${index}`}
                  className="overflow-hidden rounded-2xl border border-orange-50 bg-white shadow-sm"
                >
                  <Skeleton className="h-44 w-full rounded-none" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : condimentItems.length === 0 ? (
            <div className="rounded-2xl border border-orange-100 bg-white px-4 py-10 text-center text-sm text-[#8D4925]">
              No condiments available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {condimentItems.map((item) => (
                <div
                  key={`condiment-${item.menu_item_id}`}
                  className="group overflow-hidden rounded-2xl border border-orange-50 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative h-44 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={item.item_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={item.picture_url || PLACEHOLDER_IMAGE}
                    />
                  </div>
                  <div className="p-4">
                    <h3
                      className="mb-1 text-base font-bold text-gray-800"
                      style={{ fontFamily: "var(--font-v2-playfair)" }}
                    >
                      {item.item_name}
                    </h3>
                    <p className="line-clamp-2 text-xs text-gray-500">
                      {item.description || "A perfect accompaniment to your meal."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedOrder ? (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/35"
            type="button"
            aria-label="Close details"
            onClick={() => setSelectedOrder(null)}
          />
          <section className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#FDFAF1] px-5 pb-8 pt-6 shadow-2xl">
            <div />
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#8D4925]/60">
                  Order ID
                </p>
                <h3 className="text-xl font-bold text-[#8D4925]">#{selectedOrder.order_id}</h3>
              </div>
              <OrderStatusPill status={selectedOrder.status} />
            </div>

            <div className="space-y-3 rounded-xl border border-[#8D4925]/10 bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">Date</span>
                <span className="font-semibold text-[#1e293b]">
                  {selectedOrder.created_at
                    ? formatDate(new Date(selectedOrder.created_at), "dd MMM yyyy • hh:mm a")
                    : "Scheduled"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">Order type</span>
                <span className="font-semibold text-[#1e293b]">
                  {normalizeType(selectedOrder.order_type) === "subscription"
                    ? "Subscription"
                    : "One-time"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">Payment</span>
                <span className="font-semibold text-[#1e293b]">{selectedOrder.payment_method}</span>
              </div>
              <div className="text-sm">
                <p className="text-[#64748b]">Delivery address</p>
                <p className="mt-1 font-semibold text-[#1e293b]">
                  {selectedOrder.address
                    ? [
                        selectedOrder.address.line,
                        selectedOrder.address.city,
                        selectedOrder.address.pin_code,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : "Address details unavailable"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#8D4925]/10 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8D4925]/70">
                Items
              </p>
              <div className="space-y-2">
                {selectedOrder.items.length ? (
                  selectedOrder.items.map((item, index) => (
                    <div
                      key={`${selectedOrder.order_id}-${item.item_name}-${index}`}
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
                  <p className="text-sm text-[#64748b]">No line items available.</p>
                )}
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748b]">Total</span>
                  <span className="text-lg font-bold text-[#0f172a]">
                    {currency(selectedOrder.total_price)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="mt-4 w-full rounded-xl bg-[#1B4332] py-3 text-sm font-bold text-white"
            >
              Close
            </button>
          </section>
        </>
      ) : null}
    </>
  );
}
