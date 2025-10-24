"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, User, ChevronDown, Menu } from "lucide-react"
import Sidebar from "@/components/sidebar"
import { useAuthStore } from "@/store/store"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface AdminLayoutProps {
  children: React.ReactNode
  activePage: string
}

export function AdminLayout({ children, activePage }: AdminLayoutProps) {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const setAdmin = useAuthStore((state) => state.setAdmin)
  const setUser = useAuthStore((state) => state.setUser)
  const router = useRouter()
  const { toast } = useToast()

  const [isHydrated, setIsHydrated] = useState(false)
  const displayName =
    isHydrated && typeof user?.name === "string" && user.name.trim().length > 0
      ? user.name.trim()
      : "Admin"
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const sessionWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionExpiryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tokenVersion, setTokenVersion] = useState(0)

  const clearSessionTimers = useCallback(() => {
    if (sessionWarningTimeoutRef.current) {
      clearTimeout(sessionWarningTimeoutRef.current)
      sessionWarningTimeoutRef.current = null
    }
    if (sessionExpiryTimeoutRef.current) {
      clearTimeout(sessionExpiryTimeoutRef.current)
      sessionExpiryTimeoutRef.current = null
    }
  }, [])

  const handleLogout = useCallback(() => {
    clearSessionTimers()
    logout()
    router.push("/login")
  }, [clearSessionTimers, logout, router])

  const handleSessionExpired = useCallback(() => {
    setSessionDialogOpen(false)
    handleLogout()
  }, [handleLogout])

  const handleRefreshSession = useCallback(async () => {
    const refreshToken = (() => {
      try {
        return localStorage.getItem("refresh_token")
      } catch {
        return null
      }
    })()

    if (!refreshToken) {
      toast({
        title: "Session expired",
        description: "Unable to refresh session. Please log in again.",
        variant: "destructive",
      })
      handleSessionExpired()
      return
    }

    try {
      const response = await fetch("/api/backend/auth/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      })

      const data = await response.json()
      if (!response.ok || !data?.access_token) {
        throw new Error(typeof data?.detail === "string" ? data.detail : "Failed to refresh session")
      }

      try {
        localStorage.setItem("access_token", data.access_token)
      } catch {
        /* ignore storage errors */
      }

      setSessionDialogOpen(false)
      clearSessionTimers()
      setTokenVersion((prev) => prev + 1)

      try {
        const meRes = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        })
        if (meRes.ok) {
          const userInfo = await meRes.json()
          setUser(userInfo)
          setAdmin(userInfo?.role === "admin")
        }
      } catch {
        /* ignore */
      }

      toast({ title: "Session extended", description: "You are still signed in." })
    } catch (error) {
      toast({
        title: "Session refresh failed",
        description: error instanceof Error ? error.message : "Unable to refresh session.",
        variant: "destructive",
      })
      handleSessionExpired()
    }
  }, [clearSessionTimers, handleSessionExpired, setAdmin, setUser, toast])
  
  // Check if we're on mobile and set initial collapsed state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }
    
    // Set initial state
    handleResize()
    
    // Add event listener
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    clearSessionTimers()

    const token = (() => {
      try {
        return localStorage.getItem("access_token")
      } catch {
        return null
      }
    })()

    if (!token) {
      setSessionDialogOpen(false)
      return
    }

    const payload = decodeJwt(token)
    const exp = typeof payload?.exp === "number" ? payload.exp * 1000 : null
    if (!exp) {
      setSessionDialogOpen(false)
      return
    }

    const now = Date.now()
    const msUntilExpiry = exp - now

    if (msUntilExpiry <= 0) {
      handleSessionExpired()
      return
    }

    const WARNING_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes before expiry
    const warningDelay = Math.max(0, msUntilExpiry - WARNING_THRESHOLD_MS)

    sessionWarningTimeoutRef.current = setTimeout(() => {
      setSessionDialogOpen(true)
    }, warningDelay)

    sessionExpiryTimeoutRef.current = setTimeout(() => {
      handleSessionExpired()
    }, msUntilExpiry)

    setSessionDialogOpen(false)

    return () => {
      clearSessionTimers()
    }
  }, [clearSessionTimers, handleSessionExpired, isHydrated, tokenVersion])

  const getPageTitle = () => {
    switch (activePage) {
      case "dashboard":
        return "Dashboard Overview"
      case "productmgmt":
        return "Product Management"
      case "customermgmt":
        return "Customer Management"
      case "dailymenusetup":
        return "Daily Menu Setup"
      case "production":
        return "Kitchen Production Planning"
      case "reports":
        return "Reports & Analytics"
      case "ordertest":
        return "Developer · Order Test"
      case "dbschema":
        return "Developer · DB Schema"
      case "dev-auto-menu":
        return "Developer · Auto Menu"
      default:
        return "Dashboard"
    }
  }

  return (
    <>
      <div className="flex min-h-screen bg-background">
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        activePage={activePage} 
        setActivePage={() => {}}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden" 
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
            </div>

            <nav className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="hidden md:inline-block">{displayName}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      </div>

      <Dialog open={sessionDialogOpen} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session expiring soon</DialogTitle>
            <DialogDescription>
              Your admin session is about to expire. Stay signed in to keep working or log out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
            <Button onClick={handleRefreshSession}>Stay signed in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function decodeJwt(token: string): { exp?: number } | null {
  try {
    if (typeof window === "undefined") return null
    const parts = token.split(".")
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
    const decoded = window.atob(padded)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}
