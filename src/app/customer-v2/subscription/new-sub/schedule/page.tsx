"use client";

import { addDays, addMonths, eachDayOfInterval, format as formatDate } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { normalizeCityCode } from "@/config/cities";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";

const SUB_ITEMS_KEY = "sub_schedule_items";
const PLACEHOLDER_IMAGE = "/images/menu/idli-sambar.jpg";

type MealType = "breakfast" | "lunch" | "dinner";

type SubItem = {
  menu_item_id: number;
  item_id: number | null;
  combo_id: number | null;
  item_name: string;
  quantity: number;
  rate: number;
  meal: MealType;
  picture_url: string | null;
};

type AddressEntry = {
  address_id: number;
  address_type: string;
  house_apartment_no: string | null;
  written_address: string;
  city: string;
  city_code?: string;
  pin_code: string;
  is_default: boolean;
};

type OrderResponse = {
  message: string;
  order_id: number;
  total_price: number;
  status: string;
};

const PAYMENT_METHODS = [
  {
    id: "UPI",
    label: "UPI (GPay, PhonePe, Paytm)",
    subtitle: "Fast & Secure payments",
    icon: "payments",
  },
  {
    id: "Card",
    label: "Credit / Debit Cards",
    subtitle: "Save cards for faster checkout",
    icon: "credit_card",
  },
  { id: "Cash", label: "Cash on Delivery", subtitle: "Pay when order arrives", icon: "local_atm" },
];

const DURATION_OPTIONS = [
  { id: "1m", label: "1 Month", months: 1 },
  { id: "3m", label: "3 Months", months: 3 },
  { id: "6m", label: "6 Months", months: 6 },
];

const WEEKDAYS = [
  { id: 1, short: "Mon" },
  { id: 2, short: "Tue" },
  { id: 3, short: "Wed" },
  { id: 4, short: "Thu" },
  { id: 5, short: "Fri" },
  { id: 6, short: "Sat" },
  { id: 0, short: "Sun" },
];

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const tomorrowISO = () => formatDate(addDays(new Date(), 1), "yyyy-MM-dd");

