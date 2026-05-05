"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { AdminLayout } from "@/components/admin-layout";
import { DatePickerWithPresets } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { http } from "@/lib/http";
import { useAuthStore } from "@/store/store";
import { getCityLabel, getSupportedMeals } from "@/config/cities";

type MealName = "Breakfast" | "Lunch" | "Dinner";

type PackingItem = {
  item_id: number;
  item_name: string;
  order_units: number;
  uom_customer?: string | null;
  unit_packing?: number | null;
  uom_packing?: string | null;
};

type PackingIssue = {
  type: string;
  parent_name: string;
  item_name?: string | null;
  component_type_name?: string | null;
  required_units: number;
  detail?: string | null;
};

type PackingMeal = {
  meal: MealName;
  is_released: boolean;
  is_production_generated: boolean;
  items: PackingItem[];
  issues: PackingIssue[];
};

type PackingPlanResponse = {
  date: string;
  city_code: string;
  period_type?: string | null;
  meals: PackingMeal[];
};

const formatQuantity = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, "");
};

const normalizeDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getPackingTotal = (item: PackingItem) =>
  Number(item.order_units || 0) * Number(item.unit_packing || 0);

const getPackCount = (item: PackingItem) => Number(item.order_units || 0);

const getPackSizeLabel = (item: PackingItem) => {
  if (item.unit_packing == null || !item.uom_packing) return "—";
  return `${formatQuantity(item.unit_packing)} ${item.uom_packing}`;
};

const buildPrintMarkup = (
  plan: PackingPlanResponse | null,
  visibleMeals: MealName[],
  cityLabel: string,
) => {
  const sections =
    plan?.meals
      .filter((meal) => visibleMeals.includes(meal.meal))
      .map((meal) => {
        const rows =
          meal.items.length > 0
            ? meal.items
                .map(
                  (item) => `
            <tr>
              <td>${item.item_name}</td>
              <td>${formatQuantity(item.order_units)} ${item.uom_customer ?? ""}</td>
              <td>${getPackSizeLabel(item)}</td>
              <td>${formatQuantity(getPackCount(item))}</td>
            </tr>
          `,
                )
                .join("")
            : `<tr><td colspan="4">No packing quantity for this meal.</td></tr>`;

        const issues =
          meal.issues.length > 0
            ? `
          <div class="issues">
            <h4>Issues</h4>
            <ul>
              ${meal.issues
                .map(
                  (issue) =>
                    `<li>${issue.parent_name}: ${issue.component_type_name || issue.item_name || issue.detail || issue.type}</li>`,
                )
                .join("")}
            </ul>
          </div>
        `
            : "";

        return `
        <section class="meal">
          <div class="meal-header">
            <h2>${meal.meal}</h2>
            <span>${meal.is_released ? "Released" : "Not Released"}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Order Units</th>
                <th>Each Pack Size</th>
                <th>No. of Packs</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${issues}
        </section>
      `;
      })
      .join("") ?? "";

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Packing Plan · ${plan?.date ?? ""}</title>
      <style>
        body { font-family: Inter, Arial, sans-serif; padding: 24px; color: #1f2937; }
        h1 { margin: 0 0 8px; }
        .meta { color: #6b7280; margin-bottom: 24px; }
        .meal { margin-bottom: 32px; page-break-inside: avoid; }
        .meal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
        th { background: #f9fafb; }
        .issues { margin-top: 12px; }
        .issues h4 { margin: 0 0 8px; font-size: 14px; }
        .issues ul { margin: 0; padding-left: 18px; color: #92400e; }
      </style>
    </head>
    <body>
      <h1>Packing Plan</h1>
      <div class="meta">${cityLabel} · ${plan?.date ?? ""}</div>
      ${sections || "<p>No packing items found.</p>"}
      <script>
        window.addEventListener("load", () => setTimeout(() => window.print(), 150));
      </script>
    </body>
  </html>`;
};

function PackingPlanPageContent() {
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");
  const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeDate(new Date()));
  const [plan, setPlan] = useState<PackingPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealName>("Breakfast");

  const cityLabel = getCityLabel(adminCity);
  const selectedDateISO = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);
  const visibleMeals = useMemo<MealName[]>(
    () =>
      getSupportedMeals(adminCity)
        .filter((meal) => meal !== "condiments")
        .map((meal) => (meal.charAt(0).toUpperCase() + meal.slice(1)) as MealName),
    [adminCity],
  );

  useEffect(() => {
    if (!visibleMeals.length) return;
    if (!visibleMeals.includes(selectedMeal)) {
      setSelectedMeal(visibleMeals[0]);
    }
  }, [selectedMeal, visibleMeals]);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        date: selectedDateISO,
        city_code: adminCity,
        period_type: "one_day",
      });
      const response = await http.get(`/api/production/day-plan?${params.toString()}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = (await response.json()) as PackingPlanResponse;
      setPlan(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Unable to load packing plan.");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDateISO, adminCity]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined") return;
    const nextWindow = window.open("", "_blank", "noopener=yes,width=1024,height=768");
    if (!nextWindow) return;
    nextWindow.document.write(buildPrintMarkup(plan, [selectedMeal], cityLabel));
    nextWindow.document.close();
    nextWindow.focus();
  }, [plan, selectedMeal, cityLabel]);

  const summaryCards = useMemo(
    () =>
      visibleMeals.map((meal) => {
        const mealData = plan?.meals.find((entry) => entry.meal === meal) ?? null;
        return {
          meal,
          itemCount: mealData?.items.length ?? 0,
          issueCount: mealData?.issues.length ?? 0,
          isReleased: Boolean(mealData?.is_released),
          isProductionExported: Boolean(mealData?.is_production_generated),
          totalPackingQty: (mealData?.items ?? []).reduce(
            (sum, item) => sum + getPackingTotal(item),
            0,
          ),
        };
      }),
    [plan?.meals, visibleMeals],
  );

  const selectedMealData = useMemo(
    () => plan?.meals.find((entry) => entry.meal === selectedMeal) ?? null,
    [plan?.meals, selectedMeal],
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-border shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Packing Plan</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Uses order units and pack size to show how much of each item needs to be packed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DatePickerWithPresets
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(normalizeDate(date))}
              showQuickSelect={false}
            />
            <Button variant="outline" onClick={() => void loadPlan()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!selectedMealData || !selectedMealData.is_production_generated}
            >
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {cityLabel} · {selectedDateISO}
          </p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <Card
            key={card.meal}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedMeal(card.meal)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedMeal(card.meal);
              }
            }}
            className={[
              "cursor-pointer border shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              card.meal === selectedMeal
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
              !card.isProductionExported ? "opacity-70" : "",
            ].join(" ")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{card.meal}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Production exported</span>
                <Badge variant={card.isProductionExported ? "default" : "secondary"}>
                  {card.isProductionExported ? "Yes" : "Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Packing items</span>
                <span className="font-medium text-foreground">{card.itemCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>No. of packs</span>
                <span className="font-medium text-foreground">
                  {formatQuantity(
                    (plan?.meals.find((entry) => entry.meal === card.meal)?.items ?? []).reduce(
                      (sum, item) => sum + getPackCount(item),
                      0,
                    ),
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Issues</span>
                <span className="font-medium text-foreground">{card.issueCount}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{selectedMeal}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Final quantity is shown in packing UOM.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={selectedMealData?.is_production_generated ? "default" : "secondary"}>
              {selectedMealData?.is_production_generated
                ? "Production Exported"
                : "Production Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedMealData?.is_production_generated ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Packing is locked until production is exported.
              </p>
              <p className="mt-1 text-sm text-amber-900">
                Export the {selectedMeal} production plan for {selectedDateISO} first, then packing
                will be enabled for this day.
              </p>
            </div>
          ) : selectedMealData.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packing quantity yet for this meal.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Item</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Order Units</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Each Pack Size</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">No. of Packs</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMealData.items.map((item) => (
                    <tr key={`${selectedMeal}-${item.item_id}`} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">{item.item_name}</td>
                      <td className="py-3 pr-4">
                        {formatQuantity(item.order_units)} {item.uom_customer ?? ""}
                      </td>
                      <td className="py-3 pr-4">{getPackSizeLabel(item)}</td>
                      <td className="py-3 pr-4 font-semibold text-foreground">
                        {formatQuantity(getPackCount(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedMealData?.issues.length ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Unresolved items</p>
              <ul className="mt-2 space-y-2 text-sm text-amber-900">
                {selectedMealData.issues.map((issue, index) => (
                  <li key={`${selectedMeal}-issue-${index}`}>
                    <span className="font-medium">{issue.parent_name}</span>
                    {": "}
                    {issue.component_type_name || issue.item_name || issue.detail || issue.type}
                    {issue.required_units > 0
                      ? ` · ${formatQuantity(issue.required_units)} customer units`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PackingPlanPage() {
  return (
    <AdminLayout activePage="packing">
      <PackingPlanPageContent />
    </AdminLayout>
  );
}
