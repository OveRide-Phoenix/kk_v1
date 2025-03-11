"use client"

import { useState } from "react"
import Sidebar from "@/components/sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState("Dashboard") // Track active page

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar (Remains Fixed) */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        activePage={activePage} 
        setActivePage={setActivePage} 
      />

      {/* Dynamic Page Content (Changes Based on Route) */}
      <div className="flex-1 p-6">
        {children} {/* This will be replaced based on the page */}
      </div>
    </div>
  )
}
//       {children}