"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format as formatDate } from "date-fns";
import { ShoppingCart, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MealType = "breakfast" | "lunch" | "dinner" | "condiments";

interface MenuItem {
  menu_item_id?: number;
  item_id: number;
  item_name: string;
  category_id: number | null;
  planned_qty: number;
  available_qty: number;
  rate: number;
  is_default: boolean;
  sort_order: number;
  picture_url?: string | null; // ✅ added for thumbnails
}

interface MenuSectionResponse {
  menu_id: number | null;
  is_released: boolean;
  items: MenuItem[];
}

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "condiments"];
const DINNER_CUTOFF_HOUR = 18; // 6 PM local time

export default function CustomerDailyMenu() {
  const router = useRouter();

  // Date state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<Date | null>(null);

  // Data
  const [itemsByMeal, setItemsByMeal] = useState<Record<MealType, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  });
  const [isReleasedByMeal, setIsReleasedByMeal] = useState<
    Record<MealType, boolean>
  >({
    breakfast: false,
    lunch: false,
    dinner: false,
    condiments: false,
  });
  const [loading, setLoading] = useState(false);

  // Cart
  type CartLine = {
    meal: MealType;
    item_id: number;
    item_name: string;
    qty: number;
    rate: number;
  };
  const [cart, setCart] = useState<CartLine[]>([]);
  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.qty * l.rate, 0),
    [cart]
  );

  // Helpers
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = () => startOfDay(new Date());
  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return startOfDay(d);
  };
  const formatISODate = (d: Date) => formatDate(d, "yyyy-MM-dd");
  const inr = (n: number) => `₹${n.toFixed(2)}`;
  const fmtBtnDate = (d: Date) => formatDate(d, "EEE, MMM d"); // e.g., Tue, Oct 8

  // Default: before 6 PM => today; else tomorrow
  useEffect(() => {
    const now = new Date();
    const defaultDate =
      now.getHours() >= DINNER_CUTOFF_HOUR ? tomorrow() : today();
    setSelectedDate(defaultDate);
    setConfirmedDate(defaultDate);
  }, []);

  // Fetch released menus for the confirmed date
  useEffect(() => {
    if (!confirmedDate) return;
    const run = async () => {
      setLoading(true);
      try {
        const nextItems: Partial<Record<MealType, MenuItem[]>> = {};
        const nextReleased: Partial<Record<MealType, boolean>> = {};
        const date = formatISODate(confirmedDate);

        await Promise.all(
          MEALS.map(async (meal) => {
            const url = new URL("http://localhost:8000/api/menu");
            url.searchParams.set("date", date);
            url.searchParams.set("bld_type", meal);
            url.searchParams.set("period_type", "one_day");

            const res = await fetch(url.toString());
            if (res.status === 404) {
              nextItems[meal] = [];
              nextReleased[meal] = false;
              return;
            }
            if (!res.ok) throw new Error(`Failed to fetch ${meal}`);

            const data: MenuSectionResponse = await res.json();
            // ✅ keep picture_url if backend returns it
            nextItems[meal] = (data.items ?? []).map((it: any) => ({
              ...it,
              picture_url: it.picture_url ?? null,
            }));
            nextReleased[meal] = data.is_released ?? false;
          })
        );

        setItemsByMeal({
          breakfast: nextItems.breakfast ?? [],
          lunch: nextItems.lunch ?? [],
          dinner: nextItems.dinner ?? [],
          condiments: nextItems.condiments ?? [],
        });

        setIsReleasedByMeal({
          breakfast: !!nextReleased.breakfast,
          lunch: !!nextReleased.lunch,
          dinner: !!nextReleased.dinner,
          condiments: !!nextReleased.condiments,
        });

        setCart([]); // clear cart when date changes
      } catch (e) {
        console.error(e);
        setItemsByMeal({
          breakfast: [],
          lunch: [],
          dinner: [],
          condiments: [],
        });
        setIsReleasedByMeal({
          breakfast: false,
          lunch: false,
          dinner: false,
          condiments: false,
        });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [confirmedDate]);

  // Cart ops
  const qtyInCart = (meal: MealType, item_id: number) =>
    cart.find((l) => l.meal === meal && l.item_id === item_id)?.qty ?? 0;

  const canAdd = (meal: MealType, item: MenuItem) => {
    const line = cart.find(
      (l) => l.meal === meal && l.item_id === item.item_id
    );
    const already = line?.qty ?? 0;
    return already < item.available_qty;
  };

  const addOne = (meal: MealType, item: MenuItem) => {
    if (!canAdd(meal, item)) return;
    setCart((prev) => {
      const i = prev.findIndex(
        (l) => l.meal === meal && l.item_id === item.item_id
      );
      if (i === -1)
        return [
          ...prev,
          {
            meal,
            item_id: item.item_id,
            item_name: item.item_name,
            qty: 1,
            rate: item.rate,
          },
        ];
      const copy = [...prev];
      copy[i] = { ...copy[i], qty: copy[i].qty + 1 };
      return copy;
    });
  };

  const removeOne = (meal: MealType, item: MenuItem) => {
    setCart((prev) => {
      const i = prev.findIndex(
        (l) => l.meal === meal && l.item_id === item.item_id
      );
      if (i === -1) return prev;
      const copy = [...prev];
      const newQty = copy[i].qty - 1;
      if (newQty <= 0) copy.splice(i, 1);
      else copy[i] = { ...copy[i], qty: newQty };
      return copy;
    });
  };

  const todayD = today();
  const tomorrowD = tomorrow();

  return (
    <div className="relative w-full max-w-6xl p-4 sm:p-6 pb-40">
      {/* Date controls (no calendar) with dates shown on the buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button
          variant={
            selectedDate &&
            formatISODate(selectedDate) === formatISODate(today())
              ? "default"
              : "outline"
          }
          onClick={() => {
            const d = today();
            setSelectedDate(d);
            setConfirmedDate(d);
          }}
        >
          Today
        </Button>

        <Button
          variant={
            selectedDate &&
            formatISODate(selectedDate) === formatISODate(tomorrow())
              ? "default"
              : "outline"
          }
          onClick={() => {
            const d = tomorrow();
            setSelectedDate(d);
            setConfirmedDate(d);
          }}
        >
          Tomorrow
        </Button>

        {/* Selected date shown next to the buttons */}
        <span className="text-sm text-muted-foreground">
          Selected Date:&nbsp;
          <span className="font-medium">
            {confirmedDate ? formatDate(confirmedDate, "EEE, MMM d") : "—"}
          </span>
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {MEALS.map((meal) => {
          const items = itemsByMeal[meal] ?? [];
          const released = isReleasedByMeal[meal];
          const visibleItems = released ? items : [];

          return (
            <section key={meal}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-semibold capitalize">{meal}</h2>
                {!released && (
                  <Badge variant="outline" className="text-xs">
                    Not released yet
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="text-sm text-muted-foreground">
                  Loading {meal}…
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No items for {meal}.
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleItems.map((it) => {
                    const qty = qtyInCart(meal, it.item_id);
                    const soldOut = it.available_qty <= 0;
                    return (
                      <Card
                        key={`${meal}-${it.item_id}`}
                        className={
                          soldOut
                            ? "overflow-hidden bg-muted/70 border-dashed"
                            : "overflow-hidden"
                        }
                        aria-disabled={soldOut}
                      >
                        <CardContent
                          className={[
                            "flex items-start gap-4 p-4",
                            soldOut
                              ? [
                                  // dim everything
                                  "text-muted-foreground",
                                  // disable interactions except we’ll keep badge visuals intact
                                  "pointer-events-none",
                                  // make buttons look disabled
                                  "[&_button]:opacity-40",
                                  "[&_button]:cursor-not-allowed",
                                  // grayscale only images
                                  "[&_img]:grayscale",
                                  // keep the SOLD OUT badge vivid
                                  "[&_.keep-color]:!bg-red-600",
                                  "[&_.keep-color]:!text-white",
                                  "[&_.keep-color]:opacity-100",
                                ].join(" ")
                              : "",
                          ].join(" ")}
                        >
                          {/* Left thumbnail */}
                          {it.picture_url ? (
                            <img
                              src={it.picture_url}
                              alt={it.item_name}
                              className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-muted grid place-items-center text-muted-foreground text-sm flex-shrink-0">
                              {it.item_name?.charAt(0) ?? "🍽"}
                            </div>
                          )}

                          {/* Middle info */}
                          <div className="min-w-0 flex-1 self-start">
                            <div className="flex items-start justify-between gap-3">
                              <CardTitle className="text-base font-semibold leading-snug break-words pr-3">
                                {it.item_name}
                              </CardTitle>
                            </div>

                            <div className="mt-1 text-xs min-h-[1.25rem]">
                              {soldOut ? (
                                // keep-color => prevents our gray/opacity overrides from muting this
                                <Badge
                                  variant="destructive"
                                  className="keep-color text-xs"
                                >
                                  Sold out
                                </Badge>
                              ) : (
                                <span>Available</span>
                              )}
                            </div>
                            <div className="text-md font-semibold leading-none mt-4">
                              {inr(it.rate)}
                            </div>
                          </div>

                          {/* Right controls */}
                          <div className="flex flex-col items-center gap-1 self-start">
                            {soldOut ? (
                              <div className="text-xs font-medium text-muted-foreground/80">
                                Unavailable
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => removeOne(meal, it)}
                                  disabled={qty === 0}
                                  aria-label="decrease"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>

                                <div className="min-w-[2.5rem] text-center text-sm">
                                  {qty}
                                </div>

                                <Button
                                  size="icon"
                                  variant="default"
                                  className="h-8 w-8"
                                  onClick={() => addOne(meal, it)}
                                  disabled={!canAdd(meal, it)}
                                  aria-label="increase"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Fixed cart bar — always visible, page scrolls behind */}

      <div className="sticky bottom-4 mt-10">
        <Card className="border-primary/30 shadow-lg">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <div className="text-sm">
                <span className="font-medium">
                  {cart.reduce((a, l) => a + l.qty, 0)}
                </span>{" "}
                items • <span className="font-semibold">{inr(subtotal)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCart([])}
                disabled={cart.length === 0}
              >
                Clear
              </Button>
              <Button onClick={() => router.push("/cart")}>Place Order</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
