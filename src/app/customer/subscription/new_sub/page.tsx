"use client"

import Link from "next/link"
import { useState } from "react"
import { addDays, format, differenceInDays } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Home, ShoppingBag, ShoppingCart, User, MapPin, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function NewSubscription() {
  const [location, setLocation] = useState("WORK No. 3, St. Mark's Road, Bengaluru - 04......")
  const [selectedAddress, setSelectedAddress] = useState("work")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addresses] = useState([
    { type: "HOME", address: "123 Home Street, Bengaluru - 01" },
    { type: "WORK", address: "WORK No. 3, St. Mark's Road, Bengaluru - 04" },
    { type: "FRIEND", address: "456 Friend Avenue, Bengaluru - 02" },
  ])
  const [date, setDate] = useState<DateRange | undefined>(undefined)

  // Calculate number of days
  const numberOfDays = date?.from && date?.to ? 
    differenceInDays(date.to, date.from) + 1 : 0

  // Add new state for tracking selection completion
  const [dateSelected, setDateSelected] = useState(false)

  // Function to handle date selection completion
  const handleDateSelect = (value: DateRange | undefined) => {
    setDate(value)
    if (value?.from && value?.to) {
      setTimeout(() => setDateSelected(true), 100)
    }
  }

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
            <Link href="/customer/new-order">
              <Button variant="ghost" className="text-[#5d4037] p-2 flex items-center group hover:bg-[#8d6e63] hover:text-white w-[40px] hover:w-[100px] transition-all duration-200">
                <ShoppingBag className="h-5 w-5" />
                <span className="hidden group-hover:inline text-sm ml-2 whitespace-nowrap overflow-hidden">Order</span>
              </Button>
            </Link>
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
          <span className="text-xs font-medium truncate">{location}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-[#5d4037] text-center mb-8">Create New Subscription</h1>
        
        <div className="max-w-5xl mx-auto">
          <div className={`flex justify-center transition-all duration-500 ${dateSelected ? 'justify-start' : 'justify-center'}`}>
            {/* Calendar Section */}
            <div className="w-[400px] transition-all duration-500">
              <label className="text-lg font-semibold text-[#5d4037] text-center block mb-4">Select Subscription Period</label>
              <div className="p-4 border-2 border-[#8d6e63] rounded-xl bg-[#f9f3e8]">
                <Calendar
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={handleDateSelect}
                  numberOfMonths={1}
                  className="bg-[#f9f3e8] rounded-lg"
                  classNames={{
                    months: "space-y-4 mx-auto",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center text-[#5d4037] font-semibold",
                    caption_label: "text-lg",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-[#5d4037]",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex justify-between",
                    head_cell: "text-[#8d6e63] rounded-md w-9 font-normal text-sm",
                    row: "flex w-full mt-2 justify-between",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-[#8d6e63]/50 [&:has([aria-selected])]:bg-[#8d6e63] first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-[#5d4037] hover:bg-[#8d6e63] hover:text-[#f9f3e8] rounded-md",
                    day_range_end: "day-range-end",
                    day_selected: "bg-[#8d6e63] text-[#f9f3e8] hover:bg-[#5d4037] hover:text-[#f9f3e8] focus:bg-[#5d4037] focus:text-[#f9f3e8]",
                    day_today: "bg-[#e6dfd0] text-[#5d4037]",
                    day_outside: "day-outside opacity-50",
                    day_disabled: "text-[#8d6e63] opacity-50",
                    day_range_middle: "aria-selected:bg-[#8d6e63] aria-selected:text-[#f9f3e8]",
                    day_hidden: "invisible",
                  }}
                />
                <div className="mt-4 text-center text-[#5d4037] font-medium">
                  {numberOfDays > 0 ? (
                    <span>{numberOfDays} days selected</span>
                  ) : (
                    <span>Select dates to create subscription</span>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Days Selection */}
            {dateSelected && (
              <div className="w-[400px] ml-8 animate-fade-in">
                <label className="text-lg font-semibold text-[#5d4037] text-center block mb-4">Select Delivery Days</label>
                <div className="p-6 border-2 border-[#8d6e63] rounded-xl bg-[#f9f3e8]">
                  <div className="text-lg font-medium text-[#5d4037] mb-4">
                    {date?.from && date?.to && (
                      <div className="flex items-center">
                        <span>{format(date.from, "EEE, MMM d")} - {format(date.to, "EEE, MMM d")}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                      <label key={day} className="flex items-center space-x-3 p-3 hover:bg-[#8d6e63]/10 rounded-lg cursor-pointer">
                        <input type="checkbox" className="rounded border-[#8d6e63] text-[#5d4037] focus:ring-[#8d6e63]" />
                        <span className="text-[#5d4037]">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Proceed Button */}
        <div className="fixed bottom-8 right-8">
          <Button 
            className="bg-[#5d4037] text-white hover:bg-[#8d6e63] px-8 py-6 text-lg font-semibold rounded-xl"
            onClick={() => {
              // Add your proceed logic here
            }}
          >
            Proceed
          </Button>
        </div>
      </main>
    </div>
  )
}