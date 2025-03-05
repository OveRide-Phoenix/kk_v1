"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Coffee, MapPin, Menu, X} from "lucide-react"

export default function RegistrationPage() {
  // Form state
  const [formData, setFormData] = useState({
    referredBy: "",
    primaryMobile: "",
    alternativeMobile: "",
    customerName: "",
    receiverName: "",
    addressType: "",
    houseApartment: "",
    address: "",
    city: "",
    pincode: "",
    email: "",
  })
      const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
      const router = useRouter()

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    // Add your form submission logic here
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Bar */}
      <header className="border-b border-muted">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coffee className="h-6 w-6 text-primary" />
              <a href="#" className="text-xl font-bold">
                Kuteera Kitchen
              </a>
            </div>
 {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                Home
              </a>
              <a href="#" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                About
              </a>
              <a href="#" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                Services
              </a>
              <a href="#" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                Contact
              </a>
              <a href="/login">
                <Button variant="outline" className="text-sm">
                  Login
                </Button>
              </a>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                className="text-foreground hover:text-primary"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2">
              <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary">
                Home
              </a>
              <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary">
                About
              </a>
              <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary">
                Services
              </a>
              <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary">
                Contact
              </a>
            </div>
          )}
        </div>
      </header>

      {/* Registration Form */}
      <div className="container mx-auto py-8 px-4">
        <Card className="border-primary/20 max-w-4xl mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Customer Registration</CardTitle>
            <CardDescription className="text-foreground/70">
              Please fill in your details to create an account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b border-muted pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="referredBy" className="text-foreground/90">
                      Referred By (Optional)
                    </Label>
                    <Input
                      id="referredBy"
                      name="referredBy"
                      value={formData.referredBy}
                      onChange={handleChange}
                      className="border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerName" className="text-foreground/90">
                      Customer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      required
                      className="border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryMobile" className="text-foreground/90">
                      Primary Mobile <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="primaryMobile"
                      name="primaryMobile"
                      type="tel"
                      placeholder="+91"
                      value={formData.primaryMobile}
                      onChange={handleChange}
                      required
                      className="border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alternativeMobile" className="text-foreground/90">
                      Alternative Mobile (Optional)
                    </Label>
                    <Input
                      id="alternativeMobile"
                      name="alternativeMobile"
                      type="tel"
                      placeholder="+91"
                      value={formData.alternativeMobile}
                      onChange={handleChange}
                      className="border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b border-muted pb-2">Delivery Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receiverName" className="text-foreground/90">
                      Deliver To / Food Receiver Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="receiverName"
                      name="receiverName"
                      value={formData.receiverName}
                      onChange={handleChange}
                      required
                      className="border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressType" className="text-foreground/90">
                      Address Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.addressType}
                      onValueChange={(value) => handleSelectChange("addressType", value)}>
                      <SelectTrigger id="addressType" className="border-input/50 bg-secondary text-foreground">
                        <SelectValue placeholder="Select address type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOME">HOME</SelectItem>
                        <SelectItem value="WORK">WORK</SelectItem>
                        <SelectItem value="OTHER">OTHER</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b border-muted pb-2">Address Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="houseApartment" className="text-foreground/90">
                      House/Apartment <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="houseApartment"
                      name="houseApartment"
                      value={formData.houseApartment}
                      onChange={handleChange}
                      required
                      className="border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"/>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-foreground/90">
                      Address <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className="min-h-[100px] border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-foreground/90">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.city} onValueChange={(value) => handleSelectChange("city", value)}>
                      <SelectTrigger id="city" className="border-input/50 bg-secondary text-foreground">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mysore">Mysore</SelectItem>
                        <SelectItem value="Bangalore">Bangalore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode" className="text-foreground/90">
                      Pin code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      type="text"
                      value={formData.pincode}
                      onChange={handleChange}
                      required
                      className="border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"
                    />
                  </div>
                </div>

                {/* Google Maps Placeholder */}
                <div className="space-y-2">
                  <Label className="text-foreground/90">
                    Google Maps Pin <span className="text-destructive">*</span>
                  </Label>
                  <div className="border border-input/50 rounded-md h-[200px] bg-secondary/50 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-foreground/70">Google Maps integration would appear here</p>
                      <p className="text-xs text-foreground/50">Click to set your exact location</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b border-muted pb-2">Email Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/90">
                    Email (Optional)
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"/>
                  <p className="text-xs text-foreground/70 mt-1">Payment details will be sent to this email address</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                Register
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}