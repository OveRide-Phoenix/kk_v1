"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableRow, TableHeader, TableHead } from "@/components/ui/table"; // Correct import
import { Pencil, Trash2, Eye } from "lucide-react";

// Sample product data (Replace with API call)
const sampleProducts = [
  { id: 1, name: "Anna 350 gms", type: "Breakfast", group: "Condiments", price: 120, stock: 50 },
  { id: 2, name: "Special Combo", type: "Lunch", group: "Meals", price: 250, stock: 20 },
  { id: 3, name: "Mysore Pak", type: "Snacks", group: "Sweets", price: 180, stock: 40 },
];

export default function ProductTable() {
  const [products, setProducts] = useState(sampleProducts);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered Products
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle Delete
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      setProducts(products.filter((product) => product.id !== id));
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Product List</h2>
      
      {/* Search Bar */}
      <Input
        type="text"
        placeholder="Search by name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />

      {/* Product Table */}
      <Table className="w-full border-collapse border border-gray-300">
        <TableHeader>
          <TableRow>
            <TableHead className="border p-2">Sl No.</TableHead>
            <TableHead className="border p-2">Item Name</TableHead>
            <TableHead className="border p-2">Type</TableHead>
            <TableHead className="border p-2">Group</TableHead>
            <TableHead className="border p-2">Price (₹)</TableHead>
            <TableHead className="border p-2">Stock</TableHead>
            <TableHead className="border p-2">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <TableRow key={product.id}>
                <td className="border p-2">{index + 1}</td>
                <td className="border p-2">{product.name}</td>
                <td className="border p-2">{product.type}</td>
                <td className="border p-2">{product.group}</td>
                <td className="border p-2">₹{product.price}</td>
                <td className="border p-2">{product.stock}</td>
                <td className="border p-2 flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Eye className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Pencil className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </td>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <td colSpan={7} className="border p-2 text-center">No products found.</td>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
