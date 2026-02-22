"use client"

import { useEffect, useMemo, useState, type ComponentProps } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Crown, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/store"

type ButtonVariant = ComponentProps<typeof Button>["variant"]

type CustomerNavBarProps = {
  unauthLinks?: Array<{
    href: string
    label: string
    variant?: ButtonVariant
  }>
}

export default function CustomerNavBar({ unauthLinks }: CustomerNavBarProps = {}) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const logout = useAuthStore((state) => state.logout)
  const router = useRouter()
  const pathname = usePathname()
  const userRecord = user as Record<string, unknown> | null

  const navLinkClass = (href: string, options?: { disabled?: boolean }) => {
    const disabled = options?.disabled
    let isActive = false
    const normalize = (value: string) => (value.length > 1 ? value.replace(/\/+$/, "") : value)
    if (href === "/customer/home") {
      const homeVariants = ["/customer", "/customer/", "/customer/home"]
      isActive = homeVariants.includes(pathname)
    } else {
      const current = normalize(pathname)
      const target = normalize(href)
      isActive = current === target || current.startsWith(`${target}/`)
    }

    const base = "relative px-3 py-2 text-sm font-medium transition-all duration-200"
    if (disabled) {
      return `${base} text-[#8d6e63] opacity-60 cursor-not-allowed`
    }
    return `${base} ${isActive ? "text-primary" : "text-[#463028] hover:text-primary"}`
  }

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (user) return
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token) return
    ;(async () => {
      try {
        const meResponse = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!meResponse.ok) return
        const me = await meResponse.json()
        setUser(me)
      } catch (error) {
        console.error("Failed to fetch user context", error)
      }
    })()
  }, [hydrated, user, setUser])

  const derivedRoleCodes = useMemo(() => {
    const codes = new Set<string>()

    const addCodes = (source: unknown) => {
      if (!source) return
      if (Array.isArray(source)) {
        for (const entry of source) {
          if (typeof entry === "string") {
            const trimmed = entry.trim()
            if (trimmed) {
              codes.add(trimmed.toLowerCase())
            }
          } else if (entry && typeof entry === "object" && "code" in entry) {
            const value = (entry as { code?: unknown }).code
            if (typeof value === "string") {
              const trimmed = value.trim()
              if (trimmed) {
                codes.add(trimmed.toLowerCase())
              }
            }
          }
        }
      }
    }

    addCodes(userRecord?.["role_codes"])
    addCodes(userRecord?.["roleCodes"])
    addCodes(userRecord?.["role_details"])
    addCodes(userRecord?.["roleDetails"])

    return codes
  }, [userRecord])

  const isAdmin =
    Boolean(
      hydrated &&
        user &&
        (derivedRoleCodes.has("admin") || Boolean(userRecord?.["is_admin"]))
    )

  const hasUser = hydrated && Boolean(user)
  const displayName =
    (typeof user?.name === "string" && user.name.trim()) ||
    (typeof user?.phone === "string" && user.phone.trim()) ||
    "Customer"

  if (pathname?.startsWith("/customer-v2")) {
    return null
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-[#faf7f2]/95 backdrop-blur-sm shadow-md" : "bg-[#faf7f2]"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/customer/home" className="text-xl font-bold text-[#463028]">
              Kuteera Kitchen
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="relative group">
              <Link href="/customer/home" className={navLinkClass("/customer/home")}>Home</Link>
            </div>
            <div className="relative group">
              <Link href="/customer/new-order" className={navLinkClass("/customer/new-order")}>
                New Order
              </Link>
            </div>
            <div className="relative group">
              <span className={navLinkClass("/customer/subscription", { disabled: true })}>Subscription</span>
            </div>
            <div className="pl-6 text-sm text-[#463028]">
              {hasUser ? (
                <div className="flex items-center gap-2">
                  {isAdmin && <Crown className="h-4 w-4 text-amber-500" />}
                  <Link
                    href="/customer/account"
                    className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                  >
                    <User className="h-4 w-4 text-[#463028]" aria-hidden="true" />
                    <span>{displayName}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      logout()
                      router.push("/")
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {(unauthLinks?.length ? unauthLinks : [
                    { href: "/register", label: "Register" },
                    { href: "/login", label: "Sign in", variant: "outline" as ButtonVariant },
                  ]).map(({ href, label, variant }) => (
                    <Button key={href} asChild variant={variant ?? "default"} size="sm">
                      <Link href={href}>{label}</Link>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
