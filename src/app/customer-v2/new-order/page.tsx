"use client";

import { format as formatDate } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";

type MealType = "breakfast" | "lunch" | "dinner" | "condiments";

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

type CartLine = {
  menu_item_id: number;
  item_id?: number | null;
  combo_id?: number | null;
  meal: MealType;
  item_name: string;
  price: number;
  quantity: number;
  available_qty: number;
  picture_url?: string | null;
};

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "condiments"];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  condiments: "Condiments",
};

const MEAL_META: Record<MealType, { calories: string; tag: string; rating: string }> = {
  breakfast: { calories: "320 kcal", tag: "High Protein", rating: "4.9" },
  lunch: { calories: "280 kcal", tag: "Light", rating: "4.7" },
  dinner: { calories: "350 kcal", tag: "Filling", rating: "4.8" },
  condiments: { calories: "120 kcal", tag: "Side", rating: "4.6" },
};

const PLACEHOLDER_IMAGE = "/images/menu/idli-sambar.jpg";
const CART_STORAGE_KEY = "customer_cart_items";
const CART_CONTEXT_KEY = "customer_cart_context";
const CART_KEEP_KEY = "kk_keep_cart";

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

const createMenuItemMap = (menuByMeal: Record<MealType, MenuItem[]>): Record<number, MenuItem> => {
  const map: Record<number, MenuItem> = {};
  MEAL_ORDER.forEach((meal) => {
    menuByMeal[meal].forEach((item) => {
      map[item.menu_item_id] = item;
    });
  });
  return map;
};

