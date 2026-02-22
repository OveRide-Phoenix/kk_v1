"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { format as formatDate } from "date-fns";
import { ArrowLeft, ArrowRight, LayoutGrid, List, Minus, Plus, ShoppingBasket, ShoppingCart } from "lucide-react";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { LeaveCartDialog } from "@/components/mobile/customer/leave-cart-dialog";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";
import { getSupportedMeals } from "@/config/cities";
import { useAuthStore } from "@/store/store";

type MealType = "breakfast" | "lunch" | "dinner" | "condiments";

type MenuApiItem = {
  menu_item_id?: number;
  item_id?: number;
  item_name?: string;
  name?: string;
  rate?: number;
  price?: number;
  description?: string;
  picture_url?: string | null;
  available_qty?: number;
};

type MenuItem = {
  menu_item_id: number;
  item_id: number;
  item_name: string;
  meal: MealType;
  rate: number;
  available_qty: number;
  description: string;
  picture_url: string | null;
};

type CartLine = {
  menu_item_id: number;
  item_id: number;
  meal: MealType;
  item_name: string;
  price: number;
  quantity: number;
  available_qty: number;
};

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "condiments"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  condiments: "Condiments",
};

const PLACEHOLDER_IMAGE = "/images/menu/idli-sambar.jpg";
const CART_STORAGE_KEY = "customer_cart_items";
const CART_KEEP_KEY = "kk_keep_cart";

const normalizeQty = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
};

const buildAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MobileCustomerMenuPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [menuByMeal, setMenuByMeal] = useState<Record<MealType, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  });
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast");
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cartInitialized, setCartInitialized] = useState(false);
  const [menuView, setMenuView] = useState<"grid" | "list">("grid");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingLeavePath, setPendingLeavePath] = useState<string | null>(null);
  const [pendingGoBack, setPendingGoBack] = useState(false);
  const storedCartRef = useRef<CartLine[]>([]);
  const handleBack = () => {
    if (cartCount > 0) {
      setPendingGoBack(true);
      setPendingLeavePath(null);
      setLeaveDialogOpen(true);
      return;
    }
    const idx = typeof window !== "undefined" ? (window.history.state as { idx?: number } | null)?.idx : undefined;
    if (typeof idx === "number" && idx > 0) {
      router.back();
      return;
    }
    router.push("/mobile/customer/home");
  };

  const cityCode = useMemo(() => {
    const raw = typeof user?.city_code === "string" ? user.city_code.trim().toUpperCase() : "";
    return raw.length ? raw : "MYS";
  }, [user?.city_code]);
  const userHasCityOverride = Boolean(user?.city_code && user.city_code.trim());
  const todayISO = useMemo(() => formatDate(new Date(), "yyyy-MM-dd"), []);
  const availableMeals = useMemo(() => getSupportedMeals(cityCode), [cityCode]);
  const availableMealsKey = useMemo(() => availableMeals.join(","), [availableMeals]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (user || !token) return;
    (async () => {
      try {
        const response = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        setUser(await response.json());
      } catch {
        // no-op
      }
    })();
  }, [user, setUser]);

  useEffect(() => {
    let cancelled = false;
    setMenuLoading(true);
    setMenuError(null);

    (async () => {
      try {
        const headers = buildAuthHeaders();
        const nextMenu: Partial<Record<MealType, MenuItem[]>> = {};

        await Promise.all(
          MEAL_ORDER.map(async (meal) => {
            if (!availableMeals.includes(meal)) {
              nextMenu[meal] = [];
              return;
            }

            const url = new URL("http://localhost:8000/api/menu");
            url.searchParams.set("bld_type", meal);
            if (userHasCityOverride) {
              url.searchParams.set("city_code", cityCode);
            }
            if (meal === "condiments") {
              url.searchParams.set("menu_type", "CONDIMENTS");
            } else {
              url.searchParams.set("date", todayISO);
              url.searchParams.set("period_type", "one_day");
              url.searchParams.set("menu_type", "ONE_DAY");
            }

            const response = await fetch(url.toString(), { headers });
            if (response.status === 404 || !response.ok) {
              nextMenu[meal] = [];
              return;
            }

            const data = await response.json();
            const items = (data.items ?? []) as MenuApiItem[];
            const isReleased = Boolean((data as { is_released?: boolean }).is_released);
            nextMenu[meal] = isReleased
              ? items.map((item) => ({
                  menu_item_id: item.menu_item_id ?? 0,
                  item_id: item.item_id ?? 0,
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
      } catch {
        if (cancelled) return;
        setMenuError("Unable to load today's menu.");
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todayISO, availableMeals, availableMealsKey, cityCode, userHasCityOverride]);

  const menuItemsMap = useMemo(() => {
    const map: Record<number, MenuItem> = {};
    MEAL_ORDER.forEach((meal) => {
      menuByMeal[meal].forEach((item) => {
        map[item.menu_item_id] = item;
      });
    });
    return map;
  }, [menuByMeal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      storedCartRef.current = raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      storedCartRef.current = [];
    } finally {
      setCartInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!cartInitialized) return;
    const restored: Record<number, number> = {};
    storedCartRef.current.forEach((line) => {
      const item = menuItemsMap[line.menu_item_id];
      if (!item || item.available_qty <= 0) return;
      restored[line.menu_item_id] = Math.min(line.quantity, item.available_qty);
    });
    setQuantities(restored);
  }, [cartInitialized, menuItemsMap]);

  const cartSelection = useMemo(() => {
    const lines: CartLine[] = [];
    Object.entries(quantities).forEach(([id, qty]) => {
      const quantity = Number(qty) || 0;
      if (quantity <= 0) return;
      const menuItemId = Number(id);
      const item = menuItemsMap[menuItemId];
      if (!item) return;
      lines.push({
        menu_item_id: item.menu_item_id,
        item_id: item.item_id,
        meal: item.meal,
        item_name: item.item_name,
        price: item.rate,
        quantity: Math.min(quantity, item.available_qty),
        available_qty: item.available_qty,
      });
    });
    return lines;
  }, [quantities, menuItemsMap]);

  useEffect(() => {
    if (!cartInitialized || typeof window === "undefined") return;
    if (cartSelection.length) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartSelection));
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [cartSelection, cartInitialized]);

  const cartCount = useMemo(() => cartSelection.reduce((sum, line) => sum + line.quantity, 0), [cartSelection]);
  const cartTotal = useMemo(() => cartSelection.reduce((sum, line) => sum + line.quantity * line.price, 0), [cartSelection]);

  const setItemQty = (item: MenuItem, nextQty: number) => {
    const clamped = Math.max(0, Math.min(Math.floor(nextQty), item.available_qty));
    setQuantities((prev) => {
      if (clamped <= 0) {
        if (!(item.menu_item_id in prev)) return prev;
        const next = { ...prev };
        delete next[item.menu_item_id];
        return next;
      }
      return { ...prev, [item.menu_item_id]: clamped };
    });
  };

  const goToCart = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CART_KEEP_KEY, "1");
    }
  };

  const requestLeave = (targetPath: string) => {
    if (targetPath === "/mobile/customer/cart") return true;
    if (targetPath === "/mobile/customer/menu" || targetPath === "/mobile/customer/order") return true;
    if (cartCount <= 0) return true;
    setPendingGoBack(false);
    setPendingLeavePath(targetPath);
    setLeaveDialogOpen(true);
    return false;
  };

  const cancelLeave = () => {
    setLeaveDialogOpen(false);
    setPendingLeavePath(null);
    setPendingGoBack(false);
  };

  const confirmLeave = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
      sessionStorage.removeItem(CART_KEEP_KEY);
    }
    storedCartRef.current = [];
    setQuantities({});
    const destination = pendingLeavePath;
    const shouldGoBack = pendingGoBack;
    setLeaveDialogOpen(false);
    setPendingLeavePath(null);
    setPendingGoBack(false);
    if (shouldGoBack) {
      const idx = typeof window !== "undefined" ? (window.history.state as { idx?: number } | null)?.idx : undefined;
      if (typeof idx === "number" && idx > 0) {
        router.back();
      } else {
        router.push("/mobile/customer/home");
      }
      return;
    }
    if (destination) {
      router.push(destination);
    }
  };

  const activeItems = menuByMeal[activeMeal] ?? [];

  return (
    <main className={`${workSans.variable} ${playfairMobile.variable} min-h-screen pb-28`} style={{ backgroundColor: mobilePalette.background }}>
      <div className="mx-auto w-full max-w-[448px]">
        <header className="sticky top-0 z-20 bg-[rgba(253,250,241,0.95)] px-4 pb-3 pt-4 backdrop-blur-md">
          <div className="relative mb-4 flex items-center justify-between">
            <button type="button" onClick={handleBack} className="flex h-9 w-9 items-center justify-center rounded-full">
              <ArrowLeft size={20} color="#8D4925" />
            </button>
            <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold text-[#8D4925]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>Order</h1>
            <Link href="/mobile/customer/cart" onClick={goToCart} className="relative flex h-9 w-9 items-center justify-center rounded-full">
              <ShoppingBasket size={22} color="#8D4925" />
              {cartCount > 0 ? <span className="absolute right-0 top-0 rounded-full bg-[#8D4925] px-1.5 text-[10px] font-bold text-white">{cartCount}</span> : null}
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-stone-200/30 p-1">
            {MEAL_ORDER.map((meal) => {
              const active = meal === activeMeal;
              return (
                <button
                  key={meal}
                  type="button"
                  onClick={() => setActiveMeal(meal)}
                  className={`rounded-xl py-2 text-[11px] font-semibold ${active ? "bg-[#8D4925] text-[#FDFAF1] font-bold" : "text-stone-500"}`}
                >
                  {MEAL_LABELS[meal]}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex justify-end">
            <div className="inline-flex items-center gap-1 rounded-xl border border-[#8D4925]/15 bg-white p-1">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setMenuView("grid")}
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${menuView === "grid" ? "bg-[#8D4925] text-white" : "text-[#8D4925]"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setMenuView("list")}
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${menuView === "list" ? "bg-[#8D4925] text-white" : "text-[#8D4925]"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </header>

        <section className={`${menuView === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"} px-4 pt-3`}>
          {menuLoading ? (
            <>
              <div className="h-44 animate-pulse rounded-2xl bg-white/70" />
              <div className="h-44 animate-pulse rounded-2xl bg-white/70" />
            </>
          ) : menuError ? (
            <p className="col-span-2 rounded-xl bg-white px-4 py-3 text-sm text-red-600">{menuError}</p>
          ) : activeItems.length === 0 ? (
            <p className="col-span-2 rounded-xl bg-white px-4 py-3 text-sm text-[#64748b]">No items available in this section.</p>
          ) : (
            activeItems.map((item) => {
              const qty = quantities[item.menu_item_id] ?? 0;
              return menuView === "list" ? (
                <article key={`${activeMeal}-${item.menu_item_id}`} className="rounded-xl border border-[#8D4925]/8 bg-white px-3 py-3 shadow-[0_4px_12px_rgba(27,67,50,0.06)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 pr-2">
                      <h3 className="truncate text-[13px] font-bold text-[#8D4925]">{item.item_name}</h3>
                      <span className="text-sm font-bold text-[#1B4332]">₹{Math.round(item.rate || 0)}</span>
                    </div>
                    {qty > 0 ? (
                      <div className="flex items-center gap-1 rounded-lg bg-[#8D4925] px-1 py-1 text-[#FDFAF1]">
                        <button type="button" onClick={() => setItemQty(item, qty - 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15">
                          <Minus size={14} />
                        </button>
                        <span className="min-w-6 text-center text-xs font-bold">{qty}</span>
                        <button type="button" onClick={() => setItemQty(item, qty + 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15">
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setItemQty(item, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8D4925] text-[#FDFAF1]">
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </article>
              ) : (
                <article key={`${activeMeal}-${item.menu_item_id}`} className="flex flex-col overflow-hidden rounded-2xl border border-stone-50 bg-white shadow-[0_4px_12px_rgba(27,67,50,0.06)]">
                  <div className="relative p-1.5">
                    <Image
                      src={item.picture_url || PLACEHOLDER_IMAGE}
                      alt={item.item_name}
                      width={220}
                      height={165}
                      className="aspect-[4/3] w-full rounded-xl object-cover"
                      unoptimized={Boolean(item.picture_url)}
                    />
                  </div>
                  <div className="flex flex-1 flex-col px-3 pb-3">
                    <h3 className="truncate text-[13px] font-bold text-[#8D4925]">{item.item_name}</h3>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-sm font-bold text-[#1B4332]">₹{Math.round(item.rate || 0)}</span>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1 rounded-lg bg-[#8D4925] px-1 py-1 text-[#FDFAF1]">
                          <button type="button" onClick={() => setItemQty(item, qty - 1)} className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
                            <Minus size={14} />
                          </button>
                          <span className="min-w-5 text-center text-xs font-bold">{qty}</span>
                          <button type="button" onClick={() => setItemQty(item, qty + 1)} className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setItemQty(item, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8D4925] text-[#FDFAF1]">
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>

      {cartCount > 0 ? (
        <div className="fixed bottom-24 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2">
          <Link href="/mobile/customer/cart" onClick={goToCart} className="flex w-full items-center justify-between">
            <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#8D4925] p-4 text-white shadow-[0px_10px_15px_-3px_rgba(141,73,37,0.35),0px_4px_6px_-4px_rgba(141,73,37,0.35)]">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-white/90" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Selected Items</p>
                  <p className="text-base font-bold">
                    ₹{Math.round(cartTotal)}
                    <span className="ml-1 text-xs font-normal text-white/70">({cartCount} item{cartCount === 1 ? "" : "s"})</span>
                  </p>
                </div>
              </div>
              <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-5 text-xs font-bold text-white">
                View Cart
                <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        </div>
      ) : null}

      <MobileCustomerBottomNav active="orders" onNavigate={requestLeave} />
      <LeaveCartDialog open={leaveDialogOpen} onCancel={cancelLeave} onConfirm={confirmLeave} />
    </main>
  );
}
