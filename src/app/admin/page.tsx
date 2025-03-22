"use client"

import { useState } from "react"
import { Dashboard } from "@/components/dashboard"
import ProductManagement from "@/components/product-management"
import CustomerManagement from "@/components/customer-management"
import { DailyMenuSetup } from "@/components/daily-menu-setup"

export default function AdminPage() {
  const [activePage, setActivePage] = useState("dashboard")

  return (
    <div className="flex-1 overflow-auto">
      {activePage === "dashboard" && <Dashboard />}
      {activePage === "productmgmt" && <ProductManagement />}
      {activePage === "customermgmt" && <CustomerManagement />}
      {activePage === "menu" && <DailyMenuSetup />}
    </div>
  )
}