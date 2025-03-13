"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { type Product, ProductType } from "@/types/product"

interface ProductFormProps {
  product: Product | null
  onSave: (product: Product) => void
  onCancel: () => void
}

export default function ProductForm({ product, onSave, onCancel }: ProductFormProps)
 {
  const [formData, setFormData] = useState<Product>({
    id: "",
    name: "",
    description: "",
    price: 0,
    alias: "",
    isSubItem: false,
    isCombo: false,
    itemType: ProductType.BREAKFAST,
    group: "",
    uom: "",
    weightFactor: 0,
    weightUom: "kg",
    hsnCode: "",
    factor: 1,
    quantityPortion: "",
    bufferPercentage: 0,
    image: "/placeholder.svg?height=200&width=200",
  })

  const [imagePreview, setImagePreview] = useState<string>("/placeholder.svg?height=200&width=200")
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (product) {
      setFormData(product)
      setImagePreview(product.image)
    }
  }, [product])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: Number.parseFloat(value) || 0 }))

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setImagePreview(result)
        setFormData((prev) => ({ ...prev, image: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    if (!formData.alias.trim()) newErrors.alias = "Alias is required"
    if (!formData.group.trim()) newErrors.group = "Group is required"
    if (!formData.uom.trim()) newErrors.uom = "UOM is required"
    if (!formData.weightUom.trim()) newErrors.weightUom = "Weight UOM is required"
    if (!formData.hsnCode.trim()) newErrors.hsnCode = "HSN Code is required"
    if (!formData.quantityPortion.trim()) newErrors.quantityPortion = "Quantity/Portion is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  
    if (validateForm()) {
      onSave({
        ...formData,
        id: product?.id || "",
      });
    }
  };
  

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex justify-between items-center">
            <CardTitle>{product ? "Edit Product" : "Add New Product"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Anna 350 gms"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Brief details about the product"
                    value={formData.description}
                    onChange={handleChange}
                    className={errors.description ? "border-red-500" : ""}
                  />
                  {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alias">
                    Alias <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="alias"
                    name="alias"
                    placeholder="Short name for internal use"
                    value={formData.alias}
                    onChange={handleChange}
                    className={errors.alias ? "border-red-500" : ""}
                  />
                  {errors.alias && <p className="text-red-500 text-sm">{errors.alias}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="isSubItem">Sub Item</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isSubItem"
                        checked={formData.isSubItem}
                        onCheckedChange={(checked) => handleSwitchChange("isSubItem", checked)}
                      />
                      <Label htmlFor="isSubItem">Is a sub-item</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="isCombo">Combo</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isCombo"
                        checked={formData.isCombo}
                        onCheckedChange={(checked) => handleSwitchChange("isCombo", checked)}
                      />
                      <Label htmlFor="isCombo">Is a combo product</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemType">
                    Item Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.itemType} onValueChange={(value) => handleSelectChange("itemType", value)}>
                    <SelectTrigger id="itemType" className={errors.itemType ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ProductType.BREAKFAST}>Breakfast</SelectItem>
                      <SelectItem value={ProductType.LUNCH}>Lunch</SelectItem>
                      <SelectItem value={ProductType.DINNER}>Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.itemType && <p className="text-red-500 text-sm">{errors.itemType}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group">
                    Group <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="group"
                    name="group"
                    placeholder="e.g., South Indian, Main Course"
                    value={formData.group}
                    onChange={handleChange}
                    className={errors.group ? "border-red-500" : ""}
                  />
                  {errors.group && <p className="text-red-500 text-sm">{errors.group}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="uom">
                      UOM <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="uom"
                      name="uom"
                      placeholder="e.g., grams, liters"
                      value={formData.uom}
                      onChange={handleChange}
                      className={errors.uom ? "border-red-500" : ""}
                    />
                    {errors.uom && <p className="text-red-500 text-sm">{errors.uom}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weightFactor">Weight Factor</Label>
                    <Input
                      id="weightFactor"
                      name="weightFactor"
                      type="number"
                      step="0.001"
                      placeholder="e.g., 0.350"
                      value={formData.weightFactor}
                      onChange={handleNumberChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weightUom">
                      Weight UOM <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.weightUom}
                      onValueChange={(value) => handleSelectChange("weightUom", value)}
                    >
                      <SelectTrigger id="weightUom" className={errors.weightUom ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select weight UOM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                        <SelectItem value="g">Gram (g)</SelectItem>
                        <SelectItem value="l">Liter (l)</SelectItem>
                        <SelectItem value="ml">Milliliter (ml)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.weightUom && <p className="text-red-500 text-sm">{errors.weightUom}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hsnCode">
                      HSN Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="hsnCode"
                      name="hsnCode"
                      placeholder="Tax classification code"
                      value={formData.hsnCode}
                      onChange={handleChange}
                      className={errors.hsnCode ? "border-red-500" : ""}
                    />
                    {errors.hsnCode && <p className="text-red-500 text-sm">{errors.hsnCode}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="factor">Factor</Label>
                    <Input
                      id="factor"
                      name="factor"
                      type="number"
                      step="0.01"
                      placeholder="Numeric input for quantity measurement"
                      value={formData.factor}
                      onChange={handleNumberChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantityPortion">
                      Quantity/Portion <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="quantityPortion"
                      name="quantityPortion"
                      placeholder="e.g., 1 plate, 2 pieces"
                      value={formData.quantityPortion}
                      onChange={handleChange}
                      className={errors.quantityPortion ? "border-red-500" : ""}
                    />
                    {errors.quantityPortion && <p className="text-red-500 text-sm">{errors.quantityPortion}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bufferPercentage">Buffer Percentage</Label>
                  <Input
                    id="bufferPercentage"
                    name="bufferPercentage"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Set stock buffer percentage"
                    value={formData.bufferPercentage}
                    onChange={handleNumberChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="border rounded-md overflow-hidden w-40 h-40">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Label
                      htmlFor="image-upload"
                      className="cursor-pointer flex items-center gap-2 border rounded-md px-4 py-2 hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Image
                    </Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t p-6">
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{product ? "Save Changes" : "Save"}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

