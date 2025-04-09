"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Coffee, Menu, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Header component with responsive navigation
 * Includes logo, navigation links, and contact information
 */
export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Handle scroll event to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu when clicking a link
  const handleLinkClick = () => {
    setMobileMenuOpen(false)
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-card/95 backdrop-blur-md shadow-md py-2" : "bg-transparent py-4",
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center group" aria-label="Kuteera Kitchen Home">
              <Coffee className="h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-12" />
              <span className="ml-2 text-xl font-serif font-bold">Kuteera Kitchen</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="#home"
              className="text-foreground/80 hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              Home
            </Link>
            <Link
              href="#menu"
              className="text-foreground/80 hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              Menu
            </Link>
            <Link
              href="#about"
              className="text-foreground/80 hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              About
            </Link>
            <Link
              href="#contact"
              className="text-foreground/80 hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              Contact
            </Link>
          </nav>

          {/* Contact */}
          <div className="hidden md:flex items-center">
            <a
              href="https://wa.me/919876543210"
              className="flex items-center text-primary hover:text-primary/80 transition-colors"
              aria-label="Contact us on WhatsApp"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              <span>+91 9876 543 210</span>
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="text-foreground hover:text-primary"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 bg-background/95 backdrop-blur-md z-40 transition-transform duration-300 transform md:hidden",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="container mx-auto px-4 py-20 h-full flex flex-col">
          <nav className="flex flex-col space-y-6 text-center text-lg">
            <Link
              href="#home"
              className="text-foreground hover:text-primary transition-colors py-2"
              onClick={handleLinkClick}
            >
              Home
            </Link>
            <Link
              href="#menu"
              className="text-foreground hover:text-primary transition-colors py-2"
              onClick={handleLinkClick}
            >
              Menu
            </Link>
            <Link
              href="#about"
              className="text-foreground hover:text-primary transition-colors py-2"
              onClick={handleLinkClick}
            >
              About
            </Link>
            <Link
              href="#contact"
              className="text-foreground hover:text-primary transition-colors py-2"
              onClick={handleLinkClick}
            >
              Contact
            </Link>
          </nav>

          <div className="mt-auto mb-10 text-center">
            <a
              href="https://wa.me/919876543210"
              className="flex items-center justify-center text-primary hover:text-primary/80 transition-colors"
              onClick={handleLinkClick}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              <span>+91 9876 543 210</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

