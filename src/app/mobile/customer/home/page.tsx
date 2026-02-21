"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, CalendarDays, ChevronDown, ChevronUp, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import { format as formatDate, isSameDay, isSameMonth } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { mobilePalette, outfit, playfairMobile } from "@/components/mobile/customer/theme";
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
  items: OrderItem[];
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
const DEFAULT_PROFILE_ICON = "/icons/contact-card.png";

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

export default function MobileCustomerHomePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [hydrated, setHydrated] = useState(false);
  const [menuByMeal, setMenuByMeal] = useState<Record<MealType, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  });
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cartInitialized, setCartInitialized] = useState(false);
  const [collapsedMeals, setCollapsedMeals] = useState<Record<MealType, boolean>>({
    breakfast: false,
    lunch: true,
    dinner: true,
    condiments: true,
  });
  const storedCartRef = useRef<CartLine[]>([]);

  const todayISO = useMemo(() => formatDate(new Date(), "yyyy-MM-dd"), []);
  const customerId = hydrated ? user?.customer_id : undefined;
  const isAuthenticated = hydrated && Boolean(customerId);

  const cityCode = useMemo(() => {
    const raw = typeof user?.city_code === "string" ? user.city_code.trim().toUpperCase() : "";
    return raw.length ? raw : "MYS";
  }, [user?.city_code]);
  const userHasCityOverride = Boolean(user?.city_code && user.city_code.trim());

  const availableMeals = useMemo(() => getSupportedMeals(cityCode), [cityCode]);
  const availableMealsKey = useMemo(() => availableMeals.join(","), [availableMeals]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (user || !token) return;

    (async () => {
      try {
        const response = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const me = await response.json();
        setUser(me);
      } catch {
        // no-op
      }
    })();
  }, [hydrated, user, setUser]);

  useEffect(() => {
    let cancelled = false;
    setMenuLoading(true);
    setMenuError(null);

    (async () => {
      const headers = buildAuthHeaders();
      try {
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
            const isReleased = Boolean((data as { is_released?: boolean }).is_released);
            const items = (data.items ?? []) as MenuApiItem[];

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
        setMenuByMeal({ breakfast: [], lunch: [], dinner: [], condiments: [] });
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todayISO, availableMeals, availableMealsKey, cityCode, userHasCityOverride]);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;

    (async () => {
      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const headers = buildAuthHeaders();
        const response = await fetch(`http://localhost:8000/api/customers/${customerId}/orders`, { headers });
        if (!response.ok) throw new Error("Unable to load your orders");
        const data = (await response.json()) as OrderSummary[];
        if (cancelled) return;
        setOrders(
          data.map((order) => ({
            ...order,
            order_type: order.order_type ?? "one_time",
            items: Array.isArray((order as { items?: OrderItem[] }).items) ? (order as { items?: OrderItem[] }).items ?? [] : [],
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

  useEffect(() => {
    if (!isAuthenticated) {
      setQuantities({});
      storedCartRef.current = [];
      setCartInitialized(false);
      return;
    }
    if (typeof window === "undefined") return;
    let cancelled = false;
    try {
      const rawItems = localStorage.getItem(CART_STORAGE_KEY);
      if (rawItems) {
        const parsed = JSON.parse(rawItems) as CartLine[];
        if (!cancelled) {
          storedCartRef.current = parsed;
        }
      } else if (!cancelled) {
        storedCartRef.current = [];
      }
    } catch {
      storedCartRef.current = [];
    } finally {
      if (!cancelled) setCartInitialized(true);
    }
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const customerName = useMemo(() => {
    if (!user?.name) return null;
    const trimmed = user.name.trim();
    if (!trimmed) return null;
    return trimmed.split(" ")[0];
  }, [user]);

  const menuItemsMap = useMemo(() => createMenuItemMap(menuByMeal), [menuByMeal]);

  useEffect(() => {
    if (!isAuthenticated || !cartInitialized) return;
    const restored: Record<number, number> = {};
    storedCartRef.current.forEach((line) => {
      const item = menuItemsMap[line.menu_item_id];
      if (!item || item.available_qty <= 0) return;
      restored[line.menu_item_id] = Math.min(line.quantity, item.available_qty);
    });
    setQuantities(restored);
  }, [isAuthenticated, cartInitialized, menuItemsMap]);

  const cartSelection = useMemo<CartLine[]>(() => {
    if (!isAuthenticated) return [];
    const lines: CartLine[] = [];
    Object.entries(quantities).forEach(([key, rawValue]) => {
      const value = Number(rawValue) || 0;
      if (value <= 0) return;
      const menuItemId = Number(key);
      const item = menuItemsMap[menuItemId];
      if (!item || item.available_qty <= 0) return;
      lines.push({
        menu_item_id: menuItemId,
        item_id: item.item_id,
        meal: item.meal,
        item_name: item.item_name,
        price: item.rate,
        quantity: Math.min(value, item.available_qty),
        available_qty: item.available_qty,
      });
    });
    return lines;
  }, [isAuthenticated, quantities, menuItemsMap]);

  const cartTotals = useMemo(() => {
    const totalQuantity = cartSelection.reduce((sum, line) => sum + line.quantity, 0);
    const totalPrice = cartSelection.reduce((sum, line) => sum + line.quantity * line.price, 0);
    return { totalQuantity, totalPrice };
  }, [cartSelection]);

  useEffect(() => {
    if (!isAuthenticated || !cartInitialized) return;
    if (typeof window === "undefined") return;
    storedCartRef.current = cartSelection;
    if (cartSelection.length) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartSelection));
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [cartSelection, isAuthenticated, cartInitialized]);

  const setQuantityForItem = (menuItem: MenuItem, nextValue: number) => {
    if (!isAuthenticated) return;
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

  const toggleMeal = (meal: MealType) => {
    setCollapsedMeals((prev) => ({ ...prev, [meal]: !prev[meal] }));
  };

  const handleReviewCart = () => {
    if (!cartSelection.length) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CART_KEEP_KEY, "1");
    }
    router.push("/mobile/customer/cart");
  };

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

  return (
    <main
      className={`${outfit.variable} ${playfairMobile.variable} min-h-screen w-full pb-28`}
      style={{ backgroundColor: mobilePalette.background, fontFamily: "var(--font-mobile-outfit), sans-serif" }}
    >
      <div className="mx-auto w-full max-w-[448px]">
        <header className="flex items-center justify-between px-6 pb-4 pt-10">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[rgba(141,73,37,0.2)] bg-white p-1">
              <Image src={DEFAULT_PROFILE_ICON} alt="profile icon" width={48} height={48} className="h-full w-full rounded-full object-cover" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1px] text-[rgba(141,73,37,0.6)]">Namaste</p>
              <h1 className="text-[20px] font-bold leading-[25px] text-[#8D4925]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>
                {hydrated && customerName ? `Welcome, ${customerName}` : "Welcome"}
              </h1>
            </div>
          </div>
          <button className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(141,73,37,0.05)] bg-white">
            <Bell color="#8D4925" size={18} />
          </button>
        </header>

        <section className="px-6 py-2">
          <div className="rounded-2xl border border-[rgba(141,73,37,0.05)] bg-white p-4 shadow-[0px_4px_12px_-1px_rgba(141,73,37,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[rgba(141,73,37,0.6)]">Today&apos;s Booking</p>
                {ordersLoading ? (
                  <p className="mt-1 flex items-center gap-2 text-sm text-[#475569]"><Loader2 className="h-4 w-4 animate-spin" /> Checking bookings...</p>
                ) : ordersError ? (
                  <p className="mt-1 text-sm text-red-600">{ordersError}</p>
                ) : hasMultipleTodayOrders ? (
                  <>
                    <p className="text-lg font-bold text-[#8D4925]">{todaysBookings.length} Orders Today</p>
                    <p className="text-xs text-[#475569]">Track all today&apos;s orders from one place.</p>
                  </>
                ) : todaysBooking ? (
                  <>
                    <p className="text-lg font-bold text-[#8D4925]">{todaysBooking.status}</p>
                    <p className="text-xs text-[#475569]">{todaysItemsCount} items • ₹{Math.round(todaysBooking.total_price)}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-[#475569]">No bookings for today yet.</p>
                )}
              </div>
              <Link href={hasMultipleTodayOrders ? "/mobile/customer/orders" : "/mobile/customer/menu"} className="rounded-xl bg-[#8D4925] px-5 py-2 text-xs font-bold text-white">
                {hasMultipleTodayOrders ? "Manage Orders" : "View Menu"}
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-4">
          <div className="relative overflow-hidden rounded-2xl bg-[#8D4925] p-6 text-white shadow-[0px_10px_15px_-3px_rgba(141,73,37,0.2),0px_4px_6px_-4px_rgba(141,73,37,0.2)]">
            <p className="text-[11px] uppercase tracking-[1px] text-white/70">Monthly Subscription</p>
            {ordersLoading ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-white/90"><Loader2 className="h-4 w-4 animate-spin" /> Checking subscription...</p>
            ) : ordersError ? (
              <p className="mt-2 text-sm text-white/90">{ordersError}</p>
            ) : currentSubscription ? (
              <>
                <h2 className="mt-1 text-2xl font-bold" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>
                  Active Subscription
                </h2>
                <div className="mt-6 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.5px] text-white/70">This month</p>
                    <p className="mt-1 flex items-center gap-2 text-xl font-bold">
                      <CalendarDays size={15} />
                      {subscriptionDeliveries} deliveries
                    </p>
                  </div>
                  <Link href="/mobile/customer/subscription/manage" className="rounded-xl bg-white px-5 py-2 text-xs font-bold text-[#8D4925]">
                    Manage Plan
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white/90">No active subscription for this month.</p>
                <Link href="/mobile/customer/subscription/manage" className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#8D4925]">
                  Start Now
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="px-6 pb-4">
          <h3 className="text-xl font-bold text-[#8D4925]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>
            Today&apos;s Menu
          </h3>
          <p className="text-[11px] text-[rgba(141,73,37,0.6)]">Breakfast, Lunch, Dinner, and Condiments</p>
        </section>

        {MEAL_ORDER.map((meal) => (
          <section key={meal} className="px-6 pb-5">
            <button
              type="button"
              className="mb-3 flex w-full items-center justify-between text-left"
              onClick={() => toggleMeal(meal)}
            >
              <h4 className="text-base font-bold text-[#8D4925]">{MEAL_LABELS[meal]}</h4>
              {collapsedMeals[meal] ? <ChevronDown size={18} color="#8D4925" /> : <ChevronUp size={18} color="#8D4925" />}
            </button>

            {menuLoading ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="h-36 animate-pulse rounded-2xl bg-white/70" />
                <div className="h-36 animate-pulse rounded-2xl bg-white/70" />
              </div>
            ) : menuError ? (
              <p className="text-sm text-red-600">{menuError}</p>
            ) : collapsedMeals[meal] ? null : menuByMeal[meal].length === 0 ? (
              <p className="rounded-xl border border-[rgba(141,73,37,0.08)] bg-white px-4 py-3 text-sm text-[#475569]">No items available right now.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {menuByMeal[meal].map((item) => (
                  <article key={`${meal}-${item.menu_item_id}`} className="overflow-hidden rounded-2xl border border-[rgba(141,73,37,0.05)] bg-white shadow-[0px_4px_12px_-1px_rgba(141,73,37,0.08)]">
                    <div className="relative">
                      <Image
                        src={item.picture_url || PLACEHOLDER_IMAGE}
                        alt={item.item_name}
                        width={180}
                        height={112}
                        className="h-28 w-full object-cover"
                        unoptimized={Boolean(item.picture_url)}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-white/40 bg-white/85 px-1.5 py-1 shadow-md backdrop-blur-[2px]">
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-[#8D4925]/30 bg-white text-[#8D4925] disabled:opacity-40"
                          onClick={() => decrementItem(item)}
                          disabled={(quantities[item.menu_item_id] ?? 0) <= 0}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="min-w-5 text-center text-[11px] font-semibold text-[#8D4925]">
                          {quantities[item.menu_item_id] ?? 0}
                        </span>
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8D4925] text-white disabled:opacity-40"
                          onClick={() => incrementItem(item)}
                          disabled={(quantities[item.menu_item_id] ?? 0) >= item.available_qty}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-[13px] font-bold text-[#8D4925] leading-tight">{item.item_name}</h5>
                        <p className="shrink-0 text-sm font-bold text-[#1B4332]">₹{Math.round(item.rate || 0)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {cartTotals.totalQuantity > 0 ? (
        <div className="fixed bottom-24 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[416px] -translate-x-1/2 rounded-2xl bg-[#8D4925] p-3 text-white shadow-[0px_10px_15px_-3px_rgba(141,73,37,0.35),0px_4px_6px_-4px_rgba(141,73,37,0.35)]">
          <button type="button" className="flex w-full items-center justify-between" onClick={handleReviewCart}>
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} />
              <div className="text-left">
                <p className="text-xs font-semibold">{cartTotals.totalQuantity} item{cartTotals.totalQuantity === 1 ? "" : "s"} in cart</p>
                <p className="text-sm font-bold">₹{Math.round(cartTotals.totalPrice)}</p>
              </div>
            </div>
            <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-[#8D4925]">Checkout</span>
          </button>
        </div>
      ) : null}

      <MobileCustomerBottomNav active="home" />
    </main>
  );
}

function createMenuItemMap(menuByMeal: Record<MealType, MenuItem[]>) {
  const map: Record<number, MenuItem> = {};
  MEAL_ORDER.forEach((meal) => {
    menuByMeal[meal]?.forEach((item) => {
      map[item.menu_item_id] = item;
    });
  });
  return map;
}
