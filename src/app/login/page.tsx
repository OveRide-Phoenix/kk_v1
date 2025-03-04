"use client"

import React, { useState } from "react"
import axios from "axios"
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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d+()-\s]/g, "")
    setPhoneNumber(value)
  }

  const handleLogin = async () => {
    setLoading(true)
    setMessage("")
    try {
      const response = await axios.post("http://localhost:5000/login", {
        phone_number: phoneNumber,
        city: city
      })
      setMessage(response.data.message)
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "Login failed")
    }
    setLoading(false)
  }

  const cities = ["Mysore", "Bangalore"]

  return (
    <div className="min-h-screen bg-background text-foreground">
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
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleLogin} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
            {message && <p className="text-sm text-center text-red-500">{message}</p>}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
