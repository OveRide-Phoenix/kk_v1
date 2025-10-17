"use client"

import { useEffect, useState } from "react"
import CustomerNavBar from "@/components/customer-nav-bar"
import { useAuthStore } from "@/store/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { format as formatDate } from "date-fns"

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
}

interface AddressEntry {
  address_id: number
  address_type: string
  house_apartment_no: string | null
  written_address: string
  city: string
  pin_code: string
  is_default: boolean
}

const PAYMENT_OPTIONS = ["Daily", "Weekly", "Monthly"]

export default function AccountPage() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [form, setForm] = useState<CustomerProfile | null>(null)
  const [addresses, setAddresses] = useState<AddressEntry[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
      } catch (err) {
        console.error("Failed to load user", err)
      }
    })()
  }, [user, setUser])

  useEffect(() => {
    const customerId = user?.customer_id
    if (!customerId) return
    setIsLoading(true)
    setError(null)

    const fetchProfile = async () => {
      try {
        const [profileRes, addressRes] = await Promise.all([
          fetch(`http://localhost:8000/get-customer/${customerId}`),
          fetch(`http://localhost:8000/api/customers/${customerId}/addresses`),
        ])

        if (!profileRes.ok) throw new Error("Unable to load profile")
        const profileData = (await profileRes.json()) as CustomerProfile
        setProfile(profileData)
        setForm(profileData)

        if (addressRes.ok) {
          const addressData = (await addressRes.json()) as AddressEntry[]
          setAddresses(addressData)
        }
      } catch (err) {
        console.error(err)
        setError("Unable to load your account details. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const handleChange = (key: keyof CustomerProfile, value: string) => {
    if (!form) return
    setForm({ ...form, [key]: value })
  }

  const handleSave = async () => {
    if (!form || !profile) return
    setSaving(true)
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
        const data = await response.json()
        throw new Error(data.detail || "Failed to update account")
      }

      setProfile(form)
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      setError("Unable to update your account right now.")
    } finally {
      setSaving(false)
    }
  }

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-[#8d6e63]">Account</p>
            <h1 className="text-3xl font-serif font-semibold text-[#463028]">Profile overview</h1>
            <p className="text-xs text-[#8d6e63]">
              Member since {profile.created_at ? formatDate(new Date(profile.created_at), "PPP") : "recently"}
            </p>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setForm(profile); setIsEditing(false) }} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif text-[#463028]">Personal information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient name</Label>
                <Input id="recipient" value={form.recipient_name} onChange={(e) => handleChange("recipient_name", e.target.value)} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Primary mobile</Label>
                <Input id="phone" value={form.primary_mobile} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="altPhone">Alternate mobile</Label>
                <Input id="altPhone" value={form.alternative_mobile ?? ""} onChange={(e) => handleChange("alternative_mobile", e.target.value)} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email ?? ""} onChange={(e) => handleChange("email", e.target.value)} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref">Referred by</Label>
                <Input id="ref" value={form.referred_by ?? ""} onChange={(e) => handleChange("referred_by", e.target.value)} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label>Payment frequency</Label>
                <Select value={form.payment_frequency ?? "Daily"} onValueChange={(value) => handleChange("payment_frequency", value)} disabled={!isEditing}>
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
            <CardHeader>
              <CardTitle className="text-xl font-serif text-[#463028]">Default address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="house">House / apartment</Label>
                <Input id="house" value={form.house_apartment_no ?? ""} onChange={(e) => handleChange("house_apartment_no", e.target.value)} disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={form.written_address} onChange={(e) => handleChange("written_address", e.target.value)} disabled={!isEditing} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => handleChange("city", e.target.value)} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN code</Label>
                  <Input id="pin" value={form.pin_code} onChange={(e) => handleChange("pin_code", e.target.value)} disabled={!isEditing} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {addresses.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-[#463028]">Other saved addresses</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {addresses.map((address) => (
                <div key={address.address_id} className="rounded-lg border border-[#e6dfd0] bg-white p-3 shadow-sm">
                  <p className="text-sm font-semibold text-[#463028]">
                    {address.address_type}
                    {address.is_default && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-[#8d6e63]">
                    {[address.house_apartment_no, address.written_address, address.city, address.pin_code]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
