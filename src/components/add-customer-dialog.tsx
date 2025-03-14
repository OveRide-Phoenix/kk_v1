"use client"

import { useState, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker"

interface AddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCustomerDialog({ open, onOpenChange }: AddCustomerDialogProps) {
  const [formData, setFormData] = useState({
    referredBy: "",
    primaryMobile: "",
    alternativeMobile: "",
    name: "",
    recipientName: "",
    paymentFrequency: "Daily",
    email: "",
    houseApartmentNo: "",
    writtenAddress: "",
    city: "",
    pinCode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    addressType: "",
    routeAssignment: "",
    isDefault: true,
  })

  const [addressType, setAddressType] = useState("")
  const [otherAddressName, setOtherAddressName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => {
        if (name === "primaryMobile" || name === "alternativeMobile") {
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
    },
    []
  )

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage("")

    const formattedData = {
      referred_by: formData.referredBy || null,
      phone: formData.primaryMobile,
      alt_phone: formData.alternativeMobile || null,
      name: formData.name,
      recipient: formData.recipientName,
      address_type: addressType === "Other" ? otherAddressName : addressType,
      house: formData.houseApartmentNo || null,
      full_address: formData.writtenAddress,
      city: formData.city,
      pin_code: formData.pinCode,
      email: formData.email || null,
      latitude: formData.latitude !== null ? parseFloat(String(formData.latitude)) : 0,
      longitude: formData.longitude !== null ? parseFloat(String(formData.longitude)) : 0,
    }

    try {
      const response = await fetch("http://localhost:8000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      })

      const data = await response.json()
      setIsSubmitting(false)

      if (response.ok) {
        onOpenChange(false)
      } else {
        if (data.detail?.includes("Duplicate entry")) {
          setErrorMessage("This phone number is already registered.")
        } else {
          setErrorMessage(data.detail || "Something went wrong. Please try again.")
        }
      }
    } catch (error) {
      setIsSubmitting(false)
      setErrorMessage("Failed to send request. Please check your connection.")
    }
  }
  const MemoizedGoogleMap = useMemo(
    () => <GoogleMapPicker onLocationSelect={handleLocationSelect} />,
    []
);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referredBy">Referred By (Optional)</Label>
                <Input
                  id="referredBy"
                  name="referredBy"
                  value={formData.referredBy}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryMobile">
                  Primary Mobile <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="primaryMobile"
                  name="primaryMobile"
                  type="tel"
                  value={formData.primaryMobile ? `+91 ${formData.primaryMobile}` : ""}
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
          </div>

          {/* Delivery Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Delivery Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">
                  Deliver To / Food Receiver Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="recipientName"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleChange}
                  required
                />
              </div>

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
            </div>
          </div>

          {/* Address Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Address Details</h3>


            {/* Rest of the address fields */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="houseApartmentNo">
                  House/Apartment <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="houseApartmentNo"
                  name="houseApartmentNo"
                  value={formData.houseApartmentNo}
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
                value={formData.writtenAddress}
                onChange={handleChange}
                required
                className="min-h-[100px] w-full"
              />
            </div>
              
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

                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => handleSelectChange("city", value)}
                  >
                    <SelectTrigger id="city">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bangalore">Bangalore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pinCode">
                    Pin Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pinCode"
                    name="pinCode"
                    value={formData.pinCode}
                    onChange={handleChange}
                    required
                  />
                </div>

                
              </div>

              {/* Google Maps Location */}
            <div className="space-y-4">
            <Label>Google Maps Location</Label>
            {MemoizedGoogleMap}
            {formData.latitude && formData.longitude && (
            <p className="text-sm text-muted-foreground">
            Selected Location: {formData.latitude}, {formData.longitude}
            </p>
            )}
            </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentFrequency">Payment Frequency</Label>
                <Select
                  value={formData.paymentFrequency}
                  onValueChange={(value) => handleSelectChange("paymentFrequency", value)}
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
            </div>
          </div>

          {errorMessage && (
            <div className="text-destructive text-sm">{errorMessage}</div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
