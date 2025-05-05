"use client"

import { useState } from "react"
import Link from "next/link"
import { Home, ShoppingBag, ShoppingCart, User, MapPin, Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Cart() {
  const [location, setLocation] = useState("WORK No. 3, St. Mark's Road, Bengaluru - 04......")
  const [selectedAddress, setSelectedAddress] = useState("work")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [cartItems, setCartItems] = useState([
    { id: 1, name: "Masala Dosa", price: 120, quantity: 1, image: "/dosa.jpg" },
    { id: 2, name: "Idli Sambar", price: 80, quantity: 2, image: "/idli.jpg" },
  ])
  const [addresses] = useState([
    { type: "HOME", address: "123 Home Street, Bengaluru - 01" },
    { type: "WORK", address: "WORK No. 3, St. Mark's Road, Bengaluru - 04" },
    { type: "FRIEND", address: "456 Friend Avenue, Bengaluru - 02" },
  ])

  const deliveryCharge = 40
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const total = subtotal + deliveryCharge

  const updateQuantity = (id: number, change: number) => {
    setCartItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    )
  }

  const removeItem = (id: number) => {
    setCartItems(items => items.filter(item => item.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#f9f3e8]">
      {/* Navigation Bar - Same as other pages */}
      <header className="border-b border-[#e6dfd0] bg-[#f9f3e8] py-4 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[#5d4037] text-lg">KUTEERA KITCHEN</div>

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
            <Link href="/customer/new-order">
              <Button variant="ghost" className="text-[#5d4037] p-2 flex items-center group hover:bg-[#8d6e63] hover:text-white w-[40px] hover:w-[100px] transition-all duration-200">
                <ShoppingBag className="h-5 w-5" />
                <span className="hidden group-hover:inline text-sm ml-2 whitespace-nowrap overflow-hidden">Order</span>
              </Button>
            </Link>
            <Link href="/customer/cart">
              <Button variant="ghost" className="text-[#5d4037] p-2 flex items-center group hover:bg-[#8d6e63] hover:text-white w-[40px] hover:w-[100px] transition-all duration-200">
                <ShoppingCart className="h-5 w-5" />
                <span className="hidden group-hover:inline text-sm ml-2 whitespace-nowrap overflow-hidden">Cart</span>
              </Button>
            </Link>
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
          <span className="text-xs font-medium truncate">{location}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-[#5d4037] text-center mb-8">Your Cart</h1>

        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl p-6 border-2 border-[#e6dfd0]">
              <h2 className="text-xl font-semibold text-[#5d4037] mb-4">Items</h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-[#e6dfd0] last:border-0">
                    <div className="flex-1">
                      <h3 className="text-[#5d4037] font-medium">{item.name}</h3>
                      <p className="text-sm text-[#8d6e63]">₹{item.price}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-[#5d4037]">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border-2 border-[#e6dfd0]">
              <h2 className="text-xl font-semibold text-[#5d4037] mb-4">Order Summary</h2>
              <div className="space-y-2 text-[#5d4037]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span>₹{deliveryCharge}</span>
                </div>
                <div className="h-px bg-[#e6dfd0] my-2"></div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
            </div>

            {/* Coupon Code */}
            <div className="bg-white rounded-xl p-6 border-2 border-[#e6dfd0]">
              <h2 className="text-lg font-semibold text-[#5d4037] mb-4">Apply Coupon</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="border-[#e6dfd0]"
                />
                <Button variant="outline">Apply</Button>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-xl p-6 border-2 border-[#e6dfd0]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#5d4037]">Delivery Address</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Change</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Delivery Address</DialogTitle>
                    </DialogHeader>
                    {/* Add address selection content */}
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-[#5d4037]">{location}</p>
            </div>

            {/* Place Order Button */}
            <Button className="w-full bg-[#5d4037] text-white hover:bg-[#8d6e63] py-6 text-lg font-semibold rounded-xl">
              Place Order
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}