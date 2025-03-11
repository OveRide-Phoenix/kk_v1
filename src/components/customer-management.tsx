"use client"

import { useState } from "react"
import Sidebar from "@/components/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Filter } from "lucide-react"
import { AddCustomerDialog } from "@/components/add-customer-dialog"

export function CustomerManagement() {
  const [filterValue, setFilterValue] = useState("all")
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false) 
  const [activePage, setActivePage] = useState("customers") 

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        activePage={activePage} 
        setActivePage={setActivePage} 
      />
      
      <div className="flex-1">
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Customer Management</h1>
            <p className="text-gray-500">Manage and view all your customers</p>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>All Customers</CardTitle>
                <Button onClick={() => setAddCustomerOpen(true)}>
                  <Plus size={16} className="mr-2" />
                  Add New Customer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input placeholder="Search customers..." className="pl-10" />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-500" />
                  <Select value={filterValue} onValueChange={setFilterValue}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="new">New This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>CUST-{1000 + i}</TableCell>
                        <TableCell>
                          {["Rahul Sharma", "Priya Patel", "Amit Kumar", "Sneha Reddy", "Vikram Singh"][i]}
                        </TableCell>
                        <TableCell>customer{i + 1}@example.com</TableCell>
                        <TableCell>+91 98765{i}4321</TableCell>
                        <TableCell>{Math.floor(Math.random() * 20) + 1}</TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              i % 3 === 0
                                ? "bg-green-100 text-green-800"
                                : i % 3 === 1
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {i % 3 === 0 ? "Active" : i % 3 === 1 ? "Pending" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
        <AddCustomerDialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen} />
      </div>
    </div>
  )
}
