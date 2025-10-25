"use client"

import { useState } from "react"
import CustomerNavBar from "@/components/customer-nav-bar"
import { ShoppingBag, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

export default function Subscription() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div className="min-h-screen bg-brand-shell">
      <CustomerNavBar />
      <main className="container mx-auto px-4 py-8 mt-8">
        {/* Removed the title and description from here */}

        <div className="relative flex justify-center mb-8 mx-4">
          <img 
            src="/images/subscription/subscription-landing-page.jpg" 
            alt="Veg Only Subscription Plans" 
            className="w-full h-[400px] object-cover rounded-lg shadow-md"
          />
          {/* Adjusted overlay to be slightly brown */}
          <div className="absolute inset-0 flex flex-col justify-center items-center bg-gradient-to-b from-transparent to-[#8d6e63]/60 p-4 rounded-lg w-full h-full">
            <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">Subscription Plans</h1>
            <p className="text-xl text-white drop-shadow-md">Choose or manage your meal subscription plans.</p>
          </div>
        </div>

        <div className="flex justify-center gap-8">
          <div 
            className="w-[500px] p-6 rounded-xl border border-brand-subtle flex flex-col items-center"
          >
            <div className="flex items-center justify-center mb-3">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xs bg-[#e6dfd0] text-primary rounded-full px-2 py-1">new</span>
            </div>
            <h2 className="text-xl font-serif text-[#463028] mb-1">Create</h2>
            <p className="text-sm text-[#8d6e63] text-center mb-4">a new meal subscription plan</p>
            <Button className="bg-[#e6dfd0] text-primary w-3/4 py-2" onClick={toggleModal}>Get Started</Button>
            <ul className="text-xs text-[#8d6e63] mt-4 space-y-1">
              <li>✓ Flexible meal options</li>
              <li>✓ Customizable plans</li>
            </ul>
          </div>

          <div 
            className="w-[500px] p-6 rounded-xl border border-brand-subtle flex flex-col items-center"
          >
            <div className="flex items-center justify-center mb-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xs bg-[#e6dfd0] text-primary rounded-full px-2 py-1">active</span>
            </div>
            <h2 className="text-xl font-serif text-[#463028] mb-1">Manage</h2>
            <p className="text-sm text-[#8d6e63] text-center mb-4">your current subscriptions</p>
            <Button className="bg-[#e6dfd0] text-primary w-3/4 py-2">View Plans</Button>
            <ul className="text-xs text-[#8d6e63] mt-4 space-y-1">
              <li>✓ Track active subscriptions</li>
              <li>✓ Pause or cancel anytime</li>
            </ul>
          </div>
        </div>

        {/* Modal for CalendarRAC */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center mt-16">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">Select a Date</h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={{ before: new Date() }}
              />
              <Button className="mt-4" onClick={toggleModal}>Close</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
