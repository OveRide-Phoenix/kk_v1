"use client";

import { addDays, format as formatDate, isSameMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { OrderStatusPill } from "@/components/order-status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeCityCode } from "@/config/cities";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { http, readJsonResponse } from "@/lib/http";
import { useAuthStore } from "@/store/store";

type OrderItem = {
  item_name: string;
  quantity: number;
  price: number;
  meal_type?: string | null;
};

type OrderSummary = {
  order_id: number;
  created_at: string | null;
  order_date?: string | null;
  total_price: number;
  status: string;
  payment_status?: string;
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

type AddressEntry = {
  address_id: number;
  address_type: string;
  written_address: string;
  city: string;
  city_code?: string;
  pin_code: string;
  is_default: boolean;
};

type PauseWindow = {
  pause_id: number;
  customer_id: number;
  city_code: string;
  meal_type: string | null;
  start_date: string;
  end_date: string;
  reason?: string | null;
  is_active: boolean;
};

type ApiMessage = {
  detail?: string;
};

const PAYMENT_METHODS = [
  { id: "UPI", label: "UPI", icon: "payments" },
  { id: "Card", label: "Card", icon: "credit_card" },
  { id: "Cash", label: "Cash", icon: "local_atm" },
];

const MEAL_FILTERS = [
  { value: "all", label: "All meals" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

const PAUSE_DURATIONS = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
];

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const readableDate = (value: string | null) => {
  if (!value) return "Scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date, "EEE, d MMM yyyy");
};

const planStartValue = (plan: OrderSummary) => plan.order_date ?? plan.created_at;

const inputDate = (date: Date) => formatDate(date, "yyyy-MM-dd");

const friendlyDate = (date: Date) => formatDate(date, "EEE, d MMM");

const isCancelled = (status: string) => status.trim().toLowerCase() === "cancelled";

const mealLabel = (meal: string) => meal.charAt(0).toUpperCase() + meal.slice(1);

const planMealLabel = (plan: OrderSummary) => {
  const meals = Array.from(
    new Set(
      plan.items
        .map((item) => item.item_name)
        .filter(Boolean)
        .slice(0, 2),
    ),
  );
  return meals.length ? meals.join(", ") : "Subscription meal";
};

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [pauses, setPauses] = useState<PauseWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [actionMode, setActionMode] = useState<"pause" | "edit" | "cancel">("pause");

  const [pauseDays, setPauseDays] = useState(3);
  const [pauseMeal, setPauseMeal] = useState("all");
  const [pauseReason, setPauseReason] = useState("");
  const [editAddressId, setEditAddressId] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("UPI");

  useEffect(() => {
    setHydrated(true);
  }, []);

  useHydrateAuthUser({ enabled: hydrated });

  const customerId = hydrated ? user?.customer_id : undefined;
  const cityCode = useMemo(() => {
    const rawUser = typeof user?.city_code === "string" ? user.city_code : "";
    if (typeof window === "undefined") return normalizeCityCode(rawUser);
    const persisted = localStorage.getItem("admin_city_code") || "";
    return normalizeCityCode(rawUser || persisted);
  }, [user?.city_code]);

  const activePlans = useMemo(
    () =>
      orders
        .filter((order) => (order.order_type ?? "").toLowerCase() === "subscription")
        .filter((order) => !isCancelled(order.status))
        .sort((a, b) => {
          const leftValue = planStartValue(a);
          const rightValue = planStartValue(b);
          const left = leftValue ? new Date(leftValue).getTime() : 0;
          const right = rightValue ? new Date(rightValue).getTime() : 0;
          return right - left;
        }),
    [orders],
  );

  const selectedPlan = useMemo(() => {
    if (!activePlans.length) return null;
    return activePlans.find((plan) => plan.order_id === selectedOrderId) ?? activePlans[0];
  }, [activePlans, selectedOrderId]);

  const selectedPlanMeals = useMemo(() => {
    if (!selectedPlan) return [];
    return Array.from(
      new Set(
        selectedPlan.items
          .map((item) => item.meal_type?.trim().toLowerCase())
          .filter((meal): meal is string => Boolean(meal)),
      ),
    );
  }, [selectedPlan]);

  const pauseStartDate = useMemo(() => addDays(new Date(), 1), []);
  const pauseEndDate = useMemo(
    () => addDays(pauseStartDate, pauseDays - 1),
    [pauseDays, pauseStartDate],
  );
  const resumeDate = useMemo(() => addDays(pauseEndDate, 1), [pauseEndDate]);
  const pauseStart = inputDate(pauseStartDate);
  const pauseEnd = inputDate(pauseEndDate);

  const activePauses = useMemo(
    () => pauses.filter((pause) => pause.is_active),
    [pauses],
  );

  const monthPlans = useMemo(() => {
    const today = new Date();
    return activePlans.filter((plan) => {
      const startValue = planStartValue(plan);
      if (!startValue) return false;
      const start = new Date(startValue);
      return !Number.isNaN(start.getTime()) && isSameMonth(start, today);
    });
  }, [activePlans]);

  const loadData = async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const pauseQuery = new URLSearchParams({
        city_code: cityCode,
        customer_id: String(customerId),
        include_inactive: "true",
      });
      const [ordersRes, addressesRes, pausesRes] = await Promise.all([
        http.get(`/api/customers/${customerId}/orders?limit=200`),
        http.get(`/api/customers/${customerId}/addresses`),
        http.get(`/api/subscription-pauses?${pauseQuery.toString()}`),
      ]);
      if (!ordersRes.ok) throw new Error("Unable to load subscriptions.");
      if (!addressesRes.ok) throw new Error("Unable to load addresses.");
      if (!pausesRes.ok) throw new Error("Unable to load pause history.");

      const [ordersData, addressesData, pausesData] = await Promise.all([
        ordersRes.json() as Promise<OrderSummary[]>,
        addressesRes.json() as Promise<AddressEntry[]>,
        pausesRes.json() as Promise<PauseWindow[]>,
      ]);
      setOrders(
        ordersData.map((order) => ({
          ...order,
          order_type: order.order_type ?? "one_time",
          items: Array.isArray(order.items) ? order.items : [],
        })),
      );
      setAddresses(addressesData);
      setPauses(pausesData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, cityCode]);

  useEffect(() => {
    if (!selectedPlan) return;
    const matchingAddress = addresses.find((address) => {
      const planLine = selectedPlan.address?.line ?? "";
      return address.written_address === planLine;
    });
    setEditAddressId(String(matchingAddress?.address_id ?? addresses[0]?.address_id ?? ""));
    setEditPaymentMethod(selectedPlan.payment_method || "UPI");
    setPauseMeal(selectedPlanMeals.length === 1 ? selectedPlanMeals[0] : "all");
  }, [addresses, selectedPlan, selectedPlanMeals]);

  const runAction = async (action: () => Promise<void>, success: string) => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await action();
      setSuccessMessage(success);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async () => {
    if (!customerId) throw new Error("Please sign in again.");
    const response = await http.post("/api/subscription-pauses", {
      customer_id: customerId,
      city_code: cityCode,
      start_date: pauseStart,
      end_date: pauseEnd,
      meal_type: pauseMeal === "all" ? null : pauseMeal,
      reason: pauseReason.trim() || null,
    });
    const data = await readJsonResponse<ApiMessage>(response);
    if (!response.ok) throw new Error(data.detail || "Unable to pause subscription.");
    setPauseReason("");
  };

  const handleResumePause = async (pauseId: number) => {
    await runAction(async () => {
      const response = await http.patch(`/api/subscription-pauses/${pauseId}/resume`);
      const data = await readJsonResponse<ApiMessage>(response);
      if (!response.ok) throw new Error(data.detail || "Unable to resume subscription.");
    }, "Pause removed. Your subscription is active for those dates.");
  };

  const handleEdit = async () => {
    if (!customerId || !selectedPlan) throw new Error("Choose a plan first.");
    const response = await http.patch(
      `/api/customers/${customerId}/subscription-orders/${selectedPlan.order_id}`,
      {
        address_id: editAddressId ? Number(editAddressId) : null,
        payment_method: editPaymentMethod,
      },
    );
    const data = await readJsonResponse<ApiMessage>(response);
    if (!response.ok) throw new Error(data.detail || "Unable to update subscription.");
  };

  const handleCancel = async () => {
    if (!customerId || !selectedPlan) throw new Error("Choose a plan first.");
    const response = await http.patch(
      `/api/customers/${customerId}/subscription-orders/${selectedPlan.order_id}/cancel`,
    );
    const data = await readJsonResponse<ApiMessage>(response);
    if (!response.ok) throw new Error(data.detail || "Unable to cancel subscription.");
  };

  const signedOut = hydrated && !customerId;

  return (
    <main className="min-h-[calc(100vh-6rem)] bg-[#FDFAF1]">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-[#8D4925] transition-colors hover:bg-orange-50"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8D4925]/60">
                Subscriptions
              </p>
              <h1
                className="mt-1 text-3xl font-bold text-[#8D4925] sm:text-4xl"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                Manage your meal plan
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Pause deliveries, change payment or address, cancel a plan, or add another meal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/customer-v2/subscription/new-sub")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8D4925] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#7a3f20]"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add meal
          </button>
        </div>

        {signedOut ? (
          <div className="rounded-2xl border border-orange-100 bg-white p-8 text-center">
            <p className="text-sm text-[#8D4925]">Please sign in to manage plans.</p>
          </div>
        ) : loading ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
            <Skeleton className="h-[520px] rounded-2xl" />
            <Skeleton className="h-[520px] rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.28fr)_minmax(360px,0.72fr)]">
            <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl bg-orange-50 p-2">
                <div className="rounded-lg bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D4925]/60">
                    Active
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {activePlans.length}
                  </p>
                </div>
                <div className="rounded-lg px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D4925]/60">
                    This month
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {monthPlans.length}
                  </p>
                </div>
                <div className="rounded-lg px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8D4925]/60">
                    Paused
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {activePauses.length}
                  </p>
                </div>
              </div>

              {errorMessage ? (
                <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}
              {successMessage ? (
                <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </p>
              ) : null}

              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Plans</h2>
                <button
                  type="button"
                  onClick={loadData}
                  className="text-sm font-semibold text-[#8D4925] hover:text-[#7a3f20]"
                >
                  Refresh
                </button>
              </div>

              {activePlans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-100 bg-[#FDFAF1] px-6 py-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-[#8D4925]/30">
                    eco
                  </span>
                  <h3
                    className="mt-3 text-xl font-bold text-[#8D4925]"
                    style={{ fontFamily: "var(--font-v2-playfair)" }}
                  >
                    No active subscriptions
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-600">
                    Start with breakfast, lunch, or dinner. Your active plans will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activePlans.map((plan) => {
                    const selected = selectedPlan?.order_id === plan.order_id;
                    return (
                      <button
                        type="button"
                        key={plan.order_id}
                        onClick={() => setSelectedOrderId(plan.order_id)}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${
                          selected
                            ? "border-orange-200 bg-orange-50"
                            : "border-orange-100 bg-white hover:bg-orange-50"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-gray-900">
                                #{plan.order_id}
                              </p>
                              <OrderStatusPill status={plan.status} />
                            </div>
                            <p className="mt-2 text-sm font-semibold text-[#8D4925]">
                              {planMealLabel(plan)}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              Started {readableDate(planStartValue(plan))}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {currency(plan.total_price)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {plan.payment_method}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {plan.items.slice(0, 4).map((item, index) => (
                            <span
                              key={`${plan.order_id}-${item.item_name}-${index}`}
                              className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-[#8D4925]"
                            >
                              {item.item_name} x {item.quantity}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8D4925]/60">
                    Manage
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-gray-900">
                    {selectedPlan ? `Plan #${selectedPlan.order_id}` : "Choose a plan"}
                  </h2>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-orange-50 p-1">
                  {(["pause", "edit", "cancel"] as const).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setActionMode(mode)}
                      disabled={!selectedPlan}
                      className={`h-9 rounded-lg text-sm font-bold capitalize transition-colors ${
                        actionMode === mode
                          ? "bg-white text-[#8D4925] shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {!selectedPlan ? (
                  <p className="text-sm leading-6 text-gray-600">
                    Select an active subscription to pause, edit, or cancel it.
                  </p>
                ) : actionMode === "pause" ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-orange-100 bg-[#FDFAF1] p-4">
                      <p className="text-sm font-bold text-gray-900">How pause works</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Pause applies to upcoming deliveries only. Choose how long to skip meals;
                        we resume automatically after the pause ends.
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-900">Duration</p>
                      <div className="grid grid-cols-2 gap-2">
                        {PAUSE_DURATIONS.map((duration) => (
                          <button
                            type="button"
                            key={duration.days}
                            onClick={() => setPauseDays(duration.days)}
                            className={`h-11 rounded-xl border text-sm font-bold transition-colors ${
                              pauseDays === duration.days
                                ? "border-orange-200 bg-orange-50 text-[#8D4925]"
                                : "border-orange-100 bg-white text-gray-600 hover:bg-orange-50"
                            }`}
                          >
                            {duration.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-orange-50 p-2">
                      <div className="rounded-lg bg-white px-3 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8D4925]/60">
                          Paused through
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {friendlyDate(pauseEndDate)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8D4925]/60">
                          Resumes
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {friendlyDate(resumeDate)}
                        </p>
                      </div>
                    </div>

                    <label className="space-y-1.5 text-sm font-semibold text-gray-900">
                      Applies to
                      <select
                        value={pauseMeal}
                        onChange={(event) => setPauseMeal(event.target.value)}
                        className="h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-normal"
                      >
                        {MEAL_FILTERS.filter(
                          (meal) =>
                            meal.value === "all" ||
                            selectedPlanMeals.length === 0 ||
                            selectedPlanMeals.includes(meal.value),
                        ).map((meal) => (
                          <option key={meal.value} value={meal.value}>
                            {meal.value === "all"
                              ? "All active subscription meals"
                              : `${meal.label} only`}
                          </option>
                        ))}
                      </select>
                      {selectedPlanMeals.length > 0 ? (
                        <span className="block text-xs font-normal text-gray-500">
                          Selected plan contains {selectedPlanMeals.map(mealLabel).join(", ")}.
                        </span>
                      ) : null}
                    </label>
                    <label className="space-y-1.5 text-sm font-semibold text-gray-900">
                      Note
                      <textarea
                        value={pauseReason}
                        onChange={(event) => setPauseReason(event.target.value)}
                        rows={3}
                        placeholder="Travel, family function, or anything we should know"
                        className="w-full resize-none rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm font-normal"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        runAction(
                          handlePause,
                          `Pause scheduled. Deliveries resume on ${friendlyDate(resumeDate)}.`,
                        )
                      }
                      className="h-11 w-full rounded-xl bg-[#8D4925] text-sm font-bold text-white transition-colors hover:bg-[#7a3f20] disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Schedule pause"}
                    </button>
                  </div>
                ) : actionMode === "edit" ? (
                  <div className="space-y-4">
                    <label className="space-y-1.5 text-sm font-semibold text-gray-900">
                      Delivery address
                      <select
                        value={editAddressId}
                        onChange={(event) => setEditAddressId(event.target.value)}
                        className="h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-normal"
                      >
                        {addresses.map((address) => (
                          <option key={address.address_id} value={address.address_id}>
                            {address.address_type}: {address.written_address}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-900">
                        Payment
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            type="button"
                            key={method.id}
                            onClick={() => setEditPaymentMethod(method.id)}
                            className={`rounded-xl border px-2 py-3 text-center text-xs font-bold transition-colors ${
                              editPaymentMethod === method.id
                                ? "border-orange-200 bg-orange-50 text-[#8D4925]"
                                : "border-orange-100 text-gray-600"
                            }`}
                          >
                            <span className="material-symbols-outlined mb-1 block text-lg">
                              {method.icon}
                            </span>
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving || !editAddressId}
                      onClick={() => runAction(handleEdit, "Plan updated.")}
                      className="h-11 w-full rounded-xl bg-[#8D4925] text-sm font-bold text-white transition-colors hover:bg-[#7a3f20] disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                      <p className="text-sm font-bold text-red-700">
                        Cancel this subscription?
                      </p>
                      <p className="mt-1 text-sm leading-6 text-red-700/80">
                        This stops the selected plan. Already delivered meals stay in your history.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => runAction(handleCancel, "Subscription cancelled.")}
                      className="h-11 w-full rounded-xl bg-red-600 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                    >
                      {saving ? "Cancelling..." : "Cancel subscription"}
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8D4925]/60">
                      Pause history
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-gray-900">
                      Delivery breaks
                    </h2>
                  </div>
                </div>
                {pauses.length === 0 ? (
                  <p className="text-sm leading-6 text-gray-600">
                    No pauses yet. Add one before travel or busy weeks.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pauses.slice(0, 5).map((pause) => (
                      <div
                        key={pause.pause_id}
                        className="rounded-xl border border-orange-100 bg-[#FDFAF1] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {pause.start_date} to {pause.end_date}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-600">
                              {pause.meal_type ? pause.meal_type : "All meals"}
                              {pause.reason ? `, ${pause.reason}` : ""}
                            </p>
                          </div>
                          {pause.is_active ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleResumePause(pause.pause_id)}
                              className="text-xs font-bold text-[#8D4925] hover:text-[#7a3f20]"
                            >
                              Resume
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-gray-400">
                              Ended
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