export default function SubscriptionSchedulePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useHydrateAuthUser();

  const [items, setItems] = useState<SubItem[]>([]);
  const [startDate, setStartDate] = useState(tomorrowISO());
  const [endDateInput, setEndDateInput] = useState(() =>
    formatDate(addMonths(addDays(new Date(), 1), 1), "yyyy-MM-dd"),
  );
  const [duration, setDuration] = useState<"1m" | "3m" | "6m" | null>("1m");
  const [deliveryDays, setDeliveryDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUB_ITEMS_KEY);
      if (raw) setItems(JSON.parse(raw) as SubItem[]);
    } catch {
      // no-op
    }
  }, []);

  const cityCode = useMemo(() => {
    const rawUser = typeof user?.city_code === "string" ? user.city_code.trim() : "";
    if (typeof window === "undefined") return normalizeCityCode(rawUser);
    const persisted = localStorage.getItem("admin_city_code") || "";
    return normalizeCityCode(rawUser || persisted);
  }, [user?.city_code]);

  useEffect(() => {
    const customerId = user?.customer_id;
    if (!customerId) return;
    (async () => {
      setAddressesLoading(true);
      setAddressesError(null);
      try {
        const res = await http.get(`/api/customers/${customerId}/addresses`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as AddressEntry[];
        setAddresses(data);
      } catch {
        setAddressesError("Unable to load addresses.");
      } finally {
        setAddressesLoading(false);
      }
    })();
  }, [user?.customer_id]);

  const filteredAddresses = useMemo(
    () =>
      addresses.filter((a) => {
        if (!a.city_code) return true;
        return normalizeCityCode(a.city_code) === cityCode;
      }),
    [addresses, cityCode],
  );

  useEffect(() => {
    if (!filteredAddresses.length) {
      setSelectedAddressId(null);
      return;
    }
    const def = filteredAddresses.find((a) => a.is_default);
    setSelectedAddressId((def ?? filteredAddresses[0]).address_id);
  }, [filteredAddresses]);

  const selectedAddress = useMemo(
    () => filteredAddresses.find((a) => a.address_id === selectedAddressId) ?? null,
    [filteredAddresses, selectedAddressId],
  );

  const toggleDay = (day: number) => {
    setDeliveryDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const endDate = useMemo(() => {
    if (!endDateInput) return null;
    try {
      return new Date(endDateInput);
    } catch {
      return null;
    }
  }, [endDateInput]);

  const estimatedDeliveries = useMemo(() => {
    if (!deliveryDays.length || !startDate || !endDate) return 0;
    try {
      const start = new Date(startDate);
      if (endDate <= start) return 0;
      const days = eachDayOfInterval({ start, end: endDate });
      return days.filter((d) => deliveryDays.includes(d.getDay())).length;
    } catch {
      return 0;
    }
  }, [startDate, endDate, deliveryDays]);

  const perDeliveryTotal = useMemo(
    () => items.reduce((s, i) => s + i.rate * i.quantity, 0),
    [items],
  );

  const estimatedTotal = perDeliveryTotal * estimatedDeliveries;

  const hasPriceVaryingItems = useMemo(() => items.some((i) => i.rate === 0), [items]);

  const handleConfirm = useCallback(async () => {
    if (!items.length || !user?.customer_id || !selectedAddress) return;
    setPlacingOrder(true);
    setErrorMessage(null);
    try {
      const res = await http.post("/api/orders/create", {
        customer_id: user.customer_id,
        address_id: selectedAddress.address_id,
        payment_method: paymentMethod,
        delivery_date: startDate,
        order_type: "subscription",
        items: items.map((item) => ({
          item_id: item.item_id,
          combo_id: item.combo_id,
          quantity: item.quantity,
          price: item.rate,
          menu_item_id: item.menu_item_id,
          meal_type: item.meal,
        })),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to confirm subscription");
      setOrderResult(data as OrderResponse);
      localStorage.removeItem(SUB_ITEMS_KEY);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPlacingOrder(false);
    }
  }, [items, user?.customer_id, selectedAddress, paymentMethod, startDate]);

  if (orderResult) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6 lg:px-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1b4332]/10 text-[#1b4332]">
          <span className="material-symbols-outlined text-3xl">check_circle</span>
        </div>
        <h1
          className="mb-2 text-3xl font-bold text-[#8D4925]"
          style={{ fontFamily: "var(--font-v2-playfair)" }}
        >
          Subscription Confirmed
        </h1>
        <p className="mb-1 text-gray-600">
          Order #{orderResult.order_id} · {currency(orderResult.total_price)}
        </p>
        <p className="mb-8 text-sm text-gray-500">
          Starting {formatDate(new Date(startDate), "EEE, d MMM yyyy")} · {estimatedDeliveries}{" "}
          deliveries scheduled
        </p>
        <button
          type="button"
          onClick={() => router.push("/customer-v2/subscription")}
          className="rounded-xl bg-[#8D4925] px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-[#7a3f20] active:scale-95"
        >
          View My Subscriptions
        </button>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6 lg:px-8">
        <span className="material-symbols-outlined mb-4 text-5xl text-[#8D4925]/30">
          event_available
        </span>
        <p className="mb-6 text-sm text-gray-500">
          No items selected. Go back and pick your meals.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-[#8D4925] px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-[#7a3f20] active:scale-95"
        >
          Back to Menu
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 flex items-center gap-1 text-sm font-bold uppercase tracking-widest text-[#8D4925]/60 transition-colors hover:text-[#8D4925]"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Subscription Menu
        </button>
        <h1
          className="mb-2 text-4xl font-bold text-[#8D4925]"
          style={{ fontFamily: "var(--font-v2-playfair)" }}
        >
          Set Schedule
        </h1>
        <p className="text-gray-600">
          Choose when and how often you&apos;d like your meals delivered.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="space-y-8 lg:w-2/3">
          {/* Delivery Address */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-2xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                Delivery Address
              </h2>
              <button
                type="button"
                onClick={() => router.push("/customer-v2/account?section=addresses")}
                className="group flex items-center gap-1.5 text-sm font-bold text-[#8D4925] transition-colors hover:text-[#7a3f20]"
              >
                <span className="material-symbols-outlined text-base transition-transform duration-200 group-hover:scale-105">
                  add_circle
                </span>
                Add New Address
              </button>
            </div>

            {addressesLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-40 rounded-3xl" />
                <Skeleton className="h-40 rounded-3xl" />
              </div>
            ) : addressesError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {addressesError}
              </div>
            ) : filteredAddresses.length === 0 ? (
              <div className="rounded-2xl border border-orange-100 bg-white px-4 py-6 text-sm text-[#8D4925]">
                No delivery addresses for this city.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredAddresses.map((address) => {
                  const active = selectedAddressId === address.address_id;
                  return (
                    <button
                      key={address.address_id}
                      type="button"
                      onClick={() => setSelectedAddressId(address.address_id)}
                      className={`relative rounded-3xl border bg-white p-6 text-left shadow-sm transition-all ${
                        active
                          ? "border-[#8D4925] ring-2 ring-[#8D4925]/20"
                          : "border-orange-100 hover:border-[#8D4925]/40"
                      }`}
                    >
                      {active && (
                        <span className="material-symbols-outlined absolute right-4 top-4 text-[#8D4925]">
                          check_circle
                        </span>
                      )}
                      <div className="mb-2 flex items-center gap-2 text-[#8D4925]">
                        <span className="material-symbols-outlined text-base">
                          {address.address_type.toLowerCase() === "work" ? "work" : "home"}
                        </span>
                        <span className="text-sm font-bold">{address.address_type}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-600">
                        {[
                          address.house_apartment_no,
                          address.written_address,
                          address.city,
                          address.pin_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Schedule */}
          <section>
            <h2
              className="mb-5 text-2xl font-bold text-[#8D4925]"
              style={{ fontFamily: "var(--font-v2-playfair)" }}
            >
              Delivery Schedule
            </h2>

            <div className="space-y-6 overflow-hidden rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
              {/* Date range picker */}
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-widest text-[#8D4925]/60">
                  Subscription Period
                </p>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDateInput}
                  minDate={tomorrowISO()}
                  onChange={(start, end) => {
                    setStartDate(start);
                    setEndDateInput(end);
                    setDuration(null);
                  }}
                />
              </div>

              {/* Duration shortcuts */}
              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#8D4925]/60">
                  Duration
                </p>
                <div className="flex flex-wrap gap-3">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setDuration(opt.id as "1m" | "3m" | "6m");
                        setEndDateInput(
                          formatDate(addMonths(new Date(startDate), opt.months), "yyyy-MM-dd"),
                        );
                      }}
                      className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
                        duration === opt.id
                          ? "bg-[#8D4925] text-white shadow-md shadow-[#8D4925]/20"
                          : "border border-orange-100 text-gray-600 hover:border-[#8D4925]/40 hover:bg-orange-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery days */}
              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#8D4925]/60">
                  Delivery Days
                </p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const active = deliveryDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id)}
                        className={`h-11 w-14 rounded-2xl text-sm font-bold transition-all ${
                          active
                            ? "bg-[#1b4332] text-white shadow-sm"
                            : "border border-orange-100 text-gray-500 hover:border-[#8D4925]/30 hover:bg-orange-50"
                        }`}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
                {deliveryDays.length === 0 && (
                  <p className="mt-2 text-xs text-red-500">Select at least one delivery day.</p>
                )}
              </div>
            </div>
          </section>

          {/* Payment Method */}
          <section>
            <h2
              className="mb-5 text-2xl font-bold text-[#8D4925]"
              style={{ fontFamily: "var(--font-v2-playfair)" }}
            >
              Payment Method
            </h2>
            <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
              {PAYMENT_METHODS.map((method, index) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-center justify-between px-6 py-5 ${
                    index < PAYMENT_METHODS.length - 1 ? "border-b border-orange-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#8D4925]">
                      <span className="material-symbols-outlined">{method.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{method.label}</p>
                      <p className="text-xs font-medium text-gray-500">{method.subtitle}</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    className="h-5 w-5 border-gray-300 text-[#8D4925]"
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-6 border-t border-orange-100 pt-6 text-[11px] font-bold uppercase tracking-widest text-[#8D4925]/70">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>FSSAI Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">autorenew</span>
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">eco</span>
              <span>Plastic-Free Packaging</span>
            </div>
          </div>
        </div>

        {/* ── Right column — Summary ───────────────────────────────── */}
        <div className="lg:w-1/3">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-[2.25rem] border border-orange-100 bg-white p-6 shadow-xl shadow-[#8D4925]/5 sm:p-8">
              <h2
                className="mb-6 text-2xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                Subscription Summary
              </h2>

              {/* Items */}
              <div className="mb-6 max-h-[280px] space-y-4 overflow-y-auto pr-1 [scrollbar-color:#8D492588_transparent] [scrollbar-width:thin]">
                {items.map((item) => (
                  <div key={item.menu_item_id} className="flex gap-3">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-orange-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={item.item_name}
                        className="h-full w-full object-cover"
                        src={item.picture_url || PLACEHOLDER_IMAGE}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">
                        {item.item_name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {item.meal} · ×{item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-[#8D4925]">
                        {item.rate > 0 ? currency(item.rate * item.quantity) : "Price varies"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Schedule summary */}
              <div className="mb-5 space-y-2 rounded-2xl border border-orange-50 bg-orange-50/60 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Start date</span>
                  <span className="font-semibold text-gray-800">
                    {startDate ? formatDate(new Date(startDate), "d MMM yyyy") : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-semibold text-gray-800">
                    {DURATION_OPTIONS.find((d) => d.id === duration)?.label ?? "Custom"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">End date</span>
                  <span className="font-semibold text-gray-800">
                    {endDate ? formatDate(endDate, "d MMM yyyy") : "—"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-gray-500">Delivery days</span>
                  <span className="text-right font-semibold text-gray-800">
                    {deliveryDays.length === 0
                      ? "None selected"
                      : WEEKDAYS.filter((d) => deliveryDays.includes(d.id))
                          .map((d) => d.short)
                          .join(", ")}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-orange-100 pt-2">
                  <span className="text-gray-500">Est. deliveries</span>
                  <span className="font-bold text-[#1b4332]">{estimatedDeliveries}</span>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-2 border-t border-dashed border-orange-200 py-5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Per delivery</span>
                  <span className="font-bold text-gray-800">
                    {perDeliveryTotal > 0
                      ? `${currency(perDeliveryTotal)}${hasPriceVaryingItems ? "+" : ""}`
                      : "Price varies"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Est. deliveries</span>
                  <span className="font-bold text-gray-800">× {estimatedDeliveries}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-orange-100 pt-3 text-lg font-bold text-gray-900">
                  <span>Est. Total</span>
                  <span className="text-[#8D4925]">
                    {perDeliveryTotal > 0
                      ? `${currency(estimatedTotal)}${hasPriceVaryingItems ? "+" : ""}`
                      : "Varies"}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  placingOrder || !items.length || !selectedAddress || deliveryDays.length === 0
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8D4925] py-4 font-bold text-white shadow-lg shadow-[#8D4925]/20 transition-all hover:bg-[#7a3f20] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">autorenew</span>
                {placingOrder ? "Confirming..." : "Confirm Subscription"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
