"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker"

export default function RegisterPage() {
  const [formData, setFormData] = useState<{
    referredBy: string
    primaryMobile: string
    alternativeMobile: string
    name: string
    recipientName: string
    addressType: string
    houseApartmentNo: string
    writtenAddress: string
    city: string
    pinCode: string
    email: string
    latitude: number | null
    longitude: number | null
  }>({
    referredBy: "",
    primaryMobile: "",
    alternativeMobile: "",
    name: "",
    recipientName: "",
    addressType: "",
    houseApartmentNo: "",
    writtenAddress: "",
    city: "",
    pinCode: "",
    email: "",
    latitude: null,
    longitude: null,
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value })
  }

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      writtenAddress: address,
    }))
  }

  const handleRegister = async () => {
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Registration failed")

      setMessage("Registration successful! Redirecting...")
      setTimeout(() => router.push("/"), 2000)
    } catch (error) {
      setMessage("Failed to register. Please try again.")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-3xl border-primary/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription className="text-foreground/70">
            Fill in the details to register as a new customer
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="referredBy">Referred By</Label>
              <Input id="referredBy" name="referredBy" value={formData.referredBy} onChange={handleChange} placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="primaryMobile">Primary Mobile *</Label>
              <Input id="primaryMobile" name="primaryMobile" value={formData.primaryMobile} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="alternativeMobile">Alternative Mobile</Label>
              <Input id="alternativeMobile" name="alternativeMobile" value={formData.alternativeMobile} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="recipientName">Deliver To *</Label>
              <Input id="recipientName" name="recipientName" value={formData.recipientName} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="addressType">Address Type *</Label>
              <Select value={formData.addressType} onValueChange={(value) => handleSelectChange("addressType", value)}>
                <SelectTrigger id="addressType">
                  <SelectValue placeholder="Select Address Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="Work">Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="houseApartmentNo">House/Apartment</Label>
              <Input id="houseApartmentNo" name="houseApartmentNo" value={formData.houseApartmentNo} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="writtenAddress">Address *</Label>
              <Textarea id="writtenAddress" name="writtenAddress" value={formData.writtenAddress} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Select value={formData.city} onValueChange={(value) => handleSelectChange("city", value)}>
                <SelectTrigger id="city">
                  <SelectValue placeholder="Select Your City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mysore">Mysore</SelectItem>
                  <SelectItem value="Bangalore">Bangalore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pinCode">Pin Code *</Label>
              <Input id="pinCode" name="pinCode" value={formData.pinCode} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Optional" />
            </div>

            {/* Google Maps Picker */}
            <div>
              <Label>Google Maps Pin *</Label>
              <GoogleMapPicker onLocationSelect={handleLocationSelect} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleRegister} disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </Button>
          {message && <p className="text-sm text-center text-red-500">{message}</p>}
        </CardFooter>
      </Card>
    </div>
  )
}
