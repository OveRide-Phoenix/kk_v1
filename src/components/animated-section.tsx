"use client"

import type React from "react"

import type { ReactNode } from "react"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { cn } from "@/lib/utils"

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  animation?: "fade-in" | "slide-up" | "slide-in-right" | "slide-in-left" | "scale"
  delay?: number
  threshold?: number
  id?: string
}

/**
 * A section that animates when it enters the viewport
 * Uses Intersection Observer to trigger animations
 */
export default function AnimatedSection({
  children,
  className,
  animation = "fade-in",
  delay = 0,
  threshold = 0.1,
  id,
}: AnimatedSectionProps) {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold })

  // Map animation type to CSS class
  const animationClass = {
    "fade-in": "animate-fade-in",
    "slide-up": "animate-slide-up",
    "slide-in-right": "animate-slide-in-right",
    "slide-in-left": "animate-slide-in-left",
    scale: "animate-scale",
  }[animation]

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={cn("transition-opacity duration-700", isIntersecting ? animationClass : "opacity-0", className)}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
      }}
      id={id}
    >
      {children}
    </section>
  )
}

