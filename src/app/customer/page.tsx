"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Home, ShoppingBag, ShoppingCart, User, MapPin, Utensils, ClipboardList, Settings, History } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

export default function KuteeraKitchen() {
  const [location, setLocation] = useState("WORK No. 3, St. Mark's Road, Bengaluru - 04......")

  // Sample menu data
  const menuItems = [
    {
      id: 1,
      name: "Gobi Manchurian",
      description: "Description about the product Description about the product Description about the product",
      price: 200,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 2,
      name: "Gobi Manchurian",
      description: "Description about the product Description about the product Description about the product",
      price: 200,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 3,
      name: "Gobi Manchurian",
      description: "Description about the product Description about the product Description about the product",
      price: 200,
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: 4,
      name: "Gobi Manchurian",
      description: "Description about the product Description about the product Description about the product",
      price: 200,
      image: "/placeholder.svg?height=300&width=300",
    },
  ]

  return (
    <div className="min-h-screen bg-[#f9f3e8]">
      {/* Navigation Bar */}
      <header className="border-b border-[#e6dfd0] bg-[#f9f3e8] py-4 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[#5d4037] text-lg">KUTEERA KITCHEN</div>

          <div className="hidden md:flex items-center gap-2 text-[#5d4037]">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Deliver to:</span>
            <span className="text-sm font-medium">{location}</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-[#5d4037]">
              <Home className="h-5 w-5" />
              <span className="sr-only">Home</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-[#5d4037]">
              <ShoppingBag className="h-5 w-5" />
              <span className="sr-only">Order</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-[#5d4037]">
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">Cart</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-[#5d4037]">
              <User className="h-5 w-5" />
              <span className="sr-only">Profile</span>
            </Button>
            <span className="text-sm font-medium text-[#5d4037]">Tim</span>
          </div>
        </div>

        <div className="md:hidden flex items-center gap-2 text-[#5d4037] mt-2">
          <MapPin className="h-4 w-4" />
          <span className="text-xs">Deliver to:</span>
          <span className="text-xs font-medium truncate">{location}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Today's Menu Section */}
        <section className="mb-12">
          <h2 className="text-center text-3xl font-bold text-[#5d4037] mb-8">Today's Menu</h2>

          <Carousel className="w-full">
            <CarouselContent>
              {menuItems.map((item) => (
                <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/4">
                  <Card className="border border-[#e6dfd0] bg-[#f9f3e8] shadow-sm">
                    <CardHeader className="p-0">
                      <div className="aspect-square overflow-hidden rounded-t-lg">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={300}
                          height={300}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-[#5d4037]">{item.name}</h3>
                      <p className="text-xs text-[#8d6e63] mt-1 line-clamp-2">{item.description}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <p className="text-sm font-medium text-[#5d4037]">Rs. {item.price}</p>
                    </CardFooter>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="bg-[#8d6e63] text-white hover:bg-[#5d4037] border-none" />
            <CarouselNext className="bg-[#8d6e63] text-white hover:bg-[#5d4037] border-none" />
          </Carousel>
        </section>

        {/* Quick Actions Section */}
        <section>
          <h2 className="text-center text-3xl font-bold text-[#5d4037] mb-8">Quick Actions</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="#" className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#8d6e63] bg-[#f9f3e8] mb-2">
                <Utensils className="h-10 w-10 text-[#8d6e63]" />
              </div>
              <span className="text-center font-medium text-[#5d4037]">New order</span>
            </Link>

            <Link href="#" className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#8d6e63] bg-[#f9f3e8] mb-2">
                <ClipboardList className="h-10 w-10 text-[#8d6e63]" />
              </div>
              <span className="text-center font-medium text-[#5d4037]">Subscription</span>
            </Link>

            <Link href="#" className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#8d6e63] bg-[#f9f3e8] mb-2">
                <Settings className="h-10 w-10 text-[#8d6e63]" />
              </div>
              <span className="text-center font-medium text-[#5d4037]">Account Settings</span>
            </Link>

            <Link href="#" className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#8d6e63] bg-[#f9f3e8] mb-2">
                <History className="h-10 w-10 text-[#8d6e63]" />
              </div>
              <span className="text-center font-medium text-[#5d4037]">Order History</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

