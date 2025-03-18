"use client"

import { useState } from "react"
import { Pencil, Trash2, Plus, Search, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle,DialogTrigger} from "@/components/ui/dialog"
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger,} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import RegisterForm from "@/components/registerform";
import { AdminLayout } from "@/components/admin-layout"

// Define customer types
type CustomerType = "Regular" | "Reseller" | "Agent"
type PaymentFrequency = "Daily" | "Weekly" | "Monthly"
type CustomerStatus = "Active" | "Pending" | "Inactive"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  orders: number
  status: CustomerStatus
  address: string
  type: CustomerType
  paymentFrequency: PaymentFrequency
  routeNumber?: string
}

// Sample data
const initialCustomers: Customer[] = [
  {
    id: "CUST-1000",
    name: "Rahul Sharma",
    email: "customer1@example.com",
    phone: "+91 9876504321",
    orders: 2,
    status: "Active",
    address: "123 Main St, Mumbai, Maharashtra",
    type: "Regular",
    paymentFrequency: "Daily",
    routeNumber: "R-101",
  },
  {
    id: "CUST-1001",
    name: "Priya Patel",
    email: "customer2@example.com",
    phone: "+91 9876514321",
    orders: 9,
    status: "Pending",
    address: "456 Park Ave, Delhi, Delhi",
    type: "Reseller",
    paymentFrequency: "Monthly",
    routeNumber: "R-102",
  },
  {
    id: "CUST-1002",
    name: "Amit Kumar",
    email: "customer3@example.com",
    phone: "+91 9876524321",
    orders: 3,
    status: "Inactive",
    address: "789 Lake View, Bangalore, Karnataka",
    type: "Regular",
    paymentFrequency: "Daily",
    routeNumber: "R-103",
  },
  {
    id: "CUST-1003",
    name: "Sneha Reddy",
    email: "customer4@example.com",
    phone: "+91 9876534321",
    orders: 18,
    status: "Active",
    address: "234 Hill Road, Chennai, Tamil Nadu",
    type: "Agent",
    paymentFrequency: "Weekly",
    routeNumber: "R-104",
  },
  {
    id: "CUST-1004",
    name: "Vikram Singh",
    email: "customer5@example.com",
    phone: "+91 9876544321",
    orders: 15,
    status: "Pending",
    address: "567 Valley St, Hyderabad, Telangana",
    type: "Reseller",
    paymentFrequency: "Monthly",
    routeNumber: "R-105",
  },
]

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("All Customers")

  // Filter customers based on search query and status filter
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filterStatus === "All Customers" || customer.status === filterStatus

    return matchesSearch && matchesFilter
  })

  // Handle customer deletion
  const handleDeleteCustomer = (id: string) => {
    setCustomers(customers.filter((customer) => customer.id !== id))
  }

  // Handle customer update
  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    setCustomers(customers.map((customer) => (customer.id === updatedCustomer.id ? updatedCustomer : customer)))
    setIsEditDialogOpen(false)
  }

  // View customer details
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsViewDialogOpen(true)
  }

  // Edit customer
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer({ ...customer })
    setIsEditDialogOpen(true)
  }
  const handleAddCustomer = (newCustomer: any) => {
    const newCustomerWithId = { id: `CUST-${customers.length + 1000}`, ...newCustomer, orders: 0, status: "Pending" };
    setCustomers([...customers, newCustomerWithId]);
  };
  
  <RegisterForm onSubmit={handleAddCustomer} />
  

    
  return (
    <AdminLayout activePage="customermgmt">
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold">All Customers</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px]">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>Enter the details of the new customer below.</DialogDescription>
                </DialogHeader> 
              <div className="max-h-[80vh] overflow-y-auto">
                <RegisterForm  onSubmit={(data) => console.log("Registered:", data)} /> {/* Using the extracted form */}
                <DialogFooter className="mt-4">
                <Button variant="outline">Cancel</Button>
                <Button>Save Customer</Button>
              </DialogFooter></div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Customers">All Customers</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Customer ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.id}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell className="text-center">{customer.orders}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          customer.status === "Active"
                            ? "default"
                            : customer.status === "Pending"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewCustomer(customer)}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditCustomer(customer)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {customer.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleDeleteCustomer(customer.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* View Customer Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Customer ID</h3>
                  <p>{selectedCustomer.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                  <p>{selectedCustomer.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{selectedCustomer.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                  <p>{selectedCustomer.phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Badge
                    variant={
                      selectedCustomer.status === "Active"
                        ? "default"
                        : selectedCustomer.status === "Pending"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {selectedCustomer.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Orders</h3>
                  <p>{selectedCustomer.orders}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                <p>{selectedCustomer.address}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Customer Type</h3>
                  <p>{selectedCustomer.type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Payment Frequency</h3>
                  <p>{selectedCustomer.paymentFrequency}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Route Number</h3>
                  <p>{selectedCustomer.routeNumber || "Not assigned"}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewDialogOpen(false)
                    handleEditCustomer(selectedCustomer)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedCustomer.name}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-500 hover:bg-red-600"
                        onClick={() => {
                          handleDeleteCustomer(selectedCustomer.id)
                          setIsViewDialogOpen(false)
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer information below.</DialogDescription>
          </DialogHeader>
          {editingCustomer && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editingCustomer.status}
                    onValueChange={(value: CustomerStatus) => setEditingCustomer({ ...editingCustomer, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Delivery Address</Label>
                <Textarea
                  id="address"
                  value={editingCustomer.address}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Customer Type</Label>
                <RadioGroup
                  value={editingCustomer.type}
                  onValueChange={(value: CustomerType) => setEditingCustomer({ ...editingCustomer, type: value })}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Regular" id="type-regular" />
                    <Label htmlFor="type-regular">Regular</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Reseller" id="type-reseller" />
                    <Label htmlFor="type-reseller">Reseller</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Agent" id="type-agent" />
                    <Label htmlFor="type-agent">Agent</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Payment Frequency</Label>
                <RadioGroup
                  value={editingCustomer.paymentFrequency}
                  onValueChange={(value: PaymentFrequency) =>
                    setEditingCustomer({ ...editingCustomer, paymentFrequency: value })
                  }
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Daily" id="freq-daily" />
                    <Label htmlFor="freq-daily">Daily</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Weekly" id="freq-weekly" />
                    <Label htmlFor="freq-weekly">Weekly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Monthly" id="freq-monthly" />
                    <Label htmlFor="freq-monthly">Monthly</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="route">Route Number</Label>
                <Input
                  id="route"
                  value={editingCustomer.routeNumber || ""}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, routeNumber: e.target.value })}
                  placeholder="e.g., R-101"
                />
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateCustomer(editingCustomer)}>Save Changes</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  )
}

