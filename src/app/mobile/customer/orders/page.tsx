"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format as formatDate, isSameDay, isSameMonth, subDays } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileText,
  Filter,
  Loader2,
  Package,
  SlidersHorizontal,
} from "lucide-react";
import { MobileCustomerBottomNav } from "@/components/mobile/customer/bottom-nav";
import { mobilePalette, outfit, playfairMobile } from "@/components/mobile/customer/theme";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";
import { normalizeOrderStatusKey, orderStatusLabel } from "@/lib/order-status";

type OrderItem = {
  item_name: string;
  quantity: number;
  price: number;
};

type OrderSummary = {
  order_id: number;
  created_at: string | null;
  total_price: number;
  status: string;
  payment_status?: string;
  payment_method: string;
  order_type?: string | null;
  address?: {
    label: string;
    line: string;
    city: string;
    pin_code: string;
  };
  items: OrderItem[];
};

type DateRange = "today" | "last7" | "thisMonth" | "custom" | "all";
type SortKey = "newest" | "oldest" | "amountHigh" | "amountLow";
type OrderTypeFilter = "all" | "subscription" | "one_time";

type FilterState = {
  dateRange: DateRange;
  customDate: string;
  status: string;
  orderType: OrderTypeFilter;
  sort: SortKey;
};

const defaultFilters: FilterState = {
  dateRange: "today",
  customDate: "",
  status: "all",
  orderType: "all",
  sort: "newest",
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const normalizeType = (value: string | null | undefined): "subscription" | "one_time" => {
  const normalized = (value ?? "one_time").toLowerCase().replace("-", "_");
  return normalized === "subscription" ? "subscription" : "one_time";
};

const asTimestamp = (order: OrderSummary) => {
  if (!order.created_at) return 0;
  const parsed = new Date(order.created_at).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

function matchesDateRange(order: OrderSummary, filters: FilterState) {
  if (!order.created_at) return false;
  const orderDate = new Date(order.created_at);
  if (Number.isNaN(orderDate.getTime())) return false;
  const now = new Date();

  if (filters.dateRange === "today") return isSameDay(orderDate, now);
  if (filters.dateRange === "last7") return orderDate >= subDays(now, 6);
  if (filters.dateRange === "thisMonth") return isSameMonth(orderDate, now);
  if (filters.dateRange === "custom") {
    if (!filters.customDate) return false;
    const picked = new Date(filters.customDate);
    if (Number.isNaN(picked.getTime())) return false;
    return isSameDay(orderDate, picked);
  }
  return true;
}

export default function MobileCustomerOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<FilterState>(defaultFilters);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const handleBack = () => {
    const canGoBack =
      typeof window !== "undefined" &&
      (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0 ||
        window.history.length > 1);
    if (canGoBack) {
      router.back();
      return;
    }
    router.push("/mobile/customer/home");
  };

  useHydrateAuthUser();

  useEffect(() => {
    const customerId = user?.customer_id;
    if (!customerId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Same source endpoint used by desktop /customer/account order history
        const response = await http.get(`/api/customers/${customerId}/orders`);
        if (!response.ok) throw new Error("Unable to load order history");
        const data = (await response.json()) as OrderSummary[];
        if (cancelled) return;
        setOrders(
          data.map((order) => ({
            ...order,
            order_type: normalizeType(order.order_type),
            items: Array.isArray(order.items) ? order.items : [],
          })),
        );
      } catch {
        if (!cancelled) {
          setOrders([]);
          setError("Unable to load your order history right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.customer_id]);

  useEffect(() => {
    if (deepLinkHandled) return;
    const orderIdParam = searchParams.get("orderId");
    if (!orderIdParam) {
      setDeepLinkHandled(true);
      return;
    }
    if (loading) return;
    const orderId = Number(orderIdParam);
    if (!Number.isFinite(orderId)) {
      setDeepLinkHandled(true);
      return;
    }
    const target = orders.find((order) => order.order_id === orderId);
    if (target) {
      setFilterOpen(false);
      setSelectedOrder(target);
    }
    setDeepLinkHandled(true);
  }, [deepLinkHandled, loading, orders, searchParams]);

  const statusOptions = useMemo(() => {
    const options = new Set<string>();
    orders.forEach((order) => {
      const value = orderStatusLabel(order.status);
      if (value) options.add(value);
    });
    return ["all", ...Array.from(options)];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let next = orders.filter((order) => matchesDateRange(order, filters));

    if (filters.status !== "all") {
      next = next.filter(
        (order) => orderStatusLabel(order.status).toLowerCase() === filters.status.toLowerCase(),
      );
    }

    if (filters.orderType !== "all") {
      next = next.filter((order) => normalizeType(order.order_type) === filters.orderType);
    }

    next = [...next].sort((a, b) => {
      if (filters.sort === "newest") return asTimestamp(b) - asTimestamp(a);
      if (filters.sort === "oldest") return asTimestamp(a) - asTimestamp(b);
      if (filters.sort === "amountHigh") return (b.total_price ?? 0) - (a.total_price ?? 0);
      return (a.total_price ?? 0) - (b.total_price ?? 0);
    });

    return next;
  }, [orders, filters]);

  const totalItems = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      return acc + order.items.reduce((lineAcc, item) => lineAcc + (item.quantity ?? 0), 0);
    }, 0);
  }, [filteredOrders]);

  const dateFilterLabel = useMemo(() => {
    if (filters.dateRange === "today") return "Today's Orders";
    if (filters.dateRange === "last7") return "Last 7 Days";
    if (filters.dateRange === "thisMonth") return "This Month";
    if (filters.dateRange === "custom")
      return filters.customDate
        ? formatDate(new Date(filters.customDate), "dd MMM yyyy")
        : "Custom Date";
    return "All Orders";
  }, [filters.dateRange, filters.customDate]);

  const applyDraftFilters = () => {
    setFilters(draftFilters);
    setFilterOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftFilters(defaultFilters);
  };

  const openFilterSheet = () => {
    setSelectedOrder(null);
    setDraftFilters(filters);
    setFilterOpen(true);
  };

  const openOrderDetails = (order: OrderSummary) => {
    setFilterOpen(false);
    setSelectedOrder(order);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
  };

  const handleGenerateBill = () => {
    if (!selectedOrder || typeof window === "undefined") return;
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;

    const generatedAt = formatDate(new Date(), "dd MMM yyyy • hh:mm a");
    const orderDate = selectedOrder.created_at
      ? formatDate(new Date(selectedOrder.created_at), "dd MMM yyyy • hh:mm a")
      : "N/A";

    const itemsRows = selectedOrder.items
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.item_name}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${currency(item.price)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${currency(item.price * item.quantity)}</td>
          </tr>`,
      )
      .join("");

    const addressLine = selectedOrder.address
      ? [selectedOrder.address.line, selectedOrder.address.city, selectedOrder.address.pin_code]
          .filter(Boolean)
          .join(", ")
      : "Address details unavailable";

    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${selectedOrder.order_id} • Kuteera Kitchen</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #2c1810; }
            h1 { margin-bottom: 0; }
            .meta { margin-top: 8px; font-size: 13px; color: #5f4339; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            .footer { margin-top: 28px; font-size: 12px; color: #8d6e63; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Kuteera Kitchen</h1>
          <p class="meta">Order #${selectedOrder.order_id}</p>
          <p class="meta">Order Date: ${orderDate}</p>
          <p class="meta">Generated: ${generatedAt}</p>
          <p class="meta">Payment: ${selectedOrder.payment_method}</p>
          <p class="meta">Address: ${addressLine}</p>
          <table>
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Qty</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Rate</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <h2 style="text-align:right;margin-top:16px;">Total: ${currency(selectedOrder.total_price)}</h2>
          <div class="footer">Thank you for dining with Kuteera Kitchen.</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <main
      className={`${outfit.variable} ${playfairMobile.variable} min-h-screen w-full pb-28`}
      style={{ backgroundColor: mobilePalette.background }}
    >
      <div className="mx-auto w-full max-w-[448px]">
        <header className="sticky top-0 z-20 border-b border-[#8D4925]/10 bg-[rgba(253,250,241,0.95)] px-4 py-4 backdrop-blur-md">
          <div className="relative flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-full"
            >
              <ArrowLeft size={20} color="#8D4925" />
            </button>
            <h1
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold text-[#8D4925]"
              style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
            >
              Order History
            </h1>
            <div className="h-9 w-9" />
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() =>
                setFilters((prev) => ({ ...prev, dateRange: "today", customDate: "" }))
              }
              className={`h-10 shrink-0 rounded-lg px-4 text-sm font-semibold ${filters.dateRange === "today" ? "bg-[#8D4925] text-white" : "bg-[#8D4925]/10 text-[#8D4925]"}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() =>
                setFilters((prev) => ({ ...prev, dateRange: "last7", customDate: "" }))
              }
              className={`h-10 shrink-0 rounded-lg px-4 text-sm font-semibold ${filters.dateRange === "last7" ? "bg-[#8D4925] text-white" : "bg-[#8D4925]/10 text-[#8D4925]"}`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() =>
                setFilters((prev) => ({ ...prev, dateRange: "thisMonth", customDate: "" }))
              }
              className={`h-10 shrink-0 rounded-lg px-4 text-sm font-semibold ${filters.dateRange === "thisMonth" ? "bg-[#8D4925] text-white" : "bg-[#8D4925]/10 text-[#8D4925]"}`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={openFilterSheet}
              className="h-10 shrink-0 rounded-lg bg-[#8D4925]/10 px-4 text-sm font-semibold text-[#8D4925]"
            >
              Custom
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between py-2">
            <span className="text-xs font-semibold uppercase tracking-[1px] text-[#8D4925]/60">
              {dateFilterLabel}
            </span>
            <button
              type="button"
              onClick={openFilterSheet}
              className="inline-flex items-center gap-1 rounded-lg border border-[#8D4925]/20 bg-[#8D4925]/5 px-3 py-1.5 text-sm font-bold text-[#8D4925]"
            >
              <SlidersHorizontal size={16} />
              Sort & Filter
            </button>
          </div>
        </header>

        <section className="space-y-4 px-4 py-4">
          {loading ? (
            <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-[#475569]">
              <Loader2 className="h-4 w-4 animate-spin" /> Fetching order history...
            </div>
          ) : error ? (
            <p className="rounded-lg bg-white px-4 py-3 text-sm text-red-600">{error}</p>
          ) : filteredOrders.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#8D4925]/8">
                <Package size={30} color="#8D4925" />
              </div>
              <h2
                className="text-2xl font-bold text-[#1B4332]"
                style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
              >
                No orders for this filter
              </h2>
              <p className="mx-auto mt-2 max-w-[280px] text-sm text-[#64748b]">
                Try changing date range, status, or order type to see your meals.
              </p>
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, dateRange: "all" }))}
                className="mt-6 w-full max-w-xs rounded-xl bg-[#8D4925] px-6 py-3 text-sm font-semibold text-white"
              >
                View All Orders
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#8D4925]/60">
                {filteredOrders.length} orders • {totalItems} items
              </p>
              {filteredOrders.map((order) => {
                const createdAt = order.created_at ? new Date(order.created_at) : null;
                const dateText =
                  createdAt && !Number.isNaN(createdAt.getTime())
                    ? formatDate(createdAt, "dd MMM yyyy • hh:mm a")
                    : "Scheduled";
                const typeText =
                  normalizeType(order.order_type) === "subscription" ? "Subscription" : "One-time";
                const itemsLabel = order.items
                  .slice(0, 2)
                  .map((item) => `${item.item_name} ×${item.quantity}`)
                  .join(" • ");
                const statusKey = normalizeOrderStatusKey(order.status);
                const delivered = statusKey.includes("deliver");
                const dispatched = statusKey === "dispatched";
                const confirmed = statusKey === "confirmed";

                return (
                  <article
                    key={order.order_id}
                    className="rounded-lg border border-[#8D4925]/5 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-[#8D4925]/60">
                          Order ID
                        </span>
                        <h3 className="text-lg font-bold text-[#8D4925]">#{order.order_id}</h3>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                          delivered
                            ? "bg-[#1B4332] text-white"
                            : dispatched
                              ? "bg-[#1B4332]/10 text-[#1B4332]"
                              : confirmed
                                ? "bg-[#8D4925]/10 text-[#8D4925]"
                                : "bg-[#8D4925]/10 text-[#8D4925]"
                        }`}
                      >
                        {delivered ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
                        {orderStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="mb-4 space-y-2">
                      <p className="text-sm font-medium text-[#64748b]">
                        {typeText} • {dateText}
                      </p>
                      <p className="text-sm font-semibold text-[#1e293b]">
                        {itemsLabel || "Meal order"}
                      </p>
                      <p className="text-xs italic text-[#94a3b8]">
                        {order.address
                          ? `Deliver to ${[order.address.line, order.address.city, order.address.pin_code].filter(Boolean).join(", ")}`
                          : "Address details unavailable"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-xs text-[#64748b]">Total Amount</span>
                        <p className="text-lg font-bold text-[#0f172a]">
                          {currency(order.total_price)}
                        </p>
                        <p className="text-xs text-[#64748b]">{order.payment_method}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openOrderDetails(order)}
                        className="inline-flex items-center gap-1 text-sm font-bold text-[#8D4925]"
                      >
                        View Details
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </>
          )}
        </section>
      </div>

      {filterOpen ? (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/35"
            type="button"
            aria-label="Close filters"
            onClick={() => setFilterOpen(false)}
          />
          <section className="fixed bottom-0 left-1/2 z-50 w-full max-w-[448px] -translate-x-1/2 rounded-t-3xl bg-[#FDFAF1] px-5 pb-8 pt-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="mb-6 flex items-center justify-between">
              <h3
                className="text-xl font-bold text-[#1B4332]"
                style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
              >
                Filter & Sort
              </h3>
              <button
                type="button"
                onClick={resetDraftFilters}
                className="text-sm font-semibold text-[#8D4925]"
              >
                Reset
              </button>
            </div>

            <div className="mb-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Date Range
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "today", label: "Today" },
                  { key: "last7", label: "Last 7 Days" },
                  { key: "thisMonth", label: "This Month" },
                  { key: "all", label: "All Orders" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        dateRange: item.key as DateRange,
                        customDate: "",
                      }))
                    }
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${draftFilters.dateRange === item.key ? "border-[#8D4925] bg-[#8D4925]/10 text-[#8D4925]" : "border-slate-200 text-slate-600"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <label className="mb-1 block text-xs font-semibold text-slate-500">Pick Date</label>
                <input
                  type="date"
                  value={draftFilters.customDate}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      customDate: event.target.value,
                      dateRange: "custom",
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                />
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Order Status
              </p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setDraftFilters((prev) => ({ ...prev, status }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${draftFilters.status === status ? "border-[#8D4925] bg-[#8D4925]/10 text-[#8D4925]" : "border-slate-200 text-slate-600"}`}
                  >
                    {status === "all" ? "All" : status}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Order Type
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "subscription", label: "Subscription" },
                  { key: "one_time", label: "One-time" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        orderType: item.key as OrderTypeFilter,
                      }))
                    }
                    className={`rounded-lg border px-2 py-2 text-xs font-medium ${draftFilters.orderType === item.key ? "border-[#8D4925] bg-[#8D4925]/10 text-[#8D4925]" : "border-slate-200 text-slate-600"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Sort</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "newest", label: "Newest first" },
                  { key: "oldest", label: "Oldest first" },
                  { key: "amountHigh", label: "Amount high-low" },
                  { key: "amountLow", label: "Amount low-high" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setDraftFilters((prev) => ({ ...prev, sort: item.key as SortKey }))
                    }
                    className={`rounded-lg border px-2 py-2 text-xs font-medium ${draftFilters.sort === item.key ? "border-[#1B4332] bg-[#1B4332]/10 text-[#1B4332]" : "border-slate-200 text-slate-600"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={applyDraftFilters}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] py-3 text-sm font-bold text-white"
            >
              <Filter size={16} />
              Apply Filters
            </button>
          </section>
        </>
      ) : null}

      {selectedOrder ? (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/35"
            type="button"
            aria-label="Close details"
            onClick={closeOrderDetails}
          />
          <section className="fixed bottom-0 left-1/2 z-50 w-full max-w-[448px] -translate-x-1/2 rounded-t-3xl bg-[#FDFAF1] px-5 pb-8 pt-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#8D4925]/60">
                  Order ID
                </p>
                <h3
                  className="text-xl font-bold text-[#8D4925]"
                  style={{ fontFamily: "var(--font-mobile-playfair), serif" }}
                >
                  #{selectedOrder.order_id}
                </h3>
              </div>
              <span className="rounded-full bg-[#8D4925]/10 px-2.5 py-1 text-xs font-bold text-[#8D4925]">
                {orderStatusLabel(selectedOrder.status)}
              </span>
            </div>

            <div className="space-y-3 rounded-xl border border-[#8D4925]/10 bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">Date</span>
                <span className="font-semibold text-[#1e293b]">
                  {selectedOrder.created_at
                    ? formatDate(new Date(selectedOrder.created_at), "dd MMM yyyy • hh:mm a")
                    : "Scheduled"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">Order type</span>
                <span className="font-semibold text-[#1e293b]">
                  {normalizeType(selectedOrder.order_type) === "subscription"
                    ? "Subscription"
                    : "One-time"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748b]">Payment</span>
                <span className="font-semibold text-[#1e293b]">{selectedOrder.payment_method}</span>
              </div>
              <div className="text-sm">
                <p className="text-[#64748b]">Delivery address</p>
                <p className="mt-1 font-semibold text-[#1e293b]">
                  {selectedOrder.address
                    ? [
                        selectedOrder.address.line,
                        selectedOrder.address.city,
                        selectedOrder.address.pin_code,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : "Address details unavailable"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#8D4925]/10 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8D4925]/70">
                Items
              </p>
              <div className="space-y-2">
                {selectedOrder.items.length ? (
                  selectedOrder.items.map((item, index) => (
                    <div
                      key={`${selectedOrder.order_id}-${item.item_name}-${index}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[#1e293b]">
                        {item.item_name} × {item.quantity}
                      </span>
                      <span className="font-semibold text-[#1e293b]">
                        {currency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#64748b]">No line items available.</p>
                )}
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748b]">Total</span>
                  <span className="text-lg font-bold text-[#0f172a]">
                    {currency(selectedOrder.total_price)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleGenerateBill}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8D4925] py-3 text-sm font-bold text-white"
              >
                <FileText size={16} />
                Generate Bill
              </button>
              <button
                type="button"
                onClick={closeOrderDetails}
                className="rounded-xl bg-[#1B4332] py-3 text-sm font-bold text-white"
              >
                Close
              </button>
            </div>
          </section>
        </>
      ) : null}

      <MobileCustomerBottomNav active="orders" />
    </main>
  );
}
