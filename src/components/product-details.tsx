"use client"

import { X, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Product } from "@/types/product"

interface ProductDetailsProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ProductDetails({ product, open, onOpenChange }: ProductDetailsProps) {
  if (!product || !open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto"
      onClick={() => onOpenChange(false)}
    >
      <Card
        className="w-full max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Product Details</CardTitle>
            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <img
                src={product.picture_url || "/placeholder.svg"}
                alt={product.name}
                className="w-full aspect-square object-cover rounded-md border"
              />
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{product.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={
                      product.item_type === "Breakfast"
                        ? "default"
                        : product.item_type === "Lunch"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {product.item_type}
                  </Badge>
                  {product.is_combo && <Badge variant="outline">Combo</Badge>}
                </div>
              </div>
              

              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1">{product.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Alias</h3>
                  <p className="mt-1">{product.alias}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Category</h3>
                  <p className="mt-1">{product.category_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">UOM</h3>
                  <p className="mt-1">{product.uom}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Weight</h3>
                  <p className="mt-1">
                    {product.weight_factor} {product.weight_uom}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">HSN Code</h3>
                  <p className="mt-1">{product.hsn_code}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Factor</h3>
                  <p className="mt-1">{product.factor}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Quantity/Portion</h3>
                  <p className="mt-1">{product.quantity_portion}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Buffer Percentage</h3>
                  <p className="mt-1">{product.buffer_percentage}%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t p-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

