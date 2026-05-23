"use client";

import { format as formatDate } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { normalizeCityCode } from "@/config/cities";
import { useHydrateAuthUser } from "@/hooks/useHydrateAuthUser";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/store";
import { http, readJsonResponse } from "@/lib/http";

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
  picture_url?: string | null;
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
  delivery_charge: number;
  coupon_codes?: string[];
  status: string;
};

type OrderQuoteResponse = {
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  delivery_charge: number;
  total_price: number;
  coupon_codes?: string[];
};

type ApiErrorResponse = {
  detail?: string;
};

const CART_STORAGE_KEY = "customer_cart_items";
const CART_CONTEXT_KEY = "customer_cart_context";
const CART_REFRESH_KEY = "customer_cart_refresh";
const CART_KEEP_KEY = "kk_keep_cart";
const PLACEHOLDER_IMAGE = "/images/menu/idli-sambar.jpg";

const PAYMENT_METHODS = [
  {
    id: "UPI",
    label: "UPI (GPay, PhonePe, Paytm)",
    subtitle: "Fast & Secure payments",
    icon: "payments",
    chip: null,
  },
  {
    id: "Card",
    label: "Credit / Debit Cards",
    subtitle: "Save cards for faster checkout",
    icon: "credit_card",
    chip: null,
  },
  {
    id: "Cash",
    label: "Cash on Delivery",
    subtitle: "Pay when order arrives",
    icon: "local_atm",
    chip: null,
  },
];

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const mealLabel = (meal: MealType) => {
  if (meal === "condiments") return "Condiments";
  return meal.charAt(0).toUpperCase() + meal.slice(1);
};

export default function CustomerV2CartPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

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
        setCartContext(JSON.parse(rawContext) as CartContext);
      }
    } catch {
      // no-op
    }
  }, []);

  useHydrateAuthUser();

  useEffect(() => {
    const customerId = user?.customer_id;
    if (!customerId) return;
    (async () => {
      setAddressesLoading(true);
      setAddressesError(null);
      try {
        const response = await http.get(`/api/customers/${customerId}/addresses`);
        if (!response.ok) {
          throw new Error("Unable to fetch addresses");
        }
        const data = (await response.json()) as AddressEntry[];
        setAddresses(data);
      } catch {
        setAddressesError("Unable to load addresses.");
      } finally {
        setAddressesLoading(false);
      }
    })();
  }, [user?.customer_id]);

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
    if (!filteredAddresses.length) {
      setSelectedAddressId(null);
      return;
    }
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
      return;
    }
    setSelectedAddressId(filteredAddresses[0].address_id);
  }, [filteredAddresses, cartContext]);

  const selectedAddress = useMemo(
    () =>
      selectedAddressId
        ? (filteredAddresses.find((address) => address.address_id === selectedAddressId) ?? null)
        : null,
    [filteredAddresses, selectedAddressId],
  );

  const subtotalFromCart = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const totalQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const setLineQuantity = (menuItemId: number, nextQuantity: number) => {
    setCartItems((prev) => {
      const item = prev.find((line) => line.menu_item_id === menuItemId);
      if (!item) return prev;
      const clamped = Math.max(0, Math.min(Math.floor(nextQuantity), item.available_qty));
      if (clamped <= 0) {
        return prev.filter((line) => line.menu_item_id !== menuItemId);
      }
      return prev.map((line) =>
        line.menu_item_id === menuItemId ? { ...line, quantity: clamped } : line,
      );
    });
  };

  const fetchQuote = useCallback(
    async (couponOverride?: string[], showCouponError = false) => {
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
            menu_item_id: item.menu_item_id,
            meal_type: item.meal,
          })),
          discount_code: (couponOverride ?? appliedCoupons)[0],
        });
        const data = await readJsonResponse<OrderQuoteResponse & ApiErrorResponse>(response);
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
    },
    [appliedCoupons, cartItems],
  );

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleApplyCoupon = async () => {
    const next = couponCode.trim();
    if (!next) return;
    const normalized = next.toUpperCase();
    if (appliedCoupons.includes(normalized)) return;
    const updated = [normalized];
    const ok = await fetchQuote(updated, true);
    if (ok) {
      setAppliedCoupons(updated);
      setCouponCode(normalized);
    }
  };

  const handleClearCoupon = () => {
    setAppliedCoupons([]);
    setCouponCode("");
    setCouponError(null);
    fetchQuote([]);
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
      discount_code: appliedCoupons[0],
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
      const data = await readJsonResponse<OrderResponse & ApiErrorResponse>(response);
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
    if (!cartItems.length) {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_CONTEXT_KEY);
      return;
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    localStorage.setItem(
      CART_CONTEXT_KEY,
      JSON.stringify({
        order_date: cartContext?.order_date ?? formatDate(new Date(), "yyyy-MM-dd"),
        address_id: selectedAddress?.address_id ?? 0,
        order_type: cartContext?.order_type ?? "one_time",
      }),
    );
  }, [cartItems, cartContext?.order_date, cartContext?.order_type, selectedAddress?.address_id]);

  const handleContinueShopping = () => {
    sessionStorage.setItem(CART_KEEP_KEY, "1");
    router.push("/customer-v2/new-order");
  };

  if (cartItems.length === 0 && !orderResult) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#8D4925]/10 text-[#8D4925]">
          <span className="material-symbols-outlined text-2xl">shopping_cart</span>
        </div>
        <h1
          className="text-3xl font-bold text-[#8D4925]"
          style={{ fontFamily: "var(--font-v2-playfair)" }}
        >
          Your cart is empty
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Add meals from today&apos;s menu to place your order.
        </p>
        <button
          onClick={handleContinueShopping}
          className="mt-6 rounded-xl bg-[#8D4925] px-6 py-3 font-bold text-white shadow-md shadow-[#8D4925]/20 transition-colors hover:bg-[#7a3f20]"
        >
          Back to Menu
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1
          className="text-4xl font-bold text-[#8D4925]"
          style={{ fontFamily: "var(--font-v2-playfair)" }}
        >
          Checkout & Cart
        </h1>
        <button
          onClick={handleContinueShopping}
          className="rounded-xl border border-[#8D4925]/20 bg-white px-4 py-2 text-sm font-semibold text-[#8D4925] transition-colors hover:bg-orange-50"
        >
          Back to Menu
        </button>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="space-y-8 lg:w-2/3">
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-2xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                Delivery Address
              </h2>
              <button
                onClick={() => router.push("/customer-v2/account?section=addresses")}
                className="group flex items-center gap-1.5 text-sm font-bold text-[#8D4925] transition-colors hover:text-[#7a3f20]"
              >
                <span className="material-symbols-outlined text-base transition-transform duration-200 group-hover:scale-105">
                  add_circle
                </span>
                Add New Address
              </button>
            </div>

            {addressesLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-40 rounded-3xl" />
                <Skeleton className="h-40 rounded-3xl" />
              </div>
            ) : addressesError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {addressesError}
              </div>
            ) : filteredAddresses.length === 0 ? (
              <div className="rounded-2xl border border-orange-100 bg-white px-4 py-6 text-sm text-[#8D4925]">
                No delivery addresses available for this city.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredAddresses.map((address) => {
                  const active = selectedAddressId === address.address_id;
                  return (
                    <button
                      key={address.address_id}
                      onClick={() => setSelectedAddressId(address.address_id)}
                      className={`relative rounded-3xl border bg-white p-6 text-left shadow-sm transition-all ${
                        active
                          ? "border-[#8D4925] ring-2 ring-[#8D4925]/20"
                          : "border-orange-100 hover:border-[#8D4925]/40"
                      }`}
                    >
                      {active ? (
                        <span className="material-symbols-outlined absolute right-4 top-4 text-[#8D4925]">
                          check_circle
                        </span>
                      ) : null}
                      <div className="mb-2 flex items-center gap-2 text-[#8D4925]">
                        <span className="material-symbols-outlined text-base">
                          {address.address_type.toLowerCase() === "work" ? "work" : "home"}
                        </span>
                        <span className="text-sm font-bold">{address.address_type}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-600">
                        {[
                          address.house_apartment_no,
                          address.written_address,
                          address.city,
                          address.pin_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2
              className="mb-5 text-2xl font-bold text-[#8D4925]"
              style={{ fontFamily: "var(--font-v2-playfair)" }}
            >
              Payment Method
            </h2>
            <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
              {PAYMENT_METHODS.map((method, index) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-center justify-between px-6 py-5 ${
                    index < PAYMENT_METHODS.length - 1 ? "border-b border-orange-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#8D4925]">
                      <span className="material-symbols-outlined">{method.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{method.label}</p>
                      <p className="text-xs font-medium text-gray-500">{method.subtitle}</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    className="h-5 w-5 border-gray-300 text-[#8D4925]"
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                  />
                </label>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-6 border-t border-orange-100 pt-6 text-[11px] font-bold uppercase tracking-widest text-[#8D4925]/70">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>FSSAI Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">sanitizer</span>
              <span>Hygienic Kitchen</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">eco</span>
              <span>Plastic-Free Packaging</span>
            </div>
          </div>
        </div>

        <div className="lg:w-1/3">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-[2.25rem] border border-orange-100 bg-white p-6 shadow-xl shadow-[#8D4925]/5 sm:p-8">
              <h2
                className="mb-6 text-2xl font-bold text-[#8D4925]"
                style={{ fontFamily: "var(--font-v2-playfair)" }}
              >
                Order Summary
              </h2>

              <div className="mb-7 max-h-[340px] space-y-5 overflow-y-auto pr-3 [scrollbar-color:#8D492588_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8D492544] [&::-webkit-scrollbar-track]:bg-transparent">
                {cartItems.map((item) => (
                  <div key={`${item.meal}-${item.menu_item_id}`} className="flex gap-3">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-orange-100/70">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={item.item_name}
                        className="h-full w-full object-cover"
                        src={item.picture_url || PLACEHOLDER_IMAGE}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-bold text-gray-900">
                          {item.item_name}
                        </h3>
                        <p className="text-sm font-bold text-[#8D4925]">{currency(item.price)}</p>
                      </div>
                      <p className="mb-2 text-xs font-medium text-gray-500">
                        {mealLabel(item.meal)}
                      </p>
                      <div className="inline-flex h-9 min-w-[108px] items-center overflow-hidden rounded-full bg-[#8D4925] text-white">
                        <button
                          onClick={() => setLineQuantity(item.menu_item_id, item.quantity - 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="flex flex-1 items-center justify-center px-2 text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setLineQuantity(item.menu_item_id, item.quantity + 1)}
                          disabled={item.quantity >= item.available_qty}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold disabled:opacity-50"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-dashed border-orange-200 py-5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-800">
                    {currency(quote?.subtotal ?? subtotalFromCart)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span className="font-bold text-[#1b4332]">
                    {(quote?.delivery_charge ?? 0) > 0 ? currency(quote!.delivery_charge) : "FREE"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Taxes & Charges</span>
                  <span className="font-bold text-gray-800">
                    {currency((quote?.cgst ?? 0) + (quote?.sgst ?? 0))}
                  </span>
                </div>
                {quote?.discount ? (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount</span>
                    <span className="font-bold text-[#1b4332]">- {currency(quote.discount)}</span>
                  </div>
                ) : null}
                <div className="mb-1 mt-3 rounded-2xl border border-[#1b4332]/20 bg-[#1b4332]/5 p-3">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b4332]/20 text-[#1b4332]">
                      <span className="material-symbols-outlined text-base">local_offer</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1b4332]">Coupon Code</p>
                      <p className="text-xs text-[#1b4332]/70">Save more on your healthy meals</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="Enter coupon code"
                      disabled={appliedCoupons.length > 0}
                      className={`h-10 flex-1 rounded-xl border border-[#1b4332]/20 px-3 text-sm outline-none ${
                        appliedCoupons.length > 0
                          ? "cursor-not-allowed bg-white/60 text-[#1b4332]/70"
                          : "bg-white"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={appliedCoupons.length > 0 ? handleClearCoupon : handleApplyCoupon}
                      disabled={quoteLoading || (!couponCode.trim() && appliedCoupons.length === 0)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1b4332]/30 bg-white text-[#1b4332] disabled:opacity-60"
                      aria-label={appliedCoupons.length > 0 ? "Clear coupon" : "Apply coupon"}
                      title={appliedCoupons.length > 0 ? "Clear coupon" : "Apply coupon"}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {appliedCoupons.length > 0 ? "close" : "arrow_forward"}
                      </span>
                    </button>
                  </div>
                  {quoteError ? <p className="mt-2 text-xs text-red-600">{quoteError}</p> : null}
                  {couponError ? <p className="mt-2 text-xs text-red-600">{couponError}</p> : null}
                </div>
                <div className="mt-2 flex justify-between border-t border-orange-100 pt-3 text-lg font-bold text-gray-900">
                  <span>Total Pay</span>
                  <span className="text-[#8D4925]">
                    {quoteLoading
                      ? "Calculating..."
                      : currency(quote?.total_price ?? subtotalFromCart)}
                  </span>
                </div>
              </div>

              {errorMessage ? (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              {orderResult ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <p className="font-bold">Order placed successfully</p>
                  <p className="mt-1 text-xs">
                    Order #{orderResult.order_id} • {currency(orderResult.total_price)} •{" "}
                    {orderResult.status}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || !cartItems.length || !selectedAddress}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8D4925] py-4 font-bold text-white shadow-lg shadow-[#8D4925]/20 transition-all hover:bg-[#7a3f20] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {placingOrder ? "Placing order..." : `Place Order (${totalQuantity})`}
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
