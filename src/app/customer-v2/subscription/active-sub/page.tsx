"use client"

import { useState } from "react"
import CustomerNavBar from "@/components/customer-nav-bar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ActiveSubscription() {
  return (
    <div className="min-h-screen bg-brand-shell">
      <CustomerNavBar />
      
      <main className="container mx-auto px-4 pt-20">
        <div className="py-4">
          <h1 className="text-center text-3xl font-bold text-[#463028] mb-8 font-serif">Active Subscriptions</h1>
          
          {/* Subscription Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-brand-subtle">
              <CardHeader className="bg-[#463028] text-white py-4 px-6 rounded-t-lg">
                <h2 className="text-xl font-serif">Monthly Breakfast Plan</h2>
                <p className="text-sm opacity-90">Active until Dec 31, 2023</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-[#463028]">Delivery Schedule</h3>
                    <p className="text-sm text-[#8d6e63]">Monday to Friday, 8:00 AM</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-[#463028]">Items</h3>
                    <ul className="text-sm text-[#8d6e63] list-disc list-inside">
                      <li>2x Masala Dosa</li>
                      <li>1x Idli Sambar</li>
                      <li>1x Mint Chutney</li>
                    </ul>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 border-[#463028] text-[#463028] hover:bg-[#463028] hover:text-white"
                  >
                    Modify Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-subtle">
              <CardHeader className="bg-[#463028] text-white py-4 px-6 rounded-t-lg">
                <h2 className="text-xl font-serif">Weekly Lunch Pack</h2>
                <p className="text-sm opacity-90">Active until Jan 15, 2024</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-[#463028]">Delivery Schedule</h3>
                    <p className="text-sm text-[#8d6e63]">Monday to Saturday, 12:30 PM</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-[#463028]">Items</h3>
                    <ul className="text-sm text-[#8d6e63] list-disc list-inside">
                      <li>1x Veg Thali</li>
                      <li>1x Raita</li>
                      <li>1x Sweet (Chef's Special)</li>
                    </ul>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 border-[#463028] text-[#463028] hover:bg-[#463028] hover:text-white"
                  >
                    Modify Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}