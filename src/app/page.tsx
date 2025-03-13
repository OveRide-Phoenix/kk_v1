"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Coffee } from "lucide-react";

// --- Main Home Page ---
export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5DC] text-foreground flex flex-col relative">
      {/* Navigation Bar with Updated Background Color */}
      <header className="bg-[#6F4D38] text-white border-b border-muted">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coffee className="h-6 w-6 text-white" />
              <a href="#" className="text-xl font-bold text-cream">
                Kuteera Kitchen
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4 items-center">
              <Link href="/" className="text-sm font-medium text-white hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-sm font-medium text-white hover:text-primary transition-colors">
                About
              </Link>
              <Link href="/services" className="text-sm font-medium text-white hover:text-primary transition-colors">
                Services
              </Link>
              <Link href="/contact" className="text-sm font-medium text-white hover:text-primary transition-colors">
                Contact
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                className="text-white hover:text-primary"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2 bg-[#6F4D38] text-white">
              <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent hover:text-primary">
                Home
              </Link>
              <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent hover:text-primary">
                About
              </Link>
              <Link href="/services" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent hover:text-primary">
                Services
              </Link>
              <Link href="/contact" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent hover:text-primary">
                Contact
              </Link>
              <Link href="/login" className="block px-3 py-2 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                Login
              </Link>
              <Link href="/register" className="block px-3 py-2 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section with Background Image */}
      <main className="relative flex-grow flex items-center justify-center text-center p-6 mt-12 bg-[url('/hero-bg.jpg')] bg-cover bg-center">
        <div className="relative z-10 bg-white/80 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold text-primary">Welcome to Kuteera Kitchen</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-lg">
            Experience fresh, homemade meals delivered right to your doorstep in Mysore and Bangalore.
          </p>
          <div>
          <Link href="/register">
            <Button className="mt-6 px-6 py-3 text-sm text-white border-primary hover:bg-primary hover:text-white rounded-full">
              Get Started
            </Button>
          </Link></div>
         
          <Link href="/login">
            <Button variant="outline" className="text-sm mt-4 text-primary border-primary hover:bg-primary hover:text-white rounded-full">
              Login
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer with Social Links */}
      <footer className="py-6 border-t border-muted w-full text-center text-sm bg-[#6F4D38] text-white">
        <p>© {new Date().getFullYear()} Kuteera Kitchen. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}