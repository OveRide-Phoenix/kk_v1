"use client"

import { useRouter } from "next/navigation"
import { format as formatDate, isSameDay, isSameMonth } from "date-fns"
import { useEffect, useMemo, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/store/store"

type MealType = "breakfast" | "lunch" | "dinner" | "condiments"

type MenuApiItem = {
  menu_item_id?: number
  item_id?: number
  item_name?: string
  name?: string
  rate?: number
  price?: number
  description?: string
  picture_url?: string | null
  available_qty?: number
}

type MenuApiResponse = {
  is_released?: boolean
  items?: MenuApiItem[]
  delivers_by?: string | null
}

type MenuItem = {
  menu_item_id: number
  item_id: number
  item_name: string
  meal: MealType
  rate: number
  available_qty: number
  description: string
  picture_url: string | null
}

type OrderItem = {
  item_name: string
  quantity: number
  price: number
}

type OrderSummary = {
  order_id: number
  created_at: string | null
  total_price: number
  status: string
  payment_method: string
  order_type?: string | null
  address?: {
    label: string
    line: string
    city: string
    pin_code: string
  }
  items: OrderItem[]
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "condiments"]

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  condiments: "Condiments",
}

const PLACEHOLDER_IMAGE = "/images/menu/idli-sambar.jpg"

const normalizeQty = (value: unknown): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.floor(parsed)
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0)

const buildAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function CustomerHomeV2Page() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const [hydrated, setHydrated] = useState(false)
  const [menuLoading, setMenuLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [menuByMeal, setMenuByMeal] = useState<Record<MealType, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  })
  const [deliversByMeal, setDeliversByMeal] = useState<Record<MealType, string | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    condiments: null,
  })
  const [orders, setOrders] = useState<OrderSummary[]>([])

  const todayISO = useMemo(() => formatDate(new Date(), "yyyy-MM-dd"), [])
  const customerId = hydrated ? user?.customer_id : undefined
  const cityCode = useMemo(() => {
    const raw = typeof user?.city_code === "string" ? user.city_code.trim().toUpperCase() : ""
    return raw.length ? raw : "MYS"
  }, [user?.city_code])
  const userHasCityOverride = Boolean(user?.city_code && user.city_code.trim())

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (user || !token) return
    ;(async () => {
      try {
        const response = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const me = await response.json()
        setUser(me)
      } catch {
        // no-op
      }
    })()
  }, [hydrated, user, setUser])

  useEffect(() => {
    let cancelled = false
    setMenuLoading(true)
    setMenuError(null)

    ;(async () => {
      const headers = buildAuthHeaders()
      try {
        const nextMenu: Partial<Record<MealType, MenuItem[]>> = {}
        const nextDeliversBy: Partial<Record<MealType, string | null>> = {}

        await Promise.all(
          MEAL_ORDER.map(async (meal) => {
            const url = new URL("http://localhost:8000/api/menu")
            url.searchParams.set("bld_type", meal)
            if (userHasCityOverride) {
              url.searchParams.set("city_code", cityCode)
            }
            if (meal === "condiments") {
              url.searchParams.set("menu_type", "CONDIMENTS")
            } else {
              url.searchParams.set("date", todayISO)
              url.searchParams.set("period_type", "one_day")
              url.searchParams.set("menu_type", "ONE_DAY")
            }

            const response = await fetch(url.toString(), { headers })
            if (response.status === 404 || !response.ok) {
              nextMenu[meal] = []
              nextDeliversBy[meal] = null
              return
            }

            const data = (await response.json()) as MenuApiResponse
            const isReleased = Boolean(data.is_released)
            const items = (data.items ?? []) as MenuApiItem[]
            nextDeliversBy[meal] = data.delivers_by ?? null
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
              : []
          })
        )

        if (cancelled) return
        setMenuByMeal({
          breakfast: nextMenu.breakfast ?? [],
          lunch: nextMenu.lunch ?? [],
          dinner: nextMenu.dinner ?? [],
          condiments: nextMenu.condiments ?? [],
        })
        setDeliversByMeal({
          breakfast: nextDeliversBy.breakfast ?? null,
          lunch: nextDeliversBy.lunch ?? null,
          dinner: nextDeliversBy.dinner ?? null,
          condiments: nextDeliversBy.condiments ?? null,
        })
      } catch {
        if (cancelled) return
        setMenuError("Unable to load today's menu.")
        setMenuByMeal({ breakfast: [], lunch: [], dinner: [], condiments: [] })
        setDeliversByMeal({ breakfast: null, lunch: null, dinner: null, condiments: null })
      } finally {
        if (!cancelled) setMenuLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [todayISO, cityCode, userHasCityOverride])

  useEffect(() => {
    if (!customerId) {
      setOrders([])
      return
    }
    let cancelled = false

    ;(async () => {
      setOrdersLoading(true)
      setOrdersError(null)
      try {
        const headers = buildAuthHeaders()
        const response = await fetch(`http://localhost:8000/api/customers/${customerId}/orders`, { headers })
        if (!response.ok) throw new Error("Unable to load your orders")
        const data = (await response.json()) as OrderSummary[]
        if (cancelled) return
        setOrders(
          data.map((order) => ({
            ...order,
            order_type: order.order_type ?? "one_time",
            items: Array.isArray((order as { items?: OrderItem[] }).items)
              ? (order as { items?: OrderItem[] }).items ?? []
              : [],
          }))
        )
      } catch {
        if (cancelled) return
        setOrders([])
        setOrdersError("We couldn’t load your recent orders.")
      } finally {
        if (!cancelled) setOrdersLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [customerId])

  const customerName = useMemo(() => {
    if (!user?.name) return "Shashank"
    const trimmed = user.name.trim()
    return trimmed ? trimmed.split(" ")[0] : "Shashank"
  }, [user?.name])

  const todaysBookings = useMemo(() => {
    if (!orders.length) return []
    const today = new Date()
    const matches = orders.filter((order) => {
      if (!order.created_at) return false
      const orderDate = new Date(order.created_at)
      if (Number.isNaN(orderDate.getTime())) return false
      return isSameDay(orderDate, today)
    })
    if (!matches.length) return []
    matches.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      return timeB - timeA
    })
    return matches
  }, [orders])

  const todaysBooking = todaysBookings[0] ?? null
  const hasMultipleTodayOrders = todaysBookings.length > 1
  const todaysItemsCount = useMemo(() => {
    if (!todaysBooking) return 0
    return todaysBooking.items.reduce((total, item) => total + (item.quantity ?? 0), 0)
  }, [todaysBooking])

  const currentSubscription = useMemo(() => {
    const today = new Date()
    const subscriptions = orders.filter((order) => {
      if (!order.created_at) return false
      if ((order.order_type ?? "").toLowerCase() !== "subscription") return false
      const orderDate = new Date(order.created_at)
      if (Number.isNaN(orderDate.getTime())) return false
      return isSameMonth(orderDate, today)
    })
    if (!subscriptions.length) return null
    subscriptions.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      return timeB - timeA
    })
    return subscriptions[0]
  }, [orders])

  const subscriptionDeliveries = useMemo(() => {
    if (!orders.length) return 0
    const today = new Date()
    return orders.filter((order) => {
      if (!order.created_at) return false
      if ((order.order_type ?? "").toLowerCase() !== "subscription") return false
      const orderDate = new Date(order.created_at)
      if (Number.isNaN(orderDate.getTime())) return false
      return isSameMonth(orderDate, today)
    }).length
  }, [orders])

  const todayMenuItems = useMemo(() => {
    const pools: Record<Exclude<MealType, "condiments">, MenuItem[]> = {
      breakfast: [...menuByMeal.breakfast],
      lunch: [...menuByMeal.lunch],
      dinner: [...menuByMeal.dinner],
    }
    const sequence: Exclude<MealType, "condiments">[] = ["breakfast", "lunch", "dinner"]
    const picked: MenuItem[] = []

    while (picked.length < 6) {
      let progressed = false
      for (const meal of sequence) {
        const nextItem = pools[meal].shift()
        if (!nextItem) continue
        picked.push(nextItem)
        progressed = true
        if (picked.length >= 6) break
      }
      if (!progressed) break
    }

    return picked
  }, [menuByMeal])

  const condimentItems = useMemo(() => menuByMeal.condiments.slice(0, 4), [menuByMeal.condiments])
  const mealDeliverySummary = useMemo(() => {
    const segments = MEAL_ORDER.filter((meal) => meal !== "condiments")
      .map((meal) => {
        const deliveredBy = deliversByMeal[meal]
        if (!deliveredBy) return null
        return `${MEAL_LABELS[meal]} by ${deliveredBy}`
      })
      .filter((segment): segment is string => Boolean(segment))
    return segments.join(" • ")
  }, [deliversByMeal])
  const showTopBookingCard = ordersLoading || Boolean(todaysBooking)
  const showTopSubscriptionCard = Boolean(currentSubscription)
  const showAnyTopHeroCard = showTopBookingCard || showTopSubscriptionCard
  const showBothTopCards = showTopBookingCard && showTopSubscriptionCard

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
        <div className={`mb-10 grid grid-cols-1 gap-6 ${showAnyTopHeroCard ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
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
            <div className={`lg:col-span-2 grid gap-6 ${showBothTopCards ? "md:grid-cols-2" : "grid-cols-1"}`}>
              {showTopBookingCard ? (
                <div className={`hero-pattern relative overflow-hidden rounded-2xl bg-[#8D4925] text-white shadow-xl ${showBothTopCards ? "p-6" : "p-8"}`}>
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">Today&apos;s Booking</p>
                        {ordersLoading ? (
                          <div className="space-y-2">
                            <Skeleton className={`h-10 ${showBothTopCards ? "w-44" : "w-56"} bg-white/30`} />
                            <Skeleton className="h-4 w-28 bg-white/25" />
                          </div>
                        ) : (
                          <h2 className={`${showBothTopCards ? "text-3xl" : "text-4xl"} font-bold`} style={{ fontFamily: "var(--font-v2-playfair)" }}>
                            {hasMultipleTodayOrders ? `${todaysBookings.length} Active Orders` : `Order #${todaysBooking?.order_id ?? "—"}`}
                          </h2>
                        )}
                      </div>
                      <span className="rounded-full bg-[#1b4332] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Today</span>
                    </div>
                    <div className={`${showBothTopCards ? "mt-8" : "mt-12"} flex flex-col justify-between gap-6 sm:flex-row sm:items-end`}>
                      <div>
                        {ordersLoading ? (
                          <div className="space-y-3">
                            <Skeleton className="h-4 w-36 bg-white/25" />
                            <Skeleton className="h-8 w-40 bg-white/30" />
                            <Skeleton className="h-3 w-64 bg-white/20" />
                          </div>
                        ) : todaysBooking ? (
                          <>
                            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">Order Snapshot</p>
                            <div className="flex items-center gap-3">
                              <span className={`material-symbols-outlined ${showBothTopCards ? "text-2xl" : "text-3xl"}`}>schedule</span>
                              <span className={`${showBothTopCards ? "text-xl" : "text-2xl"} font-bold italic`}>
                                {todaysBooking.created_at
                                  ? formatDate(new Date(todaysBooking.created_at), "EEE, h:mm a")
                                  : "Scheduled"}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-orange-100">
                              {todaysItemsCount} item{todaysItemsCount === 1 ? "" : "s"} • {currency(todaysBooking.total_price)} • {todaysBooking.status}
                            </p>
                          </>
                        ) : null}
                      </div>
                      <button
                        onClick={() => router.push("/customer-v2/account?section=orders")}
                        className={`rounded-xl bg-white ${showBothTopCards ? "px-6 py-2.5 text-sm" : "px-8 py-3"} font-bold text-[#8D4925] shadow-lg transition-all active:scale-95 hover:bg-orange-50`}
                      >
                        {hasMultipleTodayOrders ? "Manage Orders" : "View Order"}
                      </button>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 -right-10 opacity-20">
                    <span className="material-symbols-outlined select-none text-[200px]">receipt_long</span>
                  </div>
                </div>
              ) : null}

              {showTopSubscriptionCard ? (
                <div className={`hero-pattern relative overflow-hidden rounded-2xl bg-[#8D4925] text-white shadow-xl ${showBothTopCards ? "p-6" : "p-8"}`}>
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">Subscription Status</p>
                        <h2 className={`${showBothTopCards ? "text-3xl" : "text-4xl"} font-bold`} style={{ fontFamily: "var(--font-v2-playfair)" }}>
                          Monthly Veg Plan
                        </h2>
                      </div>
                      <span className="rounded-full bg-[#1b4332] px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Active</span>
                    </div>
                    <div className={`${showBothTopCards ? "mt-8" : "mt-12"} flex flex-col justify-between gap-6 sm:flex-row sm:items-end`}>
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-200">Next Delivery</p>
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined ${showBothTopCards ? "text-2xl" : "text-3xl"}`}>schedule</span>
                          <span className={`${showBothTopCards ? "text-xl" : "text-2xl"} font-bold italic`}>
                            {currentSubscription?.created_at
                              ? formatDate(new Date(currentSubscription.created_at), "EEE, h:mm a")
                              : "Scheduled"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-orange-100">
                          {subscriptionDeliveries} deliver{subscriptionDeliveries === 1 ? "y" : "ies"} this month
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
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ordersError}</div>
          </section>
        ) : null}

        <section className="mb-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#8D4925]" style={{ fontFamily: "var(--font-v2-playfair)" }}>
                Today&apos;s Menu
              </h2>
              <p className="text-gray-500">{mealDeliverySummary || "Timings unavailable"}</p>
            </div>
            <button
              onClick={() => router.push("/customer-v2/new-order")}
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
                <div key={`menu-skeleton-${index}`} className="overflow-hidden rounded-2xl border border-orange-50 bg-white shadow-sm">
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
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{menuError}</div>
          ) : todayMenuItems.length === 0 ? (
            <div className="rounded-2xl border border-orange-100 bg-white px-4 py-10 text-center text-sm text-[#8D4925]">
              No items available in today&apos;s menu.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {todayMenuItems.map((item) => (
                <div key={`${item.meal}-${item.menu_item_id}`} className="group overflow-hidden rounded-2xl border border-orange-50 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative h-44 overflow-hidden">
                    <img
                      alt={item.item_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={item.picture_url || PLACEHOLDER_IMAGE}
                    />
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 shadow-sm backdrop-blur-sm">
                      <span className="material-symbols-outlined text-sm text-orange-500">bolt</span>
                      <span className="text-xs font-bold text-gray-700">{currency(item.rate)}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#1b4332]">eco</span>
                      <span className="text-xs font-bold uppercase tracking-widest text-[#1b4332]">{MEAL_LABELS[item.meal]}</span>
                    </div>
                    <h3 className="mb-1 text-base font-bold text-gray-800" style={{ fontFamily: "var(--font-v2-playfair)" }}>
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
          <h2 className="mb-6 text-3xl font-bold text-[#8D4925]" style={{ fontFamily: "var(--font-v2-playfair)" }}>
            Condiments
          </h2>
          {menuLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`condiment-skeleton-${index}`} className="rounded-2xl border border-orange-50 bg-white p-6 shadow-sm">
                  <Skeleton className="mb-4 h-4 w-20" />
                  <Skeleton className="mb-4 h-32 w-full rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/3" />
                  <Skeleton className="mt-5 h-10 w-full rounded-xl" />
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
                <div key={`condiment-${item.menu_item_id}`} className="group relative rounded-2xl border border-orange-50 bg-white p-6 shadow-sm">
                  <span className="absolute left-4 top-4 rounded bg-[#1b4332] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                    Condiment
                  </span>
                  <div className="mb-4 mt-4 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-orange-50/40">
                    <img
                      alt={item.item_name}
                      className="h-full w-full object-cover"
                      src={item.picture_url || PLACEHOLDER_IMAGE}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">{item.item_name}</h4>
                    <p className="mt-1 text-sm font-bold text-[#8D4925]">{currency(item.rate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
