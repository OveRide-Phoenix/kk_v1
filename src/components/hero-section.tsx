"use client"

import type React from "react"

import { useParallax } from "@/hooks/use-parallax"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import NavBar from "@/components/nav-bar"


export default function HeroSection() {
  // Use parallax effect for background elements
  const { ref: parallaxBg } = useParallax({ speed: 0.2 })
  const { ref: parallaxImage1 } = useParallax({ speed: 0.3, direction: "down" })
  const { ref: parallaxImage2 } = useParallax({ speed: 0.4 })

  return (
    <>
      <section id="home" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background pattern with parallax effect */}
        <div
          ref={parallaxBg as React.RefObject<HTMLDivElement>}
          className="absolute inset-0 opacity-5 bg-food-pattern"
          aria-hidden="true"
        ></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text content */}
            <div className="text-center lg:text-left animate-slide-up">
              <h1 className="text-3xl md:text-5xl lg:text-8xl font-bold leading-tight mb-6">
                Kuteera Kitchen
              </h1>
              <p
                className="text-lg md:text-xl text-foreground/80 mb-8 animate-fade-in"
                style={{ animationDelay: "300ms" }}
              >
                Freshly Prepared, Authentic Home-Cooked Meals Delivered to Your Doorstep
              </p>
              <div
                className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 animate-fade-in"
                style={{ animationDelay: "600ms" }}
              >
                <Button size="lg" className="rounded-full group">
                  Order Now
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button size="lg" variant="outline" className="rounded-full">
                  View Menu
                </Button>
              </div>
            </div>

            {/* Image grid with parallax effects */}
            <div className="grid grid-cols-12 gap-4 h-[500px]">
              {/* Main image */}
              <div
                ref={parallaxImage1 as React.RefObject<HTMLDivElement>}
                className="col-span-8 row-span-2 relative rounded-lg overflow-hidden shadow-xl animate-slide-in-right"
                style={{ animationDelay: "300ms" }}
              >
                <img
                  src="/images/hero/thali.png"
                  alt="Delicious South Indian meal"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>

              {/* Secondary images */}
              <div
                className="col-span-4 relative rounded-lg overflow-hidden shadow-lg animate-slide-in-left"
                style={{ animationDelay: "500ms" }}
              >
                <img
                  src="/images/hero/dosa.png"
                  alt="Crispy dosa"
                  className="w-full h-full object-cover"
                />
              </div>

              <div
                ref={parallaxImage2 as React.RefObject<HTMLDivElement>}
                className="col-span-4 relative rounded-lg overflow-hidden shadow-lg animate-slide-in-left"
                style={{ animationDelay: "700ms" }}
              >
                <img
                  src="/images/hero/idli.png"
                  alt="Soft idli with sambar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Decorative curved shape at the bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-secondary/50"
          style={{ clipPath: "ellipse(70% 100% at 50% 100%)" }}
        ></div>
      </section>
    </>
  )
}

