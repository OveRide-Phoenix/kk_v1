"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Home, ShoppingBag, ShoppingCart, User, MapPin, Utensils, ClipboardList, Settings, History } from "lucide-react"
import Autoplay from "embla-carousel-autoplay"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Add these imports at the top
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import NavBar from "@/components/nav-bar"
import CustomerNavBar from "@/components/customer-nav-bar"

export default function KuteeraKitchen() {
  const [location, setLocation] = useState("WORK No. 3, St. Mark's Road, Bengaluru - 04......")
  const [selectedAddress, setSelectedAddress] = useState("work") // Initialize with default address type
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("breakfast")
  const [addresses] = useState([
    { type: "HOME", address: "123 Home Street, Bengaluru - 01" },
    { type: "WORK", address: "WORK No. 3, St. Mark's Road, Bengaluru - 04" },
    { type: "FRIEND", address: "456 Friend Avenue, Bengaluru - 02" },
  ])

  // Updated menu data with categories
  // Updated menu data with more items
  const menuItems = [
    // Breakfast Items
    {
      id: 1,
      name: "Masala Dosa",
      description: "Crispy rice crepe served with potato filling, sambar and chutneys",
      price: 120,
      image: "/images/menu/masala-dosa.jpg",
      category: "breakfast"
    },
    {
      id: 2,
      name: "Idli Sambar",
      description: "Steamed rice cakes served with lentil soup and coconut chutney",
      price: 80,
      image: "/images/menu/idli-sambar.jpg",
      category: "breakfast"
    },
    {
      id: 3,
      name: "Poori Bhaji",
      description: "Deep-fried bread served with spiced potato curry",
      price: 100,
      image: "/images/menu/poori.jpg",
      category: "breakfast"
    },
    {
      id: 13,
      name: "Upma",
      description: "Savory semolina porridge with vegetables and spices",
      price: 90,
      image: "/images/menu/upma.jpg",
      category: "breakfast"
    },
    {
      id: 14,
      name: "Vada Sambar",
      description: "Crispy lentil doughnuts served with lentil soup",
      price: 85,
      image: "/images/menu/vada-sambar.jpg",
      category: "breakfast"
    },
    {
      id: 15,
      name: "Rava Dosa",
      description: "Crispy semolina crepe served with potato curry",
      price: 110,
      image: "/images/menu/rava-dosa.jpg",
      category: "breakfast"
    },
    // Lunch Items
    {
      id: 4,
      name: "Veg Thali",
      description: "Complete meal with rice, rotis, dal, sabzi, and dessert",
      price: 200,
      image: "/placeholder.svg?height=300&width=300",
      category: "lunch"
    },
    {
      id: 5,
      name: "Pulao",
      description: "Fragrant rice cooked with mixed vegetables and spices",
      price: 180,
      image: "/placeholder.svg?height=300&width=300",
      category: "lunch"
    },
    {
      id: 6,
      name: "Dal Makhani",
      description: "Creamy black lentils cooked overnight with butter and spices",
      price: 160,
      image: "/placeholder.svg?height=300&width=300",
      category: "lunch"
    },
    {
      id: 16,
      name: "Chole Bhature",
      description: "Spiced chickpea curry with deep-fried bread",
      price: 150,
      image: "/placeholder.svg?height=300&width=300",
      category: "lunch"
    },
    {
      id: 17,
      name: "Rajma Chawal",
      description: "Kidney bean curry served with steamed rice",
      price: 170,
      image: "/placeholder.svg?height=300&width=300",
      category: "lunch"
    },
    {
      id: 18,
      name: "Kadai Paneer",
      description: "Cottage cheese in spicy bell pepper gravy",
      price: 190,
      image: "/placeholder.svg?height=300&width=300",
      category: "lunch"
    },
    // Dinner Items
    {
      id: 7,
      name: "Paneer Butter Masala",
      description: "Cottage cheese cubes in rich tomato gravy",
      price: 220,
      image: "/placeholder.svg?height=300&width=300",
      category: "dinner"
    },
    {
      id: 8,
      name: "Veg Biryani",
      description: "Aromatic rice layered with mixed vegetables and spices",
      price: 250,
      image: "/placeholder.svg?height=300&width=300",
      category: "dinner"
    },
    {
      id: 9,
      name: "Roti Basket",
      description: "Assorted Indian breads with butter",
      price: 120,
      image: "/placeholder.svg?height=300&width=300",
      category: "dinner"
    },
    {
      id: 19,
      name: "Malai Kofta",
      description: "Vegetable dumplings in creamy curry sauce",
      price: 230,
      image: "/placeholder.svg?height=300&width=300",
      category: "dinner"
    },
    {
      id: 20,
      name: "Palak Paneer",
      description: "Cottage cheese in creamy spinach gravy",
      price: 210,
      image: "/placeholder.svg?height=300&width=300",
      category: "dinner"
    },
    {
      id: 21,
      name: "Dal Tadka",
      description: "Yellow lentils tempered with spices",
      price: 140,
      image: "/placeholder.svg?height=300&width=300",
      category: "dinner"
    },
    // Condiments
    {
      id: 10,
      name: "Mint Chutney",
      description: "Fresh mint and coriander chutney",
      price: 40,
      image: "/placeholder.svg?height=300&width=300",
      category: "condiments"
    },
    {
      id: 11,
      name: "Mixed Pickle",
      description: "Spicy mixed vegetable pickle",
      price: 50,
      image: "/placeholder.svg?height=300&width=300",
      category: "condiments"
    },
    {
      id: 12,
      name: "Raita",
      description: "Yogurt with mixed vegetables and mild spices",
      price: 60,
      image: "/placeholder.svg?height=300&width=300",
      category: "condiments"
    },
    {
      id: 22,
      name: "Mango Chutney",
      description: "Sweet and tangy mango relish",
      price: 45,
      image: "/placeholder.svg?height=300&width=300",
      category: "condiments"
    },
    {
      id: 23,
      name: "Onion Salad",
      description: "Sliced onions with lemon and spices",
      price: 30,
      image: "/placeholder.svg?height=300&width=300",
      category: "condiments"
    },
    {
      id: 24,
      name: "Papad Basket",
      description: "Assorted crispy lentil wafers",
      price: 55,
      image: "/placeholder.svg?height=300&width=300",
      category: "condiments"
    }
  ]

  // Filter items based on active tab
  const filteredItems = activeTab === "all" ? menuItems : menuItems.filter(item => item.category === activeTab)

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <CustomerNavBar />
      <main className="container mx-auto px-4 py-8 pt-20">
        {/* Quick Actions Icons */}
        <div className="flex justify-center gap-8 mb-8">
          <Link href="/customer/new-order" className="flex flex-col items-center group h-16">
            <div className="flex h-12 w-12 items-center justify-center transition-all duration-300 group-hover:scale-110 relative">
              <Utensils className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 group-hover:animate-ripple"></div>
            </div>
            <span className="text-xs font-medium text-[#463028] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-3 transition-all duration-200">New Order</span>
          </Link>

          <Link href="/customer/subscription" className="flex flex-col items-center group h-16">
            <div className="flex h-12 w-12 items-center justify-center transition-all duration-300 group-hover:scale-110 relative">
              <ClipboardList className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 group-hover:animate-ripple"></div>
            </div>
            <span className="text-xs font-medium text-[#463028] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-3 transition-all duration-200">Subscription</span>
          </Link>

          <Link href="#" className="flex flex-col items-center group h-16">
            <div className="flex h-12 w-12 items-center justify-center transition-all duration-300 group-hover:scale-110 relative">
              <Settings className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 group-hover:animate-ripple"></div>
            </div>
            <span className="text-xs font-medium text-[#463028] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-3 transition-all duration-200">Settings</span>
          </Link>

          <Link href="#" className="flex flex-col items-center group h-16">
            <div className="flex h-12 w-12 items-center justify-center transition-all duration-300 group-hover:scale-110 relative">
              <History className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 group-hover:animate-ripple"></div>
            </div>
            <span className="text-xs font-medium text-[#463028] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-3 transition-all duration-200">History</span>
          </Link>
        </div>

        {/* Today's Menu Section */}
        <section className="mb-12">
          <div className="flex items-center justify-center mb-8">
            <div className="h-px bg-border flex-grow max-w-xs"></div>
            <div className="mx-4 flex items-center">
              <Utensils className="h-5 w-5 text-[#463028] mr-2" />
              <h2 className="text-3xl font-serif font-bold text-[#463028]">Today's Menu</h2>
            </div>
            <div className="h-px bg-border flex-grow max-w-xs"></div>
          </div>
          
          <Tabs defaultValue="breakfast" className="mb-16" onValueChange={setActiveTab}>
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-[600px] grid-cols-5 bg-[#faf7f2] border border-primary rounded-full p-1 shadow-md">
                <TabsTrigger 
                  value="all"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full font-serif"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="breakfast"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full font-serif"
                >
                  Breakfast
                </TabsTrigger>
                <TabsTrigger 
                  value="lunch"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-full font-serif"
                >
                  Lunch
                </TabsTrigger>
                <TabsTrigger 
                  value="dinner"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-full font-serif"
                >
                  Dinner
                </TabsTrigger>
                <TabsTrigger 
                  value="condiments"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-full font-serif"
                >
                  Condiments
                </TabsTrigger>
              </TabsList>
            </div>
          
          <TabsContent value={activeTab}>
            <div className="px-16">
              {activeTab === "all" ? (
                <Carousel
                  className="w-full relative mx-auto"
                  opts={{
                    slidesToScroll: 1,
                    align: "start",
                    loop: true,
                  }}
                  plugins={[
                    Autoplay({
                      delay: 5000,
                      stopOnInteraction: false,
                    })
                  ]}
                >
                  <CarouselContent>
                    {Array.from({ length: Math.ceil(filteredItems.length / 6) }).map((_, index) => (
                      <CarouselItem key={index}>
                        <div className="grid grid-cols-3 gap-4">
                          {filteredItems.slice(index * 6, (index + 1) * 6).map((item) => (
                            <div key={item.id} className="flex bg-[#faf7f2] border-2 border-[#e6dfd0] rounded-lg overflow-hidden h-[120px] shadow-sm hover:shadow-md transition-shadow duration-200">
                              <div className="w-[120px] h-[120px] flex-shrink-0">
                                <Image
                                  src={item.image || "/placeholder.svg"}
                                  alt={item.name}
                                  width={120}
                                  height={120}
                                  className="object-cover h-full w-full"
                                />
                              </div>
                              <div className="flex-1 p-3">
                                <h3 className="font-medium text-[#463028] text-sm">{item.name}</h3>
                                <p className="text-xs text-[#8d6e63] mt-1 line-clamp-2">{item.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="absolute -left-12 top-1/2 -translate-y-1/2" />
                  <CarouselNext className="absolute -right-12 top-1/2 -translate-y-1/2" />
                </Carousel>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="flex bg-[#faf7f2] border-2 border-[#e6dfd0] rounded-lg overflow-hidden h-[120px] shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="w-[120px] h-[120px] flex-shrink-0">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={120}
                          height={120}
                          className="object-cover h-full w-full"
                        />
                      </div>
                      <div className="flex-1 p-3">
                        <h3 className="font-medium text-[#463028] text-sm">{item.name}</h3>
                        <p className="text-xs text-[#8d6e63] mt-1 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </section>

        {/* Quick Actions Section */}
        <section>
          <div className="flex items-center justify-center mb-8">
            <div className="h-px bg-border flex-grow max-w-xs"></div>
            <h2 className="mx-4 text-3xl font-serif font-bold text-[#5d4037]">Quick Actions</h2>
            <div className="h-px bg-border flex-grow max-w-xs"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/customer/new-order" className="flex flex-col items-center group relative overflow-hidden pt-4">
              <div className="flex h-16 w-16 items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110 relative">
                <Utensils className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 group-hover:animate-ripple"></div>
              </div>
              <span className="text-center font-medium text-[#463028]">New order</span>
            </Link>

            <Link href="/customer/subscription" className="flex flex-col items-center group relative overflow-hidden pt-4">
              <div className="flex h-16 w-16 items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110 relative">
                <ClipboardList className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 group-hover:animate-ripple"></div>
              </div>
              <span className="text-center font-medium text-[#463028]">Subscription</span>
            </Link>

            <Link href="#" className="flex flex-col items-center group relative overflow-hidden pt-4">
              <div className="flex h-16 w-16 items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110 relative">
                <Settings className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 group-hover:animate-ripple"></div>
              </div>
              <span className="text-center font-medium text-[#463028]">Account Settings</span>
            </Link>

            <Link href="#" className="flex flex-col items-center group relative overflow-hidden pt-4">
              <div className="flex h-16 w-16 items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110 relative">
                <History className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 group-hover:animate-ripple"></div>
              </div>
              <span className="text-center font-medium text-[#463028]">Order History</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

