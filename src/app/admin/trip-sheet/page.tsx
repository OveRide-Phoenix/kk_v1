"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithPresets } from "@/components/ui/date-picker";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { http } from "@/lib/http";
import { normalizeOrderStatusKey, paymentStatusLabel } from "@/lib/order-status";
import { useAuthStore } from "@/store/store";
import { getSupportedMeals } from "@/config/cities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Info, Loader2, MapPin, Plus, Route, Truck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderStatusPill } from "@/components/order-status-pill";

type MealName = "Breakfast" | "Lunch" | "Dinner" | "Condiments";

type OrderItem = {
  item_name: string;
  meal_type: string | null;
  quantity: number;
  price: number;
  line_total: number;
};

type TripSheetOrder = {
  order_id: number;
  customer_id: number;
  customer_name: string | null;
  phone: string | null;
  email?: string | null;
  total_price: number;
  payment_method: string;
  paid: boolean;
  payment_status?: string;
  status: string;
  address: {
    address_id: number | null;
    label?: string | null;
    house_apartment_no?: string | null;
    written_address?: string | null;
    city?: string | null;
    pin_code?: string | null;
  };
  items: OrderItem[];
};

type TripSheetRoute = {
  route: string;
  total_orders: number;
  total_amount: number;
  orders: TripSheetOrder[];
};

type TripSheetResponse = {
  date: string;
  city_code: string;
  meal_type: string | null;
  routes: TripSheetRoute[];
  status_updates: number;
  generated_at: string;
};

type UnassignedCustomer = {
  order_id: number;
  customer_id: number;
  customer_name: string;
  phone: string | null;
  total_price: number;
  status: string;
  address: {
    address_id: number;
    house_apartment_no: string | null;
    written_address: string | null;
    city: string | null;
  };
};

type UnassignedResponse = {
  date: string;
  city_code: string;
  unassigned_count: number;
  customers: UnassignedCustomer[];
};

type DeliveryRouteConfig = {
  route_id?: number | null;
  route_code: string;
  route_name: string;
  notes?: string | null;
  is_active?: boolean;
  sort_order: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function TripSheetPage() {
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedMeal, setSelectedMeal] = useState<MealName>("Breakfast");
  // Per-meal generated sheet data
  const [mealSheets, setMealSheets] = useState<Partial<Record<MealName, TripSheetResponse | null>>>(
    {},
  );
  const [sheetLoading, setSheetLoading] = useState(false);
  // Per-meal unassigned customers
  const [unassigned, setUnassigned] = useState<Partial<Record<MealName, UnassignedResponse>>>({});
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [routePlannerLoading, setRoutePlannerLoading] = useState(false);
  const [routePlannerSaving, setRoutePlannerSaving] = useState(false);
  const [routePlannerError, setRoutePlannerError] = useState<string | null>(null);
  const [routeConfigs, setRouteConfigs] = useState<DeliveryRouteConfig[]>([]);
  // Route assignment dialog (from unassigned warning)
  const [assignTarget, setAssignTarget] = useState<UnassignedCustomer | null>(null);
  const [assignRouteId, setAssignRouteId] = useState<string>("");
  const [assignSaving, setAssignSaving] = useState(false);
  const { toast } = useToast();

  const isoDate = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);
  const dateLabel = useMemo(() => format(selectedDate, "PPP"), [selectedDate]);

  const visibleMeals = useMemo<MealName[]>(
    () =>
      getSupportedMeals(adminCity).map((m) => (m.charAt(0).toUpperCase() + m.slice(1)) as MealName),
    [adminCity],
  );

  // Reset selection to first valid meal if city changes
  useEffect(() => {
    if (visibleMeals.length && !visibleMeals.includes(selectedMeal)) {
      setSelectedMeal(visibleMeals[0]);
    }
  }, [selectedMeal, visibleMeals]);

  // Clear sheet + reload unassigned whenever date or city changes
  useEffect(() => {
    setMealSheets({});
    setError(null);
  }, [isoDate, adminCity]);

  const loadUnassigned = useCallback(
    async (meal: MealName) => {
      setUnassignedLoading(true);
      try {
        const params = new URLSearchParams({
          date: isoDate,
          city_code: adminCity,
          meal_type: meal,
        });
        const res = await http.get(`/api/logistics/trip-sheet/unassigned-routes?${params}`);
        const data = (await res.json()) as UnassignedResponse | { detail?: string };
        if (!res.ok) throw new Error("detail" in data && data.detail ? data.detail : "Failed");
        setUnassigned((prev) => ({ ...prev, [meal]: data as UnassignedResponse }));
      } catch {
        // non-fatal — just clear
        setUnassigned((prev) => ({ ...prev, [meal]: undefined }));
      } finally {
        setUnassignedLoading(false);
      }
    },
    [isoDate, adminCity],
  );

  // Load unassigned whenever meal or date changes
  useEffect(() => {
    void loadUnassigned(selectedMeal);
  }, [selectedMeal, loadUnassigned]);

  const loadSavedSheet = useCallback(
    async (meal: MealName) => {
      setSheetLoading(true);
      try {
        const params = new URLSearchParams({
          date: isoDate,
          city_code: adminCity,
          meal_type: meal,
        });
        const res = await http.get(`/api/logistics/trip-sheet?${params}`);
        if (res.status === 404) {
          setMealSheets((prev) => ({ ...prev, [meal]: null }));
          return;
        }
        const data = (await res.json()) as TripSheetResponse | { detail?: string };
        if (!res.ok) {
          throw new Error(
            "detail" in data && data.detail ? data.detail : "Failed to load trip sheet",
          );
        }
        setMealSheets((prev) => ({ ...prev, [meal]: data as TripSheetResponse }));
      } catch (err) {
        setMealSheets((prev) => ({ ...prev, [meal]: null }));
        setError(err instanceof Error ? err.message : "Unable to load trip sheet");
      } finally {
        setSheetLoading(false);
      }
    },
    [isoDate, adminCity],
  );

  useEffect(() => {
    if (mealSheets[selectedMeal] !== undefined) return;
    setError(null);
    void loadSavedSheet(selectedMeal);
  }, [selectedMeal, mealSheets, loadSavedSheet]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await http.post("/api/logistics/trip-sheet", {
        date: isoDate,
        city_code: adminCity,
        meal_type: selectedMeal,
      });
      const data = (await res.json()) as TripSheetResponse | { detail?: string };
      if (!res.ok) {
        throw new Error(
          "detail" in data && data.detail ? data.detail : "Failed to generate trip sheet",
        );
      }
      const payload = data as TripSheetResponse;
      setMealSheets((prev) => ({ ...prev, [selectedMeal]: payload }));
      // Refresh unassigned after generation (statuses may have changed)
      void loadUnassigned(selectedMeal);
      toast({
        title: `${selectedMeal} trip sheet generated`,
        description:
          payload.status_updates > 0
            ? `${payload.status_updates} orders marked as Dispatched.`
            : payload.routes.length > 0
              ? "No status changes required."
              : "No orders found for this meal.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate trip sheet");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllDelivered = async () => {
    setMarkingDelivered(true);
    setError(null);
    try {
      const res = await http.post("/api/logistics/trip-sheet/mark-delivered", {
        date: isoDate,
        city_code: adminCity,
        meal_type: selectedMeal,
      });
      const data = (await res.json()) as { updated_orders?: number; detail?: string };
      if (!res.ok) {
        throw new Error(data.detail || "Failed to mark orders as delivered");
      }

      setMealSheets((prev) => {
        const next: Partial<Record<MealName, TripSheetResponse | null>> = { ...prev };
        const sheet = next[selectedMeal];
        if (sheet) {
          next[selectedMeal] = {
            ...sheet,
            routes: sheet.routes.map((route) => ({
              ...route,
              orders: route.orders.map((order) => ({
                ...order,
                status:
                  normalizeOrderStatusKey(order.status) === "cancelled"
                    ? order.status
                    : "Delivered",
              })),
            })),
          };
        }
        return next;
      });

      toast({
        title: `${selectedMeal} orders marked as delivered`,
        description:
          (data.updated_orders ?? 0) > 0
            ? `${data.updated_orders} ${selectedMeal.toLowerCase()} orders updated for ${dateLabel}.`
            : `No active ${selectedMeal.toLowerCase()} orders needed updating for ${dateLabel}.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark orders as delivered");
    } finally {
      setMarkingDelivered(false);
    }
  };

  const openAssignDialog = async (customer: UnassignedCustomer) => {
    setAssignTarget(customer);
    setAssignRouteId("");
    // Ensure routes are loaded
    if (routeConfigs.length === 0) {
      try {
        const res = await http.get(`/api/logistics/routes?city_code=${adminCity}`);
        const data = (await res.json()) as DeliveryRouteConfig[] | { detail?: string };
        if (res.ok && Array.isArray(data)) setRouteConfigs(data as DeliveryRouteConfig[]);
      } catch {
        // non-fatal
      }
    }
  };

  const handleAssignRoute = async () => {
    if (!assignTarget) return;
    setAssignSaving(true);
    try {
      const res = await http.patch(
        `/api/customers/${assignTarget.customer_id}/addresses/${assignTarget.address.address_id}/route`,
        { route_id: assignRouteId ? Number(assignRouteId) : null },
      );
      const data = (await res.json()) as { detail?: string };
      if (!res.ok) throw new Error(data?.detail || "Failed to assign route");
      toast({ title: "Route assigned", description: `${assignTarget.customer_name} updated.` });
      setAssignTarget(null);
      void loadUnassigned(selectedMeal);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to assign route",
        variant: "destructive",
      });
    } finally {
      setAssignSaving(false);
    }
  };

  const loadRouteConfigs = async () => {
    setRoutePlannerLoading(true);
    setRoutePlannerError(null);
    try {
      const res = await http.get(`/api/logistics/routes?city_code=${adminCity}`);
      const data = (await res.json()) as DeliveryRouteConfig[] | { detail?: string };
      if (!res.ok)
        throw new Error("detail" in data && data.detail ? data.detail : "Failed to load routes");
      const rows = Array.isArray(data) ? data : [];
      setRouteConfigs(
        rows.map((r, i) => ({
          route_id: r.route_id ?? null,
          route_code: r.route_code ?? "",
          route_name: r.route_name ?? "",
          notes: r.notes ?? "",
          is_active: r.is_active ?? true,
          sort_order: Number.isFinite(r.sort_order) ? r.sort_order : i,
        })),
      );
    } catch (err) {
      setRoutePlannerError(err instanceof Error ? err.message : "Unable to load routes");
      setRouteConfigs([]);
    } finally {
      setRoutePlannerLoading(false);
    }
  };

  const openRoutePlanner = async () => {
    setRoutePlannerOpen(true);
    await loadRouteConfigs();
  };

  const addRouteRow = () => {
    setRouteConfigs((prev) => [
      ...prev,
      {
        route_id: null,
        route_code: "",
        route_name: "",
        notes: "",
        is_active: true,
        sort_order: prev.length,
      },
    ]);
  };

  const updateRouteRow = (
    index: number,
    field: keyof DeliveryRouteConfig,
    value: string | number | boolean | null,
  ) => {
    setRouteConfigs((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const removeRouteRow = (index: number) => {
    setRouteConfigs((prev) =>
      prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, sort_order: i })),
    );
  };

  const saveRouteConfigs = async () => {
    setRoutePlannerSaving(true);
    setRoutePlannerError(null);
    try {
      const payload = {
        city_code: adminCity,
        routes: routeConfigs.map((r, i) => ({
          route_id: r.route_id ?? undefined,
          route_code: r.route_code.trim(),
          route_name: r.route_name.trim(),
          notes: r.notes?.trim() || null,
          is_active: r.is_active ?? true,
          sort_order: i,
        })),
      };
      const res = await http.post("/api/logistics/routes/bulk-save", payload);
      const data = (await res.json()) as { routes?: DeliveryRouteConfig[]; detail?: string };
      if (!res.ok) throw new Error(data?.detail || "Failed to save route plan");
      setRouteConfigs(
        (data.routes ?? []).map((r, i) => ({
          route_id: r.route_id ?? null,
          route_code: r.route_code ?? "",
          route_name: r.route_name ?? "",
          notes: r.notes ?? "",
          is_active: r.is_active ?? true,
          sort_order: Number.isFinite(r.sort_order) ? r.sort_order : i,
        })),
      );
      toast({
        title: "Route plan saved",
        description: `Saved ${data.routes?.length ?? 0} routes for ${adminCity}.`,
      });
      setRoutePlannerOpen(false);
    } catch (err) {
      setRoutePlannerError(err instanceof Error ? err.message : "Unable to save routes");
    } finally {
      setRoutePlannerSaving(false);
    }
  };

  const currentSheet = mealSheets[selectedMeal];
  const currentUnassigned = unassigned[selectedMeal];
  const hasUnassigned = (currentUnassigned?.unassigned_count ?? 0) > 0;

  return (
    <AdminLayout activePage="trip-sheet">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-serif font-semibold text-foreground">Trip Sheet Generation</h1>
        <p className="text-sm text-muted-foreground">
          Generate and save delivery manifests per meal, grouped by route. Orders advance to{" "}
          &quot;Dispatched&quot; on generation.
        </p>
      </div>

      {/* Date + actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Select run date</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Service date</p>
            <DatePickerWithPresets selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <p>
              <strong>City:</strong> {adminCity}
            </p>
            <p className="flex items-center gap-2 text-xs">
              <Info className="h-4 w-4 text-muted-foreground" /> Confirmed orders move to{" "}
              &quot;Dispatched&quot;.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void openRoutePlanner()}>
              Route Planning
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Meal tabs */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleMeals.map((meal) => {
          const sheet = mealSheets[meal];
          const isSelected = meal === selectedMeal;
          const isGenerated = !!sheet;
          return (
            <Card
              key={meal}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedMeal(meal)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedMeal(meal);
                }
              }}
              className={cn(
                "cursor-pointer border shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
              )}
            >
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-sm font-semibold">{meal}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 text-xs text-muted-foreground">
                {isGenerated ? (
                  <span className="text-emerald-600 font-medium">
                    {sheet.routes.reduce((s, r) => s + r.total_orders, 0)} orders across{" "}
                    {sheet.routes.length} routes
                  </span>
                ) : (
                  <span>Not generated</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unassigned warning */}
      {!unassignedLoading && hasUnassigned && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {currentUnassigned!.unassigned_count} delivery address
                {currentUnassigned!.unassigned_count > 1 ? "es" : ""} not assigned to a route
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Open Customer Management, find each customer below, and assign their delivery
                address to a route before generating the {selectedMeal} trip sheet.
              </p>
              <div className="mt-3 space-y-1.5">
                {currentUnassigned!.customers.map((c) => (
                  <button
                    key={c.order_id}
                    onClick={() => void openAssignDialog(c)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-amber-800 transition-colors hover:bg-amber-100"
                  >
                    <MapPin className="h-3 w-3 shrink-0 text-amber-500" />
                    <span className="font-medium">{c.customer_name}</span>
                    <span className="truncate text-amber-600">
                      {[c.address.house_apartment_no, c.address.written_address]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                    <span className="ml-auto shrink-0 text-amber-500 underline">Assign route</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate button for selected meal */}
      <div className="mb-6 flex items-center gap-3">
        <Button onClick={handleGenerate} disabled={loading || hasUnassigned}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </span>
          ) : (
            `Generate ${selectedMeal} Trip Sheet`
          )}
        </Button>
        <Button variant="outline" onClick={handleMarkAllDelivered} disabled={markingDelivered}>
          {markingDelivered ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Marking delivered…
            </span>
          ) : (
            `Mark ${selectedMeal} Orders Delivered`
          )}
        </Button>
        {hasUnassigned && (
          <p className="text-xs text-muted-foreground">
            Fix route assignments above to enable generation.
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Trip sheet results */}
      {!currentSheet ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            {sheetLoading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p>
                  Loading saved {selectedMeal.toLowerCase()} trip sheet for {dateLabel}…
                </p>
              </>
            ) : (
              <>
                <Route className="h-6 w-6 text-muted-foreground" />
                <p>
                  Generate the <strong>{selectedMeal}</strong> trip sheet to save and view delivery
                  routes for {dateLabel}.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Saved trip sheet loaded for {dateLabel}. Last generated on{" "}
            {format(new Date(currentSheet.generated_at), "PPP p")}.
          </div>

          {currentSheet.status_updates > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {currentSheet.status_updates} orders updated to <strong>Dispatched</strong>.
            </div>
          )}

          {currentSheet.routes.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No orders found for {selectedMeal} on {dateLabel}.
              </CardContent>
            </Card>
          )}

          {currentSheet.routes.map((route) => (
            <Card key={route.route}>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    {route.route}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {route.total_orders} orders · {formatCurrency(route.total_amount)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="w-48 min-w-[12rem]">Address</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {route.orders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-[10px] font-mono font-medium bg-amber-800/15 text-amber-900">
                            ORD-{String(order.order_id).padStart(5, "0")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.customer_name ?? "Customer"}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.phone ? `+91 ${order.phone}` : "No phone"}
                          </div>
                        </TableCell>
                        <TableCell className="w-48 min-w-[12rem] text-sm text-muted-foreground">
                          <div className="flex items-start gap-1">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="whitespace-normal break-words">
                              {[
                                order.address.house_apartment_no,
                                order.address.written_address,
                                order.address.city,
                                order.address.pin_code,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.items.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <ul className="space-y-0.5 text-xs text-muted-foreground">
                              {order.items.map((item, idx) => (
                                <li key={idx}>
                                  {item.quantity} × {item.item_name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm font-semibold">
                            {formatCurrency(order.total_price)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.payment_method} ·{" "}
                            {order.payment_status ?? paymentStatusLabel(order.paid)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <OrderStatusPill status={order.status} className="text-xs" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Route assignment dialog */}
      <Dialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign delivery route</DialogTitle>
          </DialogHeader>
          {assignTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{assignTarget.customer_name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[assignTarget.address.house_apartment_no, assignTarget.address.written_address]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Route</Label>
                {routeConfigs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No routes configured for {adminCity}. Add routes via Route Planning first.
                  </p>
                ) : (
                  <Select value={assignRouteId} onValueChange={setAssignRouteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a route…" />
                    </SelectTrigger>
                    <SelectContent>
                      {routeConfigs.map((r) => (
                        <SelectItem
                          key={r.route_id ?? r.route_code}
                          value={String(r.route_id ?? "")}
                        >
                          {r.route_name}
                          {r.notes ? ` — ${r.notes}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)} disabled={assignSaving}>
              Cancel
            </Button>
            <Button onClick={handleAssignRoute} disabled={!assignRouteId || assignSaving}>
              {assignSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route planner dialog */}
      <Dialog open={routePlannerOpen} onOpenChange={setRoutePlannerOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Route Planning</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 overflow-hidden">
            <p className="text-sm text-muted-foreground">
              Define reusable delivery routes for {adminCity}. Customers are assigned to routes from
              Customer Management.
            </p>
            {routePlannerError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {routePlannerError}
              </div>
            )}
            {routePlannerLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading routes…
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-hidden">
                <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
                  {routeConfigs.length === 0 && (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      No routes configured yet. Add your first route below.
                    </div>
                  )}
                  {routeConfigs.map((route, index) => (
                    <div
                      key={`${route.route_id ?? "new"}-${index}`}
                      className="rounded-lg border p-3"
                    >
                      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto]">
                        <div className="space-y-1.5">
                          <Label>Route Code</Label>
                          <Input
                            value={route.route_code}
                            onChange={(e) => updateRouteRow(index, "route_code", e.target.value)}
                            placeholder="route 1"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Route Name</Label>
                          <Input
                            value={route.route_name}
                            onChange={(e) => updateRouteRow(index, "route_name", e.target.value)}
                            placeholder="Vijayanagar and Gokulam"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRouteRow(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" onClick={addRouteRow} className="w-fit">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Route
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoutePlannerOpen(false)}
              disabled={routePlannerSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveRouteConfigs} disabled={routePlannerLoading || routePlannerSaving}>
              {routePlannerSaving ? "Saving…" : "Save Routes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
