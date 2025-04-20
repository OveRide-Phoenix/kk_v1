"use client"
import { Eye, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import type { Product, ComboProduct, AddonProduct, CategoryProduct } from "@/types/product"

interface ProductTableProps {
  products: (Product | ComboProduct | AddonProduct | CategoryProduct)[]
  onEdit: (product: any) => void
  onDelete: (product: any) => void
  tableType: "items" | "combos" | "addons" | "categories"
}

export default function ProductTable({ products, onEdit, onDelete, tableType }: ProductTableProps) {
  const [viewProduct, setViewProduct] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const handleViewProduct = (product: any) => {
    setViewProduct(product)
    setIsViewDialogOpen(true)
  }

  // Define columns based on table type
  let columns: { key: string; header: string }[] = []
  if (tableType === "items") {
    columns = [
      { key: "item_id", header: "ID" },
      { key: "name", header: "Name" },
      { key: "item_type", header: "Type" },
      { key: "category_name", header: "Category" },
      { key: "breakfast_price", header: "Breakfast Price" },
      { key: "lunch_price", header: "Lunch Price" },
      { key: "dinner_price", header: "Dinner Price" },
      { key: "is_combo", header: "Combo?" },
      { key: "actions", header: "Actions" },
    ]
  } else if (tableType === "combos") {
    columns = [
      { key: "combo_id", header: "ID" }, // Added ID column
      { key: "combo_name", header: "Combo Name" },
      { key: "included_item_names", header: "Included Items" },
      { key: "included_category_names", header: "Included Categories" },
      { key: "quantity", header: "Quantity" },
      { key: "actions", header: "Actions" },
    ]
  } else if (tableType === "addons") {
    columns = [
      { key: "add_on_id", header: "ID" }, // Added ID column
      { key: "main_item_name", header: "Main Item" },
      { key: "add_on_item_name", header: "Add-on Item" },
      { key: "is_mandatory", header: "Mandatory" },
      { key: "max_quantity", header: "Max Qty" },
      { key: "actions", header: "Actions" },
    ]
  } else if (tableType === "categories") {
    columns = [
      { key: "category_id", header: "ID" }, // Added ID column
      { key: "category_name", header: "Category Name" },
      { key: "actions", header: "Actions" },
    ]
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className="px-4 py-3 text-left font-medium text-sm">
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8">
                No data available.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product: any, idx) => (
              <TableRow
  key={
    tableType === "items" && product.item_id != null
      ? `item-${product.item_id}`
      : tableType === "combos" && product.combo_id != null
      ? `combo-${product.combo_id}`
      : tableType === "addons" && product.add_on_id != null
      ? `addon-${product.add_on_id}`
      : tableType === "categories" && product.category_id != null
      ? `cat-${product.category_id}`
      : `fallback-${idx}`
  }
>
                {columns.map((column) => {
                  if (column.key === "actions") {
                    return (
                      <TableCell key="actions" className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleViewProduct(product)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(product)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    )
                  }
                  if (column.key === "is_combo") {
                    return (
                      <TableCell key={column.key} className="px-4 py-3">
                        {product.is_combo ? "Yes" : "No"}
                      </TableCell>
                    )
                  }
                  if (
                    column.key === "breakfast_price" ||
                    column.key === "lunch_price" ||
                    column.key === "dinner_price"
                  ) {
                    return (
                      <TableCell key={column.key} className="px-4 py-3">
                        {product[column.key] !== null && product[column.key] !== undefined
                          ? `₹${product[column.key]}`
                          : "-"}
                      </TableCell>
                    )
                  }
                  return (
                    <TableCell key={column.key} className="px-4 py-3">
                      {column.key === "category_name" ? (
                        <Badge variant="outline" className="text-xs">
                          {product[column.key] ?? "-"}
                        </Badge>
                      ) : (
                        product[column.key] ?? "-"
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
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
              <pre className="text-sm whitespace-pre-wrap break-words">
                {JSON.stringify(viewProduct, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
