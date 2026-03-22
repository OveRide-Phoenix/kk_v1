"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShoppingCart, ArrowLeft, Loader2 } from "lucide-react";
import { format as formatDate } from "date-fns";

import CustomerNavBar from "@/components/customer-nav-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuthStore } from "@/store/store";
import { normalizeCityCode } from "@/config/cities";
import { http } from "@/lib/http";

const CART_STORAGE_KEY = "customer_cart_items";
const CART_CONTEXT_KEY = "customer_cart_context";
const CART_REFRESH_KEY = "customer_cart_refresh";
const CART_KEEP_KEY = "kk_keep_cart";

const PAYMENT_METHODS = [
  { id: "Cash", label: "Cash on Delivery" },
  { id: "UPI", label: "UPI" },
  { id: "Card", label: "Card" },
];

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

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
  route_assignment?: string | null;
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

export default function CartPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [cartContext, setCartContext] = useState<CartContext | null>(null);

  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("Cash");
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
        setCartContext(JSON.parse(rawContext) as CartContext);
      }
    } catch (error) {
      console.error("Failed to restore cart", error);
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
      } catch (error) {
        console.error("Unable to restore user", error);
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
        const response = await http.get(`/api/customers/${customerId}/addresses`);
        if (!response.ok) {
          throw new Error("Unable to fetch addresses");
        }
        const data = (await response.json()) as AddressEntry[];
        setAddresses(data);
      } catch (error) {
        console.error(error);
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
      const match = filteredAddresses.find(
        (address) => address.address_id === cartContext.address_id,
      );
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
  }, [filteredAddresses, cartContext]);

  const totals = useMemo(() => {
    const totalQuantity = cartItems.reduce((sum, line) => sum + line.quantity, 0);
    return { totalQuantity };
  }, [cartItems]);

  const selectedAddress = selectedAddressId
    ? filteredAddresses.find((address) => address.address_id === selectedAddressId)
    : null;

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
      customer_id: user?.customer_id ?? 0,
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
      const response = await http.post("/api/orders/create", payload);

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

  const fetchQuote = async (couponOverride?: string[], showCouponError = false) => {
    if (!cartItems.length) {
      setQuote(null);
      setQuoteError(null);
      return false;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const response = await http.post("/api/orders/quote", {
        items: cartItems.map((item) => ({
          item_id: item.item_id,
          combo_id: item.combo_id,
          quantity: item.quantity,
          price: item.price,
        })),
        coupon_codes: couponOverride ?? appliedCoupons,
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data?.detail || "Invalid coupon";
        if (showCouponError) {
          setCouponError(message);
          setTimeout(() => setCouponError(null), 1000);
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
    sessionStorage.setItem(CART_KEEP_KEY, "1");
    router.push("/customer/new-order");
  };

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
      <div className="min-h-screen bg-brand-shell">
        <CustomerNavBar />
        <div className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 pt-32 text-center">
          <ShoppingCart className="h-12 w-12 text-primary" />
          <div>
            <h1 className="text-2xl font-serif text-[#463028]">Your cart is empty</h1>
            <p className="text-sm text-[#8d6e63]">
              Browse the menu and add your favourites to get started.
            </p>
          </div>
          <Button onClick={handleContinueShopping}>Back to menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-shell pb-20">
      <CustomerNavBar />

      <main className="container mx-auto px-4 pt-24">
        <div className="mb-6 flex items-center gap-3 text-[#463028]">
          <Button variant="ghost" size="sm" onClick={handleContinueShopping}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to menu
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif text-[#463028]">
                  Items in your cart
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={`${item.meal}-${item.menu_item_id}`}
                    className="rounded-lg border border-brand-subtle bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#463028]">
                          {item.item_name} × {item.quantity}
                        </p>
                        <p className="text-xs text-[#8d6e63] capitalize">{item.meal}</p>
                      </div>
                      <div className="text-right text-sm font-semibold text-[#463028]">
                        <span className="text-[#8d6e63] text-xs">
                          {currency(item.price)} × {item.quantity}
                        </span>
                        <div>{currency(item.price * item.quantity)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif text-[#463028]">
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {addressesLoading ? (
                  <p className="text-sm text-[#8d6e63]">Loading addresses…</p>
                ) : addressesError ? (
                  <p className="text-sm text-[#c75b39]">{addressesError}</p>
                ) : filteredAddresses.length === 0 ? (
                  <p className="text-sm text-[#c75b39]">
                    No delivery addresses available for this city.
                  </p>
                ) : (
                  <>
                    <Select
                      value={selectedAddressId?.toString() ?? ""}
                      onValueChange={(value) => setSelectedAddressId(Number(value))}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select delivery address" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAddresses.map((address) => (
                          <SelectItem
                            key={address.address_id}
                            value={address.address_id.toString()}
                          >
                            <div className="text-left">
                              <p className="text-sm font-semibold text-[#463028]">
                                {address.address_type}
                                {address.is_default && " (Default)"}
                              </p>
                              <p className="text-xs text-[#8d6e63]">
                                {[
                                  address.house_apartment_no,
                                  address.written_address,
                                  address.city,
                                  address.pin_code,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAddress?.latitude != null && selectedAddress?.longitude != null ? (
                      <div className="overflow-hidden rounded-lg border border-brand-subtle bg-white">
                        <iframe
                          title="Delivery location"
                          className="h-56 w-full"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps?q=${selectedAddress.latitude},${selectedAddress.longitude}&z=16&output=embed`}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-[#c75b39]">
                        Location pin not available for this address.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif text-[#463028]">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#8d6e63]">
                {cartContext?.order_date && (
                  <div className="flex justify-between">
                    <span>Delivery date</span>
                    <span>{cartContext.order_date}</span>
                  </div>
                )}
                {selectedAddress && (
                  <div className="border-b border-dashed border-primary/20 pb-3 text-right text-sm text-[#463028]">
                    <p className="font-semibold">Delivering to {selectedAddress.address_type}</p>
                    <p className="text-xs text-[#8d6e63]">
                      {[
                        selectedAddress.house_apartment_no,
                        selectedAddress.written_address,
                        selectedAddress.city,
                        selectedAddress.pin_code,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Items ({totals.totalQuantity})</span>
                  <span>{quote ? currency(quote.subtotal) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST</span>
                  <span>{quote ? currency(quote.cgst) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST</span>
                  <span>{quote ? currency(quote.sgst) : "—"}</span>
                </div>
                {quote?.discount ? (
                  <div className="flex justify-between text-[#463028]">
                    <span>Discount</span>
                    <span>-{currency(quote.discount)}</span>
                  </div>
                ) : null}
                <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-3">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8d6e63]">
                    Apply coupon
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-input bg-white px-2 py-1">
                      {appliedCoupons.map((code) => (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[0.7rem] font-semibold text-[#463028]"
                        >
                          {code}
                          <button
                            type="button"
                            className="rounded-full px-1 text-[#8d6e63] hover:text-[#463028]"
                            onClick={() => handleRemoveCoupon(code)}
                            aria-label={`Remove ${code}`}
                          >
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={quoteLoading}
                    >
                      Apply
                    </Button>
                  </div>
                  {quoteError ? (
                    <p className="mt-2 text-[0.7rem] text-[#c75b39]">{quoteError}</p>
                  ) : couponError ? (
                    <p className="mt-2 text-[0.7rem] text-[#c75b39]">{couponError}</p>
                  ) : appliedCoupons.length ? (
                    <p className="mt-2 text-[0.7rem] text-[#8d6e63]">
                      Applied {appliedCoupons.join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-between border-t border-dashed border-primary/20 pt-3 text-base font-semibold text-[#463028]">
                  <span>Grand total</span>
                  <span>{quote ? currency(quote.total_price) : "—"}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                {errorMessage && (
                  <div className="w-full rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                    {errorMessage}
                  </div>
                )}

                {orderResult ? (
                  <div className="w-full rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4" /> Order placed successfully!
                    </div>
                    <p className="mt-2 text-xs text-green-700/80">
                      Order #{orderResult.order_id} for {currency(orderResult.total_price)} is{" "}
                      {orderResult.status}.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" onClick={handleContinueShopping}>
                        Back to menu
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || cartItems.length === 0}
                  >
                    {placingOrder ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
                      </span>
                    ) : (
                      "Place Order"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif text-[#463028]">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="space-y-2"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-white p-3 transition hover:border-primary/40"
                    >
                      <RadioGroupItem value={method.id} />
                      <span className="text-sm text-[#463028]">{method.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
