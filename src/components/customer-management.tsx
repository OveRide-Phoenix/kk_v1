"use client"

import { useEffect, useState } from "react"
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


// Update the Customer interface to match the API response
interface Customer {
  customer_id: number
  name: string
  primary_mobile: string
  email: string
  written_address: string
  // Add other fields from your API response
  address_id: number
  house_apartment_no: string | null
  city: string
  pin_code: string
  latitude: number
  longitude: number
  address_type: string | null
  route_assignment: string | null
}

// Add these handlers at the top of the component
export default function CustomerManagement() {
  // Initialize with empty array
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    orderCount: "all",
    address: "",
  })

  // Update the fetch and data handling
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('http://localhost:8000/get-all-customers')
        const data = await response.json()
        console.log('API Response:', response)
        console.log('Response Data:', data)
        // Ensure we're setting an array
        setCustomers(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching customers:', error)
        setCustomers([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  // Update the filter function to use the correct field names
  const filteredCustomers = Array.isArray(customers) ? customers.filter((customer) => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      customer.primary_mobile.includes(searchQuery) ||
      customer.customer_id.toString().includes(searchQuery)

    const matchesOrderCount = true // Remove if not needed
    const matchesAddress = !filters.address || 
      customer.written_address.toLowerCase().includes(filters.address.toLowerCase())

    return matchesSearch && matchesOrderCount && matchesAddress
  }) : []

  // Update the table rendering
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
                  <RegisterForm onSubmit={handleAddCustomer} />
                  <DialogFooter className="mt-4">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save Customer</Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Existing filters div */}
            <div className="flex gap-2">
              <Select
                value={filters.orderCount}
                onValueChange={(value) => setFilters(prev => ({ ...prev, orderCount: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="5">5+ Orders</SelectItem>
                  <SelectItem value="10">10+ Orders</SelectItem>
                  <SelectItem value="20">20+ Orders</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Filter by address..."
                value={filters.address}
                onChange={(e) => setFilters(prev => ({ ...prev, address: e.target.value }))}
                className="w-[200px]"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] pl-4">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-center pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      <div className="flex justify-center items-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  // Update the TableRow and TableCell in the mapping section
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.customer_id} className="h-14">
                      <TableCell className="font-medium pl-4">{customer.customer_id}</TableCell>
                      <TableCell>
                        <span className="font-medium">{customer.name}</span>
                      </TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>
                        <span className="font-medium">+91 {customer.primary_mobile}</span>
                      </TableCell>
                      <TableCell>{customer.written_address}</TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell className="text-center pr-4">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewCustomer(customer.customer_id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditCustomer(customer.customer_id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteCustomer(customer.customer_id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Existing dialogs */}
      </div>
    </AdminLayout>
  )
}

const handleAddCustomer = async (customerData: any) => {
    try {
      const response = await fetch('http://localhost:8000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...customerData,
          payment_frequency: customerData.paymentFrequency || "Daily",
          primary_mobile: customerData.phone,
          written_address: customerData.address,
          is_default: true,
          // Adding required fields from your API model
          recipient_name: customerData.name, // Using same name as recipient name
          latitude: 0, // Default values, update as needed
          longitude: 0,
          pin_code: customerData.pinCode || "",
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add customer');
      }

      const result = await response.json();
      
      if (result.success) {
        // Refresh the customers list
        const updatedResponse = await fetch('http://localhost:8000/get-all-customers');
        const updatedData = await updatedResponse.json();
        window.location.reload();
      }
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  const handleViewCustomer = (customerId: number) => {
    // TODO: Implement view dialog
    console.log('View customer:', customerId)
  }

  const handleEditCustomer = (customerId: number) => {
    // TODO: Implement edit dialog
    console.log('Edit customer:', customerId)
  }

  const handleDeleteCustomer = (customerId: number) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      fetch(`http://localhost:8000/delete-customer/${customerId}`, {
        method: 'DELETE'
      }).then(() => {
        window.location.reload()
      })
    }
  }

