"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Home, ShoppingBag, ShoppingCart, User, MapPin, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Add these state variables at the top of the component
export default function NewOrder() {
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({})
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [location, setLocation] = useState("WORK No. 3, St. Mark's Road, Bengaluru - 04......")
  const [selectedAddress, setSelectedAddress] = useState("work")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addresses] = useState([
    { type: "HOME", address: "123 Home Street, Bengaluru - 01" },
    { type: "WORK", address: "WORK No. 3, St. Mark's Road, Bengaluru - 04" },
    { type: "FRIEND", address: "456 Friend Avenue, Bengaluru - 02" },
  ])

  const handleQuantityChange = (itemId: number, change: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + change)
    }))
  }

  // Menu items data
  const menuItems = [
    // Breakfast Items
    {
      id: 1,
      name: "Masala Dosa",
      description: "Crispy rice crepe served with potato filling, sambar and chutneys",
      price: 120,
      image: "/placeholder.svg?height=300&width=300",
      category: "breakfast"
    },
    {
      id: 2,
      name: "Idli Sambar",
      description: "Steamed rice cakes served with lentil soup and coconut chutney",
      price: 80,
      image: "/placeholder.svg?height=300&width=300",
      category: "breakfast"
    },
    {
      id: 3,
      name: "Poori Bhaji",
      description: "Deep-fried bread served with spiced potato curry",
      price: 100,
      image: "/placeholder.svg?height=300&width=300",
      category: "breakfast"
    },
    {
      id: 13,
      name: "Upma",
      description: "Savory semolina porridge with vegetables and spices",
      price: 90,
      image: "/placeholder.svg?height=300&width=300",
      category: "breakfast"
    },
    {
      id: 14,
      name: "Vada Sambar",
      description: "Crispy lentil doughnuts served with lentil soup",
      price: 85,
      image: "/placeholder.svg?height=300&width=300",
      category: "breakfast"
    },
    {
      id: 15,
      name: "Rava Dosa",
      description: "Crispy semolina crepe served with potato curry",
      price: 110,
      image: "/placeholder.svg?height=300&width=300",
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

  return (
    <div className="min-h-screen bg-[#f9f3e8]">
      {/* Navigation Bar */}
      <header className="border-b border-[#e6dfd0] bg-[#f9f3e8] py-4 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[#5d4037] text-lg">KUTEERA KITCHEN</div>

          {/* Navigation dropdown */}
          <div className="hidden md:flex items-center gap-2 text-[#5d4037] w-[400px] justify-center">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 w-full justify-center">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm flex-shrink-0">Deliver to:</span>
                  <span className="text-sm font-medium truncate max-w-[200px]">{location}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-[#5d4037]">Select Delivery Address</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <RadioGroup 
                    value={selectedAddress}
                    className="gap-4" 
                    onValueChange={(value) => {
                      setSelectedAddress(value)
                    }}
                  >
                    {addresses.map((addr) => (
                      <div key={addr.type} className="flex items-center space-x-2 border rounded-lg p-4">
                        <RadioGroupItem value={addr.type.toLowerCase()} id={addr.type.toLowerCase()} />
                        <label htmlFor={addr.type.toLowerCase()} className="flex-1 cursor-pointer">
                          <div className="font-medium text-[#5d4037]">{addr.type}</div>
                          <div className="text-sm text-[#8d6e63]">{addr.address}</div>
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button 
                    className="w-full mt-6 bg-black text-white hover:bg-[#5d4037] flex items-center gap-2"
                    onClick={() => {
                      const selected = addresses.find(addr => addr.type.toLowerCase() === selectedAddress)
                      if (selected) {
                        setLocation(selected.address)
                        setDialogOpen(false)
                      }
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                    Deliver to this Address
                  </Button>
                  <Button variant="outline" className="w-full mt-3 border-dashed">
                    + Add New Address
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/customer">
              <Button variant="ghost" className="text-[#5d4037] p-2 flex items-center group hover:bg-[#8d6e63] hover:text-white w-[40px] hover:w-[100px] transition-all duration-200">
                <Home className="h-5 w-5" />
                <span className="hidden group-hover:inline text-sm ml-2 whitespace-nowrap overflow-hidden">Home</span>
              </Button>
            </Link>
            <Button variant="ghost" className="text-[#5d4037] p-2 flex items-center group hover:bg-[#8d6e63] hover:text-white w-[40px] hover:w-[100px] transition-all duration-200">
              <ShoppingBag className="h-5 w-5" />
              <span className="hidden group-hover:inline text-sm ml-2 whitespace-nowrap overflow-hidden">Order</span>
            </Button>
            <Button variant="ghost" className="text-[#5d4037] p-2 flex items-center group hover:bg-[#8d6e63] hover:text-white w-[40px] hover:w-[100px] transition-all duration-200">
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden group-hover:inline text-sm ml-2 whitespace-nowrap overflow-hidden">Cart</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-[#5d4037] p-2 flex items-center group hover:bg-[#8d6e63] hover:text-white w-[40px] hover:w-[120px] transition-all duration-200">
                  <User className="h-5 w-5" />
                  <span className="hidden group-hover:inline text-sm ml-2 whitespace-nowrap overflow-hidden">Tim Cook</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#f9f3e8] border border-[#e6dfd0] shadow-md">
                <DropdownMenuItem className="hover:bg-[#8d6e63] hover:text-white focus:bg-[#8d6e63] focus:text-white">
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-[#8d6e63] hover:text-white focus:bg-[#8d6e63] focus:text-white">
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-[#8d6e63] hover:text-white focus:bg-[#8d6e63] focus:text-white">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="md:hidden flex items-center gap-2 text-[#5d4037] mt-2">
          <MapPin className="h-4 w-4" />
          <span className="text-xs">Deliver to:</span>
          <span className="text-xs font-medium truncate">WORK No. 3, St. Mark's Road, Bengaluru - 04......</span>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="py-4">
          <h1 className="text-3xl font-bold text-[#5d4037] text-center mb-6">Place a New Order</h1>
          
          {/* Category Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            {["breakfast", "lunch", "dinner", "condiments"].map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                className={`px-6 py-2 rounded-full border border-[#8d6e63] capitalize transition-colors
                  ${activeCategory === category 
                    ? 'bg-[#8d6e63] text-white' 
                    : 'bg-transparent text-[#8d6e63] hover:bg-[#8d6e63] hover:text-white'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="px-16">
            <div className="grid grid-cols-1 gap-16">
              {["breakfast", "lunch", "dinner", "condiments"].map((category) => (
                <div
                  key={category}
                  className={`transition-all duration-300 ${
                    activeCategory === category ? 'order-[-1]' : ''
                  }`}
                  style={{
                    gridRow: activeCategory === category ? '1' : 'auto'
                  }}
                >
                  <h2 className="text-xl font-semibold text-[#5d4037] mb-4 capitalize">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {menuItems
                      .filter(item => item.category === category)
                      .map((item) => (
                        <div key={item.id} className="flex bg-white border-2 border-[#e6dfd0] rounded-lg overflow-hidden h-[120px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-shadow duration-200">
                          <div className="w-[120px] relative">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 p-3 relative">
                            <h3 className="font-semibold text-[#5d4037] text-sm">{item.name}</h3>
                            <p className="text-xs text-[#8d6e63] mt-1 line-clamp-2">{item.description}</p>
                            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 border-[#8d6e63] text-[#8d6e63] hover:bg-[#8d6e63] hover:text-white"
                                onClick={() => handleQuantityChange(item.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm text-[#5d4037] font-medium min-w-[20px] text-center">
                                {quantities[item.id] || 0}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 border-[#8d6e63] text-[#8d6e63] hover:bg-[#8d6e63] hover:text-white"
                                onClick={() => handleQuantityChange(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Cart Button */}
      <div className="fixed bottom-6 right-6">
        <Button 
          className="h-14 w-14 rounded-full bg-[#8d6e63] hover:bg-[#5d4037] text-white shadow-lg flex items-center justify-center relative"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {Object.values(quantities).reduce((a, b) => a + b, 0)}
          </span>
        </Button>
      </div>
    </div>
  )
}