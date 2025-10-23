"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format as formatDate } from "date-fns"
import {
  Crown,
  FileText,
  Loader2,
  Mail,
  MapPin,
  PauseCircle,
  PencilLine,
  Phone,
  Plus,
  SlidersHorizontal,
  User2,
} from "lucide-react"

import CustomerNavBar from "@/components/customer-nav-bar"
import { useAuthStore } from "@/store/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker"

interface CustomerProfile {
  customer_id: number
  referred_by?: string | null
  primary_mobile: string
  alternative_mobile?: string | null
  name: string
  recipient_name: string
  payment_frequency?: string | null
  email?: string | null
  house_apartment_no?: string | null
  written_address: string
  city: string
  pin_code: string
  latitude?: number | null
  longitude?: number | null
  address_type?: string | null
  route_assignment?: string | null
  created_at?: string | null
  is_admin?: boolean | number
}

interface AddressEntry {
  address_id: number
  address_type: string
  house_apartment_no: string | null
  written_address: string
  city: string
  pin_code: string
  is_default: boolean
  latitude?: number | null
  longitude?: number | null
  route_assignment?: string | null
}

type OrderItem = {
  item_name: string
  quantity: number
  price: number
}

type OrderSummary = {
  order_id: number
  created_at: string | null
  total_price: number
  status: string
  payment_method: string
  order_type?: string | null
  address: {
    label: string
    line: string
    city: string
    pin_code: string
  }
  items: OrderItem[]
}

type AddressFormState = {
  address_type: string
  house_apartment_no: string
  written_address: string
  city: string
  pin_code: string
  latitude: string
  longitude: string
  route_assignment: string
  is_default: boolean
}

const PAYMENT_OPTIONS = ["Daily", "Weekly", "Monthly"]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

const createAddressForm = (overrides: Partial<AddressFormState> = {}): AddressFormState => ({
  address_type: overrides.address_type ?? "Home",
  house_apartment_no: overrides.house_apartment_no ?? "",
  written_address: overrides.written_address ?? "",
  city: overrides.city ?? "",
  pin_code: overrides.pin_code ?? "",
  latitude: overrides.latitude ?? "",
  longitude: overrides.longitude ?? "",
  route_assignment: overrides.route_assignment ?? "",
  is_default: overrides.is_default ?? false,
})

