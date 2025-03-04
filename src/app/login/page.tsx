"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Menu, X, Coffee } from "lucide-react"

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [city, setCity] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter() 

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and basic phone formatting
    const value = e.target.value.replace(/[^\d+()-\s]/g, "")
    setPhoneNumber(value)
  }

  const cities = ["Mysore", "Bangalore"]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Bar */}
      <header className="border-b border-muted">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coffee className="h-6 w-6 text-primary" />
              <a href="#" className="text-xl font-bold text-cream">
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

      {/* Login Form */}
      <div className="flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-foreground/70">
              Enter your phone number and city to login or register
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground/90">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91"
                value={phoneNumber}
                onChange={handlePhoneChange}
                required
                className="border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-foreground/90">
                City
              </Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger id="city" className="border-input/50 bg-secondary text-foreground">
                  <SelectValue placeholder="Select your city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Login
            </Button>
            <Button className="w-full" variant="outline" onClick={() => router.push("/register")}>
  Register
</Button>

          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
