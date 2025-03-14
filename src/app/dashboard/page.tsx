"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// Add Calendar and BarChart3 to your imports
import { Coffee, ChevronDown, Menu, X, Package, Users, ShoppingCart, FileText, Bell, User, Calendar, BarChart3 } from "lucide-react"
import { useAuthStore } from "@/store/store"
import { AdminLayout } from "@/components/admin-layout"

// Add this after the imports
const dashboardMetrics = {
  totalOrders: 128,
  pendingOrders: 24,
  totalCustomers: 87,
  activeSubscriptions: 62,
  todayRevenue: 24850,
  monthlyRevenue: 345200,
  popularItems: [
    { name: "Anna 350 gms", orders: 42 },
    { name: "Masala Dosa", orders: 38 },
    { name: "South Indian Thali", orders: 31 },
    { name: "Mysore Pak", orders: 27 },
  ],
  recentOrders: [
    { id: "ORD-1234", customer: "Rahul Sharma", items: 3, total: 450, status: "Delivered" },
    { id: "ORD-1235", customer: "Priya Patel", items: 2, total: 320, status: "In Progress" },
    { id: "ORD-1236", customer: "Amit Kumar", items: 5, total: 780, status: "Pending" },
    { id: "ORD-1237", customer: "Sneha Reddy", items: 1, total: 150, status: "Delivered" },
  ],
}

export default function AdminDashboard() {
  const { isAdmin, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAdmin) {
      console.log("Not admin, redirecting to login")
      router.push("/login")
    }
  }, [isAdmin, router])

  if (!isAdmin) return null

  return (
    <AdminLayout activePage="dashboard">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
              onClick={() => router.push('/admin/productmgmt')}
            >
              <Package className="h-8 w-8" />
              <span>Add Product</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
              onClick={() => router.push('/admin/customermgmt')}
            >
              <Users className="h-8 w-8" />
              <span>Add Customer</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
              onClick={() => router.push('/admin/dailymenusetup')}
            >
              <Calendar className="h-8 w-8" />
              <span>Update Menu</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
              onClick={() => router.push('/admin/reports')}
            >
              <BarChart3 className="h-8 w-8" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">+{dashboardMetrics.pendingOrders} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">{dashboardMetrics.activeSubscriptions} active subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Todaysss's Revenue</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{new Intl.NumberFormat('en-IN').format(dashboardMetrics.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">+8% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{new Intl.NumberFormat('en-IN').format(dashboardMetrics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders and Popular Items */}
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        {/* ... keep existing order and items cards ... */}
      </div>
    </AdminLayout>
  )
}
