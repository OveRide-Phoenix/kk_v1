"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format as formatDate } from "date-fns";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Home,
  Loader2,
  Lock,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { mobilePalette, playfairMobile, workSans } from "@/components/mobile/customer/theme";
import { normalizeCityCode } from "@/config/cities";
import { useAuthStore } from "@/store/store";

const CART_STORAGE_KEY = "customer_cart_items";
const CART_CONTEXT_KEY = "customer_cart_context";
const CART_REFRESH_KEY = "customer_cart_refresh";
const CART_KEEP_KEY = "kk_keep_cart";

const PAYMENT_METHODS = [
  { id: "UPI", label: "UPI Payments", hint: "Google Pay, PhonePe, Paytm", icon: Wallet },
  { id: "Card", label: "Credit / Debit Card", hint: "Visa, Mastercard, RuPay", icon: CreditCard },
  { id: "Cash", label: "Cash on Delivery", hint: "Pay at your doorstep", icon: Banknote },
] as const;

type MealType = "breakfast" | "lunch" | "dinner" | "condiments";

type CartLine = {
  menu_item_id: number;
  item_id?: number | null;
  combo_id?: number | null;
  meal: MealType;
  item_name: string;
  price: number;
  quantity: number;
  available_qty: number;
};

type CartContext = {
  order_date: string;
  address_id: number;
  order_type?: string;
};

type AddressEntry = {
  address_id: number;
  address_type: string;
  house_apartment_no: string | null;
  written_address: string;
  city: string;
  city_code?: string;
  pin_code: string;
  is_default: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

type OrderResponse = {
  message: string;
  order_id: number;
  total_price: number;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  coupon_codes?: string[];
  status: string;
};

type OrderQuoteResponse = {
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  total_price: number;
  coupon_codes?: string[];
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const buildAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MobileCartPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [cartContext, setCartContext] = useState<CartContext | null>(null);

  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupons, setAppliedCoupons] = useState<string[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quote, setQuote] = useState<OrderQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawItems = localStorage.getItem(CART_STORAGE_KEY);
      if (rawItems) {
        setCartItems(JSON.parse(rawItems) as CartLine[]);
      }
      const rawContext = localStorage.getItem(CART_CONTEXT_KEY);
      if (rawContext) {
        const parsed = JSON.parse(rawContext) as CartContext;
        setCartContext(parsed);
      }
    } catch {
      // ignore restore errors
    }
  }, []);

  useEffect(() => {
    if (user) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;

    (async () => {
      try {
        const response = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const me = await response.json();
        setUser(me);
      } catch {
        // ignore
      }
    })();
  }, [user, setUser]);

  useEffect(() => {
    const customerId = user?.customer_id;
    if (!customerId) return;

    const fetchAddresses = async () => {
      setAddressesLoading(true);
      setAddressesError(null);
      try {
        const response = await fetch(`http://localhost:8000/api/customers/${customerId}/addresses`, {
          headers: buildAuthHeaders(),
        });
        if (!response.ok) throw new Error("Unable to fetch addresses");
        const data = (await response.json()) as AddressEntry[];
        setAddresses(data);
      } catch {
        setAddressesError("Unable to load addresses.");
      } finally {
        setAddressesLoading(false);
      }
    };

    fetchAddresses();
  }, [user]);

  const cityCode = useMemo(() => {
    const rawUser = typeof user?.city_code === "string" ? user.city_code.trim() : "";
    if (typeof window === "undefined") {
      return normalizeCityCode(rawUser);
    }
    const persisted = localStorage.getItem("admin_city_code") || "";
    const raw = rawUser || persisted;
    return normalizeCityCode(raw);
  }, [user?.city_code]);

  const filteredAddresses = useMemo(() => {
    return addresses.filter((address) => {
      if (!address.city_code) return true;
      return normalizeCityCode(address.city_code) === cityCode;
    });
  }, [addresses, cityCode]);

  useEffect(() => {
    if (!addresses.length) return;
    if (cartContext?.address_id) {
      const match = filteredAddresses.find((address) => address.address_id === cartContext.address_id);
      if (match) {
        setSelectedAddressId(match.address_id);
        return;
      }
    }
    const defaultAddress = filteredAddresses.find((address) => address.is_default);
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.address_id);
    } else if (filteredAddresses.length) {
      setSelectedAddressId(filteredAddresses[0].address_id);
    } else {
      setSelectedAddressId(null);
    }
  }, [filteredAddresses, cartContext, addresses.length]);

  const totals = useMemo(() => {
    const totalQuantity = cartItems.reduce((sum, line) => sum + line.quantity, 0);
    return { totalQuantity };
  }, [cartItems]);

  const selectedAddress = selectedAddressId
    ? filteredAddresses.find((address) => address.address_id === selectedAddressId)
    : null;

  const fetchQuote = async (couponOverride?: string[], showCouponError = false) => {
    if (!cartItems.length) {
      setQuote(null);
      setQuoteError(null);
      return false;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const response = await fetch("http://localhost:8000/api/orders/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            item_id: item.item_id,
            combo_id: item.combo_id,
            quantity: item.quantity,
            price: item.price,
          })),
          coupon_codes: couponOverride ?? appliedCoupons,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data?.detail || "Invalid coupon";
        if (showCouponError) {
          setCouponError(message);
          setTimeout(() => setCouponError(null), 1200);
          setQuoteError(null);
          return false;
        }
        throw new Error(message);
      }
      setQuote(data as OrderQuoteResponse);
      return true;
    } catch (error) {
      setQuote(null);
      setQuoteError(error instanceof Error ? error.message : "Unable to calculate totals");
      return false;
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, appliedCoupons]);

  const handleApplyCoupon = async () => {
    const next = couponCode.trim();
    if (!next) return;
    const normalized = next.toUpperCase();
    setCouponCode("");
    if (appliedCoupons.includes(normalized)) return;
    const updated = [...appliedCoupons, normalized];
    const ok = await fetchQuote(updated, true);
    if (ok) {
      setAppliedCoupons(updated);
    }
  };

  const handleRemoveCoupon = (code: string) => {
    setAppliedCoupons((prev) => {
      const updated = prev.filter((item) => item !== code);
      fetchQuote(updated);
      return updated;
    });
  };

  const handleContinueShopping = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CART_KEEP_KEY, "1");
    }
    router.push("/mobile/customer/order");
  };

  const handleBack = () => {
    const idx = typeof window !== "undefined" ? (window.history.state as { idx?: number } | null)?.idx : undefined;
    if (typeof idx === "number" && idx > 0) {
      router.back();
      return;
    }
    router.push("/mobile/customer/home");
  };

  const handlePlaceOrder = async () => {
    if (!cartItems.length) return;
    if (!user?.customer_id) {
      setErrorMessage("Please sign in to place an order.");
      return;
    }
    if (!selectedAddress) {
      setErrorMessage("Please select a delivery address.");
      return;
    }

    setPlacingOrder(true);
    setErrorMessage(null);
    setOrderResult(null);

    const payload = {
      customer_id: user.customer_id,
      address_id: selectedAddress.address_id,
      payment_method: paymentMethod,
      order_date: cartContext?.order_date,
      order_type: cartContext?.order_type ?? "one_time",
      coupon_codes: appliedCoupons.length ? appliedCoupons : undefined,
      items: cartItems.map((item) => ({
        item_id: item.item_id,
        combo_id: item.combo_id,
        quantity: item.quantity,
        price: item.price,
        menu_item_id: item.menu_item_id,
        meal_type: item.meal,
      })),
    };

    try {
      const response = await fetch("http://localhost:8000/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Failed to place order");
      }

      setOrderResult(data as OrderResponse);
      setCartItems([]);
      setCartContext(null);
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_CONTEXT_KEY);
      localStorage.setItem(CART_REFRESH_KEY, "1");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setPlacingOrder(false);
    }
  };

  useEffect(() => {
    if (!orderResult) return;
    const timeout = window.setTimeout(() => {
      router.replace("/mobile/customer/home");
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [orderResult, router]);

  useEffect(() => {
    if (!cartItems.length || !selectedAddress) return;
    const context: CartContext = {
      order_date: cartContext?.order_date ?? formatDate(new Date(), "yyyy-MM-dd"),
      address_id: selectedAddress.address_id,
      order_type: cartContext?.order_type ?? "one_time",
    };
    localStorage.setItem(CART_CONTEXT_KEY, JSON.stringify(context));
  }, [cartItems, selectedAddress, cartContext]);

  if (cartItems.length === 0 && !orderResult) {
    return (
      <main className={`${workSans.variable} ${playfairMobile.variable} min-h-screen`} style={{ backgroundColor: mobilePalette.background }}>
        <div className="mx-auto flex min-h-screen w-full max-w-[448px] flex-col items-center justify-center gap-6 px-6 text-center">
          <ShoppingCart className="h-12 w-12 text-[#8D4925]" />
          <div>
            <h1 className="text-2xl font-bold text-[#463028]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>Your cart is empty</h1>
            <p className="text-sm text-[#8d6e63]">Browse the menu and add your favourites to get started.</p>
          </div>
          <button className="rounded-xl bg-[#8D4925] px-4 py-2 text-sm font-semibold text-white" onClick={handleContinueShopping}>
            Back to menu
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`${workSans.variable} ${playfairMobile.variable} min-h-screen pb-44`} style={{ backgroundColor: mobilePalette.background }}>
      <header className="sticky top-0 z-30 border-b border-[#3D2B1F]/5 bg-[rgba(253,250,241,0.95)] backdrop-blur-md">
        <div className="mx-auto w-full max-w-[448px] p-4">
          <div className="relative flex items-center justify-between">
          <button onClick={handleBack} className="flex h-9 w-9 items-center justify-center rounded-full">
            <ArrowLeft size={20} color="#3D2B1F" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold text-[#3D2B1F]" style={{ fontFamily: "var(--font-mobile-playfair), serif" }}>Final Secure Checkout</h1>
          <span className="h-9 w-9" />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[448px] px-4 py-4">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#8D4925]">Delivery Address</h2>
          </div>
          <div className="rounded-2xl border border-[#3D2B1F]/5 bg-white p-4 shadow-sm">
            {addressesLoading ? (
              <p className="text-sm text-[#8d6e63]">Loading addresses…</p>
            ) : addressesError ? (
              <p className="text-sm text-[#c75b39]">{addressesError}</p>
            ) : filteredAddresses.length === 0 ? (
              <p className="text-sm text-[#c75b39]">No delivery addresses available for this city.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-[#FDFAF1] p-2 text-[#1B4332]">
                    <Home size={18} />
                  </div>
                  <div className="flex-1">
                    <select
                      value={selectedAddressId?.toString() ?? ""}
                      onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                      className="h-10 w-full rounded-lg border border-[#8D4925]/20 bg-white px-2 text-sm text-[#3D2B1F]"
                    >
                      {filteredAddresses.map((address) => (
                        <option key={address.address_id} value={address.address_id.toString()}>
                          {address.address_type}{address.is_default ? " (Default)" : ""}
                        </option>
                      ))}
                    </select>
                    {selectedAddress ? (
                      <p className="mt-1 text-xs text-[#3D2B1F]/70">
                        {[selectedAddress.house_apartment_no, selectedAddress.written_address, selectedAddress.city, selectedAddress.pin_code]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>

                {selectedAddress?.latitude != null && selectedAddress?.longitude != null ? (
                  <div className="overflow-hidden rounded-xl border border-[#8D4925]/10">
                    <iframe
                      title="Delivery location"
                      className="h-40 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${selectedAddress.latitude},${selectedAddress.longitude}&z=16&output=embed`}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[#c75b39]">Location pin not available for this address.</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8D4925]">Items in your cart</h2>
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div key={`${item.meal}-${item.menu_item_id}`} className="rounded-xl border border-[#3D2B1F]/5 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#3D2B1F]">{item.item_name}</p>
                    <p className="text-xs capitalize text-[#3D2B1F]/60">{item.meal} • Qty {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#3D2B1F]">{currency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8D4925]">Payment Method</h2>
          <div className="overflow-hidden rounded-2xl border border-[#3D2B1F]/5 bg-white shadow-sm">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <label key={method.id} className="flex cursor-pointer items-center justify-between border-b border-[#3D2B1F]/5 p-4 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDFAF1] text-[#1B4332]">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-[#3D2B1F]">{method.label}</p>
                      <p className="text-[11px] font-medium text-[#3D2B1F]/50">{method.hint}</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-5 w-5 accent-[#1B4332]"
                  />
                </label>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-[#1B4332] p-5">
          <div className="grid grid-cols-3 gap-4 text-center text-[9px] font-bold uppercase tracking-tight text-[#FDFAF1]">
            <p>100% Hygienic</p>
            <p>Homemade Meals</p>
            <p>Secure Payment</p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[#3D2B1F]/5 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8D4925]">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-[#3D2B1F]/80">
              <span>Delivery date</span>
              <span>{cartContext?.order_date ?? formatDate(new Date(), "yyyy-MM-dd")}</span>
            </div>
            <div className="flex justify-between text-sm text-[#3D2B1F]/80">
              <span>Items ({totals.totalQuantity})</span>
              <span>{quote ? currency(quote.subtotal) : "—"}</span>
            </div>
            <div className="flex justify-between text-sm text-[#3D2B1F]/80">
              <span>Delivery</span>
              <span>Free</span>
            </div>
            <div className="flex justify-between text-sm text-[#3D2B1F]/80">
              <span>CGST</span>
              <span>{quote ? currency(quote.cgst) : "—"}</span>
            </div>
            <div className="flex justify-between text-sm text-[#3D2B1F]/80">
              <span>SGST</span>
              <span>{quote ? currency(quote.sgst) : "—"}</span>
            </div>
            {quote?.discount ? (
              <div className="flex justify-between text-sm text-[#3D2B1F]">
                <span>Discount</span>
                <span>-{currency(quote.discount)}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-[#8D4925]/20 bg-[#8D4925]/5 p-3">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8d6e63]">Apply coupon</label>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-[#8D4925]/20 bg-white px-2 py-1">
                {appliedCoupons.map((code) => (
                  <span key={code} className="inline-flex items-center gap-1 rounded-full bg-[#8D4925]/10 px-2 py-1 text-[0.7rem] font-semibold text-[#463028]">
                    {code}
                    <button type="button" className="rounded-full px-1 text-[#8d6e63] hover:text-[#463028]" onClick={() => handleRemoveCoupon(code)}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleApplyCoupon();
                    }
                  }}
                  placeholder="Enter code"
                  className="min-w-[120px] flex-1 border-0 bg-transparent text-sm text-[#463028] outline-none placeholder:text-[#8d6e63]"
                />
              </div>
              <button type="button" className="rounded-xl border border-[#8D4925]/20 px-3 py-2 text-sm" onClick={handleApplyCoupon} disabled={quoteLoading}>
                Apply
              </button>
            </div>
            {quoteError ? <p className="mt-2 text-[0.7rem] text-[#c75b39]">{quoteError}</p> : null}
            {couponError ? <p className="mt-2 text-[0.7rem] text-[#c75b39]">{couponError}</p> : null}
          </div>

          <div className="mt-4 flex justify-between border-t border-dashed border-[#8D4925]/20 pt-3 text-base font-semibold text-[#3D2B1F]">
            <span>Grand total</span>
            <span>{quote ? currency(quote.total_price) : "—"}</span>
          </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-1/2 z-40 w-full max-w-[448px] -translate-x-1/2 border-t border-[#3D2B1F]/5 bg-[rgba(253,250,241,0.95)] px-4 pb-8 pt-4 backdrop-blur-xl">
        <div className="mx-auto w-full">
          {errorMessage ? (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">{errorMessage}</div>
          ) : null}

          <button
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#8D4925] text-base font-bold uppercase tracking-widest text-[#FDFAF1] shadow-xl shadow-[#8D4925]/20 disabled:opacity-60"
            onClick={handlePlaceOrder}
            disabled={placingOrder || cartItems.length === 0 || !!orderResult}
          >
            {placingOrder ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Placing order…</span>
            ) : (
              "Confirm Order"
            )}
          </button>
          <p className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-tight text-[#3D2B1F]/40">
            <Lock size={12} color="#1B4332" /> Secure 256-bit SSL encrypted transaction
          </p>
        </div>
      </footer>

      {orderResult ? (
        <div className="fixed bottom-28 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[416px] -translate-x-1/2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700 shadow-lg">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Order placed successfully
          </div>
          <p className="mt-1 text-xs">
            Order #{orderResult.order_id} confirmed. Redirecting to home...
          </p>
        </div>
      ) : null}
    </main>
  );
}
