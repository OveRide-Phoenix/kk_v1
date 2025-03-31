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
import { type Product, ProductType } from "@/types/product"
import { AdminLayout } from "./admin-layout"
import ComboForm from "@/components/combo-form"
import AddonForm from "@/components/addon-form"

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [filterType, setFilterType] = useState<string>("All Types")
  const [filterGroup, setFilterGroup] = useState<string>("All Groups")
  const [activeTab, setActiveTab] = useState("items")

  // Get unique groups for filter dropdown
  const uniqueGroups = Array.from(new Set(products.map((product) => product.group)))

  // Get unique product types for filter dropdown
  const uniqueTypes = Array.from(new Set(products.map((product) => product.itemType)))

  // Load sample data (replace with real db data)
  useEffect(() => {
    // Define type for sample data structure
    const sampleData: Record<string, Array<Product>> = {
      items: [
        {
          id: "1",
          name: "Rice 350 gms",
          description: "Traditional South Indian breakfast item",
          price: 213,
          rate: 250, // Added rate field
          itemType: ProductType.BREAKFAST,
          alias: "rice-350-breakfast",
          group: "South Indian",
          isCombo: false,
          isSubItem: false,
          uom: "Plate",
          weightFactor: 0.35,
          maxQuantity: 0,
          isMandatory: false,
          mainItemName: "",
          weightUom: "kg",
          hsnCode: "1234",
          factor: 1,
          quantityPortion: "1 plate",
          bufferPercentage: 10,
          image: "/placeholder.svg?height=200&width=200",
          addonItemName: undefined,
        },
        {
          id: "2",
          name: "Idli Sambar",
          description: "Steamed rice cakes with lentil soup",
          price: 180,
          rate: 200, // Added rate field
          itemType: ProductType.BREAKFAST,
          alias: "idli-sambar",
          group: "South Indian",
          isCombo: false,
          isSubItem: false,
          uom: "Plate",
          weightFactor: 0.3,
          maxQuantity: 0,
          isMandatory: false,
          mainItemName: "",
          weightUom: "kg",
          hsnCode: "1234",
          factor: 1,
          quantityPortion: "2 pieces",
          bufferPercentage: 10,
          image: "/placeholder.svg?height=200&width=200",
          addonItemName: undefined,
        },
        {
          id: "3",
          name: "Chapati",
          description: "Whole wheat flatbread",
          price: 25,
          rate: 30, // Added rate field
          itemType: ProductType.DINNER,
          alias: "chapati",
          group: "North Indian",
          isCombo: false,
          isSubItem: false,
          uom: "Piece",
          weightFactor: 0.05,
          maxQuantity: 0,
          isMandatory: false,
          mainItemName: "",
          weightUom: "kg",
          hsnCode: "1905",
          factor: 1,
          quantityPortion: "1 piece",
          bufferPercentage: 5,
          image: "/placeholder.svg?height=200&width=200",
          addonItemName: undefined,
        },
      ],
      combos: [
        {
          id: "c1",
          name: "South Indian Thali",
          description: "Complete meal with rice, sambar, and sides",
          price: 299,
          rate: 350, // Added rate field
          itemType: ProductType.LUNCH,
          alias: "south-indian-thali",
          maxQuantity: 1,
          isMandatory: false,
          mainItemName: "",
          group: "Combos",
          isCombo: true,
          isSubItem: false,
          uom: "Plate",
          weightFactor: 0.8,
          weightUom: "kg",
          hsnCode: "1234",
          factor: 1,
          quantityPortion: "1 plate",
          bufferPercentage: 10,
          image: "/placeholder.svg?height=200&width=200",
          items: [
            { name: "Rice", quantity: 1 },
            { name: "Sambar", quantity: 1 },
            { name: "Rasam", quantity: 1 },
            { name: "Papad", quantity: 2 },
          ],
          addonItemName: undefined,
        },
        {
          id: "c2",
          name: "North Indian Thali",
          description: "Complete meal with roti, dal, and sides",
          price: 329,
          rate: 380, // Added rate field
          itemType: ProductType.LUNCH,
          alias: "north-indian-thali",
          maxQuantity: 1,
          isMandatory: false,
          mainItemName: "",
          group: "Combos",
          isCombo: true,
          isSubItem: false,
          uom: "Plate",
          weightFactor: 0.75,
          weightUom: "kg",
          hsnCode: "1234",
          factor: 1,
          quantityPortion: "1 plate",
          bufferPercentage: 10,
          image: "/placeholder.svg?height=200&width=200",
          items: [
            { name: "Roti", quantity: 3 },
            { name: "Dal", quantity: 1 },
            { name: "Paneer Curry", quantity: 1 },
            { name: "Raita", quantity: 1 },
          ],
          addonItemName: undefined,
        },
      ],
      addons: [
        {
          id: "a1",
          name: "Extra Papad",
          description: "Crispy papad",
          price: 15,
          rate: 20, // Added rate field
          itemType: "ADDON" as ProductType,
          alias: "extra-papad",
          uom: "Piece",
          weightFactor: 0.02,
          weightUom: "kg",
          hsnCode: "2106",
          factor: 1,
          quantityPortion: "1 piece",
          bufferPercentage: 5,
          maxQuantity: 10,
          isMandatory: false,
          mainItemName: "Lunch Thali",
          image: "/placeholder.svg?height=200&width=200",
          group: "Sides",
          isCombo: false,
          isSubItem: true,
          addonItemName: undefined,
        },
        {
          id: "a2",
          name: "Extra Rice",
          description: "Additional serving of rice",
          price: 40,
          rate: 50, // Added rate field
          itemType: "ADDON" as ProductType,
          alias: "extra-rice",
          uom: "Bowl",
          weightFactor: 0.15,
          weightUom: "kg",
          hsnCode: "1006",
          factor: 1,
          quantityPortion: "1 bowl",
          bufferPercentage: 5,
          maxQuantity: 5,
          isMandatory: false,
          mainItemName: "South Indian Thali",
          image: "/placeholder.svg?height=200&width=200",
          group: "Sides",
          isCombo: false,
          isSubItem: true,
          addonItemName: undefined,
        },
      ],
      categories: [
        {
          id: "cat1",
          maxQuantity: 0,
          isMandatory: false,
          mainItemName: "",
          name: "South Indian",
          description: "Traditional South Indian items",
          itemType: "CATEGORY" as ProductType,
          group: "Cuisine",
          price: 0,
          rate: 0, // Added rate field
          alias: "south-indian-cuisine",
          uom: "Category",
          weightFactor: 0,
          weightUom: "N/A",
          hsnCode: "N/A",
          factor: 1,
          quantityPortion: "N/A",
          bufferPercentage: 0,
          image: "/placeholder.svg?height=200&width=200",
          isCombo: false,
          isSubItem: false,
          addonItemName: undefined,
        },
        {
          id: "cat2",
          name: "North Indian",
          description: "Traditional North Indian cuisine",
          itemType: "CATEGORY" as ProductType,
          group: "Cuisine",
          price: 0,
          rate: 0, // Added rate field
          alias: "north-indian-cuisine",
          uom: "Category",
          weightFactor: 0,
          maxQuantity: 0,
          isMandatory: false,
          mainItemName: "",
          weightUom: "N/A",
          hsnCode: "N/A",
          factor: 1,
          quantityPortion: "N/A",
          bufferPercentage: 0,
          image: "/placeholder.svg?height=200&width=200",
          isCombo: false,
          isSubItem: false,
          addonItemName: undefined,
        },
      ],
    }

    // Ensure activeTab exists as a key in sampleData before setting state
    if (activeTab in sampleData) {
      setProducts(sampleData[activeTab as keyof typeof sampleData] || [])
      setFilteredProducts(sampleData[activeTab as keyof typeof sampleData] || [])
    } else {
      setProducts([])
      setFilteredProducts([])
    }
  }, [activeTab])

  // Filter products based on search query and filters
  useEffect(() => {
    let filtered = [...products]

    // Apply search filter
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.itemType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Apply type filter
    if (filterType !== "All Types") {
      filtered = filtered.filter((product) => product.itemType === filterType)
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
      const updatedProducts = products.filter((p) => p.id !== productToDelete.id)
      setProducts(updatedProducts)
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleSaveProduct = (product: Product) => {
    if (selectedProduct) {
      // Update existing product
      const updatedProducts = products.map((p) => (p.id === product.id ? product : p))
      setProducts(updatedProducts)
    } else {
      // Add new product
      const newProduct = {
        ...product,
        id: Date.now().toString(), // Simple ID generation
      }
      setProducts([...products, newProduct])
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
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
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
                    {uniqueGroups.map((group) => (
                      <SelectItem key={`group-${group}`} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <ProductTable
                products={filteredProducts}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                tableType={activeTab as "items" | "combos" | "addons" | "categories"}
              />
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No {singularFormMap[activeTab as keyof typeof singularFormMap]}s found
              </div>
            )}
          </CardContent>
        </Card>

        {isFormOpen && activeTab === "combos" ? (
          <ComboForm 
            onSave={handleSaveProduct} 
            onCancel={() => setIsFormOpen(false)}
            existingItems={products.filter(p => !p.isCombo && !p.isSubItem)} // Pass regular items as options
          />
        ) : isFormOpen && activeTab === "addons" ? (
          <AddonForm
            onSave={handleSaveProduct}
            onCancel={() => setIsFormOpen(false)}
            existingItems={products.filter(p => !p.isCombo && !p.isSubItem)} // Pass regular items as options
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

