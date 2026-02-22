"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker"
import { Customer } from "@/types/customer"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CustomerFormProps {
  customer: Customer | null;
  onSave: (customer: Customer) => void;
  onCancel: () => void;
}

export function CustomerForm({ customer, onSave, onCancel }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    referredBy: customer?.referredBy || "",
    primaryMobile: customer?.primaryMobile || "",
    alternativeMobile: customer?.alternativeMobile || "",
    email: customer?.email || "",
    recipientName: customer?.recipientName || "",
    paymentFrequency: customer?.paymentFrequency || "Daily",
    addressType: customer?.addressType || "Home",
    houseApartmentNo: customer?.houseApartmentNo || "",
    writtenAddress: customer?.writtenAddress || "",
    city: customer?.city || "",
    pinCode: customer?.pinCode || "",
    latitude: customer?.latitude || null,
    longitude: customer?.longitude || null,
    routeAssignment: customer?.routeAssignment || "",
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => {
          // Special handling for mobile fields and pin code
          if (name === "primaryMobile" || name === "alternativeMobile") {
              // Remove all non-digit characters
              const digitsOnly = value.replace(/\D/g, "");
              
              // Limit to 10 digits without any formatting
              const limitedNumber = digitsOnly.slice(0, 10);
              
              return { ...prev, [name]: limitedNumber };
          } else if (name === "pinCode") {
              // Remove non-digits and limit to 6 numbers
              const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
              return { ...prev, [name]: digitsOnly };
          }
          
          return { ...prev, [name]: value };
      });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      writtenAddress: address || prev.writtenAddress
    }));
  };

  const MemoizedGoogleMap = useMemo(
    () => (
      <div className="col-span-2 space-y-2">
        <Label>Location</Label>
        <GoogleMapPicker 
          onLocationSelect={handleLocationSelect}
          clearSearchOnSelect={true}
        />
        {formData.latitude && formData.longitude && (
          <p className="text-sm text-muted-foreground">
            Selected Location: {formData.latitude}, {formData.longitude}
          </p>
        )}
      </div>
    ),
    [handleLocationSelect, formData.latitude, formData.longitude]
  );

  const handleSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors([]);

    // Validate required fields
    const validationErrors: string[] = [];
    if (!formData.name) validationErrors.push("Customer Name is required");
    if (!formData.primaryMobile) validationErrors.push("Primary Mobile is required");
    if (!formData.recipientName) validationErrors.push("Recipient Name is required");
    if (!formData.houseApartmentNo) validationErrors.push("House/Apartment is required");
    if (!formData.writtenAddress) validationErrors.push("Address is required");
    if (!formData.city) validationErrors.push("City is required");
    if (!formData.pinCode) validationErrors.push("Pin Code is required");

    // Validate mobile number length
    if (formData.primaryMobile && formData.primaryMobile.length !== 10) {
      validationErrors.push("Primary Mobile must be 10 digits");
    }
    if (formData.alternativeMobile && formData.alternativeMobile.length !== 10) {
      validationErrors.push("Alternative Mobile must be 10 digits");
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.push("Invalid email format");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await onSave(formData);
    } catch (error: any) {
      setErrors([error.message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
      {/* Show validation errors if any */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-5">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="address">Address</TabsTrigger>
        <TabsTrigger value="route">Route Assignment</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referredBy">Referred By</Label>
            <Input
              id="referredBy"
              name="referredBy"
              value={formData.referredBy}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryMobile">Primary Mobile <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${formData.primaryMobile ? 'text-foreground' : 'text-muted-foreground'}`}>
                +91
              </span>
              <Input
                id="primaryMobile"
                name="primaryMobile"
                type="tel"
                value={formData.primaryMobile}
                onChange={handleChange}
                className="pl-12"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="alternativeMobile">Alternative Mobile</Label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${formData.alternativeMobile ? 'text-foreground' : 'text-muted-foreground'}`}>
                +91
              </span>
              <Input
                id="alternativeMobile"
                name="alternativeMobile"
                type="tel"
                value={formData.alternativeMobile}
                onChange={handleChange}
                className="pl-12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipientName">Deliver to / Recipient Name <span className="text-destructive">*</span></Label>
            <Input
              id="recipientName"
              name="recipientName"
              value={formData.recipientName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentFrequency">Payment Frequency</Label>
            <Select
              value={formData.paymentFrequency}
              onValueChange={(value) => handleSelectChange("paymentFrequency", value)}
            >
              <SelectTrigger>
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
      </TabsContent>

      <TabsContent value="address" className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="addressType">Address Type</Label>
            <Select
              value={formData.addressType}
              onValueChange={(value) => handleSelectChange("addressType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Home">Home</SelectItem>
                <SelectItem value="Work">Work</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="houseApartmentNo">House/Apartment <span className="text-destructive">*</span></Label>
            <Input
              id="houseApartmentNo"
              name="houseApartmentNo"
              value={formData.houseApartmentNo}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
            <Textarea
              id="address"
              name="writtenAddress"
              value={formData.writtenAddress}
              onChange={handleChange}
              required
              className="min-h-[100px] w-full resize-none border rounded-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
            <Select
              value={formData.city}
              onValueChange={(value) => handleSelectChange("city", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mysore">Mysore</SelectItem>
                <SelectItem value="Bangalore">Bangalore</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pinCode">Pin Code <span className="text-destructive">*</span></Label>
            <Input
                id="pinCode"
                name="pinCode"
                type="text"
                inputMode="numeric"
                value={formData.pinCode}
                onChange={handleChange}
                required
                maxLength={6}
            />
          </div>
          {MemoizedGoogleMap}
        </div>
      </TabsContent>

      <TabsContent value="route" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="routeAssignment">Route Assignment</Label>
          <p className="text-sm text-muted-foreground mb-2">Route assignment functionality coming soon...</p>
          <Input
            id="routeAssignment"
            name="routeAssignment"
            value={formData.routeAssignment}
            onChange={handleChange}
            placeholder="Route assignment placeholder"
            disabled
          />
        </div>
      </TabsContent>

      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Customer"}
        </Button>
      </div>
    </Tabs>
  )
}