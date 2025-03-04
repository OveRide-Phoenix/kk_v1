"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Coffee } from "lucide-react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Bar */}
      <header className="border-b border-muted">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coffee className="h-6 w-6 text-primary" />
              <a href="#" className="text-xl font-bold text-cream">
                Kuteera Kitchen
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                About
              </Link>
              <Link href="/services" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                Services
              </Link>
              <Link href="/contact" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                Contact
              </Link>
              <Link href="/login">
                <Button variant="outline" className="text-sm">
                  Login
                </Button>
              </Link>
            
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                className="text-foreground hover:text-primary">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2">
              <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary">
                Home
              </Link>
              <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary">
                About
              </Link>
              <Link href="/services" className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary">
                Services
              </Link>
              <Link href="/contact" className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary">
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

      {/* Hero Section */}
      <main className="flex flex-col items-center text-center p-6 mt-12">
        <h1 className="text-4xl font-bold text-primary">Welcome to Kuteera Kitchen</h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-lg">
          Experience fresh, homemade meals delivered right to your doorstep in Mysore and Bangalore.
        </p>
        <Link href="/login">
          <Button className="mt-6 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground">
            Get Started
          </Button>
        </Link>
              <Link href="/register">
                <Button variant="outline" className="text-sm">
                  Register
                </Button>
              </Link>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-muted w-full text-center text-sm">
        © {new Date().getFullYear()} Kuteera Kitchen. All rights reserved.
      </footer>
    </div>
  );
}
