"use client"

import { useEffect, useState } from "react"
import { Pencil, Trash2, Plus, Search, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle,DialogTrigger} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger,} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import RegisterForm from "@/components/registerform";
import { AdminLayout } from "@/components/admin-layout"
import { CustomerForm } from "./customer-form"
import { toast, useToast } from "@/hooks/use-toast"
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

export default function CustomerManagement() {
  // Remove the destructuring
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  
  // Initialize with empty array
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const refreshCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/get-all-customers');
      const data = await response.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };
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
      (customer?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesOrderCount = true; // Remove if not needed
    const matchesAddress = !filters.address || 
      (customer?.written_address?.toLowerCase() || '').includes(filters.address.toLowerCase());

    return matchesSearch && matchesOrderCount && matchesAddress;
  }) : [];

  // Remove the throwing error function and update the Dialog component
  return (
    <AdminLayout activePage="customermgmt">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl font-semibold">All Customers</CardTitle>
              <Dialog open={open} onOpenChange={setOpen}>
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
                  <CustomerForm 
                    customer={null} 
                    onSave={async (customerData) => {
                      try {
                        const formattedData = {
                          referred_by: customerData.referredBy || null,
                          primary_mobile: customerData.primaryMobile?.toString(),
                          alternative_mobile: customerData.alternativeMobile || null,
                          name: customerData.name?.trim(),
                          recipient_name: customerData.recipientName?.trim(),
                          payment_frequency: customerData.paymentFrequency || "Daily",
                          email: customerData.email || null,
                          house_apartment_no: customerData.houseApartmentNo?.trim() || null,
                          written_address: customerData.writtenAddress?.trim(),
                          city: customerData.city?.trim(),
                          pin_code: customerData.pinCode?.toString(),
                          latitude: customerData.latitude ? parseFloat(String(customerData.latitude)) : 0,
                          longitude: customerData.longitude ? parseFloat(String(customerData.longitude)) : 0,
                          address_type: customerData.addressType || "Home",
                          route_assignment: customerData.routeAssignment || null,
                          is_default: true
                        };
                        
                        const response = await fetch('http://localhost:8000/api/register', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(formattedData),
                        });
                        
                        const responseData = await response.json();
                        
                        if (!response.ok) {
                          throw new Error(responseData.detail || 'Failed to add customer');
                        }
                        
                        // Close dialog first
                        setOpen(false);
                        // Refresh customers
                        await refreshCustomers();
                        
                        // Show success toast - this is where we call it
                        toast({
                          description: "Customer added successfully",
                        });
                        
                        return { success: true, data: responseData };
                      } catch (error: any) {
                        // Show error toast
                        toast({
                          variant: "destructive",
                          description: error.message || 'Failed to add customer',
                        });
                        return {
                          success: false,
                          message: error.message || 'Failed to add customer'
                        };
                      }
                    }}
                    onCancel={() => setOpen(false)} 
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="w-full customer-form-field pl-8 pr-3 py-2"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Filters */}
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
                  autoComplete="new-address-filter" 
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table className="w-full customer-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] pl-4">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-center px-2 align-middle">
                      <div className="flex justify-center">Actions</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow key="loading-row">
                      <TableCell colSpan={7} className="text-center py-6">
                        <div className="flex justify-center items-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow key="empty-row">
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

  const handleViewCustomer = (customerId: number) => {
    // TODO: Implement view dialog
    console.log('View customer:', customerId)
  }

  const handleEditCustomer = (customerId: number) => {
    // TODO: Implement edit dialog
    console.log('Edit customer:', customerId)
  }

  const handleDeleteCustomer = async (customerId: number) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        const response = await fetch(`http://localhost:8000/delete-customer/${customerId}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.detail && data.detail.includes('foreign key constraint fails (`kk_v1`.`orders`')) {
            // Use toast directly
            toast({
              variant: "destructive",
              description: "Cannot delete customer because they have orders linked to them",
              duration: 3000,
            });
            return;
          }
          throw new Error(data.detail || 'Failed to delete customer');
        }
        
        // Use toast directly
        toast({
          description: "Customer deleted successfully",
          duration: 3000,
        });

        setTimeout(() => {
          window.location.reload();
        }, 3000);

      } catch (error: any) {
        // Use toast directly
        toast({
          variant: "destructive",
          description: error.message || "An unexpected error occurred",
          duration: 3000,
        });
      }
    }
  }

