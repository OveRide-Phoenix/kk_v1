"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { format as formatDate } from "date-fns"
import { Calendar, Clock } from "lucide-react"

import CustomerNavBar from "@/components/customer-nav-bar"
import { Button } from "@/components/ui/button"

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
  description: string
  picture_url: string | null
}

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "condiments"]

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  condiments: "Condiments",
}

const PLACEHOLDER_IMAGE = "/images/menu/placeholder.jpg"

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

export default function CustomerHomePage() {
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

  useEffect(() => {
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
              description: item.description ?? "",
              picture_url: item.picture_url ?? null,
            }))
          })
        )

        setMenuByMeal({
          breakfast: nextMenu.breakfast ?? [],
          lunch: nextMenu.lunch ?? [],
          dinner: nextMenu.dinner ?? [],
          condiments: nextMenu.condiments ?? [],
        })
      } catch (err) {
        console.error(err)
        setError("Unable to load today's menu. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [todayISO])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (top?.target.id && MEALS.includes(top.target.id as MealType)) {
          setActiveMeal(top.target.id as MealType)
        }
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0.1, 0.25, 0.4] }
    )

    MEALS.forEach((meal) => {
      const section = document.getElementById(meal)
      if (section) observer.observe(section)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToMeal = (meal: MealType) => {
    const element = document.getElementById(meal)
    if (!element) return
    const headerOffset = 100
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset
    window.scrollTo({ top: offsetPosition, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <CustomerNavBar />

      <main className="container mx-auto px-4 pt-24 pb-20">
        <section className="grid gap-6 rounded-3xl border border-[#e6dfd0] bg-white/70 p-6 md:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col justify-center gap-4">
            <p className="text-sm uppercase tracking-wide text-[#8d6e63]">Today&apos;s Menu</p>
            <h1 className="text-3xl font-serif font-semibold text-[#463028]">
              Crafted fresh, delivered warm.
            </h1>
            <p className="text-sm text-[#8d6e63]">
              Explore what the kitchen is cooking today across breakfast, lunch and dinner. Tap any item to learn more or start a one-time order.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#8d6e63]">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary">
                <Calendar className="h-4 w-4" /> {formatDate(new Date(), "MMM d, yyyy")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" /> Fast delivery slots available all day
              </span>
            </div>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/customer/new-order">Order now</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/customer/subscription">View subscriptions</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <Image
              src="/images/menu/hero.jpg"
              alt="Freshly prepared meal"
              fill
              priority
              className="rounded-2xl object-cover"
            />
          </div>
        </section>

        <section className="sticky top-20 z-10 mt-10 mb-6 flex justify-center gap-2">
          {MEALS.map((meal) => (
            <button
              key={meal}
              onClick={() => scrollToMeal(meal)}
              className={`px-4 py-1.5 rounded-full border border-primary capitalize font-serif text-sm transition-colors shadow ${
                activeMeal === meal
                  ? "bg-primary text-white"
                  : "bg-white text-primary hover:bg-primary/10"
              }`}
            >
              {MEAL_LABELS[meal]}
            </button>
          ))}
        </section>

        {error && (
          <div className="mx-auto mb-6 max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-[#8d6e63]">Loading today&apos;s menu…</div>
        ) : (
          <div className="space-y-12">
            {MEALS.map((meal) => (
              <section key={meal} id={meal} className="scroll-mt-24">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-serif font-semibold text-[#463028]">
                      {MEAL_LABELS[meal]}
                    </h2>
                    <p className="text-xs text-[#8d6e63]">
                      {menuByMeal[meal]?.length ? "Highlighted selections from the kitchen" : "No items available right now"}
                    </p>
                  </div>
                </div>
                {menuByMeal[meal]?.length ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {menuByMeal[meal].map((item) => (
                      <article
                        key={item.menu_item_id}
                        className="flex h-[120px] overflow-hidden rounded-xl border border-[#e6dfd0] bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                      >
                        <div className="relative h-full w-[120px] flex-shrink-0 bg-muted">
                          <Image
                            src={item.picture_url || PLACEHOLDER_IMAGE}
                            alt={item.item_name}
                            fill
                            sizes="120px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-3">
                          <div>
                            <h3 className="text-sm font-semibold text-[#463028]">
                              {item.item_name}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs text-[#8d6e63]">
                              {item.description || "Our chefs prepare this fresh daily."}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-[#463028]">
                            {currency(item.rate)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#8d6e63]">
                    Check back a little later for {MEAL_LABELS[meal].toLowerCase()} specials.
                  </p>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
