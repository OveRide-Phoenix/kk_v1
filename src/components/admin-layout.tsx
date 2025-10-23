"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, User, ChevronDown, Menu } from "lucide-react"
import Sidebar from "@/components/sidebar"
import { useAuthStore } from "@/store/store"

interface AdminLayoutProps {
  children: React.ReactNode
  activePage: string
}

export function AdminLayout({ children, activePage }: AdminLayoutProps) {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const displayName =
    (typeof user?.name === "string" && user.name.trim().length > 0
      ? user.name.trim()
      : undefined) ?? "Admin"
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  
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
      default:
        return "Dashboard"
    }
  }

  return (
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
  )
}
