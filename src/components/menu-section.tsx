"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Utensils, ShoppingBag } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import AnimatedSection from "./animated-section"

// Menu item interface
interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image: string
  tags?: string[]
}

// Menu section props
interface MenuSectionProps {
  title: string
  items: MenuItem[]
  index: number
}

/**
 * Individual menu section component (Breakfast, Lunch, or Dinner)
 */
function MenuSection({ title, items, index }: MenuSectionProps) {
  // Use intersection observer to trigger animations
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 })

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="py-12">
      <div className="flex items-center justify-center mb-8">
        <div className="h-px bg-border flex-grow max-w-xs"></div>
        <div className="mx-4 flex items-center">
          <Utensils className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-2xl md:text-3xl font-serif font-bold">{title}</h2>
        </div>
        <div className="h-px bg-border flex-grow max-w-xs"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`flex border rounded-lg overflow-hidden bg-card hover:hover-lift transition-all duration-300 ${
              isIntersecting ? "animate-fade-in" : "opacity-0"
            }`}
            style={{ animationDelay: `${i * 100 + 200}ms` }}
          >
            <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                className="w-full h-full object-cover transition-transform hover:scale-110 duration-500"
              />
            </div>
            <div className="flex-grow p-4">
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{item.name}</h3>
                <span className="font-medium text-primary">{formatPrice(item.price)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              {item.tags && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 bg-secondary rounded-full text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button className="rounded-full group">
          Order Now
          <ShoppingBag className="ml-2 h-4 w-4 transition-transform group-hover:translate-y-[-2px]" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Menu tabs component that displays all menu sections
 */
export default function MenuSections() {
  const [activeTab, setActiveTab] = useState("breakfast")

  // Menu data
  const breakfastItems: MenuItem[] = [
    {
      id: "b1",
      name: "Masala Dosa",
      description: "Crispy rice crepe filled with spiced potato filling, served with sambar and chutney",
      price: 120,
      image: "/placeholder.svg?height=100&width=100&text=Dosa",
      tags: ["Vegetarian", "Popular"],
    },
    {
      id: "b2",
      name: "Idli Sambar",
      description: "Steamed rice cakes served with lentil soup and coconut chutney",
      price: 80,
      image: "/placeholder.svg?height=100&width=100&text=Idli",
      tags: ["Vegetarian"],
    },
    {
      id: "b3",
      name: "Poori Bhaji",
      description: "Deep-fried bread served with spiced potato curry",
      price: 100,
      image: "/placeholder.svg?height=100&width=100&text=Poori",
      tags: ["Vegetarian"],
    },
    {
      id: "b4",
      name: "Upma",
      description: "Savory semolina porridge with vegetables and spices",
      price: 90,
      image: "/placeholder.svg?height=100&width=100&text=Upma",
      tags: ["Vegetarian", "Healthy"],
    },
  ]

  const lunchItems: MenuItem[] = [
    {
      id: "l1",
      name: "South Indian Thali",
      description: "Complete meal with rice, sambar, rasam, vegetables, and dessert",
      price: 180,
      image: "/placeholder.svg?height=100&width=100&text=Thali",
      tags: ["Vegetarian", "Popular"],
    },
    {
      id: "l2",
      name: "Bisi Bele Bath",
      description: "Spicy rice dish with lentils, vegetables, and aromatic spices",
      price: 150,
      image: "/placeholder.svg?height=100&width=100&text=BisiBele",
      tags: ["Vegetarian", "Spicy"],
    },
    {
      id: "l3",
      name: "Puliyogare",
      description: "Tamarind rice with peanuts and spices",
      price: 130,
      image: "/placeholder.svg?height=100&width=100&text=Puliyogare",
      tags: ["Vegetarian"],
    },
    {
      id: "l4",
      name: "Curd Rice",
      description: "Yogurt rice with tempering of mustard seeds and curry leaves",
      price: 110,
      image: "/placeholder.svg?height=100&width=100&text=CurdRice",
      tags: ["Vegetarian", "Cooling"],
    },
  ]

  const dinnerItems: MenuItem[] = [
    {
      id: "d1",
      name: "Ragi Mudde with Saaru",
      description: "Finger millet balls served with spiced lentil soup",
      price: 160,
      image: "/placeholder.svg?height=100&width=100&text=RagiMudde",
      tags: ["Vegetarian", "Healthy"],
    },
    {
      id: "d2",
      name: "Akki Roti",
      description: "Rice flour flatbread with vegetables and spices",
      price: 140,
      image: "/placeholder.svg?height=100&width=100&text=AkkiRoti",
      tags: ["Vegetarian"],
    },
    {
      id: "d3",
      name: "Neer Dosa with Chicken Curry",
      description: "Thin rice crepes served with spicy chicken curry",
      price: 200,
      image: "/placeholder.svg?height=100&width=100&text=NeerDosa",
      tags: ["Non-Vegetarian", "Popular"],
    },
    {
      id: "d4",
      name: "Vegetable Korma with Chapati",
      description: "Mixed vegetables in creamy coconut sauce with Indian bread",
      price: 170,
      image: "/placeholder.svg?height=100&width=100&text=VegKorma",
      tags: ["Vegetarian", "Mild"],
    },
  ]

  return (
    <AnimatedSection id="menu" className="py-16 bg-secondary/50" animation="fade-in">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Our Special Menu</h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Discover our authentic home-cooked meals prepared with love and tradition
          </p>
        </div>

        {/* Menu tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-card rounded-full p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("breakfast")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === "breakfast"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              Breakfast
            </button>
            <button
              onClick={() => setActiveTab("lunch")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === "lunch"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              Lunch
            </button>
            <button
              onClick={() => setActiveTab("dinner")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === "dinner"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              Dinner
            </button>
          </div>
        </div>

        {/* Menu content */}
        <div className="relative">
          <div
            className={`transition-opacity duration-300 ${activeTab === "breakfast" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"}`}
          >
            <MenuSection title="Breakfast Special Menu" items={breakfastItems} index={0} />
          </div>

          <div
            className={`transition-opacity duration-300 ${activeTab === "lunch" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"}`}
          >
            <MenuSection title="Lunch Special Menu" items={lunchItems} index={1} />
          </div>

          <div
            className={`transition-opacity duration-300 ${activeTab === "dinner" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"}`}
          >
            <MenuSection title="Dinner Special Menu" items={dinnerItems} index={2} />
          </div>
        </div>

        <div className="text-center mt-16">
          <Button size="lg" variant="outline" className="rounded-full">
            View Full Menu
          </Button>
        </div>
      </div>
    </AnimatedSection>
  )
}

