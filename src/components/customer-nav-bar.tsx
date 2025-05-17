"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function CustomerNavBar() {
  const [selectedAddress, setSelectedAddress] = useState("work")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [addresses] = useState([
    { type: "HOME", address: "123 Home Street, Bengaluru - 01" },
    { type: "WORK", address: "WORK No. 3, St. Mark's Road, Bengaluru - 04" },
    { type: "FRIEND", address: "456 Friend Avenue, Bengaluru - 02" },
  ])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-[#faf7f2]/95 backdrop-blur-sm shadow-md" : "bg-[#faf7f2]"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/customer" className="text-xl font-bold text-[#463028]">
              Kuteera Kitchen
            </Link>
          </div>

          {/* Center - Location Selector */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{selectedAddress.toUpperCase()}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-[#463028]">Select Delivery Address</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <RadioGroup 
                    value={selectedAddress}
                    className="gap-4" 
                    onValueChange={setSelectedAddress}
                  >
                    {addresses.map((addr) => (
                      <div key={addr.type} className="flex items-center space-x-2 border rounded-lg p-4">
                        <RadioGroupItem value={addr.type.toLowerCase()} id={addr.type.toLowerCase()} />
                        <label htmlFor={addr.type.toLowerCase()} className="flex-1 cursor-pointer">
                          <div className="font-medium text-[#463028]">{addr.type}</div>
                          <div className="text-sm text-[#8d6e63]">{addr.address}</div>
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button 
                    className="w-full mt-6 bg-[#463028] text-white hover:bg-[#5d4037] flex items-center gap-2"
                    onClick={() => setDialogOpen(false)}
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

          {/* Right side - Menu Items */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative group">
              <Link href="/customer" className="relative px-3 py-2 text-sm font-medium text-[#463028] hover:text-primary transition-transform duration-200 transform group-hover:scale-105 group-hover:z-10">
                Home
              </Link>
            </div>
            <div className="relative group">
              <Link href="/customer/new-order" className="relative px-3 py-2 text-sm font-medium text-[#463028] hover:text-primary transition-transform duration-200 transform group-hover:scale-105 group-hover:z-10">
                New Order
              </Link>
            </div>
            <div className="relative group">
              <Link href="/customer/subscription" className="relative px-3 py-2 text-sm font-medium text-[#463028] hover:text-primary transition-transform duration-200 transform group-hover:scale-105 group-hover:z-10">
                Subscription
              </Link>
            </div>
            <div className="relative group">
              <Link href="/customer/account" className="relative px-3 py-2 text-sm font-medium text-[#463028] hover:text-primary transition-transform duration-200 transform group-hover:scale-105 group-hover:z-10">
                Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}