"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DatePickerWithPresets } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { http } from "@/lib/http"
import { useAuthStore } from "@/store/store"
import { Info, Loader2, MapPin, Route, Truck, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

type TripSheetOrder = {
  order_id: number
  customer_id: number
  customer_name: string | null
  phone: string | null
  email?: string | null
  total_price: number
  payment_method: string
  paid: boolean
  status: string
  address: {
    address_id: number | null
    label?: string | null
    house_apartment_no?: string | null
    written_address?: string | null
    city?: string | null
    pin_code?: string | null
  }
}

type TripSheetRoute = {
  route: string
  total_orders: number
  total_amount: number
  orders: TripSheetOrder[]
}

type TripSheetResponse = {
  date: string
  city_code: string
  routes: TripSheetRoute[]
  status_updates: number
  generated_at: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

const statusBadgeClass = (status: string) => {
  const raw = status.toLowerCase()
  const normalized = raw
    .replace(/\(payment due\)/g, "")
    .replace(/\s+-\s+payment due/g, "")
    .trim()
  if (raw.includes("payment due")) {
    return "bg-amber-50 text-amber-900 border border-amber-100"
  }
  if (normalized === "confirmed") {
    return "bg-sky-50 text-sky-700 border border-sky-100"
  }
  if (normalized === "preparing") {
    return "bg-amber-50 text-amber-800 border border-amber-100"
  }
  if (normalized === "on the way") {
    return "bg-indigo-50 text-indigo-700 border border-indigo-100"
  }
  if (normalized === "delivered") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-100"
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return "bg-rose-50 text-rose-700 border border-rose-100"
  }
  return "bg-slate-50 text-slate-700 border border-slate-100"
}

export default function TripSheetPage() {
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS")
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [routes, setRoutes] = useState<TripSheetRoute[]>([])
  const [statusUpdates, setStatusUpdates] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const isoDate = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate])
  const dateLabel = useMemo(() => format(selectedDate, "PPP"), [selectedDate])

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await http.post("/api/logistics/trip-sheet", {
        date: isoDate,
        city_code: adminCity,
      })
      const data = (await response.json()) as TripSheetResponse | { detail?: string }
      if (!response.ok) {
        throw new Error("detail" in data && data.detail ? data.detail : "Failed to generate trip sheet")
      }
      const payload = data as TripSheetResponse
      setRoutes(payload.routes ?? [])
      setStatusUpdates(payload.status_updates ?? 0)
      toast({
        title: "Trip sheet generated",
        description:
          payload.routes?.length && payload.status_updates
            ? `${payload.status_updates} orders marked as On the Way.`
            : payload.routes?.length
              ? "No status changes were required."
              : "No orders found for the selected date.",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate trip sheet")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout activePage="trip-sheet">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-serif font-semibold text-foreground">Trip Sheet Generation</h1>
        <p className="text-sm text-muted-foreground">
          Generate city-wise delivery manifests grouped by route and automatically advance orders to “On the Way”.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Select run date</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Service date</p>
            <DatePickerWithPresets selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <p>
              <strong>City:</strong> {adminCity}
            </p>
            <p className="flex items-center gap-2 text-xs">
              <Info className="h-4 w-4 text-muted-foreground" /> Orders in “Confirmed (Payment Due)”, “Confirmed”, or
              “Preparing” will move to “On the Way”.
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </span>
            ) : (
              "Generate Trip Sheet"
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {routes.length === 0 && !error ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Route className="h-6 w-6 text-muted-foreground" />
            <p>Generate a trip sheet to see the grouped delivery routes for {dateLabel}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {statusUpdates > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {statusUpdates} orders updated to <strong>On the Way</strong>.
            </div>
          )}
          {routes.map((route) => (
            <Card key={route.route}>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    {route.route}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {route.total_orders} orders • {formatCurrency(route.total_amount)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {route.orders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell>
                          <div className="font-semibold">ORD-{String(order.order_id).padStart(5, "0")}</div>
                          <div className="text-xs text-muted-foreground">{order.email ?? order.phone ?? "—"}</div>
                        </TableCell>
                        <TableCell>
                          <div>{order.customer_name ?? "Customer"}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.phone ? `+91 ${order.phone}` : "No phone"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1 text-foreground">
                            <MapPin className="h-3.5 w-3.5 text-primary" />{" "}
                            {order.address.label || order.address.house_apartment_no || "Address"}
                          </div>
                          <p className="text-xs">
                            {[order.address.written_address, order.address.city, order.address.pin_code]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{formatCurrency(order.total_price)}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Wallet className="h-3 w-3" />
                            {order.payment_method} {order.paid ? "· Paid" : "· Collect"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", statusBadgeClass(order.status))}>{order.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
