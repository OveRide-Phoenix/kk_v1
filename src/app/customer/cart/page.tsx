"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ShoppingCart, ArrowLeft, Loader2 } from "lucide-react"
import { format as formatDate } from "date-fns"

import CustomerNavBar from "@/components/customer-nav-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuthStore } from "@/store/store"

const CART_STORAGE_KEY = "customer_cart_items"
const CART_CONTEXT_KEY = "customer_cart_context"
const CART_REFRESH_KEY = "customer_cart_refresh"
const CART_KEEP_KEY = "kk_keep_cart"

const PAYMENT_METHODS = [
  { id: "Cash", label: "Cash on Delivery" },
  { id: "UPI", label: "UPI" },
  { id: "Card", label: "Card" },
]

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

type MealType = "breakfast" | "lunch" | "dinner" | "condiments"

type CartLine = {
  menu_item_id: number
  item_id: number
  meal: MealType
  item_name: string
  price: number
  quantity: number
  available_qty: number
}

type CartContext = {
  order_date: string
  address_id: number
}

type AddressEntry = {
  address_id: number
  address_type: string
  house_apartment_no: string | null
  written_address: string
  city: string
  pin_code: string
  is_default: boolean
}

type OrderResponse = {
  message: string
  order_id: number
  total_price: number
  status: string
}

export default function CartPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const [cartItems, setCartItems] = useState<CartLine[]>([])
  const [cartContext, setCartContext] = useState<CartContext | null>(null)

  const [addresses, setAddresses] = useState<AddressEntry[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressesError, setAddressesError] = useState<string | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)

  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [couponCode, setCouponCode] = useState("")
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const rawItems = localStorage.getItem(CART_STORAGE_KEY)
      if (rawItems) {
        setCartItems(JSON.parse(rawItems) as CartLine[])
      }
      const rawContext = localStorage.getItem(CART_CONTEXT_KEY)
      if (rawContext) {
        setCartContext(JSON.parse(rawContext) as CartContext)
      }
    } catch (error) {
      console.error("Failed to restore cart", error)
    }
  }, [])

  useEffect(() => {
    if (user) return
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token) return
    ;(async () => {
      try {
        const response = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) return
        const me = await response.json()
        setUser(me)
      } catch (error) {
        console.error("Unable to restore user", error)
      }
    })()
  }, [user, setUser])

  useEffect(() => {
    const customerId = user?.customer_id
    if (!customerId) return

    const fetchAddresses = async () => {
      setAddressesLoading(true)
      setAddressesError(null)
      try {
        const response = await fetch(`http://localhost:8000/api/customers/${customerId}/addresses`)
        if (!response.ok) {
          throw new Error("Unable to fetch addresses")
        }
        const data = (await response.json()) as AddressEntry[]
        setAddresses(data)
      } catch (error) {
        console.error(error)
        setAddressesError("Unable to load addresses.")
      } finally {
        setAddressesLoading(false)
      }
    }

    fetchAddresses()
  }, [user])

  useEffect(() => {
    if (!addresses.length) return
    if (cartContext?.address_id) {
      const match = addresses.find((address) => address.address_id === cartContext.address_id)
      if (match) {
        setSelectedAddressId(match.address_id)
        return
      }
    }
    const defaultAddress = addresses.find((address) => address.is_default)
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.address_id)
    } else {
      setSelectedAddressId(addresses[0].address_id)
    }
  }, [addresses, cartContext])

  const totals = useMemo(() => {
    const totalQuantity = cartItems.reduce((sum, line) => sum + line.quantity, 0)
    const totalPrice = cartItems.reduce((sum, line) => sum + line.quantity * line.price, 0)
    return { totalQuantity, totalPrice }
  }, [cartItems])

  const selectedAddress = selectedAddressId
    ? addresses.find((address) => address.address_id === selectedAddressId)
    : null

  const handlePlaceOrder = async () => {
    if (!cartItems.length) return
    if (!user?.customer_id) {
      setErrorMessage("Please sign in to place an order.")
      return
    }
    if (!selectedAddress) {
      setErrorMessage("Please select a delivery address.")
      return
    }

    setPlacingOrder(true)
    setErrorMessage(null)
    setOrderResult(null)

    const payload = {
      customer_id: user?.customer_id ?? 0,
      address_id: selectedAddress.address_id,
      payment_method: paymentMethod,
      order_date: cartContext?.order_date,
      items: cartItems.map((item) => ({
        item_id: item.item_id,
        quantity: item.quantity,
        price: item.price,
        menu_item_id: item.menu_item_id,
        meal_type: item.meal,
      })),
    }

    try {
      const response = await fetch("http://localhost:8000/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to place order")
      }

      setOrderResult(data as OrderResponse)
      setCartItems([])
      setCartContext(null)
      localStorage.removeItem(CART_STORAGE_KEY)
      localStorage.removeItem(CART_CONTEXT_KEY)
      localStorage.setItem(CART_REFRESH_KEY, "1")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error")
    } finally {
      setPlacingOrder(false)
    }
  }

  const handleContinueShopping = () => {
    sessionStorage.setItem(CART_KEEP_KEY, "1")
    router.push("/customer/new-order")
  }

  useEffect(() => {
    if (!cartItems.length || !selectedAddress) return
    const context: CartContext = {
      order_date: cartContext?.order_date ?? formatDate(new Date(), "yyyy-MM-dd"),
      address_id: selectedAddress.address_id,
    }
    localStorage.setItem(CART_CONTEXT_KEY, JSON.stringify(context))
  }, [cartItems, selectedAddress, cartContext])

  if (cartItems.length === 0 && !orderResult) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
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
    )
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-20">
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
                <CardTitle className="text-xl font-serif text-[#463028]">Items in your cart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={`${item.meal}-${item.menu_item_id}`}
                    className="rounded-lg border border-[#e6dfd0] bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#463028]">{item.item_name}</p>
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
                <CardTitle className="text-xl font-serif text-[#463028]">Delivery Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {addressesLoading ? (
                  <p className="text-sm text-[#8d6e63]">Loading addresses…</p>
                ) : addressesError ? (
                  <p className="text-sm text-[#c75b39]">{addressesError}</p>
                ) : (
                  <Select
                    value={selectedAddressId?.toString() ?? ""}
                    onValueChange={(value) => setSelectedAddressId(Number(value))}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select delivery address" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((address) => (
                        <SelectItem key={address.address_id} value={address.address_id.toString()}>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-[#463028]">
                              {address.address_type}
                              {address.is_default && " (Default)"}
                            </p>
                            <p className="text-xs text-[#8d6e63]">
                              {[address.house_apartment_no, address.written_address, address.city, address.pin_code]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <p className="font-semibold">
                      Delivering to {selectedAddress.address_type}
                    </p>
                    <p className="text-xs text-[#8d6e63]">
                      {[selectedAddress.house_apartment_no, selectedAddress.written_address, selectedAddress.city, selectedAddress.pin_code]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Items ({totals.totalQuantity})</span>
                  <span>{currency(totals.totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>Free</span>
                </div>
                <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-3">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8d6e63]">
                    Apply coupon
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value)}
                      placeholder="Enter code"
                      className="bg-white"
                    />
                    <Button type="button" variant="outline" disabled>
                      Apply
                    </Button>
                  </div>
                  <p className="mt-2 text-[0.7rem] text-[#c75b39]">
                    Coupons will be available soon.
                  </p>
                </div>
                <div className="flex justify-between border-t border-dashed border-primary/20 pt-3 text-base font-semibold text-[#463028]">
                  <span>Grand total</span>
                  <span>{currency(totals.totalPrice)}</span>
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
                      Order #{orderResult.order_id} for {currency(orderResult.total_price)} is {orderResult.status}.
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
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
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
  )
}
