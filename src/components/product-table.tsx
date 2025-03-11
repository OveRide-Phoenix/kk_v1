"use client"

import { useState } from "react"
import { Edit, Trash2, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/types/product"
import ProductDetails from "@/components/product-details"

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export default function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  const [sortField, setSortField] = useState<keyof Product>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedProducts = [...products].sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortDirection === "asc" ? -1 : 1
    if (a[sortField] > b[sortField]) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailsOpen(true)
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Sl No.</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                <div className="flex items-center">
                  Item
                  {sortField === "name" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("itemType")}>
                <div className="flex items-center">
                  Type
                  {sortField === "itemType" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("group")}>
                <div className="flex items-center">
                  Group
                  {sortField === "group" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead>Attributes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              sortedProducts.map((product, index) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleViewDetails(product)}
                >
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.itemType === "Breakfast"
                          ? "default"
                          : product.itemType === "Lunch"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {product.itemType}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.group}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {product.isCombo && <Badge variant="outline">Combo</Badge>}
                      {product.isSubItem && <Badge variant="outline">Sub-item</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetails(product)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View details</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(product)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(product)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isDetailsOpen && selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={() => setIsDetailsOpen(false)}
          onEdit={() => {
            setIsDetailsOpen(false)
            onEdit(selectedProduct)
          }}
        />
      )}
    </div>
  )
}

