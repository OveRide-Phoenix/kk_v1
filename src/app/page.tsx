"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/header"
import HeroSection from "@/components/hero-section"
import MenuSections from "@/components/menu-section"
import CultureSection from "@/components/culture-section"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Coffee, Menu } from "lucide-react"

/**
 * Main landing page component that brings all sections together
 */
export default function Home() {
  const router = useRouter()

  // Add smooth scrolling behavior for anchor links
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest("a")

      const href = anchor?.getAttribute("href")
      if (anchor && href?.startsWith("#") && href.length > 1) {
        e.preventDefault()

        const targetId = href.substring(1)
        const targetElement = document.getElementById(targetId || "")

        if (targetElement) {
          // Add offset for fixed header
          const headerOffset = 80
          const elementPosition = targetElement.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.scrollY - headerOffset

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          })
        }
      }
    }

    document.addEventListener("click", handleAnchorClick)

    return () => {
      document.removeEventListener("click", handleAnchorClick)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-muted">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Coffee className="h-6 w-6 text-primary" />
              <a href="#" className="text-xl font-bold">
                Kuteera Kitchen
              </a>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-sm font-medium hover:text-primary">Home</a>
              <a href="#" className="text-sm font-medium hover:text-primary">Menu</a>
              <a href="#" className="text-sm font-medium hover:text-primary">About</a>
              <a href="#" className="text-sm font-medium hover:text-primary">Contact</a>
              
              {/* Phone number */}
              <a href="tel:+919876543210" className="text-sm font-medium">
                +91 98 7654 3210
              </a>

              {/* Auth buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/login')}
                  className="text-sm"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => router.push('/register')}
                  className="bg-primary hover:bg-primary/90 text-white text-sm"
                >
                  Register
                </Button>
              </div>
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <HeroSection />
        <MenuSections />
        <CultureSection />
      </main>
      <Footer />
    </div>
  )
}

