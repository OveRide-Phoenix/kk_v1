"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ProductTable from "@/components/product-table"
import ProductForm from "@/components/product-form"
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import { type Product, type ComboProduct, type AddonProduct, type CategoryProduct } from "@/types/product"
import { AdminLayout } from "./admin-layout"
import ComboForm from "@/components/combo-form"
import AddonForm from "@/components/addon-form"
import { useToast } from "@/hooks/use-toast"

const normalizeOptionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str.length ? str : null
}

const normalizeRequiredString = (value: unknown, fallback = ""): string => {
  if (value === null || value === undefined) return fallback
  const str = String(value).trim()
  return str.length ? str : fallback
}

const normalizeInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return Math.max(0, Math.trunc(num))
}

const normalizeFloat = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const resolveItemId = (input: any): number | null => {
  const candidates = [input?.item_id, input?.id]
  for (const candidate of candidates) {
    const parsed = Number(candidate)
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }
  return null
}

const buildItemUpdatePayload = (product: Product): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    name: normalizeRequiredString(product.name),
    description: normalizeOptionalString(product.description),
    alias: normalizeOptionalString(product.alias),
    category_id: normalizeInt((product as any).category_id),
    uom: normalizeRequiredString(product.uom),
    weight_factor: normalizeFloat(product.weight_factor),
    weight_uom: normalizeOptionalString(product.weight_uom),
    item_type: normalizeOptionalString(product.item_type),
    hsn_code: normalizeOptionalString(product.hsn_code),
    factor: normalizeFloat(product.factor),
    quantity_portion: normalizeInt(product.quantity_portion),
    buffer_percentage: normalizeFloat(product.buffer_percentage),
    max_qty_breakfast: normalizeInt((product as any).max_qty_breakfast),
    max_qty_lunch: normalizeInt((product as any).max_qty_lunch),
    max_qty_dinner: normalizeInt((product as any).max_qty_dinner),
    breakfast_price: normalizeFloat(product.breakfast_price),
    lunch_price: normalizeFloat(product.lunch_price),
    dinner_price: normalizeFloat(product.dinner_price),
    condiments_price: normalizeFloat(product.condiments_price),
    festival_price: normalizeFloat(product.festival_price),
    cgst: normalizeFloat(product.cgst),
    sgst: normalizeFloat(product.sgst),
    igst: normalizeFloat(product.igst),
    net_price: normalizeFloat(product.net_price),
    is_combo: Boolean(product.is_combo),
  }

  const pictureValue = (product as any).picture_url
  if (typeof pictureValue === "string") {
    const trimmed = pictureValue.trim()
    payload.picture_url = trimmed.length ? trimmed : null
  }

  const mealIds = Array.isArray((product as any).bld_ids)
    ? Array.from(
        new Set(
          ((product as any).bld_ids as any[]).map((value) => {
            const parsed = Number(value)
            return Number.isInteger(parsed) && parsed > 0 ? parsed : null
          }).filter((value): value is number => value !== null)
        )
      ).sort((a, b) => a - b)
    : []
  payload.bld_ids = mealIds

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  )
}

export default function ProductManagement() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product | ComboProduct | AddonProduct | CategoryProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product | ComboProduct | AddonProduct | CategoryProduct[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [filterType, setFilterType] = useState<string>("All Types")
  const [filterGroup, setFilterGroup] = useState<string>("All Groups")
  const [activeTab, setActiveTab] = useState("items")

  // Get unique groups for filter dropdown
  const uniqueGroups = Array.from(new Set((products as any[]).map((product) => product.group)))

  // Get unique product types for filter dropdown
  const uniqueTypes = Array.from(new Set((products as any[]).map((product) => product.item_type)))

  const fetchProducts = useCallback(async () => {
    let url = ""
    switch (activeTab) {
      case "items":
        url = "http://localhost:8000/api/products/items"
        break
      case "combos":
        url = "http://localhost:8000/api/products/combos"
        break
      case "addons":
        url = "http://localhost:8000/api/products/addons"
        break
      case "categories":
        url = "http://localhost:8000/api/products/categories"
        break
    }

    try {
      const response = await fetch(url)
      const data = await response.json()
      const arrayData = Array.isArray(data) ? data : []
      setProducts(arrayData)
      setFilteredProducts(arrayData)
    } catch (err) {
      setProducts([])
      setFilteredProducts([])
    }
  }, [activeTab])

  // Fetch data from FastAPI based on activeTab
  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])
  

  // Filter products based on search query and filters
  useEffect(() => {
    let filtered = [...(products as any[])]

    // Apply search filter
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter((product) => {
        const searchLower = searchQuery.toLowerCase()
        
        // Get the appropriate name and ID fields based on table type
        let name, id
        switch (activeTab) {
          case "items":
            name = (product as Product).name
            id = (product as Product).item_id
            break
          case "combos":
            name = (product as ComboProduct).combo_name
            id = (product as ComboProduct).combo_id
            break
          case "addons":
            name = (product as AddonProduct).add_on_item_name
            id = (product as AddonProduct).add_on_id
            break
          case "categories":
            name = (product as CategoryProduct).category_name
            id = (product as CategoryProduct).category_id
            break
        }
        
        return (name && String(name).toLowerCase().includes(searchLower)) ||
               (id && String(id).toLowerCase().includes(searchLower))
      })
    }

    // Apply type filter
    if (filterType !== "All Types") {
      filtered = filtered.filter((product) => product.item_type === filterType)
    }

    // Apply group filter
    if (filterGroup !== "All Groups") {
      filtered = filtered.filter((product) => product.group === filterGroup)
    }

    setFilteredProducts(filtered)
  }, [searchQuery, products, filterType, filterGroup])

  const handleAddProduct = () => {
    if (activeTab === "combos") {
      // For combos, use the specialized combo form
      setSelectedProduct(null)
      setIsFormOpen(true)
    } else if (activeTab === "addons") {
      // For add-ons, use the specialized add-on form
      setSelectedProduct(null)
      setIsFormOpen(true)
    } else {
      // For other types, use the regular product form
      setSelectedProduct(null)
      setIsFormOpen(true)
    }
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsFormOpen(true)
  }

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (productToDelete) {
      const updatedProducts = (products as any[]).filter((p) => p.id !== productToDelete.id)
      setProducts(updatedProducts)
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleSaveProduct = async (product: any) => {
    if (activeTab !== "items") {
      if (selectedProduct) {
        const updatedProducts = (products as any[]).map((p) => (p.id === product.id ? product : p))
        setProducts(updatedProducts)
      } else {
        const newProduct = {
          ...product,
          id: Date.now().toString(),
        }
        setProducts([...(products as any[]), newProduct])
      }
      setIsFormOpen(false)
      setSelectedProduct(null)
      return
    }

    const itemId = resolveItemId(product)
    if (!itemId) {
      toast({
        title: "Update failed",
        description: "Creating new catalog items from this screen isn't supported yet.",
        variant: "destructive",
      })
      throw new Error("Missing item identifier")
    }

    const payload = buildItemUpdatePayload(product)

    const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    try {
      const response = await fetch(`http://localhost:8000/api/products/items/${itemId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
      })

      if (!response.ok) {
        let detail = "Failed to update item"
        try {
          const body = await response.json()
          if (typeof body?.detail === "string" && body.detail.trim().length > 0) {
            detail = body.detail
          }
        } catch {
          const text = await response.text()
          if (text.trim().length > 0) {
            detail = text
          }
        }

        toast({
          title: "Update failed",
          description: detail,
          variant: "destructive",
        })
        throw new Error(detail)
      }

      toast({
        title: "Item updated",
        description: `${normalizeRequiredString(payload.name ?? product.name, "Item")} saved successfully.`,
      })

      await fetchProducts()
      setIsFormOpen(false)
      setSelectedProduct(null)
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new Error("Unknown error while updating item")
      }
      throw error
    }
  }

  const singularFormMap = {
    items: "Item",
    combos: "Combo",
    addons: "Add-on",
    categories: "Category",
  }

  // Reset filters when tab changes
  useEffect(() => {
    setSearchQuery("")
    setFilterType("All Types")
    setFilterGroup("All Groups")
  }, [activeTab])

  return (
    <AdminLayout activePage="productmgmt">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl font-semibold">{singularFormMap[activeTab as keyof typeof singularFormMap]}s</CardTitle>
              <Button onClick={handleAddProduct} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New {singularFormMap[activeTab as keyof typeof singularFormMap]}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="items" className="mb-6" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="combos">Combos</TabsTrigger>
                <TabsTrigger value="addons">Add-ons</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Enhanced search and filter section */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${singularFormMap[activeTab as keyof typeof singularFormMap]}s...`}
                  className="pl-10 h-10 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Types">All Types</SelectItem>
                    {uniqueTypes.map((type, index) => (
  <SelectItem key={`type-${type || index}`} value={type}>
    {type}
  </SelectItem>
))}

                  </SelectContent>
                </Select>

                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Groups">All Groups</SelectItem>
                    {uniqueGroups.map((group, index) => (
  <SelectItem key={`group-${group || index}`} value={group}>
    {group}
  </SelectItem>
))}

                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto w-full">
                <ProductTable
                  products={filteredProducts as (Product | ComboProduct | AddonProduct | CategoryProduct)[]}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  tableType={activeTab as "items" | "combos" | "addons" | "categories"}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isFormOpen && activeTab === "combos" ? (
          <ComboForm 
            onSave={handleSaveProduct} 
            onCancel={() => setIsFormOpen(false)}
            existingItems={(products as any[]).filter(p => !p.is_combo && !p.isSubItem)} // Pass regular items as options
          />
        ) : isFormOpen && activeTab === "addons" ? (
          <AddonForm
            onSave={handleSaveProduct}
            onCancel={() => setIsFormOpen(false)}
            existingItems={(products as any[]).filter(p => !p.is_combo && !p.isSubItem)} // Pass regular items as options
          />
        ) : isFormOpen && (
          <ProductForm 
            product={selectedProduct} 
            onSave={handleSaveProduct} 
            onCancel={() => setIsFormOpen(false)} 
          />
        )}
        
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onCloseAction={() => setIsDeleteDialogOpen(false)}
          onConfirmAction={confirmDelete}
          productName={productToDelete?.name || ""}
        />
      </div>
    </AdminLayout>
  )
}
