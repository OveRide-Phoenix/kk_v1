"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GoogleMapPicker from "@/components/gmap/GoogleMapPicker";

interface RegisterFormProps {
  onSubmit: (data: any) => void;
}

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
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
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const MemoizedGoogleMap = useMemo(
    () => <GoogleMapPicker onLocationSelect={handleLocationSelect} />,
    []
);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Customer Name *</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="referredBy">Referred By</Label>
          <Input id="referredBy" name="referredBy" value={formData.referredBy} onChange={handleChange} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryMobile">Primary Mobile *</Label>
          <Input id="primaryMobile" name="primaryMobile" type="tel" value={formData.primaryMobile} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alternativeMobile">Alternative Mobile</Label>
          <Input id="alternativeMobile" name="alternativeMobile" type="tel" value={formData.alternativeMobile} onChange={handleChange} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
        </div>
      </div>

      {/* Delivery Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recipientName">Deliver To / Food Receiver Name *</Label>
          <Input id="recipientName" name="recipientName" value={formData.recipientName} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentFrequency">Payment Frequency</Label>
          <Select value={formData.paymentFrequency} onValueChange={(value) => handleSelectChange("paymentFrequency", value)}>
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

        {/* Address Details */}
      
       <h3 className="text-lg font-medium border-b border-muted pb-2">
           Address Details
       </h3>
    
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
               <Label
                   htmlFor="houseApartmentNo"
                   className="text-foreground/90"
               >
                   House/Apartment{" "}
                   <span className="text-destructive">
                       *
                   </span>
               </Label>
               <Input
                   id="houseApartmentNo"
                   name="houseApartmentNo"
                   value={
                       formData.houseApartmentNo
                   }
                   onChange={handleChange}
                   required
                   className="border-input/50 bg-gray-100 text-foreground placeholder:text-foreground/50"
               />
           </div>
    
           <div className="space-y-2 md:col-span-2">
               <Label
                   htmlFor="writtenAddress"
                   className="text-foreground/90"
               >
                   Address{" "}
                   <span className="text-destructive">
                       *
                   </span>
               </Label>
               <div className="space-y-2">
                   <Textarea
                       id="writtenAddress"
                       name="writtenAddress"
                       value={
                           formData.writtenAddress
                       }
                       onChange={handleChange}
                       required
                       className="min-h-[100px] w-full border-input/50 bg-secondary text-foreground placeholder:text-foreground/50"
                   />
               </div>
           </div>
       </div>
    
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
               <Label
                   htmlFor="city"
                   className="text-foreground/90"
               >
                   City{" "}
                   <span className="text-destructive">
                       *
                   </span>
               </Label>
               <Select
                   value={formData.city}
                   onValueChange={(value) =>
                       handleSelectChange(
                           "city",
                           value
                       )
                   }
               >
                   <SelectTrigger
                       id="city"
                       className="border-input/50 bg-secondary text-foreground"
                   >
                       <SelectValue placeholder="Select city" />
                   </SelectTrigger>
                   <SelectContent>
                       <SelectItem value="Mysore">
                           Mysore
                       </SelectItem>
                       <SelectItem value="Bangalore">
                           Bangalore
                       </SelectItem>
                   </SelectContent>
               </Select>
           </div>
    
           <div className="space-y-2">
               <Label
                   htmlFor="pinCode"
                   className="text-foreground/90"
               >
                   Pin code{" "}
                   <span className="text-destructive">
                       *
                   </span>
               </Label>
               <Input
                   id="pinCode"
                   name="pinCode"
                   type="text"
                   value={formData.pinCode}
                   onChange={handleChange}
                   required
                   className="border-input/50 bg-gray-100 text-foreground placeholder:text-foreground/50"
               />
           </div>
       </div>

           {/* Google Maps Placeholder */}
           <div className="space-y-4">
                                        <Label>Google Maps Location</Label>
                                        {MemoizedGoogleMap}
                                        {formData.latitude &&
                                            formData.longitude && (
                                                <p className="text-sm text-muted-foreground">
                                                    Selected Location:{" "}
                                                    {formData.latitude},{" "}
                                                    {formData.longitude}
                                                </p>
                                            )}
                                    </div>
                              
    </form>
  );
}

   
    