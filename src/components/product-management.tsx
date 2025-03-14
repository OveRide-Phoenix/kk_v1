"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Bell, User, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import ProductTable from "@/components/product-table"
import ProductForm from "@/components/product-form"
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import { type Product, ProductType } from "@/types/product"
import { AdminLayout } from "@/components/admin-layout"

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true) 
  const [activePage, setActivePage] = useState("productmgmt") // Change this to match the product management page ID

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Load sample data (replace with real db shit)
  useEffect(() => {
    const sampleProducts: Product[] = [
      {
        id: "1",
        name: "Rice 350 gms",
        description: "Traditional South Indian breakfast item",
        price: 213,
        alias: "Rice-350",
        isSubItem: false,
        maxQuantity: 0,
        isMandatory: false,
        mainItemName: "",
        isCombo: false,
        itemType: ProductType.BREAKFAST,
        group: "South Indian",
        uom: "Plate",
        weightFactor: 0.35,
        weightUom: "kg",
        hsnCode: "1234",
        factor: 1,
        quantityPortion: "1 plate",
        bufferPercentage: 10,
        image: "/placeholder.svg?height=200&width=200",
        addonItemName: undefined
      },
      {
        id: "2",
        name: "Lunch Thali",
        description: "Complete lunch meal with rice, dal, and vegetables",
        price: 213,
        maxQuantity: 0,
        isMandatory: false,
        mainItemName: "",
        alias: "lunch-thali",
        isSubItem: false,
        isCombo: true,
        itemType: ProductType.LUNCH,
        group: "Main Course",
        uom: "Plate",
        weightFactor: 0.5,
        weightUom: "kg",
        hsnCode: "5678",
        factor: 1,
        quantityPortion: "1 plate",
        bufferPercentage: 15,
        image: "/placeholder.svg?height=200&width=200",
        addonItemName: undefined
      },
    ]

    setProducts(sampleProducts)
    setFilteredProducts(sampleProducts)
  }, [])
  
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.itemType.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredProducts(filtered)
    }
  }, [searchQuery, products])

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setIsFormOpen(true)
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

  const handleFilterByType = (type: string) => {
    if (type === "all") {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter((product) => product.itemType.toLowerCase() === type.toLowerCase())
      setFilteredProducts(filtered)
    }
  }

  const [activeTab, setActiveTab] = useState("items")

  // Sample data for different tables
  useEffect(() => {
    // Define type for sample data structure
    const sampleData: Record<string, Array<Product>> = {
      items: [
        {
          id: "1",
          name: "Rice 350 gms",
          description: "Traditional South Indian breakfast item",
          price: 213,
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
          addonItemName: undefined
        },
      ],
      combos: [
        {
          id: "c1",
          name: "South Indian Thali",
          description: "Complete meal with rice, sambar, and sides",
          price: 299,
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
            { name: "Papad", quantity: 2 }
          ],
          addonItemName: undefined
        }
      ],
      addons: [
        {
          id: "a1",
          name: "Extra Papad",
          description: "Crispy papad",
          price: 15,
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
          addonItemName: undefined
        },
      ],
      categories: [
        {
          id: "cat1",
          maxQuantity: 0, // Categories don't have quantity limits
          isMandatory: false, // Categories are not mandatory
          mainItemName: "", // Categories don't have a main item
          name: "South Indian",
          description: "Traditional South Indian items",
          itemType: "CATEGORY" as ProductType,
          group: "Cuisine",
          price: 0,
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
          addonItemName: undefined
        },
        {
          id: "cat2",
          name: "North Indian",
          description: "Traditional North Indian cuisine",
          itemType: "CATEGORY" as ProductType,
          group: "Cuisine",
          price: 0,
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
          addonItemName: undefined
        }
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

const singularFormMap = {
  items: "Item",
  combos: "Combo",
  addons: "Add-on",
  categories: "Category"
}

  // Update the return JSX
  return (
    <AdminLayout activePage="productmgmt">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Product Management</CardTitle>
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

          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search ${singularFormMap[activeTab as keyof typeof singularFormMap]}s...`}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ProductTable 
            products={filteredProducts} 
            onEdit={handleEditProduct} 
            onDelete={handleDeleteProduct}
            tableType={activeTab as 'items' | 'combos' | 'addons' | 'categories'}
          />
        </CardContent>
      </Card>

      {isFormOpen && <ProductForm product={selectedProduct} onSave={handleSaveProduct} onCancel={() => setIsFormOpen(false)} />}
      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen} 
        onCloseAction={() => setIsDeleteDialogOpen(false)} 
        onConfirmAction={confirmDelete} 
        productName={productToDelete?.name || ""} 
      />
    </AdminLayout>
)
}
