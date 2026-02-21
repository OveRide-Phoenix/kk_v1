"use client"

import { useEffect, useRef } from "react"
import { debounce } from "@/lib/utils"

interface UseParallaxProps {
  speed?: number
  direction?: "up" | "down"
}

/**
 * Custom hook that creates a parallax scrolling effect on an element
 */
export function useParallax({ speed = 0.5, direction = "up" }: UseParallaxProps = {}) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Initial position setup
    const setTransform = () => {
      if (!element) return

      const scrollTop = window.scrollY
      const elementTop = element.getBoundingClientRect().top + scrollTop
      const elementHeight = element.offsetHeight
      const windowHeight = window.innerHeight

      // Calculate how far the element is from the viewport center
      const distanceFromCenter = elementTop + elementHeight / 2 - (scrollTop + windowHeight / 2)

      // Apply parallax effect based on distance and direction
      const translateY = distanceFromCenter * speed * (direction === "up" ? -1 : 1)

      // Apply the transform
      element.style.transform = `translate3d(0, ${translateY}px, 0)`
    }

    // Debounce the scroll handler for better performance
    const handleScroll = debounce(setTransform, 10)

    // Set initial position
    setTransform()

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [speed, direction])

  return { ref }
}

