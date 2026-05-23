"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";

type MealType = "breakfast" | "lunch" | "dinner";

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
  component_type_id?: number | null;
  component_type_name?: string | null;
  is_default?: boolean;
};

type MenuApiResponse = {
  is_released?: boolean;
  items?: MenuApiItem[];
};

type SubMenuItem = {
  menu_item_id: number;
  item_id?: number | null;
  combo_id?: number | null;
  component_type_id?: number | null;
  component_type_name?: string | null;
  item_name: string;
  meal: MealType;
  rate: number;
  available_qty: number;
  description: string;
  picture_url: string | null;
};

type SelectionLine = {
  menu_item_id: number;
  item_name: string;
  quantity: number;
  rate: number;
};

const MEAL_OPTIONS: MealType[] = ["breakfast", "lunch", "dinner"];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
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

export default function NewSubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const [hydrated, setHydrated] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuByMeal, setMenuByMeal] = useState<Record<MealType, SubMenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
  });

  const mealParam = searchParams.get("meal") as MealType | null;
  const [activeMeal, setActiveMeal] = useState<MealType>(
    mealParam && MEAL_OPTIONS.includes(mealParam) ? mealParam : "breakfast",
  );
  const [menuView, setMenuView] = useState<"grid" | "list">("grid");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [showSelectionPreview, setShowSelectionPreview] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useHydrateAuthUser({ enabled: hydrated });

  const cityCode = useMemo(() => {
    const raw = typeof user?.city_code === "string" ? user.city_code.trim().toUpperCase() : "";
    return raw.length ? raw : "MYS";
  }, [user?.city_code]);
  const userHasCityOverride = Boolean(user?.city_code && user.city_code.trim());

  useEffect(() => {
    let cancelled = false;
    setMenuLoading(true);
    setMenuError(null);
    (async () => {
      try {
        const nextMenu: Partial<Record<MealType, SubMenuItem[]>> = {};

        await Promise.all(
          MEAL_OPTIONS.map(async (meal) => {
            const params = new URLSearchParams({
              bld_type: meal,
              menu_type: "SUBSCRIPTION",
              period_type: "subscription",
              include_combos: "1",
            });
            if (userHasCityOverride) {
              params.set("city_code", cityCode);
            }

            const response = await http.get(`/api/menu?${params}`);
            if (response.status === 404 || !response.ok) {
              nextMenu[meal] = [];
              return;
            }

            const data = (await response.json()) as MenuApiResponse;
            const isReleased = Boolean(data.is_released);
            const items = (data.items ?? []) as MenuApiItem[];

            nextMenu[meal] = isReleased
              ? items.map((item) => ({
                  menu_item_id: item.menu_item_id ?? 0,
                  item_id: item.item_id ?? null,
                  combo_id: item.combo_id ?? null,
                  component_type_id: item.component_type_id ?? null,
                  component_type_name: item.component_type_name ?? null,
                  item_name: item.item_name ?? item.name ?? "Item",
                  meal,
                  rate: item.rate ?? item.price ?? 0,
                  available_qty: normalizeQty(item.available_qty) || 999,
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
        });

        if (!mealParam || !MEAL_OPTIONS.includes(mealParam)) {
          const firstNonEmpty = MEAL_OPTIONS.find((m) => (nextMenu[m]?.length ?? 0) > 0);
          if (firstNonEmpty) setActiveMeal(firstNonEmpty);
        }
      } catch {
        if (cancelled) return;
        setMenuError("Unable to load the subscription menu.");
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityCode, userHasCityOverride, mealParam]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const activeMealItems = menuByMeal[activeMeal] ?? [];

  const allMenuItems = useMemo<Record<number, SubMenuItem>>(() => {
    const map: Record<number, SubMenuItem> = {};
    MEAL_OPTIONS.forEach((meal) => {
      menuByMeal[meal].forEach((item) => {
        map[item.menu_item_id] = item;
      });
    });
    return map;
  }, [menuByMeal]);

  const incrementItem = (item: SubMenuItem) => {
    const current = quantities[item.menu_item_id] ?? 0;
    if (current >= item.available_qty) return;
    setQuantities((prev) => ({ ...prev, [item.menu_item_id]: current + 1 }));
  };

  const decrementItem = (item: SubMenuItem) => {
    const current = quantities[item.menu_item_id] ?? 0;
    if (current <= 0) return;
    setQuantities((prev) => {
      const next = { ...prev, [item.menu_item_id]: current - 1 };
      if (next[item.menu_item_id] === 0) delete next[item.menu_item_id];
      return next;
    });
  };

  const selectionLines = useMemo<SelectionLine[]>(() => {
    return Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const menuItem = allMenuItems[Number(key)];
        if (!menuItem) return null;
        return {
          menu_item_id: Number(key),
          item_name: menuItem.item_name,
          quantity: qty,
          rate: menuItem.rate,
        };
      })
      .filter((l): l is SelectionLine => l !== null);
  }, [quantities, allMenuItems]);

  const totalItems = selectionLines.reduce((s, l) => s + l.quantity, 0);

  const handlePreviewEnter = () => {
    previewTimerRef.current = setTimeout(() => setShowSelectionPreview(true), 800);
  };

  const handlePreviewLeave = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setShowSelectionPreview(false);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-3 flex items-center gap-1 text-sm font-bold uppercase tracking-widest text-[#8D4925]/60 transition-colors hover:text-[#8D4925]"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Subscriptions
          </button>
          <h1
            className="mb-2 text-4xl font-bold text-[#8D4925] md:text-5xl"
            style={{ fontFamily: "var(--font-v2-playfair)" }}
          >
            Subscription Menu
          </h1>
          <p className="max-w-xl text-lg text-gray-600">
            Choose what you&apos;d like to receive each day. We resolve the exact dish from the
            daily menu.
          </p>
        </div>

        {/* Meal tabs */}
        <div className="flex flex-wrap items-center gap-3 rounded-full border border-orange-50 bg-white p-1.5 shadow-sm">
          {MEAL_OPTIONS.map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() => setActiveMeal(meal)}
              className={`rounded-full px-6 py-2.5 font-semibold transition-all ${
                activeMeal === meal
                  ? "bg-[#8D4925] text-white shadow-md shadow-[#8D4925]/20"
                  : "text-gray-500 hover:bg-orange-50"
              }`}
            >
              {MEAL_LABELS[meal]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sub-header row ────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-orange-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-medium">
            <span className="material-symbols-outlined text-sm text-[#8D4925]">autorenew</span>
            <span>Recurring · resolved daily from the menu</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">View:</span>
          <button
            type="button"
            onClick={() => setMenuView("grid")}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-100 leading-none ${menuView === "grid" ? "bg-white text-[#8D4925]" : "text-gray-400 hover:bg-white"}`}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">grid_view</span>
          </button>
          <button
            type="button"
            onClick={() => setMenuView("list")}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-100 leading-none ${menuView === "list" ? "bg-white text-[#8D4925]" : "text-gray-400 hover:bg-white"}`}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">view_list</span>
          </button>
        </div>
      </div>

      {/* ── Menu items ────────────────────────────────────────────── */}
      {menuLoading ? (
        menuView === "grid" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`sub-skel-${i}`}
                className="overflow-hidden rounded-xl border border-orange-50 bg-white shadow-sm"
              >
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-10 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`sub-list-skel-${i}`}
                className="flex gap-4 rounded-xl border border-orange-50 bg-white p-4 shadow-sm"
              >
                <Skeleton className="h-24 w-24 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : menuError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {menuError}
        </div>
      ) : activeMealItems.length === 0 ? (
        <div className="rounded-2xl border border-orange-100 bg-white px-4 py-10 text-center shadow-sm">
          <span className="material-symbols-outlined mb-3 block text-4xl text-[#8D4925]/30">
            menu_book
          </span>
          <p className="text-sm text-[#8D4925]">
            No subscription items available for {MEAL_LABELS[activeMeal]} yet.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            The admin hasn&apos;t released the subscription menu for this meal.
          </p>
        </div>
      ) : menuView === "grid" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {activeMealItems.map((item) => {
            const qty = quantities[item.menu_item_id] ?? 0;
            const isItemGroup = Boolean(item.component_type_id) && !item.item_id && !item.combo_id;
            return (
              <div
                key={item.menu_item_id}
                className="group overflow-hidden rounded-xl border border-orange-50 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-44 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={item.item_name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    src={item.picture_url || PLACEHOLDER_IMAGE}
                  />
                  {isItemGroup && (
                    <span className="absolute left-2 top-2 rounded-full bg-[#1b4332] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Changes daily
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-1">
                    <h3
                      className="text-base font-bold text-gray-900 transition-colors group-hover:text-[#8D4925]"
                      style={{ fontFamily: "var(--font-v2-playfair)" }}
                    >
                      {item.item_name}
                    </h3>
                    {isItemGroup && (
                      <p className="text-xs font-semibold text-[#1b4332]">
                        Resolved from today&apos;s menu
                      </p>
                    )}
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs text-gray-500">
                    {item.description || "Freshly prepared kitchen special, resolved daily."}
                  </p>
                  <div className="flex items-center justify-between border-t border-orange-50 pt-3">
                    {isItemGroup && item.rate === 0 ? (
                      <span className="text-sm font-semibold text-[#1b4332]/70">Price varies</span>
                    ) : (
                      <span className="text-lg font-bold text-[#8D4925]">
                        {currency(item.rate)}
                      </span>
                    )}
                    <div className="ml-auto">
                      {qty > 0 ? (
                        <div className="inline-flex h-10 min-w-[120px] items-center overflow-hidden rounded-full bg-[#8D4925] text-white">
                          <button
                            type="button"
                            onClick={() => decrementItem(item)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold"
                            aria-label="Decrease"
                          >
                            -
                          </button>
                          <span className="flex flex-1 items-center justify-center px-2 text-sm font-bold">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => incrementItem(item)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold disabled:opacity-50"
                            aria-label="Increase"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => incrementItem(item)}
                          className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-full bg-[#8D4925] px-6 text-sm font-bold text-white shadow-md shadow-[#8D4925]/20 transition-all hover:bg-[#8D4925]/90"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {activeMealItems.map((item) => {
            const qty = quantities[item.menu_item_id] ?? 0;
            const isItemGroup = Boolean(item.component_type_id) && !item.item_id && !item.combo_id;
            return (
              <div
                key={item.menu_item_id}
                className="flex gap-4 rounded-xl border border-orange-50 bg-white p-4 shadow-sm"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={item.item_name}
                    className="h-full w-full object-cover"
                    src={item.picture_url || PLACEHOLDER_IMAGE}
                  />
                  {isItemGroup && (
                    <span className="absolute bottom-0 left-0 right-0 bg-[#1b4332]/80 py-0.5 text-center text-[9px] font-bold uppercase text-white">
                      Daily
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <h3
                          className="text-lg font-bold text-gray-900"
                          style={{ fontFamily: "var(--font-v2-playfair)" }}
                        >
                          {item.item_name}
                        </h3>
                        {isItemGroup && (
                          <p className="text-xs font-semibold text-[#1b4332]">
                            Resolved from today&apos;s menu
                          </p>
                        )}
                      </div>
                      {isItemGroup && item.rate === 0 ? (
                        <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-[#1b4332]/70">
                          Price varies
                        </span>
                      ) : (
                        <span className="shrink-0 whitespace-nowrap text-lg font-bold text-[#8D4925]">
                          {currency(item.rate)}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-gray-500">
                      {item.description || "Freshly prepared kitchen special, resolved daily."}
                    </p>
                  </div>
                  <div className="flex justify-end border-t border-orange-50 pt-3">
                    {qty > 0 ? (
                      <div className="inline-flex h-9 min-w-[108px] items-center overflow-hidden rounded-full bg-[#8D4925] text-white">
                        <button
                          type="button"
                          onClick={() => decrementItem(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold"
                          aria-label="Decrease"
                        >
                          -
                        </button>
                        <span className="flex flex-1 items-center justify-center px-2 text-sm font-bold">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => incrementItem(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => incrementItem(item)}
                        className="inline-flex h-9 min-w-[108px] items-center justify-center rounded-full bg-[#8D4925] px-5 text-sm font-bold text-white shadow-md shadow-[#8D4925]/20 transition-all hover:bg-[#8D4925]/90"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky bottom bar ─────────────────────────────────────── */}
      {totalItems > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div
            className="relative"
            onMouseEnter={handlePreviewEnter}
            onMouseLeave={handlePreviewLeave}
          >
            {/* hover preview */}
            <div
              className={`absolute bottom-[calc(100%+14px)] left-1/2 hidden w-80 -translate-x-1/2 overflow-hidden rounded-[12px] border border-orange-100 bg-white shadow-2xl transition-all duration-300 md:block ${
                showSelectionPreview
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-2 opacity-0"
              }`}
            >
              <div className="flex items-center justify-between border-b border-orange-50 px-4 py-3">
                <h4 className="text-sm font-bold text-gray-900">Your Selection</h4>
                <span className="text-xs text-gray-500">
                  {totalItems} item{totalItems === 1 ? "" : "s"}
                </span>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto px-4 py-3">
                {selectionLines.map((line) => (
                  <div
                    key={line.menu_item_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">
                      {line.item_name} × {line.quantity}
                    </span>
                    <span className="font-semibold text-[#8D4925]">
                      {currency(line.rate * line.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-orange-100 bg-orange-50/60 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Per delivery</span>
                  <span className="text-lg font-bold text-gray-900">
                    {currency(selectionLines.reduce((s, l) => s + l.rate * l.quantity, 0))}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/customer-v2/subscription/new-sub/schedule")}
              className="flex items-center gap-3 rounded-full border-2 border-white/20 bg-[#114232] px-6 py-4 text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined">event_available</span>
              <span className="font-bold">
                {totalItems} item{totalItems === 1 ? "" : "s"} · Set Schedule
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
