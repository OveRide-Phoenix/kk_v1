"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Users,
  ShoppingCart,
  User,
  Calendar,
  ChefHat,
  IndianRupee,
  Eye,
  EyeOff,
} from "lucide-react"
import { useAuthStore } from "@/store/store"
import { AdminLayout } from "@/components/admin-layout"
import { getDashboardMetrics } from "@/lib/api"

// Define types for the metrics
type Order = {
  id: string
  customer: string
  items: number
  total: number
  status: string
  createdAt?: string | null
}

type ApiRecentOrder = {
  id?: string
  orderId?: number
  order_id?: number
  customer?: string
  customer_name?: string
  items?: number
  item_count?: number
  total?: number
  total_price?: number
  status?: string
  order_status?: string
  createdAt?: string | null
  created_at?: string | null
}

type ApiChecklistItem = {
  key?: string
  label?: string
  status?: string
  completed?: boolean
  detail?: string | null
}

type DashboardApiResponse = {
  totalOrders?: number
  pendingOrders?: number
  totalCustomers?: number
  activeSubscriptions?: number
  todaysRevenue?: number
  monthlyRevenue?: number
  recentOrders?: ApiRecentOrder[]
  ordersCompleted?: number
  checklist?: ApiChecklistItem[]
}

type DashboardMetrics = {
  totalOrders: number
  ordersCompleted: number
  pendingOrders: number
  totalCustomers: number
  activeSubscriptions: number
  todayRevenue: number
  monthlyRevenue: number
  recentOrders: Order[]
  checklist: ChecklistItem[]
}

type ChecklistItem = {
  key: string
  label: string
  status: string
  completed: boolean
  detail?: string | null
}

type RevenueCardProps = {
  title: string
  amount: number
  delta: string
  showAmount: boolean
  onToggle: () => void
}

// Currency formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const normalizeStatus = (status?: string | null) => {
  const trimmed = (status ?? "").trim()
  if (!trimmed) return "Pending"
  const normalized = trimmed.replace(/[-_]/g, " ")
  return normalized
    .split(/\s+/)
    .map((segment) =>
      segment ? segment[0].toUpperCase() + segment.slice(1).toLowerCase() : segment,
    )
    .join(" ")
}

const statusBadgeClass = (status: string) => {
  const key = status.toLowerCase().replace(/[-_]/g, " ")
  if (key === "delivered") return "bg-green-100 text-green-800"
  if (key === "pending") return "bg-yellow-100 text-yellow-800"
  if (key === "in progress" || key === "processing") return "bg-blue-100 text-blue-800"
  if (key === "cancelled") return "bg-red-100 text-red-800"
  return "bg-slate-100 text-slate-800"
}

const statusPriority = (status: string) => {
  const key = status.toLowerCase().replace(/[-_]/g, " ")
  if (key === "pending") return 0
  if (key === "in progress" || key === "processing") return 1
  if (key === "delivered" || key === "completed" || key === "done") return 2
  return 3
}

const checklistBadgeClass = (item: ChecklistItem) => {
  if (item.completed) return "bg-green-100 text-green-800"
  const key = item.status.toLowerCase()
  if (key.includes("progress")) return "bg-blue-100 text-blue-800"
  return "bg-amber-100 text-amber-900"
}

const formatOrderId = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "ORD"
  }

  if (typeof value === "string" && value.toUpperCase().startsWith("ORD-")) {
    return value
  }

  const numericValue = typeof value === "number" ? value : Number(value)
  if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
    return `ORD-${numericValue.toString().padStart(5, "0")}`
  }

  return String(value)
}

const pluralizeItems = (count: number) => `${count} ${count === 1 ? "item" : "items"}`

function RevenueCard({ title, amount, delta, showAmount, onToggle }: RevenueCardProps) {
  const displayAmount = showAmount ? formatCurrency(amount) : "₹ ***"
  const ToggleIcon = showAmount ? EyeOff : Eye

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <IndianRupee className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{displayAmount}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={showAmount ? "Hide revenue amount" : "Show revenue amount"}
          >
            <ToggleIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{delta}</p>
      </CardContent>
    </Card>
  )
}

// Default dashboard metrics data with proper typing
const defaultDashboardMetrics: DashboardMetrics = {
  totalOrders: 0,
  ordersCompleted: 0,
  pendingOrders: 0,
  totalCustomers: 0,
  activeSubscriptions: 0,
  todayRevenue: 0,
  monthlyRevenue: 0,
  recentOrders: [],
  checklist: [],
}

