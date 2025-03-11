"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Coffee } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Geometric Background Components ---//  doesnt work well (update with somethign else)
function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

function GeometricBackground() {
  return (
    <>
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />
      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-indigo-500/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-500/[0.15]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.15]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-amber-500/[0.15]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-cyan-500/[0.15]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80 pointer-events-none" />
    </>
  );
}

// --- Main Home Page ---

  export default function HomePage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
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
            <nav className="hidden md:flex space-x-4 items-center">
              <Link
                href="/"
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                About
              </Link>
              <Link
                href="/services"
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                Services
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
              >
                Contact
              </Link>
              <Link href="/login">
                <Button variant="outline" className="text-sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="outline"
                  className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Register
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
                className="text-foreground hover:text-primary"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2">
              <Link
                href="/"
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary"
              >
                About
              </Link>
              <Link
                href="/services"
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary"
              >
                Services
              </Link>
              <Link
                href="/contact"
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary"
              >
                Contact
              </Link>
              <Link
                href="/login"
                className="block px-3 py-2 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="block px-3 py-2 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section with Geometric Background */}
      <main className="relative flex-grow flex items-center justify-center text-center p-6 mt-12">
        {/* Background layer */}
        <GeometricBackground />
        {/* Foreground hero content */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-primary">
            Welcome to Kuteera Kitchen
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-lg">
            Experience fresh, homemade meals delivered right to your doorstep
            in Mysore and Bangalore.
          </p>
          <Link href="/register">
            <Button className="mt-6 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground">
              Get Started / Register
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="text-sm mt-4">
              Login
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-muted w-full text-center text-sm">
        © {new Date().getFullYear()} Kuteera Kitchen. All rights reserved.
      </footer>
    </div>
  );
}
