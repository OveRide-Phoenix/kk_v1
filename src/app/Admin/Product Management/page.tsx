"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent} from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} 
from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Coffee, Search, Edit, Trash2, MoreVertical, Upload, Filter } from "lucide-react"

// Sample data for demonstration
const sampleProducts = [
  {
    id: 1,
    name: "Anna 350 gms",
    description: "Traditional South Indian rice dish",
    alias: "Anna",
    itemType: "Lunch",
    group: "Main Course",
    isSubItem: false,
    isCombo: false,
    uom: "Plate",
    weightFactor: 0.35,
    weightUom: "kg",
    hsnCode: "1006",
    factor: 1.0,
    quantityPerPortion: 1,
    bufferPercentage: 10,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: 2,
    name: "Masala Dosa",
    description: "Crispy dosa filled with spiced potato filling",
    alias: "MDosa",
    itemType: "Breakfast",
    group: "Dosa Varieties",
    isSubItem: false,
    isCombo: false,
    uom: "Piece",
    weightFactor: 0.25,
    weightUom: "kg",
    hsnCode: "1901",
    factor: 1.0,
    quantityPerPortion: 1,
    bufferPercentage: 5,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: 3,
    name: "Mysore Pak",
    description: "Traditional sweet made with gram flour, ghee, and sugar",
    alias: "MPak",
    itemType: "Dinner",
    group: "Desserts",
    isSubItem: false,
    isCombo: false,
    uom: "Piece",
    weightFactor: 0.1,
    weightUom: "kg",
    hsnCode: "1704",
    factor: 1.0,
    quantityPerPortion: 2,
    bufferPercentage: 15,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: 4,
    name: "South Indian Thali",
    description: "Complete meal with rice, sambar, rasam, and sides",
    alias: "SIThali",
    itemType: "Lunch",
    group: "Combo",
    isSubItem: false,
    isCombo: true,
    uom: "Plate",
    weightFactor: 0.75,
    weightUom: "kg",
    hsnCode: "2106",
    factor: 1.0,
    quantityPerPortion: 1,
    bufferPercentage: 10,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: 5,
    name: "Sambar",
    description: "Lentil-based vegetable stew",
    alias: "Sambar",
    itemType: "Lunch",
    group: "Side Dishes",
    isSubItem: true,
    isCombo: false,
    uom: "Bowl",
    weightFactor: 0.2,
    weightUom: "kg",
    hsnCode: "2103",
    factor: 1.0,
    quantityPerPortion: 1,
    bufferPercentage: 20,
    image: "/placeholder.svg?height=100&width=100",
  },
]

const itemTypes = ["Breakfast", "Lunch", "Dinner"]
const groups = ["Main Course", "Side Dishes", "Dosa Varieties", "Desserts", "Combo"]
const uomOptions = ["Plate", "Bowl", "Piece", "Gram", "Kilogram", "Liter", "Milliliter"]
const weightUomOptions = ["g", "kg", "ml", "l"]

export default function AdminProductManagement() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("view")
  const [products, setProducts] = useState(sampleProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterGroup, setFilterGroup] = useState("")
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    alias: "",
    itemType: "Breakfast",
    group: "Main Course",
    isSubItem: false,
    isCombo: false,
    uom: "Plate",
    weightFactor: 0,
    weightUom: "",
    hsnCode: "",
    factor: 1.0,
    quantityPerPortion: 1,
    bufferPercentage: 0,
    image: "/placeholder.svg?height=100&width=100",
  })

  // Filter products based on search term and filters
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType ? product.itemType === filterType : true
    const matchesGroup = filterGroup ? product.group === filterGroup : true

    return matchesSearch && matchesType && matchesGroup
  })

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewProduct((prev) => ({ ...prev, [name]: value }))
  }

  // Handle checkbox/switch changes
  const handleCheckboxChange = (name, checked) => {
    setNewProduct((prev) => ({ ...prev, [name]: checked }))
  }

  // Handle select changes
  const handleSelectChange = (name, value) => {
    setNewProduct((prev) => ({ ...prev, [name]: value }))
  }

  // Handle product selection for editing
  const handleEditProduct = (product) => {
    setNewProduct(product)
    setIsEditMode(true)
    setActiveTab("add")
  }

  // Handle product deletion
  const handleDeleteProduct = (product) => {
    setSelectedProduct(product)
    setDeleteConfirmOpen(true)
  }

  // Confirm product deletion
  const confirmDelete = () => {
    setProducts(products.filter((p) => p.id !== selectedProduct.id))
    setDeleteConfirmOpen(false)
    setSelectedProduct(null)
  }

  // Save new or edited product
  const handleSaveProduct = () => {
    if (isEditMode) {
      setProducts(products.map((p) => (p.id === newProduct.id ? newProduct : p)))
      setIsEditMode(false)
    } else {
      const newId = Math.max(...products.map((p) => p.id)) + 1
      setProducts([...products, { ...newProduct, id: newId }])
    }

    // Reset form
    setNewProduct({
      name: "",
      description: "",
      alias: "",
      itemType: "Breakfast",
      group: "Main Course",
      isSubItem: false,
      isCombo: false,
      uom: "",
      weightFactor: 0,
      weightUom: "",
      hsnCode: "",
      factor: 1.0,
      quantityPerPortion: 1,
      bufferPercentage: 0,
      image: "/placeholder.svg?height=100&width=100",
    })

    setActiveTab("view")
  }

  // Reset form when switching to add tab
  useEffect(() => {
    if (activeTab === "add" && !isEditMode) {
      setNewProduct({
        name: "",
        description: "",
        alias: "",
        itemType: "Breakfast",
        group: "Main Course",
        isSubItem: false,
        isCombo: false,
        uom: "",
        weightFactor: 0,
        weightUom: "",
        hsnCode: "",
        factor: 1.0,
        quantityPerPortion: 1,
        bufferPercentage: 0,
        image: "/placeholder.svg?height=100&width=100",
      })
    }
  }, [activeTab, isEditMode])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-muted">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coffee className="h-6 w-6 text-primary" />
              <a href="#" className="text-xl font-bold">
                Kuteera Kitchen
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-foreground/70">Admin Panel</span>
              <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <h1 className="text-2xl font-bold">Product Database Management</h1>
            <div className="flex space-x-2">
              <Button variant={activeTab === "view" ? "default" : "outline"} onClick={() => setActiveTab("view")}>
                View Products
              </Button>
              <Button
                variant={activeTab === "add" ? "default" : "outline"}
                onClick={() => {
                  setActiveTab("add")
                  setIsEditMode(false)
                }}
              >
                Add New Item
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="view" className="space-y-6">
              {/* Search and Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[150px]">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <span>{filterType || "Item Type"}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Types</SelectItem>
                          {itemTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={filterGroup} onValueChange={setFilterGroup}>
                        <SelectTrigger className="w-[150px]">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <span>{filterGroup || "Group"}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Groups</SelectItem>
                          {groups.map((group) => (
                            <SelectItem key={group} value={group}>
                              {group}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Sl No.</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead>Alias</TableHead>
                          <TableHead className="w-16 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product, index) => (
                            <TableRow key={product.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.itemType}</TableCell>
                              <TableCell>{product.group}</TableCell>
                              <TableCell>{product.alias}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                      <span className="sr-only">Open menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteProduct(product)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              No products found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-6">{isEditMode ? "Edit Product" : "Add New Product"}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="flex space-x-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isSubItem"
                            checked={newProduct.isSubItem}
                            onCheckedChange={(checked) => handleCheckboxChange("isSubItem", checked)}
                          />
                          <Label htmlFor="isSubItem">Sub Item</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isCombo"
                            checked={newProduct.isCombo}
                            onCheckedChange={(checked) => handleCheckboxChange("isCombo", checked)}
                          />
                          <Label htmlFor="isCombo">Combo</Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">
                          Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={newProduct.name}
                          onChange={handleInputChange}
                          placeholder="e.g., Anna 350 gms"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={newProduct.description}
                          onChange={handleInputChange}
                          placeholder="Brief description of the item"
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="alias">Alias</Label>
                        <Input
                          id="alias"
                          name="alias"
                          value={newProduct.alias}
                          onChange={handleInputChange}
                          placeholder="Short name or alias"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="itemType">
                          Item Type <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={newProduct.itemType}
                          onValueChange={(value) => handleSelectChange("itemType", value)}
                        >
                          <SelectTrigger id="itemType">
                            <SelectValue placeholder="Select item type" value={newProduct.itemType} />
                          </SelectTrigger>
                          <SelectContent>
                            {itemTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="group">
                          Group <span className="text-destructive">*</span>
                        </Label>
                        <Select value={newProduct.group} onValueChange={(value) => handleSelectChange("group", value)}>
                          <SelectTrigger id="group">
                            <SelectValue placeholder="Select group" value={newProduct.group} />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((group) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="uom">
                          UOM (Unit of Measure) <span className="text-destructive">*</span>
                        </Label>
                        <Select value={newProduct.uom} onValueChange={(value) => handleSelectChange("uom", value)}>
                          <SelectTrigger id="uom">
                            <SelectValue placeholder="Select UOM" value={newProduct.uom} />
                          </SelectTrigger>
                          <SelectContent>
                            {uomOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="weightFactor">Weight Factor</Label>
                          <Input
                            id="weightFactor"
                            name="weightFactor"
                            type="number"
                            step="0.001"
                            value={newProduct.weightFactor}
                            onChange={handleInputChange}
                            placeholder="e.g., 0.350"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="weightUom">Weight UOM</Label>
                          <Select
                            value={newProduct.weightUom}
                            onValueChange={(value) => handleSelectChange("weightUom", value)}
                          >
                            <SelectTrigger id="weightUom">
                              <SelectValue placeholder="Select weight UOM" value={newProduct.weightUom} />
                            </SelectTrigger>
                            <SelectContent>
                              {weightUomOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hsnCode">HSN Code</Label>
                        <Input
                          id="hsnCode"
                          name="hsnCode"
                          value={newProduct.hsnCode}
                          onChange={handleInputChange}
                          placeholder="e.g., 1006"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="factor">Factor</Label>
                          <Input
                            id="factor"
                            name="factor"
                            type="number"
                            step="0.001"
                            value={newProduct.factor}
                            onChange={handleInputChange}
                            placeholder="e.g., 1.000"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="quantityPerPortion">Quantity/Portion</Label>
                          <Input
                            id="quantityPerPortion"
                            name="quantityPerPortion"
                            type="number"
                            value={newProduct.quantityPerPortion}
                            onChange={handleInputChange}
                            placeholder="e.g., 1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bufferPercentage">Buffer Percentage</Label>
                        <Input
                          id="bufferPercentage"
                          name="bufferPercentage"
                          type="number"
                          value={newProduct.bufferPercentage}
                          onChange={handleInputChange}
                          placeholder="e.g., 10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Upload Picture</Label>
                        <div className="flex items-start space-x-4">
                          <div className="border border-input rounded-md overflow-hidden w-24 h-24 flex-shrink-0">
                            <img
                              src={newProduct.image || "/placeholder.svg"}
                              alt="Product"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="space-y-2">
                            <Button type="button" variant="outline" size="sm" className="h-8">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Image
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Supported formats: JPEG, PNG, WebP. Max size: 2MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActiveTab("view")
                        setIsEditMode(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProduct}>{isEditMode ? "Update" : "Save"}</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

