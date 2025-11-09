"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import CustomerDailyMenu from "@/components/order";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { http } from "@/lib/http";
import { useAuthStore } from "@/store/store";

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
};

type CartLine = {
  meal: string;
  item_id: number;
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

const TEST_CUSTOMER_ID = 13;

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
  const [seedDate, setSeedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [seedCount, setSeedCount] = useState(12);
  const [seedClear, setSeedClear] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<SeedResponse | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeSummary, setPurgeSummary] = useState<string | null>(null);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");

  const handleCartChange = useCallback(
    (cart: CartLine[], context: CartContext) => {
      setCartSelection(cart);
      setCartContext(context);
    },
    [],
  );

  const totalSelected = useMemo(
    () => cartSelection.reduce((acc, item) => acc + item.qty * item.rate, 0),
    [cartSelection],
  );

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
      setErrorMessage("Test customer has no default address. Seed customer data or set a default address first.");
      setPlacingOrder(false);
      return;
    }

    const payload = {
      customer_id: TEST_CUSTOMER_ID,
      address_id,
      payment_method: "Cash",
      order_date: cartContext.confirmedDateISO ?? format(new Date(), "yyyy-MM-dd"),
      items: cartSelection.map((item) => ({
        item_id: item.item_id,
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
      setErrorMessage(error instanceof Error ? error.message : 'Unexpected error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleSeedOrders = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      const response = await http.post("/api/dev/orders/seed", {
        date: seedDate,
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
                  Purge and re-create synthetic orders for a specific service date to test status automation.
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
                <Input
                  id="seed-date"
                  type="date"
                  value={seedDate}
                  onChange={(event) => setSeedDate(event.target.value)}
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
                <Checkbox id="seed-clear" checked={seedClear} onCheckedChange={(value) => setSeedClear(Boolean(value))} />
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
                    Sample IDs: {seedResult.sample_order_ids.map((id) => `ORD-${String(id).padStart(5, "0")}`).join(", ")}
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
                  Permanently deletes every order & order item (Mysore and Bangalore). Use only on dev data.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setPurgeDialogOpen(true)}>
                Delete All Orders
              </Button>
            </div>
            {purgeSummary && <p className="mt-2 text-sm text-destructive">{purgeSummary}</p>}
          </div>

          <CustomerDailyMenu
            onCartChange={handleCartChange}
            refreshSignal={refreshSignal}
            resetCartSignal={resetCartSignal}
            cityCode={adminCity}
          />

          <div className="w-full max-w-3xl space-y-4 rounded-lg border border-border bg-card/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">One-time Order (Test)</h2>
              <Button
                onClick={handlePlaceTestOrder}
                disabled={placingOrder || cartSelection.length === 0}
              >
                {placingOrder ? 'Placing…' : 'Place Test Order'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Sends the current selection to <code>/api/orders/create</code> for customer <strong>#13</strong>. The
              available quantity is automatically reduced for the items you submit.
            </p>

            <div className="rounded-md border border-muted p-3 text-sm">
              <p className="font-medium text-foreground">Selected items</p>
              {cartSelection.length === 0 ? (
                <p className="text-muted-foreground">No items in the cart yet.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {cartSelection.map((item) => (
                    <li key={`${item.meal}-${item.item_id}`}>
                      <span className="font-medium text-foreground">{item.item_name}</span> · {item.meal} · qty {item.qty}{" "}
                      (₹{(item.rate * item.qty).toFixed(2)})
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 font-semibold text-foreground">
                Total: ₹{totalSelected.toFixed(2)}{" "}
                {cartContext.confirmedDateISO && (
                  <span className="text-sm text-muted-foreground">· Date {cartContext.confirmedDateISO}</span>
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
                  <span className="font-semibold text-primary">Order ID:</span> {orderResult.order_id}
                </p>
                <p>
                  <span className="font-semibold text-primary">Total:</span> ₹{orderResult.total_price.toFixed(2)}
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
              This permanently deletes every order and order item across Mysore and Bangalore. This action cannot be undone.
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
