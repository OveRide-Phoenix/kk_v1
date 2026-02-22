"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-sm shadow-md" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <h2 className="text-xl font-bold">Kuteera Kitchen</h2>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost">Home</Button>
            <Button variant="ghost">Menu</Button>
            <Button variant="ghost">About</Button>
            <Button variant="ghost">Contact</Button>
            <Button>Order Now</Button>
          </div>
        </div>
      </div>
    </nav>
  )
}