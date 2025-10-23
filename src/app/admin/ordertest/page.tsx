'use client';

import { useCallback, useMemo, useState } from 'react';
import CustomerDailyMenu from '@/components/order';
import { AdminLayout } from '@/components/admin-layout';
import { Button } from '@/components/ui/button';

type OrderResponse = {
  message: string;
  order_id: number;
  total_price: number;
  status: string;
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

  const handlePlaceTestOrder = async () => {
    if (cartSelection.length === 0) {
      setErrorMessage('Add at least one item to place an order.');
      return;
    }
    setPlacingOrder(true);
    setOrderResult(null);
    setErrorMessage(null);

    const payload = {
      customer_id: 13,
      address_id: null,
      payment_method: 'Cash',
      order_date: cartContext.confirmedDateISO,
      items: cartSelection.map((item) => ({
        item_id: item.item_id,
        quantity: item.qty,
        price: item.rate,
        menu_item_id: item.menu_item_id ?? null,
        meal_type: item.meal,
      })),
    };

    try {
      const response = await fetch('http://localhost:8000/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to place order');
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

  return (
    <AdminLayout activePage="ordertest">
      <div className="flex flex-col gap-6 items-start">
        <CustomerDailyMenu
          onCartChange={handleCartChange}
          refreshSignal={refreshSignal}
          resetCartSignal={resetCartSignal}
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
                    <span className="font-medium text-foreground">{item.item_name}</span> · {item.meal} · qty {item.qty}
                    {' '}
                    (₹{(item.rate * item.qty).toFixed(2)})
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 font-semibold text-foreground">
              Total: ₹{totalSelected.toFixed(2)}{' '}
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
  );
}