export default function CustomerV2OrderPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [hydrated, setHydrated] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
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
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast");
  const [menuView, setMenuView] = useState<"grid" | "list">("grid");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cartRestored, setCartRestored] = useState(false);
  const [showCartPreview, setShowCartPreview] = useState(false);
  const cartPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayISO = useMemo(() => formatDate(new Date(), "yyyy-MM-dd"), []);
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
        const normalizedMenu = {
          breakfast: nextMenu.breakfast ?? [],
          lunch: nextMenu.lunch ?? [],
          dinner: nextMenu.dinner ?? [],
          condiments: nextMenu.condiments ?? [],
        };
        setMenuByMeal(normalizedMenu);
        setDeliversByMeal({
          breakfast: nextDeliversBy.breakfast ?? null,
          lunch: nextDeliversBy.lunch ?? null,
          dinner: nextDeliversBy.dinner ?? null,
          condiments: nextDeliversBy.condiments ?? null,
        });

        const firstNonEmpty = MEAL_ORDER.find((meal) => normalizedMenu[meal].length > 0);
        if (firstNonEmpty) {
          setActiveMeal(firstNonEmpty);
        }
      } catch {
        if (cancelled) return;
        setMenuError("Unable to load today's menu.");
        setDeliversByMeal({ breakfast: null, lunch: null, dinner: null, condiments: null });
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todayISO, cityCode, userHasCityOverride]);

  const menuItemsMap = useMemo(() => createMenuItemMap(menuByMeal), [menuByMeal]);

  const setQuantityForItem = (menuItem: MenuItem, nextValue: number) => {
    const desired = Math.floor(nextValue);
    const clamped = Math.max(0, Math.min(desired, menuItem.available_qty));
    setQuantities((prev) => {
      if (clamped <= 0) {
        if (!(menuItem.menu_item_id in prev)) return prev;
        const next = { ...prev };
        delete next[menuItem.menu_item_id];
        return next;
      }
      if (prev[menuItem.menu_item_id] === clamped) return prev;
      return { ...prev, [menuItem.menu_item_id]: clamped };
    });
  };

  const incrementItem = (menuItem: MenuItem) => {
    const current = quantities[menuItem.menu_item_id] ?? 0;
    if (current >= menuItem.available_qty) return;
    setQuantityForItem(menuItem, current + 1);
  };

  const decrementItem = (menuItem: MenuItem) => {
    const current = quantities[menuItem.menu_item_id] ?? 0;
    if (current <= 0) return;
    setQuantityForItem(menuItem, current - 1);
  };

  const activeMealItems = menuByMeal[activeMeal] ?? [];
  const activeMealDeliveryText = useMemo(() => {
    const deliveredBy = deliversByMeal[activeMeal];
    if (deliveredBy) return `Delivers by ${deliveredBy}`;
    if (activeMeal === "condiments") return "Delivery time varies";
    return "Delivers by schedule";
  }, [activeMeal, deliversByMeal]);

  const cartSelection = useMemo<CartLine[]>(() => {
    const lines: CartLine[] = [];
    Object.entries(quantities).forEach(([key, rawValue]) => {
      const quantity = Number(rawValue) || 0;
      if (quantity <= 0) return;
      const menuItemId = Number(key);
      const menuItem = menuItemsMap[menuItemId];
      if (!menuItem) return;
      lines.push({
        menu_item_id: menuItemId,
        item_id: menuItem.item_id,
        combo_id: menuItem.combo_id,
        meal: menuItem.meal,
        item_name: menuItem.item_name,
        price: menuItem.rate,
        quantity: Math.min(quantity, menuItem.available_qty),
        available_qty: menuItem.available_qty,
        picture_url: menuItem.picture_url ?? null,
      });
    });
    return lines;
  }, [quantities, menuItemsMap]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        setCartRestored(true);
        return;
      }
      const saved = JSON.parse(raw) as CartLine[];
      if (!Array.isArray(saved) || !saved.length) {
        setCartRestored(true);
        return;
      }
      const restored: Record<number, number> = {};
      saved.forEach((line) => {
        const qty = Number(line.quantity) || 0;
        if (!line.menu_item_id || qty <= 0) return;
        restored[line.menu_item_id] = Math.floor(qty);
      });
      if (Object.keys(restored).length) {
        setQuantities(restored);
      }
    } catch {
      // no-op
    } finally {
      setCartRestored(true);
    }
  }, []);

  const cartTotals = useMemo(() => {
    const totalQuantity = cartSelection.reduce((sum, line) => sum + line.quantity, 0);
    const totalPrice = cartSelection.reduce((sum, line) => sum + line.quantity * line.price, 0);
    return { totalQuantity, totalPrice };
  }, [cartSelection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!cartRestored) return;
    if (!cartSelection.length) {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_CONTEXT_KEY);
      return;
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartSelection));
    localStorage.setItem(
      CART_CONTEXT_KEY,
      JSON.stringify({
        order_date: todayISO,
        address_id: 0,
        order_type: "one_time",
      }),
    );
  }, [cartRestored, cartSelection, todayISO]);

  useEffect(() => {
    return () => {
      if (cartPreviewTimerRef.current) {
        clearTimeout(cartPreviewTimerRef.current);
      }
    };
  }, []);

  const handleCartHoverStart = () => {
    if (cartPreviewTimerRef.current) {
      clearTimeout(cartPreviewTimerRef.current);
    }
    cartPreviewTimerRef.current = setTimeout(() => {
      setShowCartPreview(true);
    }, 1000);
  };

  const handleCartHoverEnd = () => {
    if (cartPreviewTimerRef.current) {
      clearTimeout(cartPreviewTimerRef.current);
      cartPreviewTimerRef.current = null;
    }
    setShowCartPreview(false);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1
            className="mb-2 text-4xl font-bold text-[#8D4925] md:text-5xl"
            style={{ fontFamily: "var(--font-v2-playfair)" }}
          >
            Daily Menu Explorer
          </h1>
          <p className="max-w-xl text-lg text-gray-600">
            Freshly prepared authentic South-Indian meals delivered to your doorstep. Choose your
            favorites for the day.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-full border border-orange-50 bg-white p-1.5 shadow-sm">
          {MEAL_ORDER.map((meal) => (
            <button
              key={meal}
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

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-orange-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-medium">
            <span className="material-symbols-outlined text-sm text-[#8D4925]">schedule</span>
            {menuLoading ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <span>{activeMealDeliveryText}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">View:</span>
          <button
            onClick={() => setMenuView("grid")}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-100 leading-none ${menuView === "grid" ? "bg-white text-[#8D4925]" : "text-gray-400 hover:bg-white"}`}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">grid_view</span>
          </button>
          <button
            onClick={() => setMenuView("list")}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-100 leading-none ${menuView === "list" ? "bg-white text-[#8D4925]" : "text-gray-400 hover:bg-white"}`}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">view_list</span>
          </button>
        </div>
      </div>

      {menuLoading ? (
        menuView === "grid" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`menu-grid-skeleton-${index}`}
                className="overflow-hidden rounded-xl border border-orange-50 bg-white shadow-sm"
              >
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-10 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`menu-list-skeleton-${index}`}
                className="flex gap-4 rounded-xl border border-orange-50 bg-white p-4 shadow-sm"
              >
                <Skeleton className="h-24 w-24 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-9 w-20 rounded-full" />
                  </div>
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
        <div className="rounded-2xl border border-orange-100 bg-white px-4 py-10 text-center text-sm text-[#8D4925]">
          No items available for {MEAL_LABELS[activeMeal]} right now.
        </div>
      ) : menuView === "grid" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {activeMealItems.map((item) => {
            const qty = quantities[item.menu_item_id] ?? 0;
            const soldOut = item.available_qty <= 0;
            const meta = MEAL_META[item.meal];
            return (
              <div
                key={item.menu_item_id}
                className="group overflow-hidden rounded-xl border border-orange-50 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    alt={item.item_name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    src={item.picture_url || PLACEHOLDER_IMAGE}
                  />
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3
                      className="text-base font-bold transition-colors group-hover:text-[#8D4925]"
                      style={{ fontFamily: "var(--font-v2-playfair)" }}
                    >
                      {item.item_name}
                    </h3>
                    <div className="flex items-center gap-1 text-orange-400">
                      <span className="material-symbols-outlined text-sm">star</span>
                      <span className="text-xs font-bold text-gray-600">{meta.rating}</span>
                    </div>
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs text-gray-500">
                    {item.description || "Freshly prepared kitchen special."}
                  </p>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#8D4925]">
                        local_fire_department
                      </span>
                      <span className="text-xs font-medium text-gray-600">{meta.calories}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#8D4925]">
                        fiber_manual_record
                      </span>
                      <span className="text-xs font-medium text-gray-600">{meta.tag}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-orange-50 pt-3">
                    <span className="text-lg font-bold text-[#8D4925]">{currency(item.rate)}</span>
                    <div className="ml-auto">
                      {soldOut ? (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                          Sold out
                        </span>
                      ) : qty > 0 ? (
                        <div className="inline-flex h-10 min-w-[120px] items-center overflow-hidden rounded-full bg-[#8D4925] text-white">
                          <button
                            onClick={() => decrementItem(item)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="flex flex-1 items-center justify-center px-2 text-sm font-bold">
                            {qty}
                          </span>
                          <button
                            onClick={() => incrementItem(item)}
                            disabled={qty >= item.available_qty}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold disabled:opacity-50"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
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
            const soldOut = item.available_qty <= 0;
            const meta = MEAL_META[item.meal];
            return (
              <div
                key={item.menu_item_id}
                className="flex gap-4 rounded-xl border border-orange-50 bg-white p-4 shadow-sm"
              >
                <img
                  alt={item.item_name}
                  className="h-24 w-24 rounded-lg object-cover"
                  src={item.picture_url || PLACEHOLDER_IMAGE}
                />
                <div className="flex flex-1 flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="text-lg font-bold text-[#8D4925]"
                        style={{ fontFamily: "var(--font-v2-playfair)" }}
                      >
                        {item.item_name}
                      </h3>
                      <div className="flex items-center gap-1 text-orange-400">
                        <span className="material-symbols-outlined text-sm">star</span>
                        <span className="text-xs font-bold text-gray-600">{meta.rating}</span>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm text-gray-500">
                      {item.description || "Freshly prepared kitchen special."}
                    </p>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[#8D4925]">
                          local_fire_department
                        </span>
                        <span className="text-xs font-medium text-gray-600">{meta.calories}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[#8D4925]">
                          fiber_manual_record
                        </span>
                        <span className="text-xs font-medium text-gray-600">{meta.tag}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-orange-50 pt-3">
                    <span className="whitespace-nowrap text-lg font-bold text-[#8D4925]">
                      {currency(item.rate)}
                    </span>
                    <div className="ml-auto">
                      {soldOut ? (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                          Sold out
                        </span>
                      ) : qty > 0 ? (
                        <div className="inline-flex h-9 min-w-[108px] items-center overflow-hidden rounded-full bg-[#8D4925] text-white">
                          <button
                            onClick={() => decrementItem(item)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="flex flex-1 items-center justify-center px-2 text-sm font-bold">
                            {qty}
                          </span>
                          <button
                            onClick={() => incrementItem(item)}
                            disabled={qty >= item.available_qty}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold disabled:opacity-50"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => incrementItem(item)}
                          className="inline-flex h-9 min-w-[108px] items-center justify-center rounded-full bg-[#8D4925] px-5 text-sm font-bold text-white shadow-md shadow-[#8D4925]/20 transition-all hover:bg-[#8D4925]/90"
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
      )}

      {cartTotals.totalQuantity > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform md:bottom-10">
          <div
            className="relative"
            onMouseEnter={handleCartHoverStart}
            onMouseLeave={handleCartHoverEnd}
          >
            <div
              className={`absolute bottom-[calc(100%+14px)] left-1/2 hidden w-80 -translate-x-1/2 overflow-hidden rounded-[12px] border border-orange-100 bg-white text-[#114232] shadow-2xl transition-all duration-300 md:block ${
                showCartPreview
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-2 opacity-0"
              }`}
            >
              <div className="flex items-center justify-between border-b border-orange-50 px-4 py-3">
                <h4 className="text-sm font-bold text-gray-900">Your Selection</h4>
                <span className="text-xs text-gray-500">
                  {cartTotals.totalQuantity} Item{cartTotals.totalQuantity === 1 ? "" : "s"}
                </span>
              </div>

              <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3 pr-5 [scrollbar-color:#8D492588_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8D492544] [&::-webkit-scrollbar-track]:bg-transparent">
                {cartSelection.slice(0, 5).map((line) => (
                  <div
                    key={`${line.meal}-${line.menu_item_id}`}
                    className="flex items-center gap-3"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        alt={line.item_name}
                        className="h-full w-full object-cover"
                        src={line.picture_url || PLACEHOLDER_IMAGE}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-800">{line.item_name}</p>
                      <p className="text-xs font-semibold text-[#8D4925]">{currency(line.price)}</p>
                    </div>
                    <span className="inline-flex items-center rounded-lg bg-orange-50 px-2.5 py-1 text-sm font-bold text-gray-800">
                      x{line.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-orange-100 bg-orange-50/60 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Subtotal</span>
                  <span className="text-lg font-bold text-gray-900">
                    {currency(cartTotals.totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem(CART_KEEP_KEY, "1");
                }
                router.push("/customer-v2/cart");
              }}
              className="flex items-center gap-3 rounded-full border-2 border-white/20 bg-[#114232] px-6 py-4 text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined">shopping_basket</span>
              <span className="font-bold">
                {cartTotals.totalQuantity} Item{cartTotals.totalQuantity === 1 ? "" : "s"} •{" "}
                {currency(cartTotals.totalPrice)}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
