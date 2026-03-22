"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { format as formatDate, isSameDay, isSameMonth } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { LeaveCartDialog } from "@/components/mobile/customer/leave-cart-dialog";
import { mobilePalette, outfit, playfairMobile } from "@/components/mobile/customer/theme";
import { getSupportedMeals } from "@/config/cities";
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

type CartLine = {
  menu_item_id: number;
  item_id?: number | null;
  combo_id?: number | null;
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

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const normalizeType = (value: string | null | undefined): "subscription" | "one_time" => {
  const normalized = (value ?? "one_time").toLowerCase().replace("-", "_");
  return normalized === "subscription" ? "subscription" : "one_time";
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
  const [menuView, setMenuView] = useState<"grid" | "list">("grid");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingLeavePath, setPendingLeavePath] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderSummary | null>(null);
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
      try {
        const nextMenu: Partial<Record<MealType, MenuItem[]>> = {};

        await Promise.all(
          MEAL_ORDER.map(async (meal) => {
            if (!availableMeals.includes(meal)) {
              nextMenu[meal] = [];
              return;
            }

            const params = new URLSearchParams();
            params.set("bld_type", meal);
            params.set("include_combos", "1");
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
              return;
            }

            const data = await response.json();
            const isReleased = Boolean((data as { is_released?: boolean }).is_released);
            const items = (data.items ?? []) as MenuApiItem[];

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
        combo_id: item.combo_id,
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

  const requestLeave = (targetPath: string) => {
    if (targetPath === "/mobile/customer/cart") return true;
    if (targetPath === "/mobile/customer/home") return true;
    if (cartTotals.totalQuantity <= 0) return true;
    setPendingLeavePath(targetPath);
    setLeaveDialogOpen(true);
    return false;
  };

  const cancelLeave = () => {
    setLeaveDialogOpen(false);
    setPendingLeavePath(null);
  };

  const confirmLeave = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
      sessionStorage.removeItem(CART_KEEP_KEY);
    }
    storedCartRef.current = [];
    setQuantities({});
    const destination = pendingLeavePath;
    setLeaveDialogOpen(false);
    setPendingLeavePath(null);
    if (destination) {
      router.push(destination);
    }
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

  const showTodaysBookingCard = ordersLoading || Boolean(ordersError) || todaysBookings.length > 0;
  const showSubscriptionCardAboveMenu =
    ordersLoading || Boolean(ordersError) || Boolean(currentSubscription);
  const bookingActionHref = hasMultipleTodayOrders
    ? "/mobile/customer/orders"
    : "/mobile/customer/order";

  return (
    <main
      className={`${outfit.variable} ${playfairMobile.variable} min-h-screen w-full overflow-y-auto pb-28 [-webkit-overflow-scrolling:touch] touch-pan-y`}
      style={{
        backgroundColor: mobilePalette.background,
        fontFamily: "var(--font-mobile-outfit), sans-serif",
      }}
    >
      <div className="mx-auto w-full max-w-[448px]">
        <header className="flex items-center justify-between px-6 pb-4 pt-10">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[rgba(141,73,37,0.2)] bg-white p-1">
              <Image
                src={DEFAULT_PROFILE_ICON}
                alt="profile icon"
                width={48}
                height={48}
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1px] text-[rgba(141,73,37,0.6)]">
                Namaste 🙏
              </p>
              <h1
                className="text-[20px] font-bold leading-[25px] text-[#8D4925]"
                style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
              >
                {hydrated && customerName ? `Welcome, ${customerName}` : "Welcome"}
              </h1>
            </div>
          </div>
          <button className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(141,73,37,0.05)] bg-white">
            <Bell color="#8D4925" size={18} />
          </button>
        </header>

        {showTodaysBookingCard ? (
          <section className="px-6 py-2 pb-5">
            <div className="rounded-2xl border border-[rgba(141,73,37,0.05)] bg-white p-4 shadow-[0px_4px_12px_-1px_rgba(141,73,37,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-[rgba(141,73,37,0.6)]">Today&apos;s Booking</p>
                  {ordersLoading ? (
                    <p className="mt-1 flex items-center gap-2 text-sm text-[#475569]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking bookings...
                    </p>
                  ) : ordersError ? (
                    <p className="mt-1 text-sm text-red-600">{ordersError}</p>
                  ) : hasMultipleTodayOrders ? (
                    <>
                      <p className="text-lg font-bold text-[#8D4925]">
                        {todaysBookings.length} Orders Today
                      </p>
                      <p className="text-xs text-[#475569]">
                        Track all today&apos;s orders from one place.
                      </p>
                    </>
                  ) : todaysBooking ? (
                    <>
                      <p className="text-lg font-bold text-[#8D4925]">{todaysBooking.status}</p>
                      <p className="text-xs text-[#475569]">
                        {todaysItemsCount} items • ₹{Math.round(todaysBooking.total_price)}
                      </p>
                    </>
                  ) : null}
                </div>
                {hasMultipleTodayOrders ? (
                  <Link
                    href={bookingActionHref}
                    onClick={(event) => {
                      if (requestLeave(bookingActionHref)) return;
                      event.preventDefault();
                    }}
                    className="inline-flex max-w-[130px] shrink-0 items-center justify-center rounded-xl bg-[#8D4925] px-4 py-2 text-center text-xs font-bold leading-tight text-white whitespace-normal"
                  >
                    Manage Orders
                  </Link>
                ) : todaysBooking ? (
                  <button
                    type="button"
                    onClick={() => setSelectedOrderDetails(todaysBooking)}
                    className="inline-flex max-w-[130px] shrink-0 items-center justify-center rounded-xl bg-[#8D4925] px-4 py-2 text-center text-xs font-bold leading-tight text-white whitespace-normal"
                  >
                    View Details
                  </button>
                ) : (
                  <Link
                    href={bookingActionHref}
                    onClick={(event) => {
                      if (requestLeave(bookingActionHref)) return;
                      event.preventDefault();
                    }}
                    className="inline-flex max-w-[130px] shrink-0 items-center justify-center rounded-xl bg-[#8D4925] px-4 py-2 text-center text-xs font-bold leading-tight text-white whitespace-normal"
                  >
                    View Menu
                  </Link>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {showSubscriptionCardAboveMenu ? (
          <section className="px-6 py-4">
            <div className="relative overflow-hidden rounded-2xl bg-[#8D4925] p-6 text-white shadow-[0px_10px_15px_-3px_rgba(141,73,37,0.2),0px_4px_6px_-4px_rgba(141,73,37,0.2)]">
              <p className="text-[11px] uppercase tracking-[1px] text-white/70">
                Monthly Subscription
              </p>
              {ordersLoading ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-white/90">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking subscription...
                </p>
              ) : ordersError ? (
                <p className="mt-2 text-sm text-white/90">{ordersError}</p>
              ) : currentSubscription ? (
                <>
                  <h2
                    className="mt-1 text-2xl font-bold"
                    style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
                  >
                    Active Subscription
                  </h2>
                  <div className="mt-6 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.5px] text-white/70">
                        This month
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xl font-bold">
                        <CalendarDays size={15} />
                        {subscriptionDeliveries} deliveries
                      </p>
                    </div>
                    <Link
                      href="/mobile/customer/subscription/manage"
                      className="rounded-xl bg-white px-5 py-2 text-xs font-bold text-[#8D4925]"
                    >
                      Manage Plan
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="px-6 pb-4">
          <div className="flex items-center justify-between gap-3">
            <h3
              className="text-xl font-bold text-[#8D4925]"
              style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
            >
              Today&apos;s Menu
            </h3>
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
          <p className="text-[11px] text-[rgba(141,73,37,0.6)]">
            Breakfast, Lunch, Dinner, and Condiments
          </p>
        </section>

        {MEAL_ORDER.map((meal) => (
          <section key={meal} className="px-6 pb-5">
            <button
              type="button"
              className="mb-3 flex w-full items-center justify-between text-left"
              onClick={() => toggleMeal(meal)}
            >
              <h4 className="text-base font-bold text-[#8D4925]">{MEAL_LABELS[meal]}</h4>
              {collapsedMeals[meal] ? (
                <ChevronDown size={18} color="#8D4925" />
              ) : (
                <ChevronUp size={18} color="#8D4925" />
              )}
            </button>

            {menuLoading ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="h-36 animate-pulse rounded-2xl bg-white/70" />
                <div className="h-36 animate-pulse rounded-2xl bg-white/70" />
              </div>
            ) : menuError ? (
              <p className="text-sm text-red-600">{menuError}</p>
            ) : collapsedMeals[meal] ? null : menuByMeal[meal].length === 0 ? (
              <p className="rounded-xl border border-[rgba(141,73,37,0.08)] bg-white px-4 py-3 text-sm text-[#475569]">
                No items available right now.
              </p>
            ) : menuView === "list" ? (
              <div className="space-y-3">
                {menuByMeal[meal].map((item) => (
                  <article
                    key={`${meal}-${item.menu_item_id}`}
                    className="rounded-xl border border-[rgba(141,73,37,0.08)] bg-white px-3 py-3 shadow-[0px_4px_12px_-1px_rgba(141,73,37,0.08)]"
                  >
                    {(() => {
                      const qty = Math.max(0, Number(quantities[item.menu_item_id] ?? 0));
                      return (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 pr-2">
                            <h5 className="truncate text-[13px] font-bold text-[#8D4925]">
                              {item.item_name}
                            </h5>
                            <p className="text-sm font-bold text-[#1B4332]">
                              ₹{Math.round(item.rate || 0)}
                            </p>
                          </div>
                          {qty > 0 ? (
                            <div className="flex items-center gap-1 rounded-lg bg-[#8D4925] px-1 py-1 text-[#FDFAF1]">
                              <button
                                type="button"
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 disabled:opacity-40"
                                onClick={() => decrementItem(item)}
                                disabled={qty <= 0}
                              >
                                <Minus size={13} />
                              </button>
                              <span className="min-w-6 text-center text-xs font-bold">{qty}</span>
                              <button
                                type="button"
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 disabled:opacity-40"
                                onClick={() => incrementItem(item)}
                                disabled={qty >= item.available_qty}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8D4925] text-[#FDFAF1]"
                              onClick={() => incrementItem(item)}
                              disabled={item.available_qty <= 0}
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {menuByMeal[meal].map((item) => (
                  <article
                    key={`${meal}-${item.menu_item_id}`}
                    className="overflow-hidden rounded-2xl border border-[rgba(141,73,37,0.05)] bg-white shadow-[0px_4px_12px_-1px_rgba(141,73,37,0.08)]"
                  >
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
                        <h5 className="text-[13px] font-bold text-[#8D4925] leading-tight">
                          {item.item_name}
                        </h5>
                        <p className="shrink-0 text-sm font-bold text-[#1B4332]">
                          ₹{Math.round(item.rate || 0)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}

        {!ordersLoading && !ordersError && !currentSubscription ? (
          <section className="px-6 pb-4">
            <div className="relative overflow-hidden rounded-2xl bg-[#8D4925] p-6 text-white shadow-[0px_10px_15px_-3px_rgba(141,73,37,0.2),0px_4px_6px_-4px_rgba(141,73,37,0.2)]">
              <p className="text-[11px] uppercase tracking-[1px] text-white/70">
                Monthly Subscription
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white/90">
                  No active subscription for this month.
                </p>
                <Link
                  href="/mobile/customer/subscription/manage"
                  onClick={(event) => {
                    if (requestLeave("/mobile/customer/subscription/manage")) return;
                    event.preventDefault();
                  }}
                  className="inline-flex max-w-[110px] shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2 text-center text-xs font-bold leading-tight text-[#8D4925] whitespace-normal"
                >
                  Start Now
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {cartTotals.totalQuantity > 0 ? (
        <div className="fixed bottom-24 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2">
          <button
            type="button"
            className="flex w-full items-center justify-between"
            onClick={handleReviewCart}
          >
            <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#8D4925] p-4 text-white shadow-[0px_10px_15px_-3px_rgba(141,73,37,0.35),0px_4px_6px_-4px_rgba(141,73,37,0.35)]">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-white/90" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    Selected Items
                  </p>
                  <p className="text-base font-bold">
                    ₹{Math.round(cartTotals.totalPrice)}
                    <span className="ml-1 text-xs font-normal text-white/70">
                      ({cartTotals.totalQuantity} item{cartTotals.totalQuantity === 1 ? "" : "s"})
                    </span>
                  </p>
                </div>
              </div>
              <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-5 text-xs font-bold text-white">
                View Cart
                <ArrowRight size={14} />
              </span>
            </div>
          </button>
        </div>
      ) : null}

      {selectedOrderDetails ? (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/35"
            type="button"
            aria-label="Close details"
            onClick={() => setSelectedOrderDetails(null)}
          />
          <section className="fixed bottom-0 left-1/2 z-50 w-full max-w-[448px] -translate-x-1/2 rounded-t-3xl bg-[#FDFAF1] px-5 pb-8 pt-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#8D4925]/60">
                  Order ID
                </p>
                <h3
                  className="text-xl font-bold text-[#8D4925]"
                  style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
                >
                  #{selectedOrderDetails.order_id}
                </h3>
              </div>
              <span className="rounded-full bg-[#8D4925]/10 px-2.5 py-1 text-xs font-bold text-[#8D4925]">
                {selectedOrderDetails.status}
              </span>
            </div>

            <div className="space-y-3 rounded-xl border border-[#8D4925]/10 bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">Date</span>
                <span className="font-semibold text-[#1e293b]">
                  {selectedOrderDetails.created_at
                    ? formatDate(new Date(selectedOrderDetails.created_at), "dd MMM yyyy • hh:mm a")
                    : "Scheduled"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">Order type</span>
                <span className="font-semibold text-[#1e293b]">
                  {normalizeType(selectedOrderDetails.order_type) === "subscription"
                    ? "Subscription"
                    : "One-time"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">Payment</span>
                <span className="font-semibold text-[#1e293b]">
                  {selectedOrderDetails.payment_method}
                </span>
              </div>
              <div className="text-sm">
                <p className="text-[#64748b]">Delivery address</p>
                <p className="mt-1 font-semibold text-[#1e293b]">
                  {selectedOrderDetails.address
                    ? [
                        selectedOrderDetails.address.line,
                        selectedOrderDetails.address.city,
                        selectedOrderDetails.address.pin_code,
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
                {selectedOrderDetails.items.length ? (
                  selectedOrderDetails.items.map((item, index) => (
                    <div
                      key={`${selectedOrderDetails.order_id}-${item.item_name}-${index}`}
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
                    {currency(selectedOrderDetails.total_price)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrderDetails(null)}
              className="mt-4 w-full rounded-xl bg-[#1B4332] py-3 text-sm font-bold text-white"
            >
              Close
            </button>
          </section>
        </>
      ) : null}

      <MobileCustomerBottomNav active="home" onNavigate={requestLeave} />
      <LeaveCartDialog open={leaveDialogOpen} onCancel={cancelLeave} onConfirm={confirmLeave} />
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
