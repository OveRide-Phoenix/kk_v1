"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Eye,
  CreditCard,
  Wallet,
  CalendarIcon,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { http } from "@/lib/http";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  line_total: number;
};

type OrderRecord = {
  order_id: number;
  created_at: string | null;
  status: string;
  payment_method: string;
  total_price: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  address: {
    address_id: number | null;
    line1: string | null;
    city: string | null;
    pin_code: string | null;
  };
  item_count: number;
  items: OrderItem[];
};

type OrdersApiResponse = {
  orders: OrderRecord[];
  total: number;
};

type InvoiceResponse = {
  invoice_number: string;
  issued_at: string;
  due_date: string | null;
  order: {
    order_id: number;
    created_at: string | null;
    status: string;
    total_price: number;
    payment_method: string;
  };
  customer: {
    customer_id: number;
    name: string;
    phone: string | null;
    email: string | null;
  };
  address: {
    address_id: number | null;
    line1: string | null;
    city: string | null;
    pin_code: string | null;
  };
  items: OrderItem[];
  subtotal: number;
  total: number;
};

type Filters = {
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  customerQuery: string;
  productQuery: string;
};

const PAGE_SIZE = 10;

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in progress" },
  { label: "Delivered", value: "delivered" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  try {
    const date = new Date(value);
    return format(date, "dd MMM yyyy, hh:mm a");
  } catch {
    return value;
  }
};

const statusBadgeClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "delivered" || normalized === "completed") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (normalized === "pending") {
    return "bg-amber-50 text-amber-800 border border-amber-200";
  }
  if (normalized === "in progress" || normalized === "processing") {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return "bg-rose-50 text-rose-700 border border-rose-200";
  }
  return "bg-slate-50 text-slate-700 border border-slate-200";
};

const formatOrderId = (raw: number) => `ORD-${String(raw).padStart(5, "0")}`;

const buildInvoiceHtml = (invoice: InvoiceResponse) => {
  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${item.name}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(item.price)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(item.line_total)}</td>
      </tr>`
    )
    .join("");

  const addressLines: string[] = [];
  if (invoice.address.line1) addressLines.push(invoice.address.line1);
  if (invoice.address.city) addressLines.push(invoice.address.city);
  if (invoice.address.pin_code) addressLines.push(invoice.address.pin_code);

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #1f2933; }
        h1 { margin-bottom: 0; }
        .meta { margin-top: 0; color: #64748b; }
        table { border-collapse: collapse; width: 100%; margin-top: 24px; }
        .summary { margin-top: 16px; text-align: right; }
      </style>
    </head>
    <body>
      <h1>Invoice ${invoice.invoice_number}</h1>
      <p class="meta">Issued: ${formatDateTime(invoice.issued_at)}</p>

      <section>
        <h2>Customer</h2>
        <p>
          ${invoice.customer.name}<br/>
          ${invoice.customer.phone ?? ""}<br/>
          ${invoice.customer.email ?? ""}
        </p>
      </section>

      <section>
        <h2>Delivery Address</h2>
        <p>${addressLines.length ? addressLines.join("<br/>") : "—"}</p>
      </section>

      <section>
        <h2>Order Items</h2>
        <table>
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:center;">Qty</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">Price</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">Line Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="summary">
          <p><strong>Subtotal:</strong> ${formatCurrency(invoice.subtotal)}</p>
          <p><strong>Total:</strong> ${formatCurrency(invoice.total)}</p>
        </div>
      </section>
    </body>
  </html>`;
};

const normalizePaymentMethod = (method: string) => {
  const normalized = method.trim().toLowerCase();
  if (!normalized) return "Unknown";
  if (normalized === "upi") return "UPI";
  return normalized.replace(/(^|\s)\S/g, (char) => char.toUpperCase());
};

const paymentMethodIcon = (method: string) => {
  const normalized = method.trim().toLowerCase();
  if (normalized.includes("card") || normalized.includes("upi")) {
    return <CreditCard className="h-3.5 w-3.5" />;
  }
  return <Wallet className="h-3.5 w-3.5" />;
};

const defaultFilters = (): Filters => {
  return {
    startDate: null,
    endDate: null,
    status: "all",
    customerQuery: "",
    productQuery: "",
  };
};

export default function OrderHistoryPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(0);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceResponse | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));
    if (filters.startDate) {
      params.set("start_date", format(filters.startDate, "yyyy-MM-dd"));
    }
    if (filters.endDate) {
      params.set("end_date", format(filters.endDate, "yyyy-MM-dd"));
    }
    if (filters.status !== "all") {
      params.set("status", filters.status);
    }
    if (filters.customerQuery.trim()) {
      params.set("customer", filters.customerQuery.trim());
    }
    if (filters.productQuery.trim()) {
      params.set("product", filters.productQuery.trim());
    }
    return params.toString();
  }, [filters, page]);

  const statusUpdateOptions = statusOptions.filter((option) => option.value !== "all");

  const fetchOrders = useCallback(async () => {
    setError(null);
    if (initialLoad) {
      setLoading(true);
    } else {
      setIsFetching(true);
    }
    try {
      const res = await http.get(`/api/admin/orders/history?${queryString}`);
      if (!res.ok) {
        throw new Error("Failed to load order history");
      }
      const data = (await res.json()) as OrdersApiResponse;
      setOrders(data.orders);
      setTotalOrders(data.total);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error loading order history.");
      }
    } finally {
      if (initialLoad) {
        setLoading(false);
      }
      setIsFetching(false);
      setInitialLoad(false);
    }
  }, [initialLoad, queryString]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFilterChange = <Key extends keyof Filters>(
    key: Key,
    value: Filters[Key],
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters());
    setDateRange(undefined);
    setPage(0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await http.get(`/api/admin/orders/history?${queryString}&export=csv`);
      if (!res.ok) {
        throw new Error("Failed to export order history");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `order-history-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleStatusUpdate = async (orderId: number, nextStatus: string) => {
    const trimmedStatus = nextStatus.trim();
    if (!trimmedStatus) return;

    const targetOrder = orders.find((order) => order.order_id === orderId);
    if (targetOrder && targetOrder.status.toLowerCase() === trimmedStatus.toLowerCase()) {
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      const res = await http.post(`/api/admin/orders/${orderId}/status`, {
        status: trimmedStatus,
      });
      if (!res.ok) {
        const message =
          res.status === 404
            ? "Order not found. It may have been removed."
            : "Failed to update order status.";
        throw new Error(message);
      }
      const body = (await res.json()) as { order_id: number; status: string };
      const updatedStatus = body.status ?? trimmedStatus;
      setOrders((prev) =>
        prev.map((order) =>
          order.order_id === orderId ? { ...order, status: updatedStatus } : order,
        ),
      );
      setSelectedOrder((prev) =>
        prev && prev.order_id === orderId ? { ...prev, status: updatedStatus } : prev,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error updating status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const loadInvoice = async (orderId: number) => {
    setInvoiceLoading(true);
    setInvoiceData(null);
    setInvoiceError(null);
    try {
      const res = await http.get(`/api/admin/orders/${orderId}/invoice`);
      if (!res.ok) {
        throw new Error("Unable to load invoice data");
      }
      const data = (await res.json()) as InvoiceResponse;
      setInvoiceData(data);
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Unexpected error loading invoice.");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleViewOrder = (order: OrderRecord) => {
    setSelectedOrder(order);
    loadInvoice(order.order_id);
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
    setInvoiceData(null);
    setInvoiceError(null);
  };

  const handleDownloadInvoice = () => {
    if (!invoiceData) return;
    const html = buildInvoiceHtml(invoiceData);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${invoiceData.invoice_number}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalOrders / PAGE_SIZE);
  const hasNextPage = page + 1 < totalPages;
  const hasPrevPage = page > 0;

  const filtersApplied =
    filters.status !== "all" ||
    filters.customerQuery.trim().length > 0 ||
    filters.productQuery.trim().length > 0 ||
    filters.startDate !== null ||
    filters.endDate !== null;

  return (
    <AdminLayout activePage="orders">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                Review, filter, and export past customer orders. Generate printable invoices with a single click.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleResetFilters} disabled={!filtersApplied}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleExport} disabled={exporting}>
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="space-y-2 lg:col-span-2">
                <span className="block text-sm font-medium text-muted-foreground">Date range</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, "dd MMM yyyy")} – ${format(dateRange.to, "dd MMM yyyy")}`
                        ) : (
                          format(dateRange.from, "dd MMM yyyy")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={dateRange}
                      defaultMonth={dateRange?.from ?? new Date()}
                      onSelect={(range) => {
                        setDateRange(range ?? undefined);
                        handleFilterChange("startDate", range?.from ?? null);
                        handleFilterChange("endDate", range?.to ?? null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <span className="block text-sm font-medium text-muted-foreground">Delivery Status</span>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="block text-sm font-medium text-muted-foreground">Product</span>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Filter by product name"
                    value={filters.productQuery}
                    onChange={(event) => handleFilterChange("productQuery", event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <span className="block text-sm font-medium text-muted-foreground">Customer / Phone</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search customer or phone"
                    value={filters.customerQuery}
                    onChange={(event) => handleFilterChange("customerQuery", event.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Order Records</CardTitle>
            <CardDescription>
              Showing {orders.length} of {totalOrders} orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : loading ? (
              initialLoad ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )
            ) : orders.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No orders found for the selected filters.
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                {isFetching && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <TooltipProvider>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Placed</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="w-[90px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">
                              {formatOrderId(order.order_id)}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {paymentMethodIcon(order.payment_method)}
                              {normalizePaymentMethod(order.payment_method)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(order.created_at)}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-medium text-foreground">
                                {order.customer_name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{order.customer_phone ?? "No phone"}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{order.item_count} items</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize px-2.5 py-1 text-xs font-medium rounded-full",
                              statusBadgeClass(order.status),
                            )}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.total_price)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewOrder(order)}
                              aria-label={`View order ${formatOrderId(order.order_id)}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Update status for ${formatOrderId(order.order_id)}`}
                                  disabled={updatingOrderId === order.order_id}
                                >
                                  {updatingOrderId === order.order_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Update status</DropdownMenuLabel>
                                {statusUpdateOptions.map((option) => {
                                  const isActive =
                                    order.status.toLowerCase() === option.label.toLowerCase();
                                  return (
                                    <DropdownMenuItem
                                      key={option.value}
                                      disabled={isActive || updatingOrderId === order.order_id}
                                      onClick={() => handleStatusUpdate(order.order_id, option.label)}
                                    >
                                      <span className="flex w-full items-center justify-between">
                                        {option.label}
                                        {isActive && <Check className="h-3.5 w-3.5" />}
                                      </span>
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {Math.min(page + 1, Math.max(totalPages, 1))} of {Math.max(totalPages, 1)}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((prev) => prev - 1)}
                  disabled={!hasPrevPage}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!hasNextPage}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>

      <Dialog open={selectedOrder != null} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder ? `Order ${formatOrderId(selectedOrder.order_id)}` : "Order details"}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">Customer</p>
                  <p>{selectedOrder.customer_name}</p>
                  <p className="text-muted-foreground">{selectedOrder.customer_phone ?? "—"}</p>
                  {invoiceData?.customer.email && (
                    <p className="text-muted-foreground">{invoiceData.customer.email}</p>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">Placed</p>
                  <p>{formatDateTime(selectedOrder.created_at)}</p>
                  <p className="font-semibold text-foreground">Status</p>
                  <Badge className={cn("capitalize", statusBadgeClass(selectedOrder.status))}>
                    {selectedOrder.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Items</h4>
                  <span className="text-sm text-muted-foreground">
                    Total: {formatCurrency(selectedOrder.total_price)}
                  </span>
                </div>
                <ScrollArea className="max-h-72 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item, index) => (
                        <TableRow key={`${selectedOrder.order_id}-${index}`}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.line_total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <Separator />

              {invoiceLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : invoiceError ? (
                <p className="text-sm text-destructive">{invoiceError}</p>
              ) : invoiceData ? (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-foreground">Invoice</p>
                  <p className="text-muted-foreground">
                    Number: {invoiceData.invoice_number} · Issued: {formatDateTime(invoiceData.issued_at)}
                  </p>
                  <p className="text-muted-foreground">
                    Delivery address:{" "}
                    {invoiceData.address.line1
                      ? [invoiceData.address.line1, invoiceData.address.city, invoiceData.address.pin_code]
                          .filter(Boolean)
                          .join(", ")
                      : "—"}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Close
            </Button>
            <Button onClick={handleDownloadInvoice} disabled={!invoiceData}>
              <FileText className="mr-2 h-4 w-4" />
              Download Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
