"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { http } from "@/lib/http";
import { Pencil, Trash2, Plus, Search, Eye, MoreHorizontal, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/admin-layout";
import { CustomerForm } from "./customer-form";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const normaliseRoles = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isInteger(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item)).filter((item) => Number.isInteger(item));
      }
    } catch {
      return [];
    }
  }
  return [];
};

type PaymentFrequency = "Daily" | "Weekly" | "Monthly";
type AddressType = "Home" | "Work" | "Other";

// Update the Customer interface to match the API response
interface Customer {
  customer_id: number;
  referred_by: string | null;
  alternative_mobile: string | null;
  name: string;
  primary_mobile: string;
  email: string;
  date_of_birth: string | null;
  written_address: string;
  // Add other fields from your API response
  address_id: number;
  house_apartment_no: string | null;
  city: string;
  pin_code: string;
  latitude: number;
  longitude: number;
  address_type: string | null;
  route_assignment: string | null;
  route_id: number | null;
  route_name?: string | null;
  route_code?: string | null;
  recipient_name: string;
  payment_frequency: string | null;
  completed_orders: number;
  pending_orders: number;
  is_admin?: number | boolean;
  roles?: number[] | null;
  role_codes?: string[] | null;
  admin_is_active?: boolean;
}

interface DeliveryRouteOption {
  route_id: number;
  route_code: string;
  route_name: string;
  notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

const PAGE_SIZE = 50;

const normalizePaymentFrequency = (value: string | null): PaymentFrequency => {
  return value === "Weekly" || value === "Monthly" ? value : "Daily";
};

const normalizeAddressType = (value: string | null): AddressType => {
  return value === "Work" || value === "Other" ? value : "Home";
};

export default function CustomerManagement() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleCatalog, setRoleCatalog] = useState<Record<number, string>>({});
  const [adminRoleId, setAdminRoleId] = useState<number | null>(null);
  const [deliveryRoutes, setDeliveryRoutes] = useState<DeliveryRouteOption[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      setDebouncedSearch(value);
    }, 400);
  };

  const refreshCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        city_code: adminCity,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const response = await http.get(`/api/admin/customers?${params}`);
      if (!response.ok) {
        setCustomers([]);
        setTotal(0);
        return;
      }
      const raw = await response.json();
      const rows: Customer[] = (Array.isArray(raw.customers) ? raw.customers : []).map(
        (customer: Customer & { roles?: unknown; role_codes?: unknown }) => {
          const roles = normaliseRoles(customer.roles);
          const roleCodes = Array.isArray(customer.role_codes)
            ? customer.role_codes.filter((code): code is string => typeof code === "string")
            : [];
          return { ...customer, roles, role_codes: roleCodes };
        },
      );
      setCustomers(rows);
      setTotal(typeof raw.total === "number" ? raw.total : 0);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [adminCity, debouncedSearch, page]);

  useEffect(() => {
    void refreshCustomers();
  }, [refreshCustomers]);

  useEffect(() => {
    const loadDeliveryRoutes = async () => {
      setRoutesLoading(true);
      try {
        const params = new URLSearchParams({ city_code: adminCity });
        const res = await http.get(`/api/logistics/routes?${params}`);
        const payload = (await res.json()) as DeliveryRouteOption[] | { detail?: string };
        if (!res.ok || !Array.isArray(payload)) {
          setDeliveryRoutes([]);
          return;
        }
        setDeliveryRoutes(
          payload
            .filter((route) => route.route_id !== null && route.route_id !== undefined)
            .map((route) => ({
              route_id: Number(route.route_id),
              route_code: route.route_code ?? "",
              route_name: route.route_name ?? "",
              notes: route.notes ?? null,
              is_active: route.is_active ?? true,
              sort_order: route.sort_order ?? 0,
            })),
        );
      } catch (error) {
        console.error("Failed to load delivery routes", error);
        setDeliveryRoutes([]);
      } finally {
        setRoutesLoading(false);
      }
    };

    void loadDeliveryRoutes();
  }, [adminCity]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const res = await fetch("/api/backend/api/rbac/roles");
        if (!res.ok) return;
        const payload = await res.json();
        if (!payload?.roles || !Array.isArray(payload.roles)) return;
        const catalog: Record<number, string> = {};
        let adminId: number | null = null;
        for (const role of payload.roles as Array<{
          role_id: number;
          name: string;
          code?: string;
        }>) {
          if (Number.isInteger(role.role_id)) {
            catalog[role.role_id] = role.name;
            if (role.code === "admin") {
              adminId = role.role_id;
            }
          }
        }
        setRoleCatalog(catalog);
        setAdminRoleId(adminId);
      } catch (error) {
        console.error("Failed to load roles", error);
      }
    };

    loadRoles();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Define columns with priority for responsive display
  const columns = [
    { key: "customer_id", header: "ID", priority: 3 },
    { key: "name", header: "Name", priority: 1 },
    { key: "email", header: "Email", priority: 3 },
    { key: "primary_mobile", header: "Phone", priority: 2 },
    { key: "written_address", header: "Address", priority: 3 },
    { key: "orders", header: "Orders", priority: 3 },
    { key: "actions", header: "Actions", priority: 1 },
  ];

  // Filter columns based on screen size
  const visibleColumns = isMobile
    ? columns.filter((col) => col.priority === 1 || col.priority === 2)
    : columns;

  // Handle view customer details
  const handleViewCustomer = (customerId: number) => {
    const customer = customers.find((c) => c.customer_id === customerId);
    if (customer) {
      setViewCustomer(customer);
      setIsViewDialogOpen(true);
    }
  };

  const handleEditCustomer = (customerId: number) => {
    const customer = customers.find((c) => c.customer_id === customerId);
    if (!customer) return;
    setEditingCustomer(customer);
    setDialogMode("edit");
    setOpen(true);
  };

  const requestDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      const response = await http.delete(`/delete-customer/${customerToDelete.customer_id}`);

      const data = await response.json();

      if (!response.ok) {
        if (data.detail && data.detail.includes("foreign key constraint fails (`kk_v1`.`orders`")) {
          toast({
            variant: "destructive",
            description: "Cannot delete customer because they have orders linked to them",
            duration: 3000,
          });
          return;
        }
        throw new Error(data.detail || "Failed to delete customer");
      }

      toast({
        description: "Customer deleted successfully",
        duration: 3000,
      });

      await refreshCustomers();
      setConfirmDeleteOpen(false);
      setCustomerToDelete(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to delete customer",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

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
                  setOpen(value);
                  if (!value) {
                    setDialogMode("create");
                    setEditingCustomer(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setDialogMode("create");
                      setEditingCustomer(null);
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
                            referredBy: editingCustomer.referred_by ?? "",
                            primaryMobile: editingCustomer.primary_mobile,
                            alternativeMobile: editingCustomer.alternative_mobile ?? "",
                            email: editingCustomer.email ?? "",
                            dateOfBirth: editingCustomer.date_of_birth ?? "",
                            recipientName: editingCustomer.recipient_name,
                            paymentFrequency: normalizePaymentFrequency(
                              editingCustomer.payment_frequency,
                            ),
                            addressType: normalizeAddressType(editingCustomer.address_type),
                            houseApartmentNo: editingCustomer.house_apartment_no ?? "",
                            writtenAddress: editingCustomer.written_address,
                            city: editingCustomer.city,
                            pinCode: editingCustomer.pin_code,
                            latitude: editingCustomer.latitude,
                            longitude: editingCustomer.longitude,
                            routeAssignment: editingCustomer.route_assignment ?? "",
                            routeId: editingCustomer.route_id ?? null,
                            routeName: editingCustomer.route_name ?? null,
                            routeCode: editingCustomer.route_code ?? null,
                          }
                        : null
                    }
                    deliveryRoutes={deliveryRoutes}
                    routesLoading={routesLoading}
                    adminCity={adminCity}
                    onSave={async (customerData) => {
                      try {
                        const formattedData = {
                          referred_by: customerData.referredBy || null,
                          primary_mobile: customerData.primaryMobile?.toString(),
                          alternative_mobile: customerData.alternativeMobile || null,
                          name: customerData.name?.trim(),
                          recipient_name: customerData.recipientName?.trim(),
                          date_of_birth: customerData.dateOfBirth || null,
                          payment_frequency: customerData.paymentFrequency || "Daily",
                          email: customerData.email || null,
                          house_apartment_no: customerData.houseApartmentNo?.trim() || null,
                          written_address: customerData.writtenAddress?.trim(),
                          city: customerData.city?.trim(),
                          pin_code: customerData.pinCode?.toString(),
                          latitude: customerData.latitude
                            ? parseFloat(String(customerData.latitude))
                            : 0,
                          longitude: customerData.longitude
                            ? parseFloat(String(customerData.longitude))
                            : 0,
                          address_type: customerData.addressType || "Home",
                          route_id: customerData.routeId ?? null,
                          is_default: true,
                        };
                        let response: Response;
                        let responseData: any;

                        if (dialogMode === "edit" && editingCustomer) {
                          response = await http.put(
                            `/update-customer/${editingCustomer.customer_id}`,
                            formattedData as Record<string, unknown>,
                          );
                          responseData = await response.json();
                        } else {
                          response = await http.post(
                            "/api/register",
                            formattedData as Record<string, unknown>,
                          );
                          responseData = await response.json();
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
                        setDialogMode("create");
                        setEditingCustomer(null);
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
                      setOpen(false);
                      setDialogMode("create");
                      setEditingCustomer(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="w-full customer-form-field pl-8 pr-3 py-2"
                  placeholder="Search by name, phone, email, or address..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
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
                        className={`${column.key === "customer_id" ? "w-[100px] pl-4" : ""} 
                                   ${column.key === "actions" ? "text-center px-2 align-middle" : ""}
                                   ${isMobile ? "text-xs" : "text-sm"}`}
                      >
                        {column.key === "actions" ? (
                          <div className="flex justify-center">Actions</div>
                        ) : (
                          column.header
                        )}
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
                  ) : customers.length === 0 ? (
                    <TableRow key="empty-row">
                      <TableCell
                        colSpan={visibleColumns.length}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    // Update the TableRow and TableCell in the mapping section
                    customers.map((customer) => (
                      <TableRow key={customer.customer_id} className="h-14">
                        {visibleColumns.map((column) => {
                          if (column.key === "actions") {
                            return (
                              <TableCell
                                key="actions"
                                className={`text-center pr-4 ${isMobile ? "text-xs" : ""}`}
                              >
                                {isMobile ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handleViewCustomer(customer.customer_id)}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleEditCustomer(customer.customer_id)}
                                      >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => requestDeleteCustomer(customer)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <div className="flex justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewCustomer(customer.customer_id)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditCustomer(customer.customer_id)}
                                    >
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
                            );
                          }
                          if (column.key === "customer_id") {
                            return (
                              <TableCell
                                key={column.key}
                                className={`font-medium pl-4 ${isMobile ? "text-xs" : ""}`}
                              >
                                {customer.customer_id}
                              </TableCell>
                            );
                          }
                          if (column.key === "name") {
                            const roles = Array.isArray(customer.roles) ? customer.roles : [];
                            const isAdmin = adminRoleId !== null && roles.includes(adminRoleId);
                            const roleLabels = roles
                              .map((roleId) => roleCatalog[roleId])
                              .filter((label): label is string => Boolean(label));
                            return (
                              <TableCell
                                key={column.key}
                                className={`${isMobile ? "text-xs" : ""}`}
                              >
                                <span className="inline-flex items-center gap-1 font-medium">
                                  {customer.name}
                                  {isAdmin && (
                                    <Crown
                                      className="h-4 w-4 text-amber-500"
                                      aria-label="Admin user"
                                    />
                                  )}
                                </span>
                                {roleLabels.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {roleLabels.map((label) => (
                                      <Badge key={label} variant="secondary" className="text-xs">
                                        {label}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                            );
                          }
                          if (column.key === "email") {
                            return (
                              <TableCell
                                key={column.key}
                                className={`${isMobile ? "text-xs" : ""}`}
                              >
                                {customer.email || "-"}
                              </TableCell>
                            );
                          }
                          if (column.key === "primary_mobile") {
                            return (
                              <TableCell
                                key={column.key}
                                className={`${isMobile ? "text-xs" : ""}`}
                              >
                                <span className="font-medium">+91 {customer.primary_mobile}</span>
                              </TableCell>
                            );
                          }
                          if (column.key === "written_address") {
                            return (
                              <TableCell
                                key={column.key}
                                className={`${isMobile ? "text-xs truncate max-w-[120px]" : ""}`}
                              >
                                {customer.written_address}
                              </TableCell>
                            );
                          }
                          if (column.key === "orders") {
                            const pending = customer.pending_orders ?? 0;
                            return (
                              <TableCell
                                key={column.key}
                                className={`text-center ${isMobile ? "text-xs" : ""}`}
                              >
                                <span className="relative inline-flex items-center justify-center text-base">
                                  {customer.completed_orders ?? 0}
                                  {pending > 0 && (
                                    <span className="absolute -top-2 -right-3 text-[0.55rem] font-medium text-muted-foreground">
                                      +{pending}
                                    </span>
                                  )}
                                </span>
                              </TableCell>
                            );
                          }
                          return null;
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
                <span>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}{" "}
                  customers
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0 || isLoading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1 || isLoading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
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
                      <div className="font-medium text-sm">
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </div>
                      <div className="text-sm">
                        {typeof value === "object" ? JSON.stringify(value) : String(value || "-")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(viewCustomer).map(([key, value]) => (
                    <div key={key} className="border-b pb-2">
                      <div className="font-medium text-sm">
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </div>
                      <div className="text-sm">
                        {typeof value === "object" ? JSON.stringify(value) : String(value || "-")}
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
            setCustomerToDelete(null);
          }
          setConfirmDeleteOpen(open);
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
                  setCustomerToDelete(null);
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
  );
}
