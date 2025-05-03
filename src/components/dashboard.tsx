"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Users, ShoppingCart, User, Calendar, BarChart3, ChevronDown, IndianRupee } from "lucide-react"
import { useAuthStore } from "@/store/store"
import { AdminLayout } from "@/components/admin-layout"

// Currency formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Dashboard metrics data
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

export function Dashboard() {
  const { isAdmin } = useAuthStore()
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
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">{dashboardMetrics.activeSubscriptions} active subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">+8% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardMetrics.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer} • {order.items} items
                    </p>
                  </div>
                  <div className="ml-auto text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === "Delivered" ? "bg-green-100 text-green-800" :
                      order.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {order.status}
                    </span>
                    <div className="mt-1 font-medium">{formatCurrency(order.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Popular Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardMetrics.popularItems.slice(0, 4).map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Ordered {item.orders} times</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}