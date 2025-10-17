"use client"

import { useEffect, useState } from "react"
import { Pencil, Trash2, Plus, Search, Eye, ChevronUp, MoreHorizontal, Crown } from "lucide-react"
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
import { useIsMobile } from "@/hooks/use-mobile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Define customer types
type CustomerType = "Regular" | "Reseller" | "Agent"
type PaymentFrequency = "Daily" | "Weekly" | "Monthly"
type CustomerStatus = "Active" | "Pending" | "Inactive"

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
  is_admin?: number | boolean
}

export default function CustomerManagement() {
  // Remove the destructuring
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const isMobile = useIsMobile()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Initialize with empty array
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
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

  // Define columns with priority for responsive display
  const columns = [
    { key: "customer_id", header: "ID", priority: 3 },
    { key: "name", header: "Name", priority: 1 },
    { key: "email", header: "Email", priority: 3 },
    { key: "primary_mobile", header: "Phone", priority: 2 },
    { key: "written_address", header: "Address", priority: 3 },
    { key: "orders", header: "Orders", priority: 3 },
    { key: "actions", header: "Actions", priority: 1 },
  ]

  // Filter columns based on screen size
  const visibleColumns = isMobile 
    ? columns.filter(col => col.priority === 1 || col.priority === 2)
    : columns

  // Handle view customer details
  const handleViewCustomer = (customerId: number) => {
    const customer = customers.find(c => c.customer_id === customerId)
    if (customer) {
      setViewCustomer(customer)
      setIsViewDialogOpen(true)
    }
  }

  const handleEditCustomer = (customerId: number) => {
    const customer = customers.find((c) => c.customer_id === customerId)
    if (!customer) return
    setEditingCustomer(customer)
    setDialogMode("edit")
    setOpen(true)
  }

  const requestDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer)
    setConfirmDeleteOpen(true)
  }

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`http://localhost:8000/delete-customer/${customerToDelete.customer_id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.detail && data.detail.includes("foreign key constraint fails (`kk_v1`.`orders`")) {
          toast({
            variant: "destructive",
            description: "Cannot delete customer because they have orders linked to them",
            duration: 3000,
          })
          return
        }
        throw new Error(data.detail || "Failed to delete customer")
      }

      toast({
        description: "Customer deleted successfully",
        duration: 3000,
      })

      await refreshCustomers()
      setConfirmDeleteOpen(false)
      setCustomerToDelete(null)
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to delete customer",
        duration: 3000,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Remove the throwing error function and update the Dialog component
  return (
    <AdminLayout activePage="customermgmt">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl font-semibold">All Customers</CardTitle>
              <Dialog
                open={open}
                onOpenChange={(value) => {
                  setOpen(value)
                  if (!value) {
                    setDialogMode("create")
                    setEditingCustomer(null)
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setDialogMode("create")
                      setEditingCustomer(null)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[900px]">
                  <DialogHeader>
                    <DialogTitle>
                      {dialogMode === "edit" ? "Edit Customer" : "Add New Customer"}
                    </DialogTitle>
                    <DialogDescription>
                      {dialogMode === "edit"
                        ? "Update the details of the customer below."
                        : "Enter the details of the new customer below."}
                    </DialogDescription>
                  </DialogHeader>
                  <CustomerForm 
                    customer={
                      editingCustomer
                        ? {
                            customer_id: editingCustomer.customer_id,
                            name: editingCustomer.name,
                            referredBy: editingCustomer.referred_by,
                            primaryMobile: editingCustomer.primary_mobile,
                            alternativeMobile: editingCustomer.alternative_mobile ?? "",
                            email: editingCustomer.email ?? "",
                            recipientName: editingCustomer.recipient_name,
                            paymentFrequency: editingCustomer.payment_frequency ?? "Daily",
                            addressType: editingCustomer.address_type ?? "Home",
                            houseApartmentNo: editingCustomer.house_apartment_no ?? "",
                            writtenAddress: editingCustomer.written_address,
                            city: editingCustomer.city,
                            pinCode: editingCustomer.pin_code,
                            latitude: editingCustomer.latitude,
                            longitude: editingCustomer.longitude,
                            routeAssignment: editingCustomer.route_assignment ?? "",
                          }
                        : null
                    }
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
                        let response: Response
                        let responseData: any

                        if (dialogMode === "edit" && editingCustomer) {
                          response = await fetch(
                            `http://localhost:8000/update-customer/${editingCustomer.customer_id}`,
                            {
                              method: "PUT",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(formattedData),
                            }
                          )
                          responseData = await response.json()
                        } else {
                          response = await fetch("http://localhost:8000/api/register", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(formattedData),
                          })
                          responseData = await response.json()
                        }

                        if (!response.ok) {
                          throw new Error(
                            responseData.detail ||
                              (dialogMode === "edit"
                                ? "Failed to update customer"
                                : "Failed to add customer"),
                          );
                        }
                        // Close dialog first
                        setOpen(false);
                        setDialogMode("create")
                        setEditingCustomer(null)
                        // Refresh customers
                        await refreshCustomers();
                        
                        // Show success toast - this is where we call it
                        toast({
                          description:
                            dialogMode === "edit"
                              ? "Customer updated successfully"
                              : "Customer added successfully",
                        });
                        
                        return { success: true, data: responseData };
                      } catch (error: any) {
                        // Show error toast
                        toast({
                          variant: "destructive",
                          description:
                            error.message ||
                            (dialogMode === "edit"
                              ? "Failed to update customer"
                              : "Failed to add customer"),
                        });
                        return {
                          success: false,
                          message:
                            error.message ||
                            (dialogMode === "edit"
                              ? "Failed to update customer"
                              : "Failed to add customer"),
                        };
                      }
                    }}
                    onCancel={() => {
                      setOpen(false)
                      setDialogMode("create")
                      setEditingCustomer(null)
                    }}
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
              <div className="flex flex-wrap gap-2">
                <Select
                  value={filters.orderCount}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, orderCount: value }))}
                >
                  <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[180px]'}`}>
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
                  className={`${isMobile ? 'w-full' : 'w-[200px]'}`}
                  autoComplete="new-address-filter" 
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table className="w-full customer-table">
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map((column) => (
                      <TableHead 
                        key={column.key}
                        className={`${column.key === 'customer_id' ? 'w-[100px] pl-4' : ''} 
                                   ${column.key === 'actions' ? 'text-center px-2 align-middle' : ''}
                                   ${isMobile ? 'text-xs' : 'text-sm'}`}
                      >
                        {column.key === 'actions' ? (
                          <div className="flex justify-center">Actions</div>
                        ) : column.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow key="loading-row">
                      <TableCell colSpan={visibleColumns.length} className="text-center py-6">
                        <div className="flex justify-center items-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow key="empty-row">
                      <TableCell colSpan={visibleColumns.length} className="text-center py-6 text-muted-foreground">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    // Update the TableRow and TableCell in the mapping section
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.customer_id} className="h-14">
                        {visibleColumns.map((column) => {
                          if (column.key === "actions") {
                            return (
                              <TableCell key="actions" className={`text-center pr-4 ${isMobile ? 'text-xs' : ''}`}>
                                {isMobile ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleViewCustomer(customer.customer_id)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleEditCustomer(customer.customer_id)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => requestDeleteCustomer(customer)}>
                                        <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
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
                                      onClick={() => requestDeleteCustomer(customer)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            )
                          }
                          if (column.key === "customer_id") {
                            return (
                              <TableCell key={column.key} className={`font-medium pl-4 ${isMobile ? 'text-xs' : ''}`}>
                                {customer.customer_id}
                              </TableCell>
                            )
                          }
                          if (column.key === "name") {
                            const isAdmin = Boolean(customer.is_admin)
                            return (
                              <TableCell key={column.key} className={`${isMobile ? 'text-xs' : ''}`}>
                                <span className="inline-flex items-center gap-1 font-medium">
                                  {customer.name}
                                  {isAdmin && (
                                    <Crown
                                      className="h-4 w-4 text-amber-500"
                                      aria-label="Admin user"
                                    />
                                  )}
                                </span>
                              </TableCell>
                            )
                          }
                          if (column.key === "email") {
                            return (
                              <TableCell key={column.key} className={`${isMobile ? 'text-xs' : ''}`}>
                                {customer.email || '-'}
                              </TableCell>
                            )
                          }
                          if (column.key === "primary_mobile") {
                            return (
                              <TableCell key={column.key} className={`${isMobile ? 'text-xs' : ''}`}>
                                <span className="font-medium">+91 {customer.primary_mobile}</span>
                              </TableCell>
                            )
                          }
                          if (column.key === "written_address") {
                            return (
                              <TableCell key={column.key} className={`${isMobile ? 'text-xs truncate max-w-[120px]' : ''}`}>
                                {customer.written_address}
                              </TableCell>
                            )
                          }
                          if (column.key === "orders") {
                            return (
                              <TableCell key={column.key} className={`text-center ${isMobile ? 'text-xs' : ''}`}>
                                -
                              </TableCell>
                            )
                          }
                          return null
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[calc(100vh-8rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>View detailed information about this customer.</DialogDescription>
          </DialogHeader>
          {viewCustomer && (
            <div className="space-y-6">
              {/* Mobile-friendly customer details view */}
              {isMobile ? (
                <div className="space-y-4">
                  {Object.entries(viewCustomer).map(([key, value]) => (
                    <div key={key} className="border-b pb-2">
                      <div className="font-medium text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                      <div className="text-sm">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(viewCustomer).map(([key, value]) => (
                    <div key={key} className="border-b pb-2">
                      <div className="font-medium text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                      <div className="text-sm">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setCustomerToDelete(null)
          }
          setConfirmDeleteOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer</AlertDialogTitle>
            <AlertDialogDescription>
              {customerToDelete
                ? `Are you sure you want to remove ${customerToDelete.name}? This action cannot be undone.`
                : "Are you sure you want to delete this customer? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (!isDeleting) {
                  setCustomerToDelete(null)
                }
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}
