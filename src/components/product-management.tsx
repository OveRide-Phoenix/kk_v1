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
import ComboForm, { type ComboFormValues } from "@/components/combo-form"
import CategoryForm, { type CategoryFormValues } from "@/components/category-form"
import AddonForm from "@/components/addon-form"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
    hsn_code: normalizeOptionalString(product.hsn_code),
    factor: normalizeFloat(product.factor),
    quantity_portion: normalizeInt(product.quantity_portion),
    buffer_percentage: normalizeFloat(product.buffer_percentage),
    max_qty_breakfast: normalizeInt((product as any).max_qty_breakfast),
    max_qty_lunch: normalizeInt((product as any).max_qty_lunch),
    max_qty_dinner: normalizeInt((product as any).max_qty_dinner),
    max_qty_condiments: normalizeInt((product as any).max_qty_condiments),
    breakfast_price: normalizeFloat(product.breakfast_price),
    lunch_price: normalizeFloat(product.lunch_price),
    dinner_price: normalizeFloat(product.dinner_price),
    condiments_price: normalizeFloat(product.condiments_price),
    festival_price: normalizeFloat(product.festival_price),
    cgst: normalizeFloat(product.cgst),
    sgst: normalizeFloat(product.sgst),
    igst: normalizeFloat(product.igst),
    net_price: normalizeFloat(product.net_price),
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

type TabKey = "items" | "combos" | "addons" | "categories" | "condiments"

