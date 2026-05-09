"use client";

import { useCallback, useMemo, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker";
import CustomerNavBar from "@/components/customer-nav-bar";
import { http } from "@/lib/http";

const CITY_OPTIONS = [
  { label: "Mysore", code: "MYS" },
  { label: "Bangalore", code: "BLR" },
];

const resolveCityCode = (value: string) => {
  const match = CITY_OPTIONS.find(
    (option) => option.label.toLowerCase() === value.trim().toLowerCase(),
  );
  return match ? match.code : "MYS";
};

export default function RegistrationPage() {
  // Form state
  const [formData, setFormData] = useState({
    referredBy: "", // Matches referred_by
    primaryMobile: "", // Matches primary_mobile
    alternativeMobile: "", // Matches alternative_mobile
    name: "", // Matches name (customer's name)
    recipientName: "", // Matches recipient_name
    paymentFrequency: "Daily", // Matches payment_frequency (default "Daily")
    email: "", // Matches email

    houseApartmentNo: "", // Matches house_apartment_no
    writtenAddress: "", // Matches written_address
    city: "", // Matches city
    cityCode: "", // City code mapping
    pinCode: "", // Matches pin_code
    latitude: null as number | null, // Matches latitude
    longitude: null as number | null, // Matches longitude
    addressType: "", // Matches address_type
    routeAssignment: "", // Matches route_assignment
    isDefault: true, // Matches is_default
  });

  const router = useRouter(); // Initialize router

  // Handle input changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => {
        if (name === "latitude" || name === "longitude") {
          return { ...prev, [name]: value }; // Store as string
        }
        // Apply special handling for mobile fields
        if (name === "primaryMobile" || name === "alternativeMobile") {
          //only digits and max 10 numbers allowed

          let newValue = value.startsWith("+91 ") ? value.slice(4) : value;

          // Prevent user from manually typing "+91"
          if (newValue.startsWith("+91")) {
            newValue = newValue.slice(3);
          }

          // Remove non-numeric characters and limit to 10 digits
          newValue = newValue.replace(/\D/g, "").slice(0, 10);

          return { ...prev, [name]: newValue };
        }

        if (name === "pinCode") {
          // Remove non-numeric characters and limit to 6 digits
          const newValue = value.replace(/\D/g, "").slice(0, 6);
          return { ...prev, [name]: newValue };
        }

        if (name === "email") {
          // Convert to lowercase
          const newValue = value.toLowerCase();
          return { ...prev, [name]: newValue };
        }

        // Default case for other fields
        return { ...prev, [name]: value };
      });
    },
    [],
  );

  const [addressType, setAddressType] = useState("");
  const [otherAddressName, setOtherAddressName] = useState("");

  // Handle address type change
  const handleAddressTypeChange = (value: string) => {
    setAddressType(value);
    // Update formData with the selected address type
    setFormData((prev) => ({ ...prev, addressType: value }));

    if (value !== "OTHER") {
      setOtherAddressName(""); // Reset if switching away from "OTHER"
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    if (name === "city") {
      setFormData((prev) => ({
        ...prev,
        city: value,
        cityCode: resolveCityCode(value),
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent multiple requests
    setIsSubmitting(true);
    setErrorMessage(""); // Reset error message before submitting

    const formattedData = {
      referred_by: formData.referredBy || null,
      primary_mobile: formData.primaryMobile,
      alternative_mobile: formData.alternativeMobile || null,
      name: formData.name,
      recipient_name: formData.recipientName,
      payment_frequency: formData.paymentFrequency || "Daily",
      email: formData.email || null,
      house_apartment_no: formData.houseApartmentNo || null,
      written_address: formData.writtenAddress,
      city: formData.city,
      city_code: formData.cityCode || resolveCityCode(formData.city),
      pin_code: formData.pinCode,
      latitude: formData.latitude !== null ? parseFloat(String(formData.latitude)) : 0,
      longitude: formData.longitude !== null ? parseFloat(String(formData.longitude)) : 0,
      address_type: formData.addressType || "Home",
      route_assignment: formData.routeAssignment || null,
      is_default: formData.isDefault ?? true,
    };

    try {
      const response = await http.post("/api/register", formattedData as Record<string, unknown>);

      setIsSubmitting(false);

      const data = await response.json();
      console.log("API Response:", response.status, data);
      if (response.ok) {
        setIsRegistered(true);
      } else {
        if (data.detail && data.detail.includes("Duplicate entry")) {
          setErrorMessage(
            "This phone number is already registered. Please use a different number.",
          );
        } else {
          setErrorMessage(data.detail || "Something went wrong. Please try again.");
        }
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage("Failed to send request. Please check your connection and try again.");
    }
  };

  const MemoizedGoogleMap = useMemo(
    () => <GoogleMapPicker onLocationSelect={handleLocationSelect} />,
    [],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CustomerNavBar unauthLinks={[{ href: "/login-v2", label: "Sign in" }]} />

      {/* Registration Form */}
      <main className="container mx-auto flex-1 px-4 pb-12 pt-24">
        <Card className="border-primary/20 max-w-4xl mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Customer Registration</CardTitle>
            <CardDescription className="text-foreground/70">
              Please fill in your details to create an account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset disabled={isRegistered}>
              <CardContent className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b border-muted pb-2">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-foreground/90">
                        Customer Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className=""
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referredBy" className="text-foreground/90">
                        Referred By (Optional)
                      </Label>
                      <Input
                        id="referredBy"
                        name="referredBy"
                        value={formData.referredBy}
                        onChange={handleChange}
                        className=""
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
                        value={formData.primaryMobile ? `+91 ${formData.primaryMobile}` : ""}
                        onChange={handleChange}
                        placeholder="+91"
                        required
                        className=""
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
                        value={
                          formData.alternativeMobile ? `+91 ${formData.alternativeMobile}` : ""
                        }
                        onChange={handleChange}
                        placeholder="+91"
                        className=""
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b border-muted pb-2">
                    Delivery Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientName" className="text-foreground/90">
                        Deliver To / Food Receiver Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="recipientName"
                        name="recipientName"
                        value={formData.recipientName}
                        onChange={handleChange}
                        required
                        className=""
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="addressType" className="text-foreground/90">
                        Address Type
                      </Label>
                      <Select value={addressType} onValueChange={handleAddressTypeChange}>
                        <SelectTrigger className="border-input/50 bg-secondary text-foreground">
                          <SelectValue placeholder="Select address type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Home">Home</SelectItem>
                          <SelectItem value="Work">Work</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>

                      {addressType === "Other" && (
                        <div className="space-y-2">
                          <Label htmlFor="otherAddressName" className="text-foreground/90">
                            Other Address Name
                          </Label>
                          <Input
                            id="otherAddressName"
                            name="otherAddressName"
                            type="text"
                            value={otherAddressName}
                            onChange={(e) => setOtherAddressName(e.target.value)}
                            placeholder="Enter address name"
                            className="border-input/50 bg-secondary text-foreground"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b border-muted pb-2">
                    Address Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="houseApartmentNo" className="text-foreground/90">
                        House/Apartment <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="houseApartmentNo"
                        name="houseApartmentNo"
                        value={formData.houseApartmentNo}
                        onChange={handleChange}
                        required
                        className=""
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="writtenAddress" className="text-foreground/90">
                        Address <span className="text-destructive">*</span>
                      </Label>
                      <div className="space-y-2">
                        <Textarea
                          id="writtenAddress"
                          name="writtenAddress"
                          value={formData.writtenAddress}
                          onChange={handleChange}
                          required
                          className="min-h-[100px] w-full "
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-foreground/90">
                        City <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.city}
                        onValueChange={(value) => handleSelectChange("city", value)}
                      >
                        <SelectTrigger
                          id="city"
                          className="border-input/50 bg-secondary text-foreground"
                        >
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {CITY_OPTIONS.map((option) => (
                            <SelectItem key={option.code} value={option.label}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pinCode" className="text-foreground/90">
                        Pin code <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="pinCode"
                        name="pinCode"
                        type="text"
                        value={formData.pinCode}
                        onChange={handleChange}
                        required
                        className=""
                      />
                    </div>
                  </div>

                  {/* Google Maps Placeholder */}
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

                {/* Email Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b border-muted pb-2">
                    Email Information
                  </h3>

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
                      className=""
                    />
                    <p className="text-xs text-foreground/70 mt-1">
                      Payment details will be sent to this email address
                    </p>
                  </div>
                </div>
              </CardContent>
            </fieldset>

            <CardFooter className="flex flex-col gap-3 w-full">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                {!isRegistered ? (
                  <>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Registering..." : "Register"}
                    </Button>
                    <Button type="button" variant="outline" className="w-full sm:w-auto">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 w-full items-center">
                    <Button
                      type="button"
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => router.push("/login-v2")}
                    >
                      Go to Login
                    </Button>
                    <p className="text-green-600 font-medium text-center sm:text-left">
                      User registered successfully!
                    </p>
                  </div>
                )}
              </div>

              {/* Error message appears right below buttons in the next line */}
              {errorMessage && (
                <p className="text-red-600 text-sm text-center w-full">{errorMessage}</p>
              )}
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
