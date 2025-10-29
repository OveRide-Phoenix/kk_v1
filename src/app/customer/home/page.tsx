"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { format as formatDate, isSameDay, isSameMonth } from "date-fns"
import { Calendar, ChefHat, Info, Leaf, Loader2, Minus, Plus, Repeat, ShoppingCart, Sparkles, UtensilsCrossed } from "lucide-react"
import Autoplay from "embla-carousel-autoplay"

import CustomerNavBar from "@/components/customer-nav-bar"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { useAuthStore } from "@/store/store"
import Footer from "@/components/footer"
import { cn } from "@/lib/utils"
import { MealSwitcher } from "@/components/ui/meal-switcher"
import { Skeleton } from "@/components/ui/skeleton"

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
  address: {
    label: string
    line: string
    city: string
    pin_code: string
  }
  items: OrderItem[]
}

type CartLine = {
  menu_item_id: number
  item_id: number
  meal: MealType
  item_name: string
  price: number
  quantity: number
  available_qty: number
}

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "condiments"]

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  condiments: "Condiments",
}

const PLACEHOLDER_IMAGE = "/images/menu/idli-sambar.jpg"

const GALLERY_IMAGES = [
  {
    src: "/images/menu/masala-dosa.jpg",
    title: "Masala Dosa",
    caption: "Crisp golden dosa with house chutneys.",
  },
  {
    src: "/images/hero/thalidosa.png",
    title: "Weekend Thali",
    caption: "A wholesome spread made for sharing.",
  },
  {
    src: "/images/menu/poori.jpg",
    title: "Poori Bhaji",
    caption: "Fluffy pooris with warm potato bhaji.",
  },
] as const

const CART_STORAGE_KEY = "customer_cart_items"
const CART_KEEP_KEY = "kk_keep_cart"

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

export default function CustomerHomePage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const todayISO = useMemo(() => formatDate(new Date(), "yyyy-MM-dd"), [])
  const [menuByMeal, setMenuByMeal] = useState<Record<MealType, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  })
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [todayCarouselApi, setTodayCarouselApi] = useState<CarouselApi | null>(null)
  const [todayCarouselIndex, setTodayCarouselIndex] = useState(0)
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [cartInitialized, setCartInitialized] = useState(false)
  const storedCartRef = useRef<CartLine[]>([])
  const todayCarouselPlugin = useRef(
    Autoplay({
      delay: 4500,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
    })
  )

  useEffect(() => {
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
      } catch (err) {
        console.warn("Unable to restore session", err)
      }
    })()
  }, [user, setUser])

  const customerId = user?.customer_id
  const isAuthenticated = Boolean(customerId)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    ;(async () => {
      try {
        const nextMenu: Partial<Record<MealType, MenuItem[]>> = {}

        await Promise.all(
          MEALS.map(async (meal) => {
            const url = new URL("http://localhost:8000/api/menu")
            url.searchParams.set("date", todayISO)
            url.searchParams.set("bld_type", meal)
            url.searchParams.set("period_type", "one_day")

            const response = await fetch(url.toString())
            if (response.status === 404) {
              nextMenu[meal] = []
              return
            }
            if (!response.ok) {
              throw new Error(`Failed to load ${meal} menu`)
            }

            const data = await response.json()
            const items = (data.items ?? []) as MenuApiItem[]
            nextMenu[meal] = items.map((item) => ({
              menu_item_id: item.menu_item_id ?? 0,
              item_id: item.item_id ?? 0,
              item_name: item.item_name ?? item.name ?? "Item",
              meal,
              rate: item.rate ?? item.price ?? 0,
              available_qty: item.available_qty ?? 0,
              description: item.description ?? "",
              picture_url: item.picture_url ?? null,
            }))
          })
        )

        if (!cancelled) {
          setMenuByMeal({
            breakfast: nextMenu.breakfast ?? [],
            lunch: nextMenu.lunch ?? [],
            dinner: nextMenu.dinner ?? [],
            condiments: nextMenu.condiments ?? [],
          })
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setError("Unable to load today's menu. Please try again later.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [todayISO])

  useEffect(() => {
    if (!customerId) return
    let cancelled = false

    const loadOrders = async () => {
      setOrdersLoading(true)
      setOrdersError(null)
      try {
        const response = await fetch(`http://localhost:8000/api/customers/${customerId}/orders`)
        if (!response.ok) {
          throw new Error("Unable to load your orders")
        }
        const data = (await response.json()) as OrderSummary[]
        if (!cancelled) {
          setOrders(
            data.map((order) => ({
              ...order,
              order_type: order.order_type ?? "one_time",
              items: Array.isArray((order as any).items) ? (order as any).items : [],
            }))
          )
        }
      } catch (err) {
        if (!cancelled) {
          setOrders([])
          setOrdersError("We couldn\u2019t load your recent orders.")
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false)
        }
      }
    }

    loadOrders()

    return () => {
      cancelled = true
    }
  }, [customerId])

  useEffect(() => {
    if (!isAuthenticated) {
      setQuantities({})
      storedCartRef.current = []
      setCartInitialized(false)
      return
    }
    if (typeof window === "undefined") return
    let cancelled = false
    try {
      const rawItems = localStorage.getItem(CART_STORAGE_KEY)
      if (rawItems) {
        const parsed = JSON.parse(rawItems) as CartLine[]
        if (!cancelled) {
          storedCartRef.current = parsed
        }
      } else if (!cancelled) {
        storedCartRef.current = []
      }
    } catch (error) {
      console.error("Failed to restore cart", error)
      storedCartRef.current = []
    } finally {
      if (!cancelled) {
        setCartInitialized(true)
      }
    }
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (typeof window === "undefined") return

    let animationFrame: number | null = null

    const calculateActiveMeal = () => {
      const offset = 200
      const scrollPosition = window.scrollY + offset
      let nextActive: MealType = MEALS[0]

      MEALS.forEach((meal) => {
        const section = document.getElementById(meal)
        if (!section) return
        const top = section.offsetTop
        if (scrollPosition >= top) {
          nextActive = meal
        }
      })

      setActiveMeal((prev) => (prev === nextActive ? prev : nextActive))
    }

    const handleScroll = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null
        calculateActiveMeal()
      })
    }

    calculateActiveMeal()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
      }
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [menuByMeal])

  useEffect(() => {
    if (!isAuthenticated || !cartInitialized) return

    const map = createMenuItemMap(menuByMeal)
    const restored: Record<number, number> = {}

    storedCartRef.current.forEach((line) => {
      const item = map[line.menu_item_id]
      if (!item) return
      if (item.available_qty <= 0) return
      restored[line.menu_item_id] = Math.min(line.quantity, item.available_qty)
    })

    setQuantities(restored)
  }, [isAuthenticated, cartInitialized, menuByMeal])

  const scrollToMeal = (meal: MealType) => {
    const element = document.getElementById(meal)
    if (!element) return
    const headerOffset = 100
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset
    window.scrollTo({ top: offsetPosition, behavior: "smooth" })
  }

  const menuItemsMap = useMemo(() => createMenuItemMap(menuByMeal), [menuByMeal])
  const mealSwitcherOptions = useMemo(
    () =>
      MEALS.map((meal) => ({
        value: meal,
        label: MEAL_LABELS[meal],
      })),
    []
  )

  const cartSelection = useMemo<CartLine[]>(() => {
    if (!isAuthenticated) return []
    const lines: CartLine[] = []
    Object.entries(quantities).forEach(([key, rawValue]) => {
      const value = Number(rawValue) || 0
      if (value <= 0) return
      const menuItemId = Number(key)
      const item = menuItemsMap[menuItemId]
      if (!item) return
      if (item.available_qty <= 0) return
      lines.push({
        menu_item_id: menuItemId,
        item_id: item.item_id,
        meal: item.meal,
        item_name: item.item_name,
        price: item.rate,
        quantity: Math.min(value, item.available_qty),
        available_qty: item.available_qty,
      })
    })
    return lines
  }, [quantities, menuItemsMap, isAuthenticated])

  const cartTotals = useMemo(() => {
    const totalQuantity = cartSelection.reduce((sum, line) => sum + line.quantity, 0)
    const totalPrice = cartSelection.reduce((sum, line) => sum + line.quantity * line.price, 0)
    return { totalQuantity, totalPrice }
  }, [cartSelection])

  useEffect(() => {
    if (!isAuthenticated || !cartInitialized) return
    if (typeof window === "undefined") return
    storedCartRef.current = cartSelection
    if (cartSelection.length) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartSelection))
    } else {
      localStorage.removeItem(CART_STORAGE_KEY)
    }
  }, [cartSelection, isAuthenticated, cartInitialized])

  const setQuantityForItem = (menuItem: MenuItem, nextValue: number) => {
    if (!isAuthenticated) return
    const clamped = Math.max(0, Math.min(nextValue, menuItem.available_qty))
    setQuantities((prev) => {
      if (clamped <= 0) {
        if (!(menuItem.menu_item_id in prev)) {
          return prev
        }
        const next = { ...prev }
        delete next[menuItem.menu_item_id]
        return next
      }
      if (prev[menuItem.menu_item_id] === clamped) {
        return prev
      }
      return { ...prev, [menuItem.menu_item_id]: clamped }
    })
  }

  const incrementItem = (menuItem: MenuItem) => {
    const current = quantities[menuItem.menu_item_id] ?? 0
    if (current >= menuItem.available_qty) return
    setQuantityForItem(menuItem, current + 1)
  }

  const decrementItem = (menuItem: MenuItem) => {
    const current = quantities[menuItem.menu_item_id] ?? 0
    if (current <= 0) return
    setQuantityForItem(menuItem, current - 1)
  }

  const handleClearCart = () => {
    if (!cartSelection.length) return
    setQuantities({})
  }

  const handleReviewCart = () => {
    if (!cartSelection.length) return
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CART_KEEP_KEY, "1")
    }
    router.push("/customer/cart")
  }

  const handleMealSelect = (meal: MealType) => {
    setActiveMeal(meal)
    scrollToMeal(meal)
  }

  const customerName = useMemo(() => {
    if (!user?.name) return null
    const trimmed = user.name.trim()
    if (!trimmed) return null
    return trimmed.split(" ")[0]
  }, [user])
  const welcomeHeadline = isAuthenticated && customerName ? `Welcome back, ${customerName}` : "Welcome to Kuteera Kitchen"

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

  const todaysItemsCount = useMemo(() => {
    if (!todaysBooking) return 0
    return todaysBooking.items.reduce((total, item) => total + (item.quantity ?? 0), 0)
  }, [todaysBooking])

  useEffect(() => {
    if (!todayCarouselApi) return
    const handleSelect = () => setTodayCarouselIndex(todayCarouselApi.selectedScrollSnap())
    handleSelect()
    todayCarouselApi.on("select", handleSelect)
    return () => {
      todayCarouselApi.off("select", handleSelect)
    }
  }, [todayCarouselApi])

  useEffect(() => {
    setTodayCarouselIndex(0)
    if (todayCarouselApi) {
      todayCarouselApi.scrollTo(0, true)
    }
  }, [todaysBookings.length, todayCarouselApi])

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

  return (
    <div className="min-h-screen bg-brand-shell">
      <CustomerNavBar />

      <main className="container mx-auto px-4 pt-24 pb-20">
        <section className="grid gap-6 rounded-3xl border border-brand-subtle bg-brand-cream p-6 shadow-brand-soft md:grid-cols-[1.25fr_1fr] lg:p-10">
            <div className="flex flex-col justify-center gap-4">
            <h1 className="inline-flex items-center gap-2 text-2xl font-bold uppercase tracking-[0.3em] text-brand-toast">
              <Sparkles className="h-6 w-6 text-primary" />
              {welcomeHeadline}
            </h1>
            <p className="text-sm text-brand-toast md:text-base">
              Home cooked meals, delivered to your doorstep.
            </p>
            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <>
                  <Button asChild>
                    <Link href="/customer/subscription">Explore subscriptions</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/customer/new-order">Plan a one-time meal</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild>
                    <Link href="/register">Register</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="relative h-[240px] overflow-hidden rounded-2xl bg-brand-caramel md:h-full">
            <Image
              src="/images/hero/thali.png"
              alt="Freshly prepared South Indian thali"
              fill
              priority
              className="object-cover"
            />
          </div>
        </section>

        {!isAuthenticated && (
          <section className="mt-10 rounded-3xl border border-brand-subtle bg-brand-cream p-6 shadow-brand-soft lg:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-brand-toast">Our promise</p>
                <h2 className="text-2xl font-serif font-semibold text-brand-cocoa">
                  Thoughtful meals, flexible plans
                </h2>
                <p className="text-sm leading-relaxed text-brand-toast">
                  We obsess over the small details so you can enjoy homestyle food without the stress of planning.
                </p>
              </div>
              <div className="grid gap-4 text-sm text-brand-cocoa sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-brand-subtle bg-brand-cream px-4 py-4 shadow-brand-soft">
                  <ChefHat className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="leading-relaxed">Balanced, vegetarian bowls every day.</p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-brand-subtle bg-brand-cream px-4 py-4 shadow-brand-soft">
                  <Repeat className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="leading-relaxed">Pause or resume your subscription anytime.</p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-brand-subtle bg-brand-cream px-4 py-4 shadow-brand-soft">
                  <UtensilsCrossed className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="leading-relaxed">Freshly prepared South Indian thali inspired menus.</p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-brand-subtle bg-brand-cream px-4 py-4 shadow-brand-soft">
                  <Leaf className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="leading-relaxed">
                    Kuteera Kitchen daily drop: Hand-picked produce, simmered &amp; served warm.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {isAuthenticated && (
          <section className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-brand-subtle bg-brand-cream p-5 shadow-brand-soft lg:p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-cocoa">
                <Calendar className="h-4 w-4 text-primary" />
                Today&apos;s booking
              </div>
              <p className="mt-1 text-xs text-brand-toast">
                We&apos;ll send a confirmation once the kitchen begins cooking.
              </p>
              <div className="mt-4 min-h-[220px]">
                {ordersLoading ? (
                  <div className="flex h-full items-center justify-center gap-2 text-sm text-brand-toast">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking for today&apos;s order…
                  </div>
                ) : ordersError ? (
                  <p className="text-sm text-destructive">{ordersError}</p>
                ) : todaysBookings.length > 1 ? (
                  <>
                    <Carousel
                      opts={{ align: "start", loop: false }}
                      className="relative"
                      setApi={setTodayCarouselApi}
                      plugins={[todayCarouselPlugin.current]}
                    >
                      <CarouselContent className="-ml-4 cursor-grab active:cursor-grabbing">
                      {todaysBookings.map((order) => {
                        const itemsCount = order.items.reduce(
                          (total, item) => total + (item.quantity ?? 0),
                          0
                          )
                          return (
                            <CarouselItem key={order.order_id} className="pl-4">
                              <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-brand-subtle bg-brand-cream p-5 shadow-brand-soft">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-brand-cocoa">
                                      Order #{order.order_id}
                                    </p>
                                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                      {order.status}
                                    </span>
                                  </div>
                                  <div className="space-y-2 text-xs text-brand-toast">
                                    <p>
                                      {order.created_at
                                        ? formatDate(new Date(order.created_at), "MMM d • p")
                                        : "Scheduled"}
                                    </p>
                                    <p>
                                      Delivering to {order.address.label} –{" "}
                                      {[order.address.line, order.address.city]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </p>
                                    <p>
                                      {itemsCount} item{itemsCount === 1 ? "" : "s"} •{" "}
                                      {currency(order.total_price)} via {order.payment_method}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button asChild size="sm">
                                    <Link href="/customer/account">View details</Link>
                                  </Button>
                                  <Button asChild size="sm" variant="outline">
                                    <Link href="/customer/new-order">Add another</Link>
                                  </Button>
                                </div>
                              </div>
                            </CarouselItem>
                          )
                        })}
                      </CarouselContent>
                    </Carousel>
                    <div className="mt-4 flex justify-center gap-2">
                      {todaysBookings.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => todayCarouselApi?.scrollTo(index)}
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.12)] transition",
                            index === todayCarouselIndex
                              ? "bg-primary"
                              : "bg-brand-toast/25 hover:bg-brand-toast/60"
                          )}
                          aria-current={index === todayCarouselIndex}
                          aria-label={`Go to order ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                ) : todaysBooking ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-brand-cocoa">
                        Order #{todaysBooking.order_id}
                      </p>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {todaysBooking.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-xs text-brand-toast">
                      <p>
                        {todaysBooking.created_at
                          ? formatDate(new Date(todaysBooking.created_at), "MMM d • p")
                          : "Scheduled"}
                      </p>
                      <p>
                        Delivering to {todaysBooking.address.label} –{" "}
                        {[todaysBooking.address.line, todaysBooking.address.city]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p>
                        {todaysItemsCount} item{todaysItemsCount === 1 ? "" : "s"} •{" "}
                        {currency(todaysBooking.total_price)} via {todaysBooking.payment_method}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm">
                        <Link href="/customer/account">View details</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/customer/new-order">Add another</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-between">
                    <div className="space-y-2 text-sm text-brand-toast">
                      <p>No bookings for today yet.</p>
                      <p>Reserve a slot before 10am for same-day lunch or dinner delivery.</p>
                    </div>
                    <Button asChild size="sm" className="mt-4 self-start">
                      <Link href="/customer/new-order">Book today&apos;s meal</Link>
                    </Button>
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-brand-subtle bg-brand-cream p-5 shadow-brand-soft lg:p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-cocoa">
                <Repeat className="h-4 w-4 text-primary" />
                Monthly subscription
              </div>
              <p className="mt-1 text-xs text-brand-toast">
                Stay stocked with wholesome meals tailored to your preferred schedule.
              </p>
              <div className="mt-4 min-h-[220px]">
                {ordersLoading ? (
                  <div className="flex h-full items-center justify-center gap-2 text-sm text-brand-toast">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking your subscription…
                  </div>
                ) : ordersError ? (
                  <p className="text-sm text-destructive">{ordersError}</p>
                ) : currentSubscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-brand-cocoa">
                        Active plan • #{currentSubscription.order_id}
                      </p>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {subscriptionDeliveries} drop{subscriptionDeliveries === 1 ? "" : "s"} this month
                      </span>
                    </div>
                    <div className="space-y-2 text-xs text-brand-toast">
                      <p>
                        Last delivery:{" "}
                        {currentSubscription.created_at
                          ? formatDate(new Date(currentSubscription.created_at), "MMM d")
                          : "Recently"}
                      </p>
                      <p>
                        Base total {currency(currentSubscription.total_price)} &middot;{" "}
                        {currentSubscription.payment_method}
                      </p>
                      <p>
                        Delivering to {currentSubscription.address.label} –{" "}
                        {[currentSubscription.address.line, currentSubscription.address.city]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm">
                        <Link href="/customer/account">Manage in account</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/customer/new-order">Add extra meals</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-brand-subtle bg-brand-cream/70 px-4 py-6 text-center text-sm text-brand-toast">
                    <div className="space-y-2 max-w-xs">
                      <p className="font-semibold text-brand-cocoa">No active subscription for this month.</p>
                      <p>Build a weekly or monthly plan, customize break days, and we&apos;ll handle the reminders.</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href="/customer/subscription">Start a subscription</Link>
                    </Button>
                  </div>
                )}
              </div>
            </article>
          </section>
        )}

        <section className="mt-12">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-serif font-semibold text-brand-cocoa">From today&apos;s kitchen</h2>
            <p className="text-xs text-brand-toast">A peek at what our chefs plated this week.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GALLERY_IMAGES.map((image) => (
              <article
                key={image.src}
                className="group relative overflow-hidden rounded-2xl border border-brand-subtle bg-brand-cream shadow-brand-soft"
              >
                <div className="relative aspect-[5/3]">
                  <Image
                    src={image.src}
                    alt={image.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#463028]/80 via-[#463028]/50 to-transparent p-5 text-white transition-opacity duration-500 group-hover:opacity-100">
                  <p className="text-lg font-serif font-semibold">{image.title}</p>
                  <p className="mt-1 text-xs">{image.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="daily-menu" className="mt-14 scroll-mt-32">
          <div className="rounded-3xl border border-brand-subtle bg-brand-cream p-6 shadow-brand-soft lg:p-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-brand-toast">Today&apos;s Menu</p>
                <h2 className="text-2xl font-serif font-semibold text-brand-cocoa">
                  Pick your meal window
                </h2>
                <p className="text-sm text-brand-toast">
                  Browse the chef&apos;s specials for breakfast, lunch, dinner, and our condiment bar.
                </p>
              </div>
              {!isAuthenticated && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm">
                    <Link href="/register">Register</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <MealSwitcher options={mealSwitcherOptions} value={activeMeal} onValueChange={handleMealSelect} />
              {!isAuthenticated && (
                <div className="flex items-center gap-2 rounded-full bg-brand-toast/15 px-3 py-1 text-xs font-medium text-brand-toast">
                  <Info className="h-3.5 w-3.5" />
                  <span>
                    <Link
                      href="/login"
                      className="inline-flex items-center text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                    >
                      Log in
                    </Link>{" "}
                    to see place an order or view order details.
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="mx-auto mt-6 max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="mt-10 space-y-12">
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex h-[120px] overflow-hidden rounded-lg border-2 border-brand-subtle bg-brand-shell/80"
                      >
                        <Skeleton className="h-full w-[120px] rounded-none" />
                        <div className="flex flex-1 flex-col gap-3 p-3">
                          <Skeleton className="h-4 w-3/5" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="mt-auto h-4 w-2/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-10 space-y-12">
                {MEALS.map((meal) => (
                  <section key={meal} id={meal} className="scroll-mt-32">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xl font-serif font-semibold text-brand-cocoa">
                          {MEAL_LABELS[meal]}
                        </h3>
                        <p className="text-xs text-brand-toast">
                          {menuByMeal[meal]?.length
                            ? "Highlighted selections from the kitchen"
                            : "No items available right now"}
                        </p>
                      </div>
                    </div>
                    {menuByMeal[meal]?.length ? (
                      <div className="grid gap-4 md:grid-cols-3">
                        {menuByMeal[meal].map((item) => {
                          const currentQty = quantities[item.menu_item_id] ?? 0
                          const isSoldOut = item.available_qty <= 0
                          const showSoldOutState = isAuthenticated && isSoldOut
                          const reachedLimit =
                            isAuthenticated && item.available_qty > 0 && currentQty >= item.available_qty

                          return (
                            <article
                              key={item.menu_item_id}
                              className={cn(
                                "relative flex h-[120px] overflow-hidden rounded-lg border-2 transition-shadow duration-200",
                                showSoldOutState
                                  ? "pointer-events-none border-dashed border-[#d9c7be] bg-[#f1ebe6] text-[#9a857b]"
                                  : "border-brand-subtle bg-brand-shell shadow-brand-soft hover:shadow-md"
                              )}
                              aria-disabled={showSoldOutState}
                            >
                              <div
                                className={cn(
                                  "h-[120px] w-[120px] flex-shrink-0",
                                  showSoldOutState ? "bg-muted/70" : "bg-muted"
                                )}
                              >
                                <Image
                                  src={item.picture_url || PLACEHOLDER_IMAGE}
                                  alt={item.item_name}
                                  width={120}
                                  height={120}
                                  className={cn("h-full w-full object-cover", showSoldOutState && "grayscale")}
                                />
                              </div>
                              <div className="relative flex flex-1 p-3">
                                <div className="flex w-full flex-col">
                                  <h4
                                    className={cn(
                                      "text-sm font-medium",
                                      showSoldOutState ? "text-[#8d6e63]" : "text-[#463028]"
                                    )}
                                  >
                                    {item.item_name}
                                  </h4>
                                  <p
                                    className={cn(
                                      "mt-1 line-clamp-2 text-xs",
                                      showSoldOutState ? "text-[#b59f93]" : "text-[#8d6e63]"
                                    )}
                                  >
                                    {item.description || "Delicious kitchen special"}
                                  </p>
                                </div>

                                <p
                                  className={cn(
                                    "absolute bottom-3 left-3 text-base font-semibold",
                                    showSoldOutState ? "text-[#9a857b]" : "text-[#463028]"
                                  )}
                                >
                                  {currency(item.rate)}
                                </p>

                                {isAuthenticated && (
                                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className={`h-6 w-6 border-primary text-primary hover:bg-primary hover:text-white ${showSoldOutState || currentQty === 0 ? "opacity-50" : ""}`}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        decrementItem(item)
                                      }}
                                      disabled={showSoldOutState || currentQty === 0}
                                      aria-label={`Decrease ${item.item_name}`}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span
                                      className={cn(
                                        "min-w-[20px] text-center text-sm",
                                        showSoldOutState ? "text-[#9a857b]" : "text-primary"
                                      )}
                                    >
                                      {currentQty}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className={`h-6 w-6 border-primary text-primary hover:bg-primary hover:text-white ${showSoldOutState || reachedLimit ? "opacity-50" : ""}`}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        incrementItem(item)
                                      }}
                                      disabled={showSoldOutState || reachedLimit}
                                      aria-label={`Increase ${item.item_name}`}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}

                                {isAuthenticated && reachedLimit && !showSoldOutState && (
                                  <span className="absolute top-3 right-3 text-[0.65rem] font-medium text-[#c75b39]">
                                    Max {item.available_qty}
                                  </span>
                                )}
                                {showSoldOutState && (
                                  <span className="absolute top-3 right-3 rounded-full bg-[#ffe2e2] px-2 py-0.5 text-[0.65rem] font-semibold text-[#c75b39] shadow-sm">
                                    Sold out
                                  </span>
                                )}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-brand-toast">
                        Check back a little later for {MEAL_LABELS[meal].toLowerCase()} specials.
                      </p>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      {isAuthenticated && cartTotals.totalQuantity > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-3xl rounded-3xl border border-primary/30 bg-white/95 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-cocoa">
                    {cartTotals.totalQuantity} item{cartTotals.totalQuantity === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-brand-toast">
                    Total {currency(cartTotals.totalPrice)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="hidden md:inline-flex"
                  onClick={handleClearCart}
                  disabled={cartTotals.totalQuantity === 0}
                >
                  Clear
                </Button>
                <Button onClick={handleReviewCart} disabled={cartTotals.totalQuantity === 0}>
                  Review Cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}

function createMenuItemMap(menuByMeal: Record<MealType, MenuItem[]>) {
  const map: Record<number, MenuItem> = {}
  MEALS.forEach((meal) => {
    menuByMeal[meal]?.forEach((item) => {
      map[item.menu_item_id] = item
    })
  })
  return map
}
