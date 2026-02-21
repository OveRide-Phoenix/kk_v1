"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"

export default function CultureSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef
      const scrollAmount = 300

      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" })
      } else {
        current.scrollBy({ left: scrollAmount, behavior: "smooth" })
      }
    }
  }

  return (
    <section id="about" className="py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold mb-4">Our Culture</h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            We take pride in our traditional cooking methods and use only the freshest ingredients to create authentic
            home-cooked meals.
          </p>
        </div>

        <div className="relative mb-16">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          <div ref={scrollContainerRef} className="flex overflow-x-auto gap-4 py-4 scrollbar-hide">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="flex-none w-64 md:w-80 aspect-[4/3] rounded-lg overflow-hidden">
                <img
                  src={`/placeholder.svg?height=300&width=400&text=Kitchen+Image+${item}`}
                  alt={`Kitchen culture ${item}`}
                  className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                />
              </div>
            ))}
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="bg-accent rounded-lg p-8 md:p-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <Quote className="h-12 w-12 text-primary" />
            </div>
            <blockquote className="text-lg md:text-xl text-center mb-6">
              "Kuteera Kitchen brings the authentic taste of home to my doorstep. Their meals remind me of my
              grandmother's cooking - full of flavor, made with love, and always fresh. I've been a loyal customer for
              over a year now!"
            </blockquote>
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                <img
                  src="/placeholder.svg?height=100&width=100&text=Avatar"
                  alt="Customer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium">Priya Sharma</p>
                <p className="text-sm text-foreground/70">Loyal Customer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

