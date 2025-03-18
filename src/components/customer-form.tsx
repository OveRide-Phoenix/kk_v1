"use client"

import type React from "react"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker"

// Define customer types
type CustomerType = "Regular" | "Reseller" | "Agent"
type PaymentFrequency = "Daily" | "Weekly" | "Monthly"
type CustomerStatus = "Active" | "Pending" | "Inactive"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  orders: number
  status: CustomerStatus
  address: string
  type: CustomerType
  paymentFrequency: PaymentFrequency
  routeNumber?: string
  // Additional fields from the form
  referredBy?: string
  alternativeMobile?: string
  recipientName?: string
  houseApartmentNo?: string
  writtenAddress?: string
  city?: string
  pinCode?: string
  latitude?: number | null
  longitude?: number | null
  addressType?: string
  routeAssignment?: string
  isDefault?: boolean
}

interface CustomerFormProps {
  customer: Customer | null
  onSave: (customer: Customer) => void
  onCancel: () => void
}

export default function CustomerForm({ customer, onSave, onCancel }: CustomerFormProps) {
  const isEditing = !!customer

  const [formData, setFormData] = useState<Partial<Customer>>(
    customer || {
      name: "",
      email: "",
      phone: "",
      status: "Active" as CustomerStatus,
      address: "",
      type: "Regular" as CustomerType,
      paymentFrequency: "Daily" as PaymentFrequency,
      routeNumber: "",
      // Additional fields
      referredBy: "",
      alternativeMobile: "",
      recipientName: "",
      houseApartmentNo: "",
      writtenAddress: "",
      city: "Bangalore",
      pinCode: "",
      latitude: null,
      longitude: null,
      addressType: "Home",
      routeAssignment: "",
      isDefault: true,
    },
  )

  const [addressType, setAddressType] = useState(customer?.addressType || "Home")
  const [otherAddressName, setOtherAddressName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [activeTab, setActiveTab] = useState("basic")

  // Set address type from customer data if editing
  useEffect(() => {
    if (customer?.addressType) {
      if (["Home", "Work"].includes(customer.addressType)) {
        setAddressType(customer.addressType)
      } else {
        setAddressType("Other")
        setOtherAddressName(customer.addressType)
      }
    }
  }, [customer])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === "phone" || name === "alternativeMobile") {
        let newValue = value.startsWith("+91 ") ? value.slice(4) : value
        if (newValue.startsWith("+91")) {
          newValue = newValue.slice(3)
        }
        newValue = newValue.replace(/\D/g, "").slice(0, 10)
        return { ...prev, [name]: newValue }
      }

      if (name === "pinCode") {
        const newValue = value.replace(/\D/g, "").slice(0, 6)
        return { ...prev, [name]: newValue }
      }

      if (name === "email") {
        return { ...prev, [name]: value.toLowerCase() }
      }

      return { ...prev, [name]: value }
    })
  }, [])

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    // Combine address fields into a single address string
    const fullAddress = `${formData.houseApartmentNo || ""}, ${formData.writtenAddress || ""}, ${formData.city || ""}, ${formData.pinCode || ""}`

    // Prepare the customer data
    const customerData = {
      ...formData,
      address: fullAddress,
      addressType: addressType === "Other" ? otherAddressName : addressType,
    } as Customer

    // If it's a new customer, generate an ID
    if (!isEditing) {
      customerData.id = `CUST-${Date.now().toString().slice(-4)}`
      customerData.orders = 0
    }

    onSave(customerData)
  }

  // Memoize the Google Map component to prevent unnecessary re-renders
  const MemoizedGoogleMap = useMemo(
    () => (
      <GoogleMapPicker
        onLocationSelect={handleLocationSelect}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="address">Address & Location</TabsTrigger>
          
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input id="name" name="name" value={formData.name || ""} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referredBy">Referred By (Optional)</Label>
                <Input id="referredBy" name="referredBy" value={formData.referredBy || ""} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Primary Mobile <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone ? `+91 ${formData.phone}` : ""}
                  onChange={handleChange}
                  placeholder="+91"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternativeMobile">Alternative Mobile (Optional)</Label>
                <Input
                  id="alternativeMobile"
                  name="alternativeMobile"
                  type="tel"
                  value={formData.alternativeMobile ? `+91 ${formData.alternativeMobile}` : ""}
                  onChange={handleChange}
                  placeholder="+91"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientName">
                  Deliver To / Food Receiver Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="recipientName"
                  name="recipientName"
                  value={formData.recipientName || ""}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Customer Type & Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Customer Details</h3>

            <div className="space-y-2">
              <Label>Customer Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value: CustomerType) => handleSelectChange("type", value)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Regular" id="type-regular" />
                  <Label htmlFor="type-regular">Regular</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Reseller" id="type-reseller" />
                  <Label htmlFor="type-reseller">Reseller</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Agent" id="type-agent" />
                  <Label htmlFor="type-agent">Agent</Label>
                </div>
              </RadioGroup>
            </div>

            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="status">Customer Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: CustomerStatus) => handleSelectChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentFrequency">Payment Frequency</Label>
                <Select
                  value={formData.paymentFrequency}
                  onValueChange={(value: PaymentFrequency) => handleSelectChange("paymentFrequency", value)}
                >
                  <SelectTrigger id="paymentFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="routeNumber">Route Number (Optional)</Label>
                <Input
                  id="routeNumber"
                  name="routeNumber"
                  value={formData.routeNumber || ""}
                  onChange={handleChange}
                  placeholder="e.g., R-101"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setActiveTab("address")}>
              Next: Address Details
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="address" className="space-y-4">
          {/* Address Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Address Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressType">Address Type</Label>
                <Select
                  value={addressType}
                  onValueChange={(value) => {
                    setAddressType(value)
                    handleSelectChange("addressType", value)
                  }}
                >
                  <SelectTrigger id="addressType">
                    <SelectValue placeholder="Select address type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Home">Home</SelectItem>
                    <SelectItem value="Work">Work</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Other Address Type Input */}
              {addressType === "Other" && (
                <div className="space-y-2">
                  <Label htmlFor="otherAddressName">
                    Specify Address Type <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="otherAddressName"
                    name="otherAddressName"
                    value={otherAddressName}
                    onChange={(e) => setOtherAddressName(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="houseApartmentNo">
                House/Apartment <span className="text-destructive">*</span>
              </Label>
              <Input
                id="houseApartmentNo"
                name="houseApartmentNo"
                value={formData.houseApartmentNo || ""}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="writtenAddress">
                Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="writtenAddress"
                name="writtenAddress"
                value={formData.writtenAddress || ""}
                onChange={handleChange}
                required
                className="min-h-[100px] w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.city} onValueChange={(value) => handleSelectChange("city", value)}>
                  <SelectTrigger id="city">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bangalore">Bangalore</SelectItem>
                    <SelectItem value="Mumbai">Mysore</SelectItem>
                    
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pinCode">
                  Pin Code <span className="text-destructive">*</span>
                </Label>
                <Input id="pinCode" name="pinCode" value={formData.pinCode || ""} onChange={handleChange} required />
              </div>
            </div>

            {/* Google Maps Location */}
            <div className="space-y-4">
              <Label>Google Maps Location</Label>
              <div className="h-[300px] w-full border rounded-md overflow-hidden">{MemoizedGoogleMap}</div>
              {formData.latitude && formData.longitude && (
                <p className="text-sm text-muted-foreground">
                  Selected Location: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          {errorMessage && <div className="text-destructive text-sm">{errorMessage}</div>}

          <div className="flex justify-between pt-4">
            <Button type="button" onClick={() => setActiveTab("basic")}>
              Back: Basic Information
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Customer" : "Save Customer"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  )
}