export function Dashboard() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>(defaultDashboardMetrics)
  const [loading, setLoading] = useState(true)
  const [showRevenue, setShowRevenue] = useState(false)

  const toggleRevenueVisibility = () => {
    setShowRevenue((prev) => !prev)
  }

  const recentOrdersSorted = useMemo(() => {
    const orders = dashboardMetrics.recentOrders ?? []
    return [...orders].sort((a, b) => {
      const statusDiff = statusPriority(a.status) - statusPriority(b.status)
      if (statusDiff !== 0) return statusDiff
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [dashboardMetrics.recentOrders])

  useEffect(() => {
    if (!isAdmin) {
      console.log("Not admin, redirecting to login")
      router.push("/login")
    } else {
      // Fetch dashboard metrics
      getDashboardMetrics()
        .then((data: DashboardApiResponse) => {
          const normalizedOrders: Order[] = (data.recentOrders ?? []).map((order: ApiRecentOrder) => {
            const createdAt = order.createdAt ?? order.created_at ?? null
            const rawItems = Number(order.items ?? order.item_count ?? 0)
            const rawTotal = Number(order.total ?? order.total_price ?? 0)
            return {
              id: formatOrderId(order.id ?? order.orderId ?? order.order_id),
              customer: order.customer ?? order.customer_name ?? "Unknown Customer",
              items: Number.isNaN(rawItems) ? 0 : rawItems,
              total: Number.isNaN(rawTotal) ? 0 : rawTotal,
              status: normalizeStatus(order.status ?? order.order_status),
              createdAt,
            }
          })

          const checklist: ChecklistItem[] = (data.checklist ?? []).map((item, index) => {
            const label = item.label ?? item.key ?? `Task ${index + 1}`
            const status = item.status ? normalizeStatus(item.status) : (item.completed ? "Done" : "Pending")
            return {
              key: item.key ?? `${index}-${label}`,
              label,
              status,
              completed: Boolean(item.completed),
              detail: item.detail ?? null,
            }
          })

          setDashboardMetrics({
            ...defaultDashboardMetrics,
            totalOrders: Number(data.totalOrders) || 0,
            ordersCompleted: Number(data.ordersCompleted) || Math.max((Number(data.totalOrders) || 0) - (Number(data.pendingOrders) || 0), 0),
            pendingOrders: Number(data.pendingOrders) || 0,
            totalCustomers: Number(data.totalCustomers) || 0,
            activeSubscriptions: Number(data.activeSubscriptions) || 0,
            todayRevenue: Number(data.todaysRevenue) || 0,
            monthlyRevenue: Number(data.monthlyRevenue) || 0,
            recentOrders: normalizedOrders,
            checklist,
          })
          setLoading(false)
        })
        .catch(err => {
          console.error("Error fetching dashboard metrics:", err)
          setLoading(false)
        })
    }
  }, [isAdmin, router])

  if (!isAdmin) return null
  if (loading) {
    return (
      <AdminLayout activePage="dashboard">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </CardContent>
        </Card>
      </AdminLayout>
    )
  }

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
              onClick={() => router.push('/admin/customermgmt')}
            >
              <Users className="h-8 w-8" />
              <span>Add Customer</span>
            </Button>

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
              onClick={() => router.push('/admin/dailymenusetup')}
            >
              <Calendar className="h-8 w-8" />
              <span>Daily Menu</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
              onClick={() => router.push('/admin/production')}
            >
              <ChefHat className="h-8 w-8" />
              <span>Kitchen Production</span>
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
            <div className="text-2xl font-bold">
              {dashboardMetrics.ordersCompleted}
              <span className="ml-2 text-base font-medium text-muted-foreground">
                + {dashboardMetrics.pendingOrders} pending
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardMetrics.totalOrders} total orders
            </p>
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
        <RevenueCard
          title="Today&apos;s Revenue"
          amount={dashboardMetrics.todayRevenue}
          delta="+8% from yesterday"
          showAmount={showRevenue}
          onToggle={toggleRevenueVisibility}
        />
        <RevenueCard
          title="Monthly Revenue"
          amount={dashboardMetrics.monthlyRevenue}
          delta="+12% from last month"
          showAmount={showRevenue}
          onToggle={toggleRevenueVisibility}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrdersSorted.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent orders yet.</p>
              ) : (
                recentOrdersSorted.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">{order.id}</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${statusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.customer} • {pluralizeItems(order.items)}
                      </p>
                    </div>
                    <div className="text-sm font-semibold">
                      {formatCurrency(order.total)}
                    </div>
                  </div>
                ))
              )}
            </div>
            {recentOrdersSorted.length > 0 && (
              <div className="pt-2 text-right">
                <Link
                  href="/admin/order-history"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  ...
                  <span className="sr-only">View all orders</span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardMetrics.checklist.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks tracked yet.</p>
              ) : (
                dashboardMetrics.checklist.map((task) => (
                  <div key={task.key} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium leading-none">{task.label}</p>
                      {task.detail ? (
                        <p className="text-xs text-muted-foreground mt-1">{task.detail}</p>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={`px-2 py-1 text-xs font-semibold ${checklistBadgeClass(task)}`}
                    >
                      {task.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
