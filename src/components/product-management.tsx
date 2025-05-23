"use client"

import { useState, useEffect } from "react"
import { Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ProductTable from "@/components/product-table"
import ProductForm from "@/components/product-form"
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import { type Product, type ComboProduct, type AddonProduct, type CategoryProduct, ProductType } from "@/types/product"
import { AdminLayout } from "./admin-layout"
import ComboForm from "@/components/combo-form"
import AddonForm from "@/components/addon-form"

export default function ProductManagement() {
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

  // Fetch data from FastAPI based on activeTab
  useEffect(() => {
    const fetchProducts = async () => {
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
        
        // Remove the mapping - pass the raw API data directly to ProductTable
        setProducts(data)
        setFilteredProducts(data)
      } catch (err) {
        setProducts([])
        setFilteredProducts([])
      }
    }

    fetchProducts()
  }, [activeTab])
  

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

  const handleSaveProduct = (product: Product) => {
    if (selectedProduct) {
      // Update existing product
      const updatedProducts = (products as any[]).map((p) => (p.id === product.id ? product : p))
      setProducts(updatedProducts)
    } else {
      // Add new product
      const newProduct = {
        ...product,
        id: Date.now().toString(), // Simple ID generation
      }
      setProducts([...(products as any[]), newProduct])
    }
    setIsFormOpen(false)
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

            <div className="rounded-md border overflow-x-auto">
              <ProductTable
                products={filteredProducts as (Product | ComboProduct | AddonProduct | CategoryProduct)[]}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                tableType={activeTab as "items" | "combos" | "addons" | "categories"}
              />
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

