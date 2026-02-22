"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google"
import { useEffect, useRef, useState } from "react"

import { useAuthStore } from "@/store/store"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-v2-playfair",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-v2-plus-jakarta",
})

const CART_STORAGE_KEY = "customer_cart_items"
const CART_CONTEXT_KEY = "customer_cart_context"

export default function CustomerV2Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useAuthStore((state) => state.logout)
  const [cartCount, setCartCount] = useState(0)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [pendingDestination, setPendingDestination] = useState<string | null>(null)
  const lastCartRawRef = useRef<string>("")

  useEffect(() => {
    const readCartCount = () => {
      if (typeof window === "undefined") return
      const raw = localStorage.getItem(CART_STORAGE_KEY) || ""
      if (raw === lastCartRawRef.current) return
      lastCartRawRef.current = raw
      if (!raw) {
        setCartCount(0)
        return
      }
      try {
        const items = JSON.parse(raw) as Array<{ quantity?: number }>
        const total = Array.isArray(items)
          ? items.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
          : 0
        setCartCount(total)
      } catch {
        setCartCount(0)
      }
    }

    readCartCount()
    const interval = window.setInterval(readCartCount, 500)
    const onStorage = () => readCartCount()
    window.addEventListener("storage", onStorage)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const currentPath = pathname ?? ""
    const onProtectedPage =
      currentPath.startsWith("/customer-v2/new-order") || currentPath.startsWith("/customer-v2/cart")
    if (!onProtectedPage || cartCount <= 0) return

    const normalizePath = (value: string) => (value.length > 1 ? value.replace(/\/+$/, "") : value)

    const handleNavigationAttempt = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const anchor = target?.closest<HTMLAnchorElement>("a")
      if (!anchor) return
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return

      let destination: URL
      try {
        destination = new URL(href, window.location.href)
      } catch {
        return
      }

      if (destination.origin !== window.location.origin) return
      const nextPath = normalizePath(destination.pathname)
      const current = normalizePath(currentPath)
      if (nextPath === current) return

      const isStayingInOrderFlow =
        nextPath.startsWith("/customer-v2/new-order") || nextPath.startsWith("/customer-v2/cart")
      if (isStayingInOrderFlow) return

      event.preventDefault()
      event.stopPropagation()

      setPendingDestination(`${destination.pathname}${destination.search}${destination.hash}`)
      setConfirmLeaveOpen(true)
    }

    document.addEventListener("click", handleNavigationAttempt, true)
    return () => {
      document.removeEventListener("click", handleNavigationAttempt, true)
    }
  }, [cartCount, pathname])

  const confirmLeaveAndNavigate = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY)
      localStorage.removeItem(CART_CONTEXT_KEY)
    }
    setCartCount(0)
    const next = pendingDestination
    setPendingDestination(null)
    setConfirmLeaveOpen(false)
    if (next) {
      router.push(next)
    }
  }

  const linkClass = (href: string) => {
    const current = pathname ?? ""
    const normalizedCurrent = current.length > 1 ? current.replace(/\/+$/, "") : current
    const normalizedHref = href.length > 1 ? href.replace(/\/+$/, "") : href
    const isActive =
      normalizedCurrent === normalizedHref ||
      normalizedCurrent.startsWith(`${normalizedHref}/`)

    return isActive
      ? "border-b-2 border-[#8D4925] pb-1 font-bold text-[#8D4925]"
      : "font-medium text-gray-600 transition-colors hover:text-[#8D4925]"
  }

  return (
    <div
      className={`${playfair.variable} ${plusJakarta.variable} min-h-screen bg-[#fdfaf1] text-gray-900`}
      style={{ fontFamily: "var(--font-v2-plus-jakarta)", fontSize: "13.5px" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");
            .material-symbols-outlined {
              font-family: "Material Symbols Outlined";
              font-weight: normal;
              font-style: normal;
              font-size: 24px;
              line-height: 1;
              letter-spacing: normal;
              text-transform: none;
              display: inline-block;
              white-space: nowrap;
              word-wrap: normal;
              direction: ltr;
              -webkit-font-feature-settings: "liga";
              -webkit-font-smoothing: antialiased;
              font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
            }
          `,
        }}
      />

      <nav className="sticky top-0 z-50 border-b border-orange-100 bg-[#fdfaf1]/95 backdrop-blur-md">
        <div className="mx-auto h-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8D4925]/10">
                <span className="material-symbols-outlined text-[#8D4925]">restaurant</span>
              </div>
              <span
                className="text-2xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                Kuteera Kitchen
              </span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <Link className={linkClass("/customer-v2/home")} href="/customer-v2/home">
                Home
              </Link>
              <Link className={linkClass("/customer-v2/new-order")} href="/customer-v2/new-order">
                Order
              </Link>
              <Link className={linkClass("/customer-v2/subscription")} href="/customer-v2/subscription">
                Subscription
              </Link>
              <Link
                className={`relative flex items-center gap-1 font-medium transition-colors ${
                  (pathname ?? "").startsWith("/customer-v2/cart")
                    ? "text-[#8D4925]"
                    : "text-gray-600 hover:text-[#8D4925]"
                }`}
                href="/customer-v2/cart"
              >
                <span className="material-symbols-outlined text-2xl">shopping_cart</span>
                {cartCount > 0 ? (
                  <span className="absolute -right-3 -top-3 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#8D4925] px-1.5 text-[10px] font-bold leading-5 text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </Link>
              <div className="flex items-center gap-3 border-l border-orange-100 pl-4">
                <a className="flex items-center gap-1 font-medium text-gray-600 transition-colors hover:text-[#8D4925]" href="#">
                  <span className="material-symbols-outlined relative text-2xl">
                    notifications
                    <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-[#fdfaf1] bg-red-500"></span>
                  </span>
                </a>
                <Link className="group flex items-center gap-2" href="/customer-v2/account">
                  <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-[#8D4925]/20 bg-orange-100 p-0.5">
                    <img
                      alt="User Profile"
                      className="h-full w-full rounded-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoLZbX-XKgbESxdE3pDbYuatyFyTcmtUV3S_652YJvY3nb7-tg5aYqrtYBI54YguxqGJJ7JoR6S6QwNqGEOTrzPKrYmkRTY18fjM9o2ldrCX__h7OPCbM62C6l5gHRgVRNNzsBpRVSgTwLvf265AYvDmDLlJFgqlg20srdDTFORam8PkOzqk8X6B0BW_YW9DtCWbk0ExPGClctG-ULqvlGqy4rsQZUYDpwI9i4pQsfWlSwokrfq_acZjz9PgglFealBobkrrnxwFs3"
                    />
                  </div>
                  <span
                    className={`text-sm font-bold transition-colors group-hover:text-[#8D4925] ${
                      (pathname ?? "").startsWith("/customer-v2/account") ? "text-[#8D4925]" : "text-gray-700"
                    }`}
                  >
                    Profile
                  </span>
                </Link>
                <button
                  onClick={async () => {
                    await logout()
                    router.replace("/login")
                  }}
                  className="inline-flex items-center justify-center text-gray-600 transition-colors hover:text-[#8D4925]"
                  aria-label="Logout"
                  title="Logout"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {children}

      <footer className="mt-20 border-t border-orange-100 bg-[#fdfaf1] pb-12 pt-16 transition-colors">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-12">
          <div className="col-span-1 md:col-span-4">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8D4925] text-white shadow-md">
                <span className="material-symbols-outlined text-xl text-white">restaurant</span>
              </div>
              <span className="text-2xl font-bold text-[#8D4925]" style={{ fontFamily: "var(--font-v2-playfair)" }}>
                Kuteera Kitchen
              </span>
            </div>
            <p className="mb-8 text-base leading-relaxed text-gray-600">
              Bringing the authentic taste of South Indian kitchens to your home, one meal at a time. Healthy, fresh, and soulful.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-orange-100 bg-white px-3 py-1.5 shadow-sm">
                <span className="material-symbols-outlined text-xl text-[#114232]">verified_user</span>
                <div>
                  <p className="mb-0.5 text-[10px] font-bold uppercase leading-none text-gray-400">Safety Assured</p>
                  <p className="text-xs font-bold text-gray-700">Hygienic Kitchen</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-orange-100 bg-white px-3 py-1.5 shadow-sm">
                <span className="material-symbols-outlined text-xl text-[#8D4925]">workspace_premium</span>
                <div>
                  <p className="mb-0.5 text-[10px] font-bold uppercase leading-none text-gray-400">Certified by</p>
                  <p className="text-xs font-bold uppercase text-gray-700">FSSAI</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <h5 className="mb-6 text-sm font-bold uppercase tracking-wider text-gray-900">Quick Links</h5>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><a className="flex items-center gap-2 transition-colors hover:text-[#8D4925]" href="#"><span className="h-1.5 w-1.5 rounded-full bg-orange-200"></span> How it Works</a></li>
              <li><a className="flex items-center gap-2 transition-colors hover:text-[#8D4925]" href="#"><span className="h-1.5 w-1.5 rounded-full bg-orange-200"></span> Pricing Plans</a></li>
              <li><a className="flex items-center gap-2 transition-colors hover:text-[#8D4925]" href="#"><span className="h-1.5 w-1.5 rounded-full bg-orange-200"></span> Daily Menu</a></li>
              <li><a className="flex items-center gap-2 transition-colors hover:text-[#8D4925]" href="#"><span className="h-1.5 w-1.5 rounded-full bg-orange-200"></span> Corporate Gifting</a></li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-2">
            <h5 className="mb-6 text-sm font-bold uppercase tracking-wider text-gray-900">Support</h5>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><a className="transition-colors hover:text-[#8D4925]" href="#">Help Center</a></li>
              <li><a className="transition-colors hover:text-[#8D4925]" href="#">Contact Us</a></li>
              <li><a className="transition-colors hover:text-[#8D4925]" href="#">Privacy Policy</a></li>
              <li><a className="transition-colors hover:text-[#8D4925]" href="#">Terms of Service</a></li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-4">
            <h5 className="mb-6 text-sm font-bold uppercase tracking-wider text-gray-900">Download Our App</h5>
            <p className="mb-6 text-sm text-gray-500">Order faster and track your subscription on the go.</p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <button className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-5 py-2.5 text-white shadow-lg transition-all hover:bg-gray-800">
                <span className="material-symbols-outlined text-2xl">smartphone</span>
                <div className="text-left">
                  <p className="text-[9px] font-bold uppercase leading-none text-gray-400">Download on</p>
                  <p className="text-sm font-bold leading-tight">App Store</p>
                </div>
              </button>
              <button className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-5 py-2.5 text-white shadow-lg transition-all hover:bg-gray-800">
                <span className="material-symbols-outlined text-2xl">shop</span>
                <div className="text-left">
                  <p className="text-[9px] font-bold uppercase leading-none text-gray-400">Get it on</p>
                  <p className="text-sm font-bold leading-tight">Google Play</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 items-center gap-4 border-t border-orange-100 px-6 pt-12 text-xs font-medium text-gray-500 md:grid-cols-3">
          <div className="text-center md:text-left">
            <p>© 2024 Kuteera Kitchen Services. All rights reserved.</p>
          </div>
          <div className="text-center">
            <p>Designed with ❤️ for authentic home-cooked meals</p>
          </div>
          <div className="flex justify-center gap-6 md:justify-end">
            <a className="transition-colors hover:text-[#8D4925]" href="#">Facebook</a>
            <a className="transition-colors hover:text-[#8D4925]" href="#">Instagram</a>
            <a className="transition-colors hover:text-[#8D4925]" href="#">Twitter</a>
          </div>
        </div>
      </footer>

      <Dialog
        open={confirmLeaveOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmLeaveOpen(false)
            setPendingDestination(null)
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Leave this page?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8d6e63]">
            Cart will be emptied. Are you sure you want to leave?
          </p>
          <DialogFooter className="mt-4">
            <button
              onClick={() => {
                setConfirmLeaveOpen(false)
                setPendingDestination(null)
              }}
              className="rounded-md border border-[#8D4925]/20 px-4 py-2 text-sm font-semibold text-[#8D4925] transition-colors hover:bg-orange-50"
            >
              Stay here
            </button>
            <button
              onClick={confirmLeaveAndNavigate}
              className="rounded-md bg-[#8D4925] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7a3f20]"
            >
              Leave page
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
