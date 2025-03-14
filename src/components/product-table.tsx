"use client"

import { useState } from "react"
import { Edit, Trash2, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/types/product"
import ProductDetails from "@/components/product-details"

interface ProductTableProps {
  products: Product[];
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  tableType: 'items' | 'combos' | 'addons' | 'categories';
}

export default function ProductTable({ products, onEdit, onDelete, tableType }: ProductTableProps) {
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
    if (a[sortField] !== undefined && b[sortField] !== undefined && a[sortField] < b[sortField]) return sortDirection === "asc" ? -1 : 1
    if (a[sortField] !== undefined && b[sortField] !== undefined && a[sortField] > b[sortField]) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const handleViewDetails = (product: Product) => {
    let formattedProduct: Product;
    
    if (tableType === 'addons') {
      formattedProduct = {
        id: product.id,
        name: `${product.mainItemName} + ${product.addonItemName}`, // Fix this addon name not displaying
        description: `Add-on configuration for ${product.mainItemName}`,
        itemType: 'Add-on' as const,
        price: product.price || 0,
        mainItemName: product.mainItemName || '',
        addonItemName: product.addonItemName || '', // Fixed this line
        isMandatory: Boolean(product.isMandatory),
        maxQuantity: product.maxQuantity || 1
      } as unknown as Product;
    } else {
      formattedProduct = { ...product };
    }
    
    setSelectedProduct(formattedProduct);
    setIsDetailsOpen(true);
  };

  const renderTableHeaders = () => {
    switch (tableType) {
      case 'items':
        return (
          <TableRow>
            <TableHead className="w-[80px]">Sl.No</TableHead>
            <TableHead className="w-[200px]">Item Name</TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead className="w-[120px]">Group</TableHead>
            <TableHead className="w-[150px]">Attributes</TableHead>
            <TableHead className="w-[100px]">Price</TableHead>
            <TableHead className="w-[150px] text-center">Actions</TableHead>
          </TableRow>
        );

      case 'combos':
        return (
          <TableRow>
            <TableHead className="w-[80px]">Sl.No</TableHead>
            <TableHead className="w-[200px]">Combo Name</TableHead>
            <TableHead className="w-[300px]">Included Items</TableHead>
            <TableHead className="w-[100px]">Price</TableHead>
            <TableHead className="w-[150px] text-center">Actions</TableHead>
          </TableRow>
        );

      case 'addons':
        return (
          <TableRow>
            <TableHead className="w-[80px]">Sl.No</TableHead>
            <TableHead className="w-[200px]">Main Item</TableHead>
            <TableHead className="w-[200px]">Add-on Item</TableHead>
            <TableHead className="w-[100px]">Mandatory</TableHead>
            <TableHead className="w-[100px]">Max Qty</TableHead>
            <TableHead className="w-[100px]">Price</TableHead>
            <TableHead className="w-[150px] text-center">Actions</TableHead>
          </TableRow>
        );

      case 'categories':
        return (
          <TableRow>
            <TableHead className="w-[80px]">Sl.No</TableHead>
            <TableHead className="w-[200px]">Category Name</TableHead>
            <TableHead className="w-[300px]">Description</TableHead>
            <TableHead className="w-[100px]">Items Count</TableHead>
            <TableHead className="w-[150px] text-center">Actions</TableHead>
          </TableRow>
        );
    }
  };

  const renderTableRow = (item: any, index: number) => {
    switch (tableType) {
      case 'items':
        return (
          <TableRow key={item.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell><Badge>{item.itemType}</Badge></TableCell>
            <TableCell>{item.group}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                {item.isCombo && <Badge variant="outline">Combo</Badge>}
                {item.isSubItem && <Badge variant="outline">Sub-item</Badge>}
              </div>
            </TableCell>
            <TableCell>{item.price}</TableCell>
            <TableCell className="text-center">
              <div className="flex justify-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleViewDetails(item)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );

      // For combos table
      case 'combos':
        return (
          <TableRow key={item.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell>
              {item.includedItems && item.includedItems.length > 0 ? (
                item.includedItems.map((included: any) => (
                  <Badge key={included.name} variant="outline" className="mr-2">
                    {included.quantity}x {included.name}
                  </Badge>
                ))
              ) : (
                <span className="text-gray-500">No items included</span>
              )}
            </TableCell>
            <TableCell>{item.price}</TableCell>
            <TableCell className="text-center">
              <div className="flex justify-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleViewDetails(item)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      
      // For addons table
      case 'addons':
        return (
          <TableRow key={item.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{item.mainItemName}</TableCell> 
            <TableCell>{item.addonItemName}</TableCell>
            <TableCell>{item.isMandatory ? 'Yes' : 'No'}</TableCell>
            <TableCell>{item.maxQuantity}</TableCell>
            <TableCell>{item.price}</TableCell>
            <TableCell className="text-center">
              <div className="flex justify-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleViewDetails(item)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      
      // For categories table
      case 'categories':
        return (
          <TableRow key={item.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.description}</TableCell>
            <TableCell>{item.itemsCount}</TableCell>
            <TableCell className="text-center">
              <div className="flex justify-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleViewDetails(item)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
    }
  };

  // At the end of the component, before the final return statement, add:
  return (
      <>
        <div className="rounded-md border">
          <Table>
            <TableHeader>{renderTableHeaders()}</TableHeader>
            <TableBody>
              {products.map((item, index) => renderTableRow(item, index))}
            </TableBody>
          </Table>
        </div>
  
        {selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            open={isDetailsOpen}
            onOpenChange={(open) => {
              setIsDetailsOpen(open);
              if (!open) {
                // Clear the selected product when closing the details
                setTimeout(() => setSelectedProduct(null), 300);
              }
            }}
          />
        )}
      </>
    );
}
