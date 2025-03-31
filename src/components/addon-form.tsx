"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { type Product } from "@/types/product"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

interface AddonFormProps {
  onSave: (addon: any) => void
  onCancel: () => void
  existingItems?: Product[]
}

export default function AddonForm({ onSave, onCancel, existingItems = [] }: AddonFormProps) {
  const [formData, setFormData] = useState({
    // Basic Details
    name: "",
    description: "",
    category: "",
    image: null as File | null,
    imagePreview: "",

    // Pricing & Quantity
    basePrice: 0,
    allowQuantitySelection: false,
    minQuantity: 1,
    maxQuantity: 1,
    hasDiscount: false,
    discountType: "flat", // or "percentage"
    discountValue: 0,
    discountExpiry: new Date(),

    // Availability & Restrictions
    availableDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
    timeRestrictions: {
      breakfast: false,
      lunch: true,
      dinner: true,
      snacks: false,
    },
    stockManagement: {
      enableTracking: false,
      autoDisable: true,
      alertEnabled: true,
      alertThreshold: 10,
    },
    limitPerOrder: 0, // 0 means no limit

    // Delivery & Pickup
    deliveryType: "both", // "delivery", "pickup", "both"
    subscriptionSettings: {
      linkedToSubscription: false,
      allowDailyCustomization: false,
      availableForOneTime: true,
    },

    // Dependencies
    itemDependencies: {
      linkedToSpecificItems: false,
      linkedItems: [] as string[],
      canOrderSeparately: true,
      allowInCombos: true,
    },

    // Admin Controls
    isVisible: true,
    isPriority: false,
    priorityLabel: "", // "Popular Add-on", "Recommended"
    status: "draft", // "draft", "published"
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleChange("image", file)
      const reader = new FileReader()
      reader.onloadend = () => {
        handleChange("imagePreview", reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Add-on</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Details</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Availability</TabsTrigger>
              <TabsTrigger value="advanced">Dependencies & Settings</TabsTrigger>
            </TabsList>

            {/* Basic Details Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Add-on Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g., Extra Chapati, Buttermilk"
                    required
                  />
                </div>

                <div className="space-y-2 w-full">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="beverages">Beverages</SelectItem>
                      <SelectItem value="snacks">Snacks</SelectItem>
                      <SelectItem value="sides">Sides</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="image">Add-on Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1"
                  />
                  {formData.imagePreview && (
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="mt-2 w-32 h-32 object-cover rounded-md"
                    />
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Pricing & Availability Tab */}
            <TabsContent value="pricing" className="space-y-4">
              <div className="space-y-4">
                {/* Pricing Section */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="basePrice">Base Price (₹) *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => handleChange("basePrice", parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.allowQuantitySelection}
                        onCheckedChange={(checked) => handleChange("allowQuantitySelection", checked)}
                      />
                      <Label>Allow Quantity Selection</Label>
                    </div>

                    {formData.allowQuantitySelection && (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label htmlFor="minQuantity">Minimum Quantity</Label>
                          <Input
                            id="minQuantity"
                            type="number"
                            min="1"
                            value={formData.minQuantity}
                            onChange={(e) => handleChange("minQuantity", parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxQuantity">Maximum Quantity</Label>
                          <Input
                            id="maxQuantity"
                            type="number"
                            min="1"
                            value={formData.maxQuantity}
                            onChange={(e) => handleChange("maxQuantity", parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.hasDiscount}
                        onCheckedChange={(checked) => handleChange("hasDiscount", checked)}
                      />
                      <Label>Enable Discount</Label>
                    </div>

                    {formData.hasDiscount && (
                      <>
                        <RadioGroup
                          value={formData.discountType}
                          onValueChange={(value) => handleChange("discountType", value)}
                          className="flex gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="flat" id="flat" />
                            <Label htmlFor="flat">Flat Discount (₹)</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="percentage" id="percentage" />
                            <Label htmlFor="percentage">Percentage Discount (%)</Label>
                          </div>
                        </RadioGroup>

                        <div>
                          <Label htmlFor="discountValue">
                            Discount Value ({formData.discountType === "flat" ? "₹" : "%"})
                          </Label>
                          <Input
                            id="discountValue"
                            type="number"
                            min="0"
                            max={formData.discountType === "percentage" ? "100" : undefined}
                            value={formData.discountValue}
                            onChange={(e) => handleChange("discountValue", parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div>
                          <Label>Discount Expiry Date</Label>
                          <span className="text-sm text-gray-500"></span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-[240px] justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.discountExpiry ? format(formData.discountExpiry, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.discountExpiry}
                                onSelect={(date) => date && handleChange("discountExpiry", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Availability Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Available Days</h3>
                    {Object.entries(formData.availableDays).map(([day, checked]) => (
                      <div key={day} className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            handleChange("availableDays", { ...formData.availableDays, [day]: value })
                          }
                        />
                        <Label>{day.charAt(0).toUpperCase() + day.slice(1)}</Label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Time Restrictions</h3>
                    {Object.entries(formData.timeRestrictions).map(([time, checked]) => (
                      <div key={time} className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            handleChange("timeRestrictions", { ...formData.timeRestrictions, [time]: value })
                          }
                        />
                        <Label>{time.charAt(0).toUpperCase() + time.slice(1)}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Dependencies & Settings Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                {/* Stock Management */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.stockManagement.enableTracking}
                      onCheckedChange={(checked) =>
                        handleChange("stockManagement", { ...formData.stockManagement, enableTracking: checked })
                      }
                    />
                    <Label>Enable Stock Tracking</Label>
                  </div>

                  {formData.stockManagement.enableTracking && (
                    <>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.stockManagement.autoDisable}
                          onCheckedChange={(checked) =>
                            handleChange("stockManagement", { ...formData.stockManagement, autoDisable: checked })
                          }
                        />
                        <Label>Auto-disable When Out of Stock</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.stockManagement.alertEnabled}
                          onCheckedChange={(checked) =>
                            handleChange("stockManagement", { ...formData.stockManagement, alertEnabled: checked })
                          }
                        />
                        <Label>Enable Stock Alerts</Label>
                      </div>

                      {formData.stockManagement.alertEnabled && (
                        <div>
                          <Label htmlFor="alertThreshold">Alert Threshold</Label>
                          <Input
                            id="alertThreshold"
                            type="number"
                            min="1"
                            value={formData.stockManagement.alertThreshold}
                            onChange={(e) =>
                              handleChange("stockManagement", {
                                ...formData.stockManagement,
                                alertThreshold: parseInt(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Dependencies */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.itemDependencies.linkedToSpecificItems}
                      onCheckedChange={(checked) =>
                        handleChange("itemDependencies", {
                          ...formData.itemDependencies,
                          linkedToSpecificItems: checked,
                        })
                      }
                    />
                    <Label>Link to Specific Items</Label>
                  </div>

                  {formData.itemDependencies.linkedToSpecificItems && (
                    <div className="space-y-2">
                      {existingItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.itemDependencies.linkedItems.includes(item.id)}
                            onCheckedChange={(checked) => {
                              const newLinkedItems = checked
                                ? [...formData.itemDependencies.linkedItems, item.id]
                                : formData.itemDependencies.linkedItems.filter((id) => id !== item.id)
                              handleChange("itemDependencies", {
                                ...formData.itemDependencies,
                                linkedItems: newLinkedItems,
                              })
                            }}
                          />
                          <Label>{item.name}</Label>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.itemDependencies.canOrderSeparately}
                      onCheckedChange={(checked) =>
                        handleChange("itemDependencies", {
                          ...formData.itemDependencies,
                          canOrderSeparately: checked,
                        })
                      }
                    />
                    <Label>Can be Ordered Separately</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.itemDependencies.allowInCombos}
                      onCheckedChange={(checked) =>
                        handleChange("itemDependencies", {
                          ...formData.itemDependencies,
                          allowInCombos: checked,
                        })
                      }
                    />
                    <Label>Allow in Combos</Label>
                  </div>
                </div>

                {/* Admin Controls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isVisible}
                      onCheckedChange={(checked) => handleChange("isVisible", checked)}
                    />
                    <Label>Show on Menu</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isPriority}
                      onCheckedChange={(checked) => handleChange("isPriority", checked)}
                    />
                    <Label>Mark as Priority</Label>
                  </div>

                  {formData.isPriority && (
                    <div>
                      <Label htmlFor="priorityLabel">Priority Label</Label>
                      <Select
                        value={formData.priorityLabel}
                        onValueChange={(value) => handleChange("priorityLabel", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select label" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="popular">Popular Add-on</SelectItem>
                          <SelectItem value="recommended">Recommended</SelectItem>
                          <SelectItem value="bestseller">Bestseller</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              Save & Preview
            </Button>
            {formData.status === "draft" && (
              <Button
                type="button"
                onClick={() => {
                  handleChange("status", "published")
                  handleSubmit
                }}
              >
                Publish
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 