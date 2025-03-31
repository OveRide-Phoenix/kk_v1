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
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, X, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ComboFormProps {
  onSave: (combo: any) => void
  onCancel: () => void
  existingItems?: Product[]
}

export default function ComboForm({ onSave, onCancel, existingItems = [] }: ComboFormProps) {
  const [formData, setFormData] = useState({
    // Basic Details
    name: "",
    description: "",
    category: "",
    image: null as File | null,
    imagePreview: "",

    // Items & Customization
    items: [] as { itemId: string; quantity: number; isRemovable: boolean }[],
    allowPortionSize: false,
    portionSizes: ["Small", "Medium", "Large"],
    allowAddons: false,
    selectedAddons: [] as string[],

    // Pricing & Discounts
    basePrice: 0,
    hasDiscount: false,
    discountType: "flat", // or "percentage"
    discountValue: 0,
    discountExpiry: null as Date | null,
    includeTax: true,
    gstRate: 5,

    // Availability
    availableDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
    timeSlots: [{ start: "", end: "", type: "lunch" }],
    cutoffTime: "",
    maxOrdersPerDay: 0,

    // Delivery Settings
    deliveryType: "both", // "delivery", "pickup", "both"
    includeDeliveryCharges: false,
    deliveryLocations: [] as string[],

    // Inventory
    requireStockManagement: false,
    autoDisableOutOfStock: true,
    restockAlert: true,
    restockThreshold: 10,

    // Admin Controls
    isVisible: true,
    isPriority: false,
    status: "draft", // "draft", "published"
    tags: [] as string[],
  })

  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [itemSearchQuery, setItemSearchQuery] = useState("")

  // Filter items based on search query
  const filteredItems = existingItems.filter(item =>
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  )

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
          <DialogTitle>Create New Combo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="basic">Basic Details</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Basic Details Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Combo Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
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
                      <SelectItem value="snacks">Snacks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="image">Combo Image</Label>
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

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label>Selected Items</Label>
                    <Button 
                      variant="outline" 
                      onClick={() => setItemDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Select Items
                    </Button>
                  </div>

                  {formData.items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      No items selected. Click "Select Items" to add items to your combo.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.items.map((comboItem) => {
                        const item = existingItems.find(i => i.id === comboItem.itemId)
                        return (
                          <div key={comboItem.itemId} className="flex items-center gap-4 p-3 border rounded-lg">
                            <div className="flex-1">{item?.name}</div>
                            <Input
                              type="number"
                              min="1"
                              value={comboItem.quantity}
                              onChange={(e) => {
                                const newItems = formData.items.map((i) =>
                                  i.itemId === comboItem.itemId 
                                    ? { ...i, quantity: parseInt(e.target.value) || 1 } 
                                    : i
                                )
                                handleChange("items", newItems)
                              }}
                              className="w-20"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                handleChange(
                                  "items",
                                  formData.items.filter((i) => i.itemId !== comboItem.itemId)
                                )
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Item Selection Dialog */}
                <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Select Items for Combo</DialogTitle>
                      <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                          placeholder="Search items by name..."
                          className="pl-10"
                          value={itemSearchQuery}
                          onChange={(e) => setItemSearchQuery(e.target.value)}
                        />
                      </div>
                    </DialogHeader>

                    <ScrollArea className="h-[400px] mt-4">
                      <div className="space-y-2 pr-4">
                        {filteredItems.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No items found. Try a different search term.
                          </div>
                        ) : (
                          filteredItems.map((item) => (
                            <div 
                              key={item.id} 
                              className="flex items-center gap-4 p-4 hover:bg-accent rounded-lg border"
                            >
                              <Checkbox
                                checked={formData.items.some((i) => i.itemId === item.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleChange("items", [
                                      ...formData.items,
                                      { itemId: item.id, quantity: 1, isRemovable: false }
                                    ])
                                  } else {
                                    handleChange(
                                      "items",
                                      formData.items.filter((i) => i.itemId !== item.id)
                                    )
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">{item.description}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>

                    <DialogFooter className="mt-4">
                      <Button variant="outline" onClick={() => {
                        setItemDialogOpen(false)
                        setItemSearchQuery("")
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={() => {
                        setItemDialogOpen(false)
                        setItemSearchQuery("")
                      }}>
                        Add Selected Items
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.allowPortionSize}
                      onCheckedChange={(checked) => handleChange("allowPortionSize", checked)}
                    />
                    <Label>Allow Portion Size Selection</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.allowAddons}
                      onCheckedChange={(checked) => handleChange("allowAddons", checked)}
                    />
                    <Label>Allow Extra Add-ons</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4">
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
                          <Label htmlFor="flat">Flat Discount</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="percentage" id="percentage" />
                          <Label htmlFor="percentage">Percentage Discount</Label>
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
                        <Calendar
                          mode="single"
                          selected={formData.discountExpiry || undefined}
                          onSelect={(date) => handleChange("discountExpiry", date)}
                          className="rounded-md border mt-1"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.includeTax}
                      onCheckedChange={(checked) => handleChange("includeTax", checked)}
                    />
                    <Label>Include GST</Label>
                  </div>

                  {formData.includeTax && (
                    <div>
                      <Label htmlFor="gstRate">GST Rate (%)</Label>
                      <Input
                        id="gstRate"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.gstRate}
                        onChange={(e) => handleChange("gstRate", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                {/* Availability Settings */}
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

                <div>
                  <Label htmlFor="maxOrdersPerDay">Maximum Orders per Day</Label>
                  <Input
                    id="maxOrdersPerDay"
                    type="number"
                    min="0"
                    value={formData.maxOrdersPerDay}
                    onChange={(e) => handleChange("maxOrdersPerDay", parseInt(e.target.value) || 0)}
                  />
                </div>

                {/* Delivery Settings */}
                <div>
                  <Label>Delivery Type</Label>
                  <RadioGroup
                    value={formData.deliveryType}
                    onValueChange={(value) => handleChange("deliveryType", value)}
                    className="flex gap-4 mt-1"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="delivery" id="delivery" />
                      <Label htmlFor="delivery">Delivery Only</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup">Pickup Only</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="both" id="both" />
                      <Label htmlFor="both">Both</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Inventory Settings */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.requireStockManagement}
                      onCheckedChange={(checked) => handleChange("requireStockManagement", checked)}
                    />
                    <Label>Enable Stock Management</Label>
                  </div>

                  {formData.requireStockManagement && (
                    <>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.autoDisableOutOfStock}
                          onCheckedChange={(checked) => handleChange("autoDisableOutOfStock", checked)}
                        />
                        <Label>Auto-disable When Out of Stock</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.restockAlert}
                          onCheckedChange={(checked) => handleChange("restockAlert", checked)}
                        />
                        <Label>Enable Restock Alerts</Label>
                      </div>
                    </>
                  )}
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
                    <Label>Mark as Priority (Recommended/Bestseller)</Label>
                  </div>
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