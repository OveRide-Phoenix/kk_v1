"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import CustomerDailyMenu from "@/components/order";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePickerWithPresets } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { http } from "@/lib/http";
import { useAuthStore } from "@/store/store";
import { getSupportedMeals } from "@/config/cities";

type OrderResponse = {
  message: string;
  order_id: number;
  total_price: number;
  status: string;
};

type SeedResponse = {
  date: string;
  city_code: string;
  cleared_orders: number;
  created_orders: number;
  sample_order_ids: number[];
  status_counts?: Record<string, number>;
};

type CartLine = {
  meal: string;
  item_id?: number | null;
  combo_id?: number | null;
  menu_item_id?: number;
  item_name: string;
  qty: number;
  rate: number;
};

type CartContext = {
  confirmedDate: Date | null;
  confirmedDateISO: string | null;
};

type CustomerAddressSummary = {
  address_id: number;
  is_default?: boolean;
};

type CustomerOption = {
  customer_id: number;
  name: string;
  primary_mobile?: string | null;
};

type MealType = "breakfast" | "lunch" | "dinner" | "condiments";

type MenuPreviewItem = {
  menu_item_id?: number;
  item_id?: number | null;
  combo_id?: number | null;
  component_type_id?: number | null;
  component_type_name?: string | null;
  item_name: string;
  rate: number;
  is_default: boolean;
};

type MenuResponse = {
  menu_id: number;
  is_released: boolean;
  items: MenuPreviewItem[];
};

type SubscriptionResolvedLine = {
  key: string;
  meal: MealType;
  subscriptionName: string;
  componentTypeName?: string | null;
  resolvedName?: string | null;
  item_id?: number | null;
  combo_id?: number | null;
  menu_item_id?: number;
  rate: number;
  status:
    | "resolved"
    | "specific"
    | "not_released"
    | "not_configured"
    | "missing_daily"
    | "missing_default";
  detail: string;
};

const TEST_CUSTOMER_ID = 13;

