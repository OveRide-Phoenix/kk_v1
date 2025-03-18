"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { type Product, ProductType } from "@/types/product"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface ProductFormProps {
  product: Product | null
  onSave: (product: Product) => void
  onCancel: () => void
}

export default function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const isEditing = !!product
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: "",
      description: "",
      price: 0,
      rate: 0, // Added rate field
      itemType: ProductType.BREAKFAST,
      group: "",
      alias: "",
      isCombo: false,
      isSubItem: false,
      uom: "",
      weightFactor: 0,
      weightUom: "kg",
      hsnCode: "",
      factor: 1,
      quantityPortion: "",
      bufferPercentage: 0,
      maxQuantity: 0,
      isMandatory: false,
      mainItemName: "",
      image: "/placeholder.svg?height=200&width=200",
    },
  )

  const handleChange = (field: keyof Product, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData as Product)
  }

  // Generate alias from name
  useEffect(() => {
    if (formData.name && !isEditing) {
      const alias = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
      handleChange("alias", alias)
    }
  }, [formData.name, isEditing])

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemType">Item Type <span className="text-destructive">*</span></Label>
                    <Select value={formData.itemType} onValueChange={(value) => handleChange("itemType", value)}>
                      <SelectTrigger id="itemType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ProductType.BREAKFAST}>Breakfast</SelectItem>
                        <SelectItem value={ProductType.LUNCH}>Lunch</SelectItem>
                        <SelectItem value={ProductType.DINNER}>Dinner</SelectItem>
                        <SelectItem value={ProductType.SNACK}>Snack</SelectItem>
                        <SelectItem value="ADDON">Add-on</SelectItem>
                        <SelectItem value="CATEGORY">Category</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="group">Group<span className="text-destructive">*</span></Label>
                    <Input
                      id="group"
                      value={formData.group}
                      onChange={(e) => handleChange("group", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="uom">Unit of Measure <span className="text-destructive">*</span></Label>
                    <Input
                      id="uom"
                      value={formData.uom}
                      onChange={(e) => handleChange("uom", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantityPortion">Quantity Portion <span className="text-destructive">*</span></Label>
                    <Input
                      id="quantityPortion"
                      value={formData.quantityPortion}
                      onChange={(e) => handleChange("quantityPortion", e.target.value)}
                      required
                      placeholder="e.g., 1 plate, 2 pieces"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isCombo"
                    checked={formData.isCombo}
                    onCheckedChange={(checked) => handleChange("isCombo", checked)}
                  />
                  <Label htmlFor="isCombo">This is a combo item</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isSubItem"
                    checked={formData.isSubItem}
                    onCheckedChange={(checked) => handleChange("isSubItem", checked)}
                  />
                  <Label htmlFor="isSubItem">This is a sub-item/add-on</Label>
                </div>

                {formData.isSubItem && (
                  <div className="space-y-2">
                    <Label htmlFor="mainItemName">Main Item Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="mainItemName"
                      value={formData.mainItemName}
                      onChange={(e) => handleChange("mainItemName", e.target.value)}
                      required={formData.isSubItem}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹) <span className="text-destructive">*</span></Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange("price", Number.parseFloat(e.target.value) || 0)}
                    required
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate">Rate (₹) <span className="text-destructive">*</span></Label>
                  <Input
                    id="rate"
                    type="number"
                    value={formData.rate}
                    onChange={(e) => handleChange("rate", Number.parseFloat(e.target.value) || 0)}
                    required
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">The selling price shown to customers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxQuantity">Maximum Quantity</Label>
                  <Input
                    id="maxQuantity"
                    type="number"
                    value={formData.maxQuantity}
                    onChange={(e) => handleChange("maxQuantity", Number.parseInt(e.target.value) || 0)}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">0 means no limit</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bufferPercentage">Buffer Percentage (%)</Label>
                  <Input
                    id="bufferPercentage"
                    type="number"
                    value={formData.bufferPercentage}
                    onChange={(e) => handleChange("bufferPercentage", Number.parseInt(e.target.value) || 0)}
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isMandatory"
                  checked={formData.isMandatory}
                  onCheckedChange={(checked) => handleChange("isMandatory", checked)}
                />
                <Label htmlFor="isMandatory">This item is mandatory</Label>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alias">Alias</Label>
                  <Input id="alias" value={formData.alias} onChange={(e) => handleChange("alias", e.target.value)} />
                  <p className="text-xs text-muted-foreground">Auto-generated from name</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hsnCode">HSN Code</Label>
                  <Input
                    id="hsnCode"
                    value={formData.hsnCode}
                    onChange={(e) => handleChange("hsnCode", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weightFactor">Weight Factor</Label>
                  <Input
                    id="weightFactor"
                    type="number"
                    value={formData.weightFactor}
                    onChange={(e) => handleChange("weightFactor", Number.parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weightUom">Weight UOM</Label>
                  <Select value={formData.weightUom} onValueChange={(value) => handleChange("weightUom", value)}>
                    <SelectTrigger id="weightUom">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="g">Gram (g)</SelectItem>
                      <SelectItem value="l">Liter (l)</SelectItem>
                      <SelectItem value="ml">Milliliter (ml)</SelectItem>
                      <SelectItem value="N/A">Not Applicable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="factor">Factor</Label>
                <Input
                  id="factor"
                  type="number"
                  value={formData.factor}
                  onChange={(e) => handleChange("factor", Number.parseFloat(e.target.value) || 1)}
                  min={0.1}
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">Multiplication factor for inventory calculations</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