export default function ProductManagement() {
  const { toast } = useToast()
  const [products, setProducts] = useState<(Product | ComboProduct | AddonProduct | CategoryProduct)[]>([])
  const [filteredProducts, setFilteredProducts] = useState<(Product | ComboProduct | AddonProduct | CategoryProduct)[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<
    Product | ComboProduct | AddonProduct | CategoryProduct | null
  >(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<
    Product | ComboProduct | AddonProduct | CategoryProduct | null
  >(null)
  const [mealFilter, setMealFilter] = useState<string>("all")
  const [filterGroup, setFilterGroup] = useState<string>("All Groups")
  const [activeTab, setActiveTab] = useState<TabKey>("items")

  const buildAuthHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("access_token")
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    }
    return headers
  }

  const resolveProductName = (
    product: Product | ComboProduct | AddonProduct | CategoryProduct | null
  ): string => {
    if (!product) return ""
    const candidate: any = product
    if (typeof candidate.combo_name === "string" && candidate.combo_name.trim().length > 0) {
      return candidate.combo_name
    }
    if (typeof candidate.name === "string" && candidate.name.trim().length > 0) {
      return candidate.name
    }
    if (typeof candidate.add_on_item_name === "string" && candidate.add_on_item_name.trim().length > 0) {
      return candidate.add_on_item_name
    }
    if (typeof candidate.category_name === "string" && candidate.category_name.trim().length > 0) {
      return candidate.category_name
    }
    if (candidate.combo_id) return `Combo #${candidate.combo_id}`
    if (candidate.item_id) return `Item #${candidate.item_id}`
    if (candidate.category_id) return `Category #${candidate.category_id}`
    return "this record"
  }

  // Get unique groups for filter dropdown
  const uniqueGroups = Array.from(new Set((products as any[]).map((product) => product.group)))
  const mealFilterOptions = [
    { label: "All Meals", value: "all" },
    { label: "Breakfast", value: "1" },
    { label: "Lunch", value: "2" },
    { label: "Dinner", value: "3" },
    { label: "Condiments", value: "4" },
  ]

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
      case "condiments":
        url = "http://localhost:8000/api/products/items?only_condiments=1"
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
          case "condiments":
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
    if (mealFilter !== "all" && (activeTab === "items" || activeTab === "condiments")) {
      const targetMeal = Number(mealFilter)
      filtered = filtered.filter((product) => {
        const bldIds = (product as Product).bld_ids
        return Array.isArray(bldIds) && bldIds.includes(targetMeal)
      })
    }

    // Apply group filter
    if (filterGroup !== "All Groups") {
      filtered = filtered.filter((product) => product.group === filterGroup)
    }

    setFilteredProducts(filtered)
  }, [searchQuery, products, mealFilter, filterGroup, activeTab])

  useEffect(() => {
    if (activeTab !== "items" && activeTab !== "condiments") {
      setMealFilter("all")
    }
  }, [activeTab])

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

  const handleEditProduct = (product: Product | ComboProduct | AddonProduct | CategoryProduct) => {
    setSelectedProduct(product)
    setIsFormOpen(true)
  }

  const handleDeleteProduct = (product: Product | ComboProduct | AddonProduct | CategoryProduct) => {
    setProductToDelete(product)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) {
      return
    }

    if (activeTab === "combos" && (productToDelete as ComboProduct).combo_id) {
      const comboId = (productToDelete as ComboProduct).combo_id
      const headers = buildAuthHeaders()
      try {
        const response = await fetch(`http://localhost:8000/api/products/combos/${comboId}`, {
          method: "DELETE",
          headers,
          credentials: "include",
        })
        if (!response.ok) {
          let detail = "Failed to delete combo"
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
            title: "Delete failed",
            description: detail,
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Combo deleted",
          description: `Combo #${comboId} removed successfully.`,
        })
        await fetchProducts()
      } catch (error) {
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Unexpected error while deleting combo.",
          variant: "destructive",
        })
      } finally {
        setIsDeleteDialogOpen(false)
        setProductToDelete(null)
      }
      return
    }

    if (activeTab === "categories" && (productToDelete as CategoryProduct).category_id) {
      const categoryId = (productToDelete as CategoryProduct).category_id
      const headers = buildAuthHeaders()
      try {
        const response = await fetch(`http://localhost:8000/api/products/categories/${categoryId}`, {
          method: "DELETE",
          headers,
          credentials: "include",
        })
        if (!response.ok) {
          let detail = "Failed to delete category"
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
            title: "Delete failed",
            description: detail,
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Category deleted",
          description: `Category #${categoryId} removed successfully.`,
        })
        await fetchProducts()
      } catch (error) {
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Unexpected error while deleting category.",
          variant: "destructive",
        })
      } finally {
        setIsDeleteDialogOpen(false)
        setProductToDelete(null)
      }
      return
    }

    const deletionId = (productToDelete as any)?.id
    const updatedProducts = Number.isFinite(deletionId)
      ? (products as any[]).filter((p) => (p as any)?.id !== deletionId)
      : (products as any[]).filter((p) => p !== productToDelete)

    setProducts(updatedProducts)
    setFilteredProducts(updatedProducts)
    setIsDeleteDialogOpen(false)
    setProductToDelete(null)
  }

  const saveCombo = async (payload: ComboFormValues) => {
    const isUpdating = Boolean(payload.combo_id)
    const endpoint = isUpdating
      ? `http://localhost:8000/api/products/combos/${payload.combo_id}`
      : "http://localhost:8000/api/products/combos"
    const headers = buildAuthHeaders()
    const body = {
      combo_name: payload.combo_name,
      category_id: payload.category_id,
      price: payload.price,
      items: payload.items,
    }

    try {
      const response = await fetch(endpoint, {
        method: isUpdating ? "PUT" : "POST",
        headers,
        body: JSON.stringify(body),
        credentials: "include",
      })

      if (!response.ok) {
        let detail = isUpdating ? "Failed to update combo" : "Failed to create combo"
        try {
          const data = await response.json()
          if (typeof data?.detail === "string" && data.detail.trim().length > 0) {
            detail = data.detail
          }
        } catch {
          const text = await response.text()
          if (text.trim().length > 0) {
            detail = text
          }
        }

        toast({
          title: "Combo save failed",
          description: detail,
          variant: "destructive",
        })
        return
      }

      toast({
        title: isUpdating ? "Combo updated" : "Combo created",
        description: `${body.combo_name} saved successfully.`,
      })

      await fetchProducts()
      setIsFormOpen(false)
      setSelectedProduct(null)
    } catch (error) {
      toast({
        title: "Combo save failed",
        description: error instanceof Error ? error.message : "Unexpected error while saving combo.",
        variant: "destructive",
      })
    }
  }

  const saveCategory = async (payload: CategoryFormValues) => {
    const isUpdating = Boolean(payload.category_id)
    const endpoint = isUpdating
      ? `http://localhost:8000/api/products/categories/${payload.category_id}`
      : "http://localhost:8000/api/products/categories"
    const headers = buildAuthHeaders()

    try {
      const response = await fetch(endpoint, {
        method: isUpdating ? "PUT" : "POST",
        headers,
        body: JSON.stringify({ category_name: payload.category_name }),
        credentials: "include",
      })

      if (!response.ok) {
        let detail = isUpdating ? "Failed to update category" : "Failed to create category"
        try {
          const data = await response.json()
          if (typeof data?.detail === "string" && data.detail.trim().length > 0) {
            detail = data.detail
          }
        } catch {
          const text = await response.text()
          if (text.trim().length > 0) {
            detail = text
          }
        }

        toast({
          title: "Category save failed",
          description: detail,
          variant: "destructive",
        })
        return
      }

      toast({
        title: isUpdating ? "Category updated" : "Category created",
        description: `${payload.category_name} saved successfully.`,
      })

      await fetchProducts()
      setIsFormOpen(false)
      setSelectedProduct(null)
    } catch (error) {
      toast({
        title: "Category save failed",
        description: error instanceof Error ? error.message : "Unexpected error while saving category.",
        variant: "destructive",
      })
    }
  }

  const handleSaveProduct = async (product: any) => {
    if (activeTab === "combos") {
      await saveCombo(product as ComboFormValues)
      return
    }
    if (activeTab === "categories") {
      await saveCategory(product as CategoryFormValues)
      return
    }

    if (activeTab !== "items" && activeTab !== "condiments") {
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

    const payload = buildItemUpdatePayload(product)
    const itemId = resolveItemId(product)
    const isCreating = !itemId

    const headers = buildAuthHeaders()

    try {
      const endpoint = isCreating
        ? "http://localhost:8000/api/products/items"
        : `http://localhost:8000/api/products/items/${itemId}`
      const response = await fetch(endpoint, {
        method: isCreating ? "POST" : "PUT",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
      })

      if (!response.ok) {
        let detail = isCreating ? "Failed to create item" : "Failed to update item"
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
        title: isCreating ? "Item created" : "Item updated",
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

  const singularFormMap: Record<TabKey, string> = {
    items: "Item",
    combos: "Combo",
    addons: "Add-on",
    categories: "Category",
    condiments: "Condiment",
  }

  // Reset filters when tab changes
  useEffect(() => {
    setSearchQuery("")
    setMealFilter("all")
    setFilterGroup("All Groups")
  }, [activeTab])

  const selectedCombo =
    activeTab === "combos" && selectedProduct && (selectedProduct as ComboProduct).combo_id
      ? (selectedProduct as ComboProduct)
      : null

  return (
    <AdminLayout activePage="productmgmt">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl font-semibold">{singularFormMap[activeTab]}s</CardTitle>
              <Button onClick={handleAddProduct} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New {singularFormMap[activeTab]}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} className="mb-6" onValueChange={(value) => setActiveTab(value as TabKey)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="combos">Combos</TabsTrigger>
                <TabsTrigger value="addons">Add-ons</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="condiments">Condiments</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Enhanced search and filter section */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${singularFormMap[activeTab]}s...`}
                  className="pl-10 h-10 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Select
                  value={mealFilter}
                  onValueChange={setMealFilter}
                  disabled={activeTab !== "items" && activeTab !== "condiments"}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Meal Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
                  tableType={activeTab}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isFormOpen && activeTab === "combos" ? (
          <Dialog open onOpenChange={(open) => { if (!open) setIsFormOpen(false) }}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedProduct ? "Edit Combo" : "Create Combo"}</DialogTitle>
              </DialogHeader>
              <ComboForm
                key={selectedCombo ? `combo-${selectedCombo.combo_id}` : "combo-new"}
                combo={selectedCombo}
                onSave={handleSaveProduct}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        ) : isFormOpen && activeTab === "addons" ? (
          <AddonForm
            onSave={handleSaveProduct}
            onCancel={() => setIsFormOpen(false)}
            existingItems={(products as any[]).filter(p => !p.is_combo && !p.isSubItem)} // Pass regular items as options
          />
        ) : isFormOpen && activeTab === "categories" ? (
          <CategoryForm
            category={selectedProduct as CategoryProduct | null}
            onSave={handleSaveProduct}
            onCancel={() => setIsFormOpen(false)}
          />
        ) : isFormOpen && (
          <ProductForm 
            product={selectedProduct as Product | null} 
            formScope={activeTab === "condiments" ? "condiments" : "items"}
            onSave={handleSaveProduct} 
            onCancel={() => setIsFormOpen(false)} 
          />
        )}
        
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onCloseAction={() => setIsDeleteDialogOpen(false)}
          onConfirmAction={() => { void confirmDelete() }}
          productName={resolveProductName(productToDelete)}
        />
      </div>
    </AdminLayout>
  )
}
