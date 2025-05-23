"use client"
import { Eye, Pencil, Trash2, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useEffect, useState } from "react"
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
  const [sortKey, setSortKey] = useState(() => {
    // Set default sort key based on table type
    switch (tableType) {
      case "items": return "name"
      case "combos": return "combo_name"
      case "addons": return "main_item_name"
      case "categories": return "category_name"
      default: return ""
    }
  })
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Add useEffect to reset sort when tableType changes
  useEffect(() => {
    // Reset sort key based on table type
    switch (tableType) {
      case "items":
        setSortKey("name")
        break
      case "combos":
        setSortKey("combo_name")
        break
      case "addons":
        setSortKey("main_item_name")
        break
      case "categories":
        setSortKey("category_name")
        break
      default:
        setSortKey("")
    }
    // Reset sort direction to ascending
    setSortDirection("asc")
  }, [tableType])

  const handleViewProduct = (product: any) => {
    setViewProduct(product)
    setIsViewDialogOpen(true)
  }

  let columns: { key: string; header: string }[] = []
  if (tableType === "items") {
    columns = [
      { key: "sl_no", header: "Sl.No" },
      { key: "name", header: "Name" },
      { key: "item_id", header: "ID" },
      { key: "category_name", header: "Category" },
      { key: "breakfast_price", header: "Breakfast Price" },
      { key: "lunch_price", header: "Lunch Price" },
      { key: "dinner_price", header: "Dinner Price" },
      { key: "actions", header: "Actions" },
    ]
  } else if (tableType === "combos") {
    columns = [
      { key: "sl_no", header: "Sl.No" },
      { key: "combo_name", header: "Combo Name" },
      { key: "combo_id", header: "ID" },
      { key: "includedItems", header: "Included Items" },
      { key: "category_name", header: "Category" },
      { key: "price", header: "Price" },
      { key: "actions", header: "Actions" },
    ]
  } else if (tableType === "addons") {
    columns = [
      { key: "sl_no", header: "Sl.No" },
      { key: "main_item_name", header: "Main Item" },
      { key: "add_on_id", header: "ID" },
      { key: "add_on_item_name", header: "Add-on Item" },
      { key: "is_mandatory", header: "Mandatory" },
      { key: "max_quantity", header: "Max Qty" },
      { key: "actions", header: "Actions" },
    ]
  } else if (tableType === "categories") {
    columns = [
      { key: "sl_no", header: "Sl.No" },
      { key: "category_name", header: "Category Name" },
      { key: "category_id", header: "ID" },
      { key: "actions", header: "Actions" },
    ]
  }

  const handleSort = (key: string) => {
    if (key === "actions" || key === "sl_no") return;
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sortedProducts = [...products].sort((a: any, b: any) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey]
    const bVal = b[sortKey]

    if (aVal == null) return 1
    if (bVal == null) return -1

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    }

    // Safely convert values to strings for comparison
    const aStr = String(aVal || "")
    const bStr = String(bVal || "")

    return sortDirection === "asc"
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr)
  })

  return (
    <>
      {/* Scrollable wrapper with max height */}
      <div className="overflow-y-auto max-h-[60vh]">
        <Table>
          <TableHeader>
            {/* Sticky header row */}
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`px-4 py-3 ${
                    column.key === 'actions' ? 'text-center' : 'text-left'
                  } font-medium text-sm ${
                    column.key !== 'actions' && column.key !== 'sl_no' ? 'cursor-pointer' : ''
                  } select-none ${column.key === 'combo_name' ? 'whitespace-nowrap' : ''}`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className={`flex items-center ${
                    column.key === 'actions' ? 'justify-center' : ''
                  }`}>
                    <span>{column.header}</span>
                    {column.key !== 'actions' &&
                      column.key !== 'sl_no' &&
                      sortKey === column.key && (
                        <ChevronUp
                          className={`
                            h-4 w-4 ml-2
                            transform transition-transform duration-200
                            ${sortDirection === "asc" ? "rotate-0" : "rotate-180"}
                          `}
                        />
                      )}
                  </div>
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
              sortedProducts.map((product: any, idx) => (
                <TableRow
                  key={`${tableType}-${
                    tableType === "items" ? product.item_id :
                    tableType === "combos" ? product.combo_id :
                    tableType === "addons" ? product.add_on_id :
                    tableType === "categories" ? product.category_id :
                    idx
                  }-${idx}`}
                >
                  {columns.map((column) => {
                    if (column.key === "sl_no") {
                      return (
                        <TableCell key={column.key} className="px-4 py-3">
                          {idx + 1}
                        </TableCell>
                      )
                    }
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
                    if (column.key === "price") {
                      return (
                        <TableCell key={column.key} className="px-4 py-3">
                          ₹{product[column.key] ?? "-"}
                        </TableCell>
                      )
                    }
                    if (column.key === "includedItems") {
                      return (
                        <TableCell key={column.key} className="px-4 py-3 text-sm">
                          {(product.includedItems && product.includedItems.length > 0)
                            ? product.includedItems.map((item: any) => item.name).join(", ")
                            : "-"}
                        </TableCell>
                      )
                    }
                    if (column.key === "category_name") {
                      return (
                        <TableCell key={column.key} className="px-4 py-3" style={{ whiteSpace: 'nowrap' }}>
                          <Badge variant="outline" className="text-xs">
                            {product[column.key] ?? "-"}
                          </Badge>
                        </TableCell>
                      )
                    }
                    if (column.key === "price") {
                      return (
                        <TableCell key={column.key} className="px-4 py-3">
                          ₹{product[column.key] ?? "-"}
                        </TableCell>
                      )
                    }
                    if (column.key === "included_item_names") {
                      return (
                        <TableCell key={column.key} className="px-4 py-3 text-sm">
                          {(product[column.key] && product[column.key].length > 0)
                            ? product[column.key].join(", ")
                            : "-"}
                        </TableCell>
                      )
                    }
                    if (column.key === "category_name" || column.key === "included_category_name") {
                      return (
                        <TableCell key={column.key} className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {product[column.key] ?? "-"}
                          </Badge>
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
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[calc(100vh-8rem)] overflow-y-auto">
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
