"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
  const [formData, setFormData] = useState<any>(
    product || {
      name: "",
      description: "",
      alias: "",
      category_id: "",
      uom: "",
      weight_factor: 0,
      weight_uom: "",
      item_type: "",
      hsn_code: "",
      factor: 1,
      quantity_portion: 0,
      buffer_percentage: 0,
      picture_url: "",
      breakfast_price: 0,
      lunch_price: 0,
      dinner_price: 0,
      condiments_price: 0,
      festival_price: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      net_price: 0,
      is_combo: false,
    }
  )

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
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
          <DialogTitle>{isEditing ? "Edit" : "Add"} Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Details</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Details Tab */}
            <TabsContent value="basic">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sub_item">Sub Item</Label>
                  <Input
                    id="sub_item"
                    value={formData.sub_item || ""}
                    onChange={(e) => handleChange("sub_item", e.target.value)}
                    placeholder="Parent Item Name or ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="is_combo">Combo</Label>
                  <Switch
                    id="is_combo"
                    checked={formData.is_combo}
                    onCheckedChange={(checked) => handleChange("is_combo", checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
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
                    className="w-full resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alias">Alias</Label>
                  <Input
                    id="alias"
                    value={formData.alias}
                    onChange={(e) => handleChange("alias", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_type">Item Type</Label>
                  <Input
                    id="item_type"
                    value={formData.item_type}
                    onChange={(e) => handleChange("item_type", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group">Group</Label>
                  <Input
                    id="group"
                    value={formData.group || ""}
                    onChange={(e) => handleChange("group", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uom">UOM (Unit of Measure) <span className="text-red-500">*</span></Label>
                  <Input
                    id="uom"
                    value={formData.uom}
                    onChange={(e) => handleChange("uom", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_factor">Weight Factor</Label>
                  <Input
                    id="weight_factor"
                    type="number"
                    value={formData.weight_factor}
                    onChange={(e) => handleChange("weight_factor", Number.parseFloat(e.target.value) || 0)}
                    step="0.001"
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight_uom">Weight UOM</Label>
                  <Input
                    id="weight_uom"
                    value={formData.weight_uom}
                    onChange={(e) => handleChange("weight_uom", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hsn_code">HSN Code</Label>
                  <Input
                    id="hsn_code"
                    value={formData.hsn_code}
                    onChange={(e) => handleChange("hsn_code", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="factor">Factor</Label>
                  <Input
                    id="factor"
                    type="number"
                    value={formData.factor}
                    onChange={(e) => handleChange("factor", Number.parseFloat(e.target.value) || 1)}
                    min={0.001}
                    step="0.001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity_portion">Quantity/Portion</Label>
                  <Input
                    id="quantity_portion"
                    type="number"
                    value={formData.quantity_portion}
                    onChange={(e) => handleChange("quantity_portion", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buffer_percentage">Buffer Percentage (%)</Label>
                  <Input
                    id="buffer_percentage"
                    type="number"
                    value={formData.buffer_percentage}
                    onChange={(e) => handleChange("buffer_percentage", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="picture_url">Upload Picture</Label>
                  <Input
                    id="picture_url"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      handleChange("picture_url", file)
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="breakfast_price">Breakfast Price</Label>
                  <Input
                    id="breakfast_price"
                    type="number"
                    value={formData.breakfast_price}
                    onChange={(e) => handleChange("breakfast_price", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lunch_price">Lunch Price</Label>
                  <Input
                    id="lunch_price"
                    type="number"
                    value={formData.lunch_price}
                    onChange={(e) => handleChange("lunch_price", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dinner_price">Dinner Price</Label>
                  <Input
                    id="dinner_price"
                    type="number"
                    value={formData.dinner_price}
                    onChange={(e) => handleChange("dinner_price", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condiments_price">Condiments Price</Label>
                  <Input
                    id="condiments_price"
                    type="number"
                    value={formData.condiments_price}
                    onChange={(e) => handleChange("condiments_price", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="festival_price">Festival Price</Label>
                  <Input
                    id="festival_price"
                    type="number"
                    value={formData.festival_price}
                    onChange={(e) => handleChange("festival_price", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="net_price">Net Price</Label>
                  <Input
                    id="net_price"
                    type="number"
                    value={formData.net_price}
                    onChange={(e) => handleChange("net_price", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cgst">CGST (%)</Label>
                  <Input
                    id="cgst"
                    type="number"
                    value={formData.cgst}
                    onChange={(e) => handleChange("cgst", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sgst">SGST (%)</Label>
                  <Input
                    id="sgst"
                    type="number"
                    value={formData.sgst}
                    onChange={(e) => handleChange("sgst", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="igst">IGST (%)</Label>
                  <Input
                    id="igst"
                    type="number"
                    value={formData.igst}
                    onChange={(e) => handleChange("igst", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
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

