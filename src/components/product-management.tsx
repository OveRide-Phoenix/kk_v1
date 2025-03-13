"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Menu, X, LayoutDashboard, Package, Users, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProductTable from "@/components/product-table"
import ProductForm from "@/components/product-form"
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import { type Product, ProductType } from "@/types/product"
import Sidebar from "@/components/sidebar"

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true) 
  const [activePage, setActivePage] = useState("Dashboard"); 

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
      },
      {
        id: "2",
        name: "Lunch Thali",
        description: "Complete lunch meal with rice, dal, and vegetables",
        price: 213,
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
            activePage={activePage} 
            setActivePage={setActivePage} 
            sidebarOpen={sidebarOpen}  
            setSidebarOpen={setSidebarOpen} />

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Product Database Management</h1>
          <Button onClick={handleAddProduct} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Item
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, group, or type..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all" onClick={() => handleFilterByType("all")}>All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ProductTable products={filteredProducts} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
        </div>

        {isFormOpen && <ProductForm product={selectedProduct} onSave={handleSaveProduct} onCancel={() => setIsFormOpen(false)} />}
        <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onCloseAction={() => setIsDeleteDialogOpen(false)} onConfirmAction={confirmDelete} productName={productToDelete?.name || ""} />
      </div>
    </div>
  )
}
