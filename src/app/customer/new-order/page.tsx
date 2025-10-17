"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingBag, ShoppingCart, MapPin, Plus, Minus, Clock } from "lucide-react"
import { format as formatDate } from "date-fns"

import CustomerNavBar from "@/components/customer-nav-bar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuthStore } from "@/store/store"

const CART_STORAGE_KEY = "customer_cart_items"
const CART_CONTEXT_KEY = "customer_cart_context"
const CART_REFRESH_KEY = "customer_cart_refresh"
const CART_KEEP_KEY = "kk_keep_cart"

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)

type MealType = "breakfast" | "lunch" | "dinner" | "condiments"

type MenuItem = {
  menu_item_id: number
  item_id: number
  item_name: string
  meal: MealType
  rate: number
  available_qty: number
  description?: string
  picture_url?: string | null
}

type MenuApiItem = {
  menu_item_id?: number
  item_id?: number
  item_name?: string
  name?: string
  rate?: number
  price?: number
  available_qty?: number
  description?: string
  picture_url?: string | null
}

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

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "condiments"]

const PLACEHOLDER_IMAGE = "/images/menu/placeholder.jpg"

export default function NewOrderPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const orderDate = useMemo(() => formatDate(new Date(), "yyyy-MM-dd"), [])

  const [menuByMeal, setMenuByMeal] = useState<Record<MealType, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  })
  const [menuError, setMenuError] = useState<string | null>(null)
  const [isMenuLoading, setIsMenuLoading] = useState(false)

  const [addresses, setAddresses] = useState<AddressEntry[]>([])
  const [addressesError, setAddressesError] = useState<string | null>(null)
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)

  const storedCartRef = useRef<CartLine[]>([])
  const storedContextRef = useRef<CartContext | null>(null)
  const [storedCartLoaded, setStoredCartLoaded] = useState(false)

  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [popupQuantities, setPopupQuantities] = useState<Record<number, number>>({})
  const [quantityChanged, setQuantityChanged] = useState(false)
  const [activeCategory, setActiveCategory] = useState<MealType | null>(null)
  const [shouldWarnOnExit, setShouldWarnOnExit] = useState(true)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const pendingNavigationRef = useRef<null | (() => void)>(null)

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
        console.error("Unable to restore session", error)
      }
    })()
  }, [user, setUser])

  useEffect(() => {
    try {
      let keepCart = false
      const refreshFlag = localStorage.getItem(CART_REFRESH_KEY)
      if (refreshFlag) {
        localStorage.removeItem(CART_REFRESH_KEY)
      }
      const flag = sessionStorage.getItem(CART_KEEP_KEY)
      if (flag === "1") {
        keepCart = true
        sessionStorage.removeItem(CART_KEEP_KEY)
      }

      if (keepCart) {
        const rawItems = localStorage.getItem(CART_STORAGE_KEY)
        if (rawItems) {
          storedCartRef.current = JSON.parse(rawItems) as CartLine[]
        }
        const rawContext = localStorage.getItem(CART_CONTEXT_KEY)
        if (rawContext) {
          storedContextRef.current = JSON.parse(rawContext) as CartContext
        }
      } else {
        localStorage.removeItem(CART_STORAGE_KEY)
        localStorage.removeItem(CART_CONTEXT_KEY)
        storedCartRef.current = []
        storedContextRef.current = null
      }
    } catch (error) {
      console.error("Failed to restore cart", error)
    } finally {
      setStoredCartLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!shouldWarnOnExit || cartSelection.length === 0) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = "Leaving this page will clear the cart."
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [shouldWarnOnExit, cartSelection.length])

  useEffect(() => {
    if (!shouldWarnOnExit || cartSelection.length === 0) return

    const handleNavigationAttempt = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const anchor = target?.closest<HTMLAnchorElement>("a")
      if (!anchor || anchor.target === "_blank" || anchor.dataset.ignoreExitWarning === "true") return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      if (href.startsWith("/customer/cart")) return

      event.preventDefault()
      event.stopPropagation()

      pendingNavigationRef.current = () => {
        setShouldWarnOnExit(false)
        router.push(href)
      }
      setConfirmLeaveOpen(true)
    }

    document.addEventListener("click", handleNavigationAttempt, true)
    return () => document.removeEventListener("click", handleNavigationAttempt, true)
  }, [shouldWarnOnExit, cartSelection.length, router])

  useEffect(() => {
    return () => {
      if (sessionStorage.getItem(CART_KEEP_KEY) === "1") return
      localStorage.removeItem(CART_STORAGE_KEY)
      localStorage.removeItem(CART_CONTEXT_KEY)
    }
  }, [])

  useEffect(() => {
    const customerId = user?.customer_id
    if (!customerId) return

    const fetchAddresses = async () => {
      setAddressesLoading(true)
      setAddressesError(null)
      try {
        const res = await fetch(`http://localhost:8000/api/customers/${customerId}/addresses`)
        if (!res.ok) {
          throw new Error("Unable to fetch addresses")
        }
        const data = await res.json()
        setAddresses(data)
      } catch (error) {
        console.error(error)
        setAddressesError("Unable to load addresses. Please try again later.")
      } finally {
        setAddressesLoading(false)
      }
    }

    fetchAddresses()
  }, [user])

  useEffect(() => {
    if (!addresses.length) return

    const contextAddressId = storedContextRef.current?.address_id
    const byId = contextAddressId ? addresses.find((a) => a.address_id === contextAddressId) : null
    if (byId) {
      setSelectedAddressId(byId.address_id)
      return
    }

    const defaultAddress = addresses.find((a) => a.is_default)
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.address_id)
    } else {
      setSelectedAddressId(addresses[0].address_id)
    }
  }, [addresses])

  useEffect(() => {
    if (!storedCartLoaded) return
    if (!Object.keys(menuByMeal).length) return

    const map = createMenuItemMap(menuByMeal)
    const restored: Record<number, number> = {}

    storedCartRef.current.forEach((line) => {
      const item = map[line.menu_item_id]
      if (!item) return
      if (item.available_qty <= 0) return
      restored[line.menu_item_id] = Math.min(line.quantity, item.available_qty)
    })

    setQuantities(restored)
  }, [storedCartLoaded, menuByMeal])

  const reloadMenu = useCallback(() => {
    setMenuError(null)
    setIsMenuLoading(true)

    ;(async () => {
      try {
        const nextMenu: Partial<Record<MealType, MenuItem[]>> = {}

        await Promise.all(
          MEALS.map(async (meal) => {
            const url = new URL("http://localhost:8000/api/menu")
            url.searchParams.set("date", orderDate)
            url.searchParams.set("bld_type", meal)
            url.searchParams.set("period_type", "one_day")

            const response = await fetch(url.toString())
            if (response.status === 404) {
              nextMenu[meal] = []
              return
            }
            if (!response.ok) {
              throw new Error(`Failed to fetch ${meal}`)
            }
            const data = await response.json()
            const items = (data.items ?? []) as MenuApiItem[]
            nextMenu[meal] = items.map((item) => ({
              menu_item_id: item.menu_item_id ?? 0,
              item_id: item.item_id ?? 0,
              item_name: item.item_name ?? item.name ?? "Item",
              meal,
              rate: item.rate ?? item.price ?? 0,
              available_qty: item.available_qty ?? 0,
              description: item.description ?? "",
              picture_url: item.picture_url ?? null,
            }))
          })
        )

        setMenuByMeal({
          breakfast: nextMenu.breakfast ?? [],
          lunch: nextMenu.lunch ?? [],
          dinner: nextMenu.dinner ?? [],
          condiments: nextMenu.condiments ?? [],
        })
      } catch (error) {
        console.error(error)
        setMenuError("Unable to load the menu. Please try again later.")
      } finally {
        setIsMenuLoading(false)
      }
    })()
  }, [orderDate])

  useEffect(() => {
    reloadMenu()
  }, [orderDate, reloadMenu])

  const menuItemsMap = useMemo(() => createMenuItemMap(menuByMeal), [menuByMeal])

  const cartSelection: CartLine[] = useMemo(() => {
    const lines: CartLine[] = []
    Object.entries(quantities).forEach(([key, rawValue]) => {
      const quantity = Number(rawValue) || 0
      if (quantity <= 0) return
      const menuItemId = Number(key)
      const menuItem = menuItemsMap[menuItemId]
      if (!menuItem) return
      lines.push({
        menu_item_id: menuItemId,
        item_id: menuItem.item_id,
        meal: menuItem.meal,
        item_name: menuItem.item_name,
        price: menuItem.rate,
        quantity: Math.min(quantity, menuItem.available_qty),
        available_qty: menuItem.available_qty,
      })
    })
    return lines
  }, [quantities, menuItemsMap])

  const cartTotals = useMemo(() => {
    const totalQuantity = cartSelection.reduce((sum, line) => sum + line.quantity, 0)
    const totalPrice = cartSelection.reduce((sum, line) => sum + line.quantity * line.price, 0)
    return { totalQuantity, totalPrice }
  }, [cartSelection])

  useEffect(() => {
    if (!storedCartLoaded) return
    if (!addresses.length) return

    if (!cartSelection.length) {
      localStorage.removeItem(CART_STORAGE_KEY)
      localStorage.removeItem(CART_CONTEXT_KEY)
      return
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartSelection))
    const selectedAddress = addresses.find((address) => address.address_id === selectedAddressId)
    const context: CartContext = {
      order_date: orderDate,
      address_id: selectedAddress?.address_id ?? addresses[0].address_id,
    }
    localStorage.setItem(CART_CONTEXT_KEY, JSON.stringify(context))
  }, [cartSelection, orderDate, selectedAddressId, addresses, storedCartLoaded])

  const setQuantityForItem = (menuItem: MenuItem, value: number) => {
    setQuantities((prev) => {
      const next = { ...prev }
      if (value <= 0) {
        delete next[menuItem.menu_item_id]
      } else {
        next[menuItem.menu_item_id] = value
      }
      return next
    })
  }

  const incrementItem = (menuItem: MenuItem) => {
    const current = quantities[menuItem.menu_item_id] ?? 0
    if (current >= menuItem.available_qty) return
    setQuantityForItem(menuItem, current + 1)
  }

  const decrementItem = (menuItem: MenuItem) => {
    const current = quantities[menuItem.menu_item_id] ?? 0
    if (current <= 0) return
    setQuantityForItem(menuItem, current - 1)
  }

  const openPopup = (menuItem: MenuItem) => {
    setSelectedItem(menuItem)
    setPopupQuantities((prev) => ({
      ...prev,
      [menuItem.menu_item_id]: quantities[menuItem.menu_item_id] ?? 0,
    }))
    setQuantityChanged(false)
  }

  const handlePopupQuantityChange = (menuItem: MenuItem, delta: number) => {
    setPopupQuantities((prev) => {
      const current = prev[menuItem.menu_item_id] ?? quantities[menuItem.menu_item_id] ?? 0
      const next = Math.min(Math.max(0, current + delta), menuItem.available_qty)
      return { ...prev, [menuItem.menu_item_id]: next }
    })
    setQuantityChanged(true)
  }

  const handleConfirmPopup = () => {
    if (!selectedItem) return
    const nextValue = popupQuantities[selectedItem.menu_item_id] ?? 0
    setQuantityForItem(selectedItem, nextValue)
    handleClosePopup(true)
  }

  const handleClosePopup = (force = false) => {
    if (!force && quantityChanged) {
      alert("Please confirm your changes before closing.")
      return
    }
    setSelectedItem(null)
    setQuantityChanged(false)
  }

  const cycleAddress = () => {
    if (!addresses.length) return
    if (selectedAddressId == null) {
      setSelectedAddressId(addresses[0].address_id)
      return
    }
    const index = addresses.findIndex((address) => address.address_id === selectedAddressId)
    const next = addresses[(index + 1) % addresses.length]
    setSelectedAddressId(next.address_id)
  }

  const selectedAddress = selectedAddressId
    ? addresses.find((address) => address.address_id === selectedAddressId)
    : null

  const handleReviewCart = () => {
    if (!cartSelection.length) return
    sessionStorage.setItem(CART_KEEP_KEY, "1")
    setShouldWarnOnExit(false)
    router.push("/customer/cart")
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-32">
      <CustomerNavBar />

      <main className="container mx-auto px-4 pt-20">
        <div className="py-4">
          <div className="flex items-center justify-center mb-8">
            <div className="h-px bg-border flex-grow max-w-xs" />
            <div className="mx-4 flex items-center">
              <ShoppingBag className="h-5 w-5 text-[#463028] mr-2" />
              <h1 className="text-3xl font-serif font-bold text-[#463028]">Place a New Order</h1>
            </div>
            <div className="h-px bg-border flex-grow max-w-xs" />
          </div>

          <section className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-[#463028]">
              <MapPin className="h-5 w-5" />
              <div>
                <p className="text-sm uppercase tracking-wide text-[#8d6e63]">Delivering to</p>
                <p className="text-base font-semibold">
                  {selectedAddress ? selectedAddress.address_type : addressesLoading ? "Loading…" : "Select address"}
                </p>
                <p className="text-xs text-[#8d6e63] max-w-sm">
                  {selectedAddress
                    ? [selectedAddress.house_apartment_no, selectedAddress.written_address, selectedAddress.city, selectedAddress.pin_code]
                        .filter(Boolean)
                        .join(", ")
                    : addressesError || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary"
                onClick={cycleAddress}
                disabled={!addresses.length}
              >
                Change
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-[#8d6e63]">
              <Clock className="h-4 w-4" />
              <span>Order Date: {formatDate(new Date(orderDate), "PPP")}</span>
            </div>
          </section>

          <div className="sticky top-20 z-10 mb-6">
            <div className="flex justify-center gap-2">
              {MEALS.map((meal) => (
                <button
                  key={meal}
                  onClick={() => {
                    setActiveCategory(activeCategory === meal ? null : meal)
                    const element = document.getElementById(meal)
                    if (!element) return
                    const headerOffset = 160
                    const elementPosition = element.getBoundingClientRect().top
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset
                    window.scrollTo({ top: offsetPosition, behavior: "smooth" })
                  }}
                  className={`px-4 py-1.5 rounded-full border border-primary capitalize font-serif text-sm transition-colors shadow-md ${
                    activeCategory === meal
                      ? "bg-primary text-white"
                      : "bg-[#faf7f2] text-primary hover:bg-primary hover:text-white"
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>

          {menuError && (
            <div className="mx-auto mb-6 max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
              {menuError}
            </div>
          )}

          {isMenuLoading ? (
            <div className="py-12 text-center text-sm text-[#8d6e63]">Loading menu…</div>
          ) : (
            <div className="px-4 md:px-16">
              <div className="grid grid-cols-1 gap-16">
                {MEALS.map((meal) => (
                  <div key={meal} id={meal}>
                    <h2 className="text-xl font-semibold text-[#463028] mb-4 capitalize font-serif">
                      {meal}
                    </h2>
                    {menuByMeal[meal]?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {menuByMeal[meal].map((item) => {
                          const currentQty = quantities[item.menu_item_id] ?? 0
                          const isSoldOut = item.available_qty <= 0
                          const reachedLimit = currentQty >= item.available_qty

                          return (
                            <div
                              key={item.menu_item_id}
                              className={`flex bg-[#faf7f2] border-2 border-[#e6dfd0] rounded-lg overflow-hidden h-[120px] shadow-sm transition-shadow duration-200 cursor-pointer ${
                                isSoldOut ? "opacity-60" : "hover:shadow-md"
                              }`}
                              onClick={() => !isSoldOut && openPopup(item)}
                            >
                              <div className="w-[120px] h-[120px] flex-shrink-0 bg-muted">
                                <Image
                                  src={item.picture_url || PLACEHOLDER_IMAGE}
                                  alt={item.item_name}
                                  width={120}
                                  height={120}
                                  className="object-cover h-full w-full"
                                />
                              </div>
                              <div className="flex-1 p-3 relative">
                                <h3 className="font-medium text-[#463028] text-sm">{item.item_name}</h3>
                                <p className="text-xs text-[#8d6e63] mt-1 line-clamp-2">
                                  {item.description || "Delicious kitchen special"}
                                </p>
                                <div className="mt-2 text-sm font-semibold text-[#463028]">
                                  {currency(item.rate)}
                                </div>
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 border-primary text-primary hover:bg-primary hover:text-white"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      decrementItem(item)
                                    }}
                                    disabled={currentQty === 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-sm text-primary font-medium min-w-[20px] text-center">
                                    {currentQty}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 border-primary text-primary hover:bg-primary hover:text-white"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      incrementItem(item)
                                    }}
                                    disabled={isSoldOut || reachedLimit}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                {reachedLimit && (
                                  <span className="absolute top-3 right-3 text-[0.65rem] font-medium text-[#c75b39]">
                                    Max {item.available_qty}
                                  </span>
                                )}
                                {isSoldOut && (
                                  <span className="absolute top-3 right-3 text-[0.65rem] font-medium text-[#c75b39]">
                                    Sold out
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[#8d6e63]">
                        No {meal} items available for today.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-3xl rounded-3xl border border-primary/30 bg-white/95 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#463028]">
                  {cartTotals.totalQuantity} item{cartTotals.totalQuantity === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-[#8d6e63]">
                  Total {currency(cartTotals.totalPrice)} · Delivery to {selectedAddress?.address_type ?? "Select"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden md:inline-flex"
                onClick={() => setQuantities({})}
                disabled={!cartSelection.length}
              >
                Clear
              </Button>
              <Button onClick={handleReviewCart} disabled={!cartSelection.length}>
                Review Cart
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && handleClosePopup()}>
        <DialogContent
          onInteractOutside={(event) => {
            event.preventDefault()
            handleClosePopup()
          }}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>{selectedItem?.item_name}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-dashed border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-[#463028]">{selectedItem.meal}</p>
                  <p className="text-xs text-[#8d6e63]">Available: {selectedItem.available_qty}</p>
                </div>
                <span className="font-semibold text-primary">{currency(selectedItem.rate)}</span>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePopupQuantityChange(selectedItem, -1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-semibold text-[#463028]">
                  {popupQuantities[selectedItem.menu_item_id] ?? quantities[selectedItem.menu_item_id] ?? 0}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePopupQuantityChange(selectedItem, 1)}
                  disabled={
                    (popupQuantities[selectedItem.menu_item_id] ?? quantities[selectedItem.menu_item_id] ?? 0) >=
                    selectedItem.available_qty
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleClosePopup(true)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirmPopup}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmLeaveOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmLeaveOpen(false)
            pendingNavigationRef.current = null
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Leave this page?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8d6e63]">
            Leaving will clear your current cart selections. Are you sure you want to continue?
          </p>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmLeaveOpen(false)
                pendingNavigationRef.current = null
              }}
            >
              Stay here
            </Button>
            <Button
              onClick={() => {
                const action = pendingNavigationRef.current
                setConfirmLeaveOpen(false)
                setShouldWarnOnExit(false)
                pendingNavigationRef.current = null
                localStorage.removeItem(CART_STORAGE_KEY)
                localStorage.removeItem(CART_CONTEXT_KEY)
                action?.()
              }}
            >
              Leave page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmLeaveOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmLeaveOpen(false)
            pendingNavigationRef.current = null
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Leave this page?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8d6e63]">
            Leaving will clear your current cart selections. Continue?
          </p>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmLeaveOpen(false)
                pendingNavigationRef.current = null
              }}
            >
              Stay here
            </Button>
            <Button
              onClick={() => {
                const action = pendingNavigationRef.current
                setConfirmLeaveOpen(false)
                setShouldWarnOnExit(false)
                pendingNavigationRef.current = null
                localStorage.removeItem(CART_STORAGE_KEY)
                localStorage.removeItem(CART_CONTEXT_KEY)
                action?.()
              }}
            >
              Leave page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function createMenuItemMap(menuByMeal: Record<MealType, MenuItem[]>) {
  const map: Record<number, MenuItem> = {}
  MEALS.forEach((meal) => {
    menuByMeal[meal]?.forEach((item) => {
      map[item.menu_item_id] = item
    })
  })
  return map
}