function SubscriptionCustomerPreview({
  cityCode,
  dateISO,
  refreshSignal,
  onOrderCreated,
}: {
  cityCode: string;
  dateISO: string;
  refreshSignal: number;
  onOrderCreated?: () => void;
}) {
  const visibleMeals = useMemo(
    () =>
      getSupportedMeals(cityCode).filter((meal): meal is MealType =>
        ["breakfast", "lunch", "dinner"].includes(meal),
      ),
    [cityCode],
  );
  const [loading, setLoading] = useState(false);
  const [linesByMeal, setLinesByMeal] = useState<Record<string, SubscriptionResolvedLine[]>>({});
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [subscriptionQuantities, setSubscriptionQuantities] = useState<Record<string, number>>({});
  const [placingSubscription, setPlacingSubscription] = useState(false);
  const [subscriptionOrderResult, setSubscriptionOrderResult] = useState<OrderResponse | null>(
    null,
  );
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  const mealLabel = (meal: string) => meal.charAt(0).toUpperCase() + meal.slice(1);

  useEffect(() => {
    let cancelled = false;

    const loadCustomers = async () => {
      try {
        const response = await http.get(`/api/admin/customers?city_code=${cityCode}&limit=500`);
        if (!response.ok) throw new Error(await response.text());
        const data = (await response.json()) as { customers?: CustomerOption[] };
        const rows = Array.isArray(data.customers) ? data.customers : [];
        if (cancelled) return;
        setCustomers(rows);
        setSelectedCustomerId(
          (current) => current || (rows[0]?.customer_id ? String(rows[0].customer_id) : ""),
        );
      } catch (error) {
        console.error("Failed to load customers for subscription test", error);
        if (!cancelled) setCustomers([]);
      }
    };

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [cityCode]);

  useEffect(() => {
    let cancelled = false;

    const fetchMenu = async (
      meal: MealType,
      params: Record<string, string>,
    ): Promise<MenuResponse | null> => {
      const search = new URLSearchParams(params);
      const response = await http.get(`/api/menu?${search.toString()}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(await response.text());
      return (await response.json()) as MenuResponse;
    };

    const resolve = async () => {
      setLoading(true);
      try {
        const next: Record<string, SubscriptionResolvedLine[]> = {};
        await Promise.all(
          visibleMeals.map(async (meal) => {
            const subscription = await fetchMenu(meal, {
              bld_type: meal,
              city_code: cityCode,
              menu_type: "SUBSCRIPTION",
              period_type: "subscription",
              include_combos: "1",
            });
            if (!subscription || !subscription.items?.length) {
              next[meal] = [
                {
                  key: `${meal}-not-configured`,
                  meal,
                  subscriptionName: mealLabel(meal),
                  rate: 0,
                  status: "not_configured",
                  detail: "No released subscription menu has been configured for this meal.",
                },
              ];
              return;
            }
            if (!subscription.is_released) {
              next[meal] = [
                {
                  key: `${meal}-not-released`,
                  meal,
                  subscriptionName: mealLabel(meal),
                  rate: 0,
                  status: "not_released",
                  detail: "Subscription menu exists but is not released.",
                },
              ];
              return;
            }

            const daily = await fetchMenu(meal, {
              bld_type: meal,
              city_code: cityCode,
              menu_type: "ONE_DAY",
              period_type: "one_day",
              date: dateISO,
              include_combos: "1",
            });

            const dailyItems = daily?.is_released ? (daily.items ?? []) : [];
            next[meal] = subscription.items.map((entry, index) => {
              const key = `${meal}-${entry.menu_item_id ?? entry.component_type_id ?? entry.item_id ?? index}`;
              const isGroup =
                entry.item_id == null && entry.combo_id == null && entry.component_type_id != null;
              if (!isGroup) {
                const matches = dailyItems.filter((item) =>
                  entry.combo_id != null
                    ? item.combo_id === entry.combo_id
                    : item.item_id === entry.item_id,
                );
                const resolved =
                  matches.length <= 1
                    ? matches[0]
                    : (matches.find((item) => item.is_default) ?? matches[0]);
                if (!daily?.is_released) {
                  return {
                    key,
                    meal,
                    subscriptionName: entry.item_name,
                    componentTypeName: entry.component_type_name,
                    rate: Number(entry.rate ?? 0),
                    status: "missing_daily",
                    detail: `Daily Menu for ${dateISO} is not released for ${mealLabel(meal)}.`,
                  };
                }
                if (!resolved?.menu_item_id) {
                  return {
                    key,
                    meal,
                    subscriptionName: entry.item_name,
                    componentTypeName: entry.component_type_name,
                    rate: Number(entry.rate ?? 0),
                    status: "missing_daily",
                    detail:
                      "This subscription food is not present in the released Daily Menu for the selected date.",
                  };
                }
                return {
                  key,
                  meal,
                  subscriptionName: entry.item_name,
                  resolvedName: resolved.item_name,
                  componentTypeName: entry.component_type_name ?? resolved.component_type_name,
                  item_id: resolved.item_id ?? null,
                  combo_id: resolved.combo_id ?? null,
                  menu_item_id: resolved.menu_item_id,
                  rate: Number(resolved.rate ?? entry.rate ?? 0),
                  status: "specific",
                  detail:
                    entry.combo_id != null
                      ? "Subscription combo matched to the released Daily Menu row."
                      : "Subscription plated item matched to the released Daily Menu row.",
                };
              }

              if (!daily?.is_released) {
                return {
                  key,
                  meal,
                  subscriptionName: entry.item_name,
                  componentTypeName: entry.component_type_name ?? entry.item_name,
                  rate: Number(entry.rate ?? 0),
                  status: "missing_daily",
                  detail: `Daily Menu for ${dateISO} is not released for ${mealLabel(meal)}.`,
                };
              }

              const matches = dailyItems.filter(
                (item) => item.component_type_id === entry.component_type_id,
              );
              if (matches.length === 0) {
                return {
                  key,
                  meal,
                  subscriptionName: entry.item_name,
                  componentTypeName: entry.component_type_name ?? entry.item_name,
                  rate: Number(entry.rate ?? 0),
                  status: "missing_daily",
                  detail: "No Daily Menu item exists for this item group on the selected date.",
                };
              }

              const resolved =
                matches.length === 1 ? matches[0] : matches.find((item) => item.is_default);
              if (!resolved) {
                return {
                  key,
                  meal,
                  subscriptionName: entry.item_name,
                  componentTypeName: entry.component_type_name ?? entry.item_name,
                  rate: Number(entry.rate ?? 0),
                  status: "missing_default",
                  detail: "Multiple Daily Menu items match this group, but none is marked default.",
                };
              }

              return {
                key,
                meal,
                subscriptionName: entry.item_name,
                componentTypeName: entry.component_type_name ?? entry.item_name,
                resolvedName: resolved.item_name,
                item_id: resolved.item_id ?? null,
                combo_id: resolved.combo_id ?? null,
                menu_item_id: resolved.menu_item_id,
                rate: Number(resolved.rate ?? entry.rate ?? 0),
                status: "resolved",
                detail:
                  matches.length === 1
                    ? "Resolved from the only matching Daily Menu item."
                    : "Resolved from the Daily Menu default item.",
              };
            });
          }),
        );
        if (!cancelled) setLinesByMeal(next);
      } catch (error) {
        console.error("Failed to resolve subscription preview", error);
        if (!cancelled) setLinesByMeal({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [cityCode, dateISO, refreshSignal, visibleMeals]);

  const resolvedLines = useMemo(
    () =>
      visibleMeals.flatMap((meal) =>
        (linesByMeal[meal] ?? []).filter((line) => line.menu_item_id && line.rate >= 0),
      ),
    [linesByMeal, visibleMeals],
  );

  const selectedSubscriptionLines = useMemo(
    () =>
      resolvedLines
        .map((line) => ({ line, quantity: Math.floor(subscriptionQuantities[line.key] ?? 0) }))
        .filter(({ quantity }) => quantity > 0),
    [resolvedLines, subscriptionQuantities],
  );

  const subscriptionTotal = selectedSubscriptionLines.reduce(
    (acc, { line, quantity }) => acc + line.rate * quantity,
    0,
  );

  const setLineQuantity = (lineKey: string, quantity: number) => {
    const normalized = Math.max(0, Math.min(99, Math.floor(quantity || 0)));
    setSubscriptionQuantities((current) => {
      const next = { ...current };
      if (normalized <= 0) {
        delete next[lineKey];
      } else {
        next[lineKey] = normalized;
      }
      return next;
    });
  };

  const fetchCustomerAddressId = async (customerId: number): Promise<number | null> => {
    const response = await http.get(`/api/customers/${customerId}/addresses`);
    if (!response.ok) return null;
    const data = (await response.json()) as CustomerAddressSummary[];
    if (!Array.isArray(data) || data.length === 0) return null;
    const preferred = data.find((address) => address.is_default) ?? data[0];
    return preferred?.address_id ?? null;
  };

  const handlePlaceSubscriptionOrder = async () => {
    const customerId = Number(selectedCustomerId);
    if (!customerId) {
      setSubscriptionError("Choose a customer for this subscription test order.");
      return;
    }
    if (selectedSubscriptionLines.length === 0) {
      setSubscriptionError("Select at least one resolved subscription food.");
      return;
    }

    setPlacingSubscription(true);
    setSubscriptionError(null);
    setSubscriptionOrderResult(null);

    try {
      const addressId = await fetchCustomerAddressId(customerId);
      if (!addressId) {
        throw new Error("Selected customer has no active address.");
      }

      const payload = {
        customer_id: customerId,
        address_id: addressId,
        payment_method: "Cash",
        delivery_date: dateISO,
        order_type: "subscription",
        items: selectedSubscriptionLines.map(({ line, quantity }) => ({
          item_id: line.item_id ?? null,
          combo_id: line.combo_id ?? null,
          quantity,
          price: line.rate,
          menu_item_id: line.menu_item_id ?? null,
          meal_type: line.meal,
        })),
      };

      const response = await http.post("/api/orders/create", payload);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Failed to place subscription test order");
      }

      setSubscriptionOrderResult(data as OrderResponse);
      setSubscriptionQuantities({});
      onOrderCreated?.();
    } catch (error) {
      setSubscriptionError(
        error instanceof Error ? error.message : "Unable to place subscription test order",
      );
    } finally {
      setPlacingSubscription(false);
    }
  };

  const statusBadge = (status: SubscriptionResolvedLine["status"]) => {
    if (status === "resolved") return <Badge variant="secondary">Resolved</Badge>;
    if (status === "specific") return <Badge variant="outline">Specific</Badge>;
    return <Badge variant="destructive">Needs setup</Badge>;
  };

  return (
    <div className="w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Subscription Menu Preview</h2>
        <p className="text-sm text-muted-foreground">
          Customer-facing resolution for {dateISO}. Item groups resolve through that day&apos;s
          released Daily Menu.
        </p>
      </div>
      <div className="w-full rounded-lg border border-border bg-card/60 p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
          <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_minmax(160px,auto)]">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Customer</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.customer_id} value={String(customer.customer_id)}>
                      {customer.name}
                      {customer.primary_mobile ? ` · ${customer.primary_mobile}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Selected total</p>
              <p className="h-9 rounded-md border border-input px-3 py-2 text-sm font-semibold">
                ₹{subscriptionTotal.toFixed(2)}
              </p>
            </div>
          </div>
          <Button
            onClick={handlePlaceSubscriptionOrder}
            disabled={placingSubscription || selectedSubscriptionLines.length === 0}
          >
            {placingSubscription ? "Creating…" : "Create Subscription Order"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Creates a real order with <code>order_type: subscription</code> and Daily Menu row IDs, so
          kitchen production, packing, and trip sheets can read it normally.
        </p>
        {subscriptionError ? (
          <p className="mt-2 text-sm text-destructive">{subscriptionError}</p>
        ) : null}
        {subscriptionOrderResult ? (
          <p className="mt-2 text-sm text-primary">
            Created subscription order ORD-
            {String(subscriptionOrderResult.order_id).padStart(5, "0")} · ₹
            {subscriptionOrderResult.total_price.toFixed(2)}
          </p>
        ) : null}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Resolving subscription menu...</p>
      ) : null}
      <div className="space-y-6">
        {visibleMeals.map((meal) => {
          const lines = linesByMeal[meal] ?? [];
          return (
            <section key={meal}>
              <h3 className="mb-3 text-lg font-semibold">{mealLabel(meal)}</h3>
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscription rows to show.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lines.map((line) => (
                    <Card key={line.key} className="overflow-hidden">
                      <CardHeader className="space-y-2 pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base">
                            {line.resolvedName ?? line.subscriptionName}
                          </CardTitle>
                          {statusBadge(line.status)}
                        </div>
                        {line.componentTypeName ? (
                          <Badge variant="outline" className="w-fit">
                            {line.componentTypeName}
                          </Badge>
                        ) : null}
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {line.resolvedName && line.resolvedName !== line.subscriptionName ? (
                          <p className="text-muted-foreground">
                            Subscription group:{" "}
                            <span className="font-medium text-foreground">
                              {line.subscriptionName}
                            </span>
                          </p>
                        ) : null}
                        <p className="text-muted-foreground">{line.detail}</p>
                        {line.status === "resolved" || line.status === "specific" ? (
                          <p className="font-semibold text-foreground">₹{line.rate.toFixed(2)}</p>
                        ) : null}
                        {line.menu_item_id ? (
                          <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                            <label
                              htmlFor={`subscription-${line.key}`}
                              className="flex items-center gap-2 text-sm font-medium"
                            >
                              <Checkbox
                                id={`subscription-${line.key}`}
                                checked={(subscriptionQuantities[line.key] ?? 0) > 0}
                                onCheckedChange={(checked) =>
                                  setLineQuantity(line.key, checked ? 1 : 0)
                                }
                              />
                              Add
                            </label>
                            <Input
                              aria-label={`Quantity for ${line.resolvedName ?? line.subscriptionName}`}
                              className="h-8 w-20"
                              type="number"
                              min={0}
                              max={99}
                              value={subscriptionQuantities[line.key] ?? 0}
                              onChange={(event) =>
                                setLineQuantity(line.key, Number(event.target.value))
                              }
                            />
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderTestPage() {
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cartSelection, setCartSelection] = useState<CartLine[]>([]);
  const [cartContext, setCartContext] = useState<CartContext>({
    confirmedDate: null,
    confirmedDateISO: null,
  });
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [resetCartSignal, setResetCartSignal] = useState(0);
  const [seedDate, setSeedDate] = useState<Date | null>(() => new Date());
  const [seedCount, setSeedCount] = useState(12);
  const [seedClear, setSeedClear] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<SeedResponse | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeSummary, setPurgeSummary] = useState<string | null>(null);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");

  const handleCartChange = useCallback((cart: CartLine[], context: CartContext) => {
    setCartSelection(cart);
    setCartContext(context);
  }, []);

  const totalSelected = useMemo(
    () => cartSelection.reduce((acc, item) => acc + item.qty * item.rate, 0),
    [cartSelection],
  );
  const previewDateISO = cartContext.confirmedDateISO ?? format(new Date(), "yyyy-MM-dd");

  const fetchTestCustomerAddressId = useCallback(async (): Promise<number | null> => {
    try {
      const response = await http.get(`/api/customers/${TEST_CUSTOMER_ID}/addresses`);
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as CustomerAddressSummary[];
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }
      const preferred = data.find((address) => address.is_default) ?? data[0];
      return preferred?.address_id ?? null;
    } catch {
      return null;
    }
  }, []);

  const handlePlaceTestOrder = async () => {
    if (cartSelection.length === 0) {
      setErrorMessage("Add at least one item to place an order.");
      return;
    }
    setPlacingOrder(true);
    setOrderResult(null);
    setErrorMessage(null);

    const addressId = await fetchTestCustomerAddressId();
    if (!addressId) {
      setErrorMessage(
        "Test customer has no default address. Seed customer data or set a default address first.",
      );
      setPlacingOrder(false);
      return;
    }

    const payload = {
      customer_id: TEST_CUSTOMER_ID,
      address_id: addressId,
      payment_method: "Cash",
      delivery_date: cartContext.confirmedDateISO ?? format(new Date(), "yyyy-MM-dd"),
      items: cartSelection.map((item) => ({
        item_id: item.item_id ?? null,
        combo_id: item.combo_id ?? null,
        quantity: item.qty,
        price: item.rate,
        menu_item_id: item.menu_item_id ?? null,
        meal_type: item.meal,
      })),
    };

    try {
      const response = await http.post("/api/orders/create", payload);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to place order");
      }

      setOrderResult(data as OrderResponse);
      setResetCartSignal((value) => value + 1);
      setRefreshSignal((value) => value + 1);
      setCartSelection([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleSeedOrders = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      const normalizedDate = seedDate
        ? format(seedDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");
      const response = await http.post("/api/dev/orders/seed", {
        date: normalizedDate,
        city_code: adminCity,
        count: seedCount,
        clear_existing: seedClear,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail ?? "Failed to seed orders");
      }
      setSeedResult(data as SeedResponse);
      setRefreshSignal((value) => value + 1);
    } catch (error) {
      setSeedError(error instanceof Error ? error.message : "Unable to seed orders");
    } finally {
      setSeeding(false);
    }
  };

  const handlePurgeAllOrders = async () => {
    setPurging(true);
    setPurgeSummary(null);
    try {
      const attemptPurge = async () => {
        const primary = await http.post("/api/dev/orders/purge");
        if (primary.ok) return primary;
        const fallback = await http.delete("/api/dev/orders");
        return fallback;
      };
      const response = await attemptPurge();
      let data: { deleted_orders?: number; detail?: string } | null = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok || !data) {
        throw new Error(data?.detail ?? "Failed to purge orders");
      }
      setPurgeSummary(`Deleted ${data.deleted_orders ?? 0} orders from the system.`);
      setRefreshSignal((value) => value + 1);
    } catch (error) {
      setPurgeSummary(error instanceof Error ? error.message : "Unable to purge orders");
    } finally {
      setPurging(false);
      setPurgeDialogOpen(false);
    }
  };

  return (
    <>
      <AdminLayout activePage="ordertest">
        <div className="flex flex-col items-start gap-6">
          <div className="w-full max-w-3xl space-y-4 rounded-lg border border-border bg-card/60 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Seed Orders (Mysore)</h2>
                <p className="text-sm text-muted-foreground">
                  Purge and re-create synthetic orders for a specific service date to test status
                  automation.
                </p>
              </div>
              <Button onClick={handleSeedOrders} disabled={seeding}>
                {seeding ? "Seeding…" : "Generate Orders"}
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="seed-date" className="text-sm font-medium text-muted-foreground">
                  Delivery date
                </label>
                <DatePickerWithPresets
                  selectedDate={seedDate ?? undefined}
                  onSelectDate={(date) => setSeedDate(date)}
                  showQuickSelect={false}
                  disablePast={false}
                  triggerClassName="w-full"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="seed-count" className="text-sm font-medium text-muted-foreground">
                  Number of orders
                </label>
                <Input
                  id="seed-count"
                  type="number"
                  min={0}
                  max={200}
                  value={seedCount}
                  onChange={(event) => setSeedCount(Number(event.target.value))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="seed-clear"
                  checked={seedClear}
                  onCheckedChange={(value) => setSeedClear(Boolean(value))}
                />
                <label htmlFor="seed-clear" className="text-sm text-muted-foreground">
                  Purge existing orders for this date
                </label>
              </div>
            </div>
            {seedError && <p className="text-sm text-destructive">{seedError}</p>}
            {seedResult && (
              <div className="text-sm text-muted-foreground">
                <p>
                  Cleared <strong>{seedResult.cleared_orders}</strong> orders · Created{" "}
                  <strong>{seedResult.created_orders}</strong> new orders ({seedResult.city_code})
                </p>
                {seedResult.sample_order_ids?.length > 0 && (
                  <p className="text-xs">
                    Sample IDs:{" "}
                    {seedResult.sample_order_ids
                      .map((id) => `ORD-${String(id).padStart(5, "0")}`)
                      .join(", ")}
                  </p>
                )}
                {seedResult.status_counts && Object.keys(seedResult.status_counts).length > 0 && (
                  <p className="text-xs">
                    Status mix:{" "}
                    {Object.entries(seedResult.status_counts)
                      .filter(([, count]) => Number(count) > 0)
                      .map(([status, count]) => `${status} (${count})`)
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="w-full max-w-3xl rounded-lg border border-destructive/40 bg-destructive/5 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-destructive">Purge ALL Orders</h2>
                <p className="text-sm text-destructive/80">
                  Permanently deletes every order & order item (Mysore and Bangalore). Use only on
                  dev data.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setPurgeDialogOpen(true)}>
                Delete All Orders
              </Button>
            </div>
            {purgeSummary && <p className="mt-2 text-sm text-destructive">{purgeSummary}</p>}
          </div>

          <Tabs defaultValue="daily-menu" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="daily-menu">Daily Menu Order</TabsTrigger>
              <TabsTrigger value="subscription-menu">Subscription Menu Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="daily-menu" className="mt-0">
              <CustomerDailyMenu
                onCartChange={handleCartChange}
                refreshSignal={refreshSignal}
                resetCartSignal={resetCartSignal}
                cityCode={adminCity}
              />
            </TabsContent>
            <TabsContent value="subscription-menu" className="mt-0">
              <SubscriptionCustomerPreview
                cityCode={adminCity}
                dateISO={previewDateISO}
                refreshSignal={refreshSignal}
                onOrderCreated={() => setRefreshSignal((value) => value + 1)}
              />
            </TabsContent>
          </Tabs>

          <div className="w-full max-w-3xl space-y-4 rounded-lg border border-border bg-card/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">One-time Order (Test)</h2>
              <Button
                onClick={handlePlaceTestOrder}
                disabled={placingOrder || cartSelection.length === 0}
              >
                {placingOrder ? "Placing…" : "Place Test Order"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Sends the current selection to <code>/api/orders/create</code> for customer{" "}
              <strong>#13</strong>. The available quantity is automatically reduced for the items
              you submit.
            </p>

            <div className="rounded-md border border-muted p-3 text-sm">
              <p className="font-medium text-foreground">Selected items</p>
              {cartSelection.length === 0 ? (
                <p className="text-muted-foreground">No items in the cart yet.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {cartSelection.map((item) => (
                    <li
                      key={`${item.meal}-${item.menu_item_id ?? item.combo_id ?? item.item_id ?? item.item_name}`}
                    >
                      <span className="font-medium text-foreground">{item.item_name}</span> ·{" "}
                      {item.meal} · qty {item.qty} (₹{(item.rate * item.qty).toFixed(2)})
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 font-semibold text-foreground">
                Total: ₹{totalSelected.toFixed(2)}{" "}
                {cartContext.confirmedDateISO && (
                  <span className="text-sm text-muted-foreground">
                    · Date {cartContext.confirmedDateISO}
                  </span>
                )}
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {orderResult && (
              <div className="rounded-md border border-primary/20 bg-primary/10 p-4 text-sm text-primary-foreground">
                <p>
                  <span className="font-semibold text-primary">Order ID:</span>{" "}
                  {orderResult.order_id}
                </p>
                <p>
                  <span className="font-semibold text-primary">Total:</span> ₹
                  {orderResult.total_price.toFixed(2)}
                </p>
                <p>
                  <span className="font-semibold text-primary">Status:</span> {orderResult.status}
                </p>
                <p className="text-muted-foreground">{orderResult.message}</p>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
      <Dialog open={purgeDialogOpen} onOpenChange={(open) => !purging && setPurgeDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all orders?</DialogTitle>
            <DialogDescription>
              This permanently deletes every order and order item across Mysore and Bangalore. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPurgeDialogOpen(false)} disabled={purging}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePurgeAllOrders} disabled={purging}>
              {purging ? "Deleting…" : "Delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
