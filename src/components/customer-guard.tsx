"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/store/store"

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-shell text-[#463028]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-4 text-sm text-[#8d6e63]">Checking your session…</p>
    </div>
  )
}

export default function CustomerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const logout = useAuthStore((state) => state.logout)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    const ensureAuthenticated = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

        if (!token) {
          logout()
          if (!cancelled) router.replace("/")
          return
        }

        if (!user) {
          const response = await fetch("/api/backend/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!response.ok) {
            logout()
            if (!cancelled) router.replace("/")
            return
          }
          const me = await response.json()
          if (cancelled) return
          setUser(me)
          if (me.role !== "customer") {
            logout()
            router.replace("/")
            return
          }
        } else if (user.role && user.role !== "customer") {
          logout()
          router.replace("/")
          return
        }
      } catch (error) {
        console.error("Customer auth guard error", error)
        logout()
        if (!cancelled) router.replace("/")
        return
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    ensureAuthenticated()

    return () => {
      cancelled = true
    }
  }, [router, pathname, user, setUser, logout])

  if (checking) {
    return <LoadingScreen />
  }

  return <>{children}</>
}