export default function AccountPage() {
  const user = useAuthStore((state) => state.user)
  const isAdminStore = useAuthStore((state) => state.isAdmin)
  const setUser = useAuthStore((state) => state.setUser)
  const setAdmin = useAuthStore((state) => state.setAdmin)

  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [form, setForm] = useState<CustomerProfile | null>(null)
  const [addresses, setAddresses] = useState<AddressEntry[]>([])
  const [orders, setOrders] = useState<OrderSummary[]>([])

  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [addressModalMode, setAddressModalMode] = useState<"create" | "edit">("create")
  const [addressEditingId, setAddressEditingId] = useState<number | null>(null)
  const [addressForm, setAddressForm] = useState<AddressFormState>(createAddressForm())
  const [addressSubmitting, setAddressSubmitting] = useState(false)
  const [addressFormError, setAddressFormError] = useState<string | null>(null)

  const [billOrderId, setBillOrderId] = useState<number | null>(null)

  // Restore user session if the store is empty
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (user || !token) return
    ;(async () => {
      try {
        const response = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const me = await response.json()
      setUser(me)
      setAdmin(Boolean(me?.role === "admin" || me?.is_admin))
    } catch (err) {
      console.warn("Failed to load user", err)
    }
    })()
  }, [user, setUser, setAdmin])

  const customerId = user?.customer_id

  const fetchProfile = useCallback(async () => {
    if (!customerId) return
    const response = await fetch(`http://localhost:8000/get-customer/${customerId}`)
    if (!response.ok) {
      throw new Error("Unable to load profile")
    }
    const data = (await response.json()) as CustomerProfile
    setProfile(data)
    setForm(data)
    setAdmin(Boolean(data.is_admin))
  }, [customerId, setAdmin])

  const fetchAddresses = useCallback(async () => {
    if (!customerId) return
    const response = await fetch(`http://localhost:8000/api/customers/${customerId}/addresses`)
    if (!response.ok) {
      throw new Error("Unable to load addresses")
    }
    const data = (await response.json()) as AddressEntry[]
    setAddresses(data)
  }, [customerId])

  const fetchOrders = useCallback(async () => {
    if (!customerId) return
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const response = await fetch(`http://localhost:8000/api/customers/${customerId}/orders`)
      if (!response.ok) {
        throw new Error("Unable to load order history")
      }
      const data = (await response.json()) as OrderSummary[]
      setOrders(data.map((order) => ({ ...order, order_type: order.order_type ?? "one_time" })))
    } catch (err) {
      setOrders([])
      setOrdersError("Unable to load your order history right now.")
    } finally {
      setOrdersLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    if (!customerId) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        await Promise.all([fetchProfile(), fetchAddresses()])
      } catch (err) {
        if (!cancelled) {
          setError("Unable to load your account details. Please try again later.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    fetchOrders()

    return () => {
      cancelled = true
    }
  }, [customerId, fetchProfile, fetchAddresses, fetchOrders])

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.is_default) ?? null,
    [addresses]
  )
  const otherAddresses = useMemo(
    () => addresses.filter((address) => !address.is_default),
    [addresses]
  )

  const mapEmbedUrl = useMemo(() => {
    if (!profile) return null
    const hasCoordinates =
      profile.latitude !== null &&
      profile.longitude !== null &&
      profile.latitude !== undefined &&
      profile.longitude !== undefined &&
      (Math.abs(profile.latitude) + Math.abs(profile.longitude) > 0)

    if (hasCoordinates) {
      return `https://maps.google.com/maps?q=${profile.latitude},${profile.longitude}&z=15&output=embed`
    }

    const query = [profile.house_apartment_no, profile.written_address, profile.city, profile.pin_code]
      .filter(Boolean)
      .join(", ")
    if (!query) return null
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
  }, [profile])

  const billOrder = useMemo(
    () => orders.find((order) => order.order_id === billOrderId) ?? null,
    [orders, billOrderId]
  )

  const profileIsAdmin = profile?.is_admin

  const isAdmin = useMemo(
    () =>
      Boolean(
        isAdminStore ||
          profileIsAdmin ||
          user?.role === "admin" ||
          (user as any)?.is_admin
      ),
    [isAdminStore, profileIsAdmin, user]
  )

  const handleChange = (key: keyof CustomerProfile, value: string) => {
    if (!form) return
    setForm({ ...form, [key]: value })
  }

  const handleSave = async () => {
    if (!form || !profile) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        referred_by: form.referred_by ?? null,
        primary_mobile: form.primary_mobile,
        alternative_mobile: form.alternative_mobile ?? null,
        name: form.name.trim(),
        recipient_name: form.recipient_name.trim(),
        payment_frequency: form.payment_frequency ?? "Daily",
        email: form.email ?? null,
        house_apartment_no: form.house_apartment_no ?? null,
        written_address: form.written_address.trim(),
        city: form.city.trim(),
        pin_code: form.pin_code,
        latitude: form.latitude ?? 0,
        longitude: form.longitude ?? 0,
        address_type: form.address_type ?? "Home",
        route_assignment: form.route_assignment ?? null,
        is_default: true,
      }

      const response = await fetch(`http://localhost:8000/update-customer/${profile.customer_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to update account")
      }

      await fetchProfile()
      await fetchAddresses()
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your account right now.")
    } finally {
      setSaving(false)
    }
  }

  const handleAddressModalClose = () => {
    setAddressModalOpen(false)
    setAddressFormError(null)
    setAddressForm(createAddressForm())
    setAddressEditingId(null)
  }

  const openCreateAddressModal = () => {
    setAddressModalMode("create")
    setAddressEditingId(null)
    setAddressForm(
      createAddressForm({
        city: form?.city ?? "",
        pin_code: form?.pin_code ?? "",
        latitude:
          profile?.latitude != null
            ? String(profile.latitude)
            : defaultAddress?.latitude != null
              ? String(defaultAddress.latitude)
              : "",
        longitude:
          profile?.longitude != null
            ? String(profile.longitude)
            : defaultAddress?.longitude != null
              ? String(defaultAddress.longitude)
              : "",
      })
    )
    setAddressFormError(null)
    setAddressModalOpen(true)
  }

  const openEditAddressModal = (entry: AddressEntry) => {
    setAddressModalMode("edit")
    setAddressEditingId(entry.address_id)
    setAddressForm(
      createAddressForm({
        address_type: entry.address_type ?? "Home",
        house_apartment_no: entry.house_apartment_no ?? "",
        written_address: entry.written_address ?? "",
        city: entry.city ?? "",
        pin_code: entry.pin_code ?? "",
        latitude:
          entry.latitude !== null && entry.latitude !== undefined ? String(entry.latitude) : "",
        longitude:
          entry.longitude !== null && entry.longitude !== undefined ? String(entry.longitude) : "",
        route_assignment: entry.route_assignment ?? "",
        is_default: entry.is_default,
      })
    )
    setAddressFormError(null)
    setAddressModalOpen(true)
  }

  const handleAddressLocationSelect = useCallback((lat: number, lng: number) => {
    setAddressForm((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }))
  }, [])

  const handleAddressSubmit = async () => {
    if (!customerId) return
    setAddressSubmitting(true)
    setAddressFormError(null)

    try {
      const latitudeRaw = addressForm.latitude.trim()
      const longitudeRaw = addressForm.longitude.trim()
      let latitude: number | null = null
      if (latitudeRaw.length > 0) {
        const parsedLatitude = Number(latitudeRaw)
        if (Number.isNaN(parsedLatitude)) {
          throw new Error("Latitude must be a valid number.")
        }
        latitude = parsedLatitude
      }

      let longitude: number | null = null
      if (longitudeRaw.length > 0) {
        const parsedLongitude = Number(longitudeRaw)
        if (Number.isNaN(parsedLongitude)) {
          throw new Error("Longitude must be a valid number.")
        }
        longitude = parsedLongitude
      }

      const payload = {
        address_type: addressForm.address_type.trim() || "Home",
        house_apartment_no: addressForm.house_apartment_no.trim() || null,
        written_address: addressForm.written_address.trim(),
        city: addressForm.city.trim(),
        pin_code: addressForm.pin_code.trim(),
        latitude,
        longitude,
        route_assignment: addressForm.route_assignment.trim() || null,
        is_default: addressForm.is_default,
      }

      const endpoint =
        addressModalMode === "create"
          ? `http://localhost:8000/api/customers/${customerId}/addresses`
          : `http://localhost:8000/api/customers/${customerId}/addresses/${addressEditingId}`

      const response = await fetch(endpoint, {
        method: addressModalMode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || "Unable to save address.")
      }

      await Promise.all([fetchAddresses(), fetchProfile()])
      handleAddressModalClose()
    } catch (err) {
      setAddressFormError(err instanceof Error ? err.message : "Unable to save address.")
    } finally {
      setAddressSubmitting(false)
    }
  }

  const handleSetDefaultAddress = async (addressId: number) => {
    if (!customerId) return
    try {
      const response = await fetch(
        `http://localhost:8000/api/customers/${customerId}/addresses/${addressId}/default`,
        { method: "POST" }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || "Unable to update default address.")
      }
      await Promise.all([fetchAddresses(), fetchProfile()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update default address.")
    }
  }

  const handlePrintBill = useCallback(() => {
    if (!billOrder || typeof window === "undefined") return
    const printWindow = window.open("", "_blank", "width=720,height=900")
    if (!printWindow) return

    const generatedAt = formatDate(new Date(), "PPP p")
    const orderDate = billOrder.created_at
      ? formatDate(new Date(billOrder.created_at), "PPP p")
      : "N/A"

    const itemsRows = billOrder.items
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.item_name}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(
              item.price
            )}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(
              item.price * item.quantity
            )}</td>
          </tr>`
      )
      .join("")

    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${billOrder.order_id} • Kuteera Kitchen</title>
          <style>
            body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; padding: 32px; color: #2c1810; }
            h1 { margin-bottom: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            .meta { margin-top: 24px; font-size: 14px; color: #5f4339; }
            .footer { margin-top: 40px; font-size: 12px; color: #8d6e63; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Kuteera Kitchen</h1>
          <p class="meta">Order #${billOrder.order_id} • ${orderDate}</p>
          <p class="meta">Generated: ${generatedAt}</p>
          <p class="meta">Deliver to: ${billOrder.address.label} – ${[
            billOrder.address.line,
            billOrder.address.city,
            billOrder.address.pin_code,
          ]
            .filter(Boolean)
            .join(", ")}</p>
          <table>
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Qty</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Rate</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <h2 style="text-align:right;margin-top:16px;">Total: ${formatCurrency(
            billOrder.total_price
          )}</h2>
          <div class="footer">
            Thank you for dining with Kuteera Kitchen. Warm meals, delivered with care.
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }, [billOrder])

  const editingDefaultAddress =
    addressModalMode === "edit" && defaultAddress?.address_id === addressEditingId

  const modalCoordinates = useMemo(() => {
    const parseCoord = (value: string | null | undefined) => {
      if (!value) return null
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric !== 0 ? numeric : null
    }

    const parsedLat = parseCoord(addressForm.latitude)
    const parsedLng = parseCoord(addressForm.longitude)
    if (parsedLat !== null && parsedLng !== null) {
      return { lat: parsedLat, lng: parsedLng }
    }

    if (addressModalMode === "edit" && addressEditingId) {
      const target = addresses.find((address) => address.address_id === addressEditingId)
      if (target && target.latitude != null && target.longitude != null) {
        return { lat: Number(target.latitude), lng: Number(target.longitude) }
      }
    }

    const fallbackLat =
      profile?.latitude ??
      defaultAddress?.latitude ??
      (addresses.length ? addresses[0].latitude ?? null : null)
    const fallbackLng =
      profile?.longitude ??
      defaultAddress?.longitude ??
      (addresses.length ? addresses[0].longitude ?? null : null)

    if (fallbackLat != null && fallbackLng != null) {
      return { lat: Number(fallbackLat), lng: Number(fallbackLng) }
    }

    return { lat: 12.9716, lng: 77.5946 }
  }, [addressForm.latitude, addressForm.longitude, addressModalMode, addressEditingId, addresses, defaultAddress, profile])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
        <CustomerNavBar />
        <div className="flex min-h-[60vh] items-center justify-center text-[#8d6e63]">
          Loading your account…
        </div>
      </div>
    )
  }

  if (!form || !profile) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
        <CustomerNavBar />
        <div className="flex min-h-[60vh] items-center justify-center text-[#c75b39]">
          {error ?? "No customer information available."}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-20">
      <CustomerNavBar />
      <main className="container mx-auto px-4 pt-24">
        <div className="mb-6 flex flex-col gap-2">
          <div>
            <p className="text-sm uppercase tracking-wide text-[#8d6e63]">Account</p>
            <h1 className="text-3xl font-serif font-semibold text-[#463028] flex items-center gap-2">
              Profile overview
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <Crown className="h-3 w-3" /> Admin
                </span>
              )}
            </h1>
            <p className="text-xs text-[#8d6e63]">
              Member since{" "}
              {profile.created_at ? formatDate(new Date(profile.created_at), "PPP") : "recently"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-xl font-serif text-[#463028]">
                <User2 className="h-5 w-5 text-primary" />
                Personal information
              </CardTitle>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => { setForm(profile); setIsEditing(false) }} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient name</Label>
                <Input
                  id="recipient"
                  value={form.recipient_name}
                  onChange={(e) => handleChange("recipient_name", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Primary mobile</Label>
                <div className="relative">
                  <Input id="phone" value={form.primary_mobile} disabled className="bg-muted" />
                  <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d6e63]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="altPhone">Alternate mobile</Label>
                <Input
                  id="altPhone"
                  value={form.alternative_mobile ?? ""}
                  onChange={(e) => handleChange("alternative_mobile", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={!isEditing}
                  />
                  <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d6e63]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref">Referred by</Label>
                <Input
                  id="ref"
                  value={form.referred_by ?? ""}
                  onChange={(e) => handleChange("referred_by", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment frequency</Label>
                <Select
                  value={form.payment_frequency ?? "Daily"}
                  onValueChange={(value) => handleChange("payment_frequency", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2">
              <CardTitle className="flex items-center justify-between text-xl font-serif text-[#463028]">
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Default address
                </span>
                {defaultAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditAddressModal(defaultAddress)}
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </CardTitle>
              <p className="text-xs text-[#8d6e63]">
                This is where we deliver by default. Update the details or choose another saved
                address as default.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-[#e6dfd0] bg-white p-4 text-sm">
                <p className="font-semibold text-[#463028]">{profile.address_type ?? "Home"}</p>
                <p className="mt-1 text-[#8d6e63]">
                  {[profile.house_apartment_no, profile.written_address, profile.city, profile.pin_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              {mapEmbedUrl && (
                <div className="overflow-hidden rounded-lg border border-[#e6dfd0] bg-white shadow-sm">
                  <iframe
                    title="Default delivery location"
                    src={mapEmbedUrl}
                    width="100%"
                    height="220"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-serif text-[#463028]">
              <FileText className="h-5 w-5 text-primary" />
              Order history
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ordersLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#8d6e63]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading order history…
              </div>
            ) : ordersError ? (
              <p className="text-sm text-[#c75b39]">{ordersError}</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-[#8d6e63]">You haven&apos;t placed any orders yet.</p>
            ) : (
              orders.map((order) => {
                const statusKey = order.status.toLowerCase()
                const statusStyle =
                  statusKey === "delivered"
                    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                    : statusKey === "in progress"
                    ? "border-amber-200 bg-amber-100 text-amber-700"
                    : "border-[#e6dfd0] bg-[#f3ebe2] text-[#705446]"

                const isSubscriptionOrder = (order.order_type ?? "").toLowerCase() === "subscription"

                return (
                  <div
                    key={order.order_id}
                    className="rounded-lg border border-[#e6dfd0] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#463028]">
                          Order #{order.order_id}
                        </p>
                        <p className="text-xs text-[#8d6e63]">
                          {order.created_at
                            ? formatDate(new Date(order.created_at), "PPP p")
                            : "Scheduled"}
                        </p>
                        <p className="text-xs text-[#8d6e63]">
                          Deliver to {order.address.label} –{" "}
                          {[order.address.line, order.address.city]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <Badge variant="outline" className={`${statusStyle} uppercase`}>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-[#463028]">
                      {order.items.map((item, index) => (
                        <div key={`${order.order_id}-${item.item_name}-${index}`} className="flex justify-between">
                          <span>
                            {item.item_name} × {item.quantity}
                          </span>
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#463028]">
                      <span className="font-semibold">
                        Total: {formatCurrency(order.total_price)} • {order.payment_method}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setBillOrderId(order.order_id)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate bill
                        </Button>
                        {isSubscriptionOrder && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="cursor-not-allowed border-dashed text-[#8d6e63]/70"
                            >
                              <PauseCircle className="mr-2 h-4 w-4" />
                              Pause subscription
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="cursor-not-allowed border-dashed text-[#8d6e63]/70"
                            >
                              <SlidersHorizontal className="mr-2 h-4 w-4" />
                              Update subscription
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-serif text-[#463028]">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Other saved addresses
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openCreateAddressModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add new address
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 md:grid md:grid-cols-2 md:gap-3">
            {otherAddresses.length === 0 ? (
              <p className="text-sm text-[#8d6e63]">
                You haven&apos;t saved any additional addresses yet.
              </p>
            ) : (
              otherAddresses.map((address) => (
                <div
                  key={address.address_id}
                  className="flex flex-col gap-3 rounded-lg border border-[#e6dfd0] bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#463028]">{address.address_type}</p>
                    <p className="mt-1 text-xs text-[#8d6e63]">
                      {[address.house_apartment_no, address.written_address, address.city, address.pin_code]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditAddressModal(address)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefaultAddress(address.address_id)}
                    >
                      Make default
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={addressModalOpen} onOpenChange={(open) => (open ? null : handleAddressModalClose())}>
        <DialogContent className="w-full max-w-4xl md:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {addressModalMode === "create" ? "Add new address" : "Edit address"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address_type">Label</Label>
                <Input
                  id="address_type"
                  value={addressForm.address_type}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, address_type: e.target.value }))
                  }
                  placeholder="Home, Office…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_house">House / apartment</Label>
                <Input
                  id="address_house"
                  value={addressForm.house_apartment_no}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, house_apartment_no: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line">Address</Label>
              <Textarea
                id="address_line"
                value={addressForm.written_address}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, written_address: e.target.value }))
                }
                className="min-h-[120px] w-full resize-none border border-input/60 bg-secondary/40 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address_city">City</Label>
                <Input
                  id="address_city"
                  value={addressForm.city}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_pin">PIN code</Label>
                <Input
                  id="address_pin"
                  value={addressForm.pin_code}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, pin_code: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Map location</Label>
              <GoogleMapPicker
                key={`${addressModalMode}-${addressEditingId ?? "new"}-${addressModalOpen}`}
                lat={modalCoordinates.lat}
                lng={modalCoordinates.lng}
                onLocationSelect={handleAddressLocationSelect}
              />
              <p className="text-xs text-[#8d6e63]">
                {addressForm.latitude && addressForm.longitude
                  ? `Selected: ${Number(addressForm.latitude).toFixed(5)}, ${Number(addressForm.longitude).toFixed(5)}`
                  : "Drag the pin or search to choose an exact delivery point."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_route">Route assignment</Label>
              <Input
                id="address_route"
                value={addressForm.route_assignment}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, route_assignment: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/10 p-3">
              <div>
                <p className="text-sm font-medium text-[#463028]">Set as default address</p>
                <p className="text-xs text-[#8d6e63]">
                  We&apos;ll use this address for future deliveries automatically.
                </p>
              </div>
              <Switch
                checked={addressForm.is_default}
                onCheckedChange={(checked) =>
                  setAddressForm((prev) => ({ ...prev, is_default: checked }))
                }
                disabled={editingDefaultAddress}
                aria-readonly={editingDefaultAddress}
              />
            </div>
            {addressFormError && (
              <p className="text-sm text-destructive">{addressFormError}</p>
            )}
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleAddressModalClose} disabled={addressSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddressSubmit} disabled={addressSubmitting}>
              {addressSubmitting ? "Saving…" : "Save address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={billOrderId !== null} onOpenChange={(open) => (!open ? setBillOrderId(null) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order bill</DialogTitle>
          </DialogHeader>
          {billOrder ? (
            <div className="space-y-4 text-sm text-[#463028]">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8d6e63]">
                <span>Order #{billOrder.order_id}</span>
                <span>
                  {billOrder.created_at
                    ? formatDate(new Date(billOrder.created_at), "PPP p")
                    : "Scheduled"}
                </span>
              </div>
              <div className="rounded-lg border border-[#e6dfd0] bg-white p-3 text-xs text-[#8d6e63]">
                <p className="font-medium text-[#463028]">Deliver to {billOrder.address.label}</p>
                <p>
                  {[billOrder.address.line, billOrder.address.city, billOrder.address.pin_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <div className="space-y-2">
                {billOrder.items.map((item) => (
                  <div key={`${billOrder.order_id}-${item.item_name}`} className="flex justify-between text-xs">
                    <span>
                      {item.item_name} × {item.quantity}
                    </span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <p className="text-right font-semibold">
                Total: {formatCurrency(billOrder.total_price)}
              </p>
              <DialogFooter className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setBillOrderId(null)}
                >
                  Close
                </Button>
                <Button onClick={handlePrintBill}>
                  <FileText className="mr-2 h-4 w-4" />
                  Print bill
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <p className="text-sm text-[#8d6e63]">Unable to load this order.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
