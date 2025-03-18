"use client"

import { Eye, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import type { Product } from "@/types/product"

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  tableType: "items" | "combos" | "addons" | "categories"
}

export default function ProductTable({ products, onEdit, onDelete, tableType }: ProductTableProps) {
  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const handleViewProduct = (product: Product) => {
    setViewProduct(product)
    setIsViewDialogOpen(true)
  }

  // Define columns based on table type
  const getColumns = () => {
    const baseColumns = [
      { key: "name", header: "Name" },
      { key: "group", header: "Group" },
      { key: "price", header: "Price (₹)" },
      { key: "rate", header: "Rate (₹)" }, // Added Rate column
      { key: "actions", header: "Actions" },
    ]

    if (tableType === "categories") {
      // Remove price and rate columns for categories
      return baseColumns.filter((col) => col.key !== "price" && col.key !== "rate")
    }

    return baseColumns
  }

  const columns = getColumns()

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={`px-4 py-3 text-left font-medium text-sm ${column.key === "actions" ? "text-right" : ""}`}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="px-4 py-3 font-medium">{product.name}</TableCell>
              <TableCell className="px-4 py-3">
                <Badge variant="outline">{product.group}</Badge>
              </TableCell>
              {tableType !== "categories" && <TableCell className="px-4 py-3">₹{product.price}</TableCell>}
              {tableType !== "categories" && <TableCell className="px-4 py-3">₹{product.rate}</TableCell>}
              <TableCell className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleViewProduct(product)}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(product)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* View Product Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>View detailed information about this product.</DialogDescription>
          </DialogHeader>

          {viewProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                  <p className="font-medium">{viewProduct.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Group</h3>
                  <p>{viewProduct.group}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Type</h3>
                  <p>{viewProduct.itemType}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Alias</h3>
                  <p>{viewProduct.alias}</p>
                </div>
                {tableType !== "categories" && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Price</h3>
                      <p>₹{viewProduct.price}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Rate</h3>
                      <p>₹{viewProduct.rate}</p>
                    </div>
                  </>
                )}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Unit of Measure</h3>
                  <p>{viewProduct.uom}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Quantity Portion</h3>
                  <p>{viewProduct.quantityPortion}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p>{viewProduct.description || "No description available"}</p>
              </div>

              {viewProduct.isCombo && viewProduct.items && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Combo Items</h3>
                  <ul className="list-disc pl-5 mt-2">
                    {viewProduct.items.map((item, index) => (
                      <li key={index}>
                        {item.name} x {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Weight Factor</h3>
                  <p>
                    {viewProduct.weightFactor} {viewProduct.weightUom}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">HSN Code</h3>
                  <p>{viewProduct.hsnCode}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Buffer %</h3>
                  <p>{viewProduct.bufferPercentage}%</p>
                </div>
              </div>

              {viewProduct.isSubItem && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Main Item</h3>
                  <p>{viewProduct.mainItemName}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

