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

type ProductionItem = {
  item_id: number;
  item_name: string;
  order_units: number;
  uom_customer?: string | null;
  uom_production?: string | null;
  production_quantity: number;
};

type ProductionIssue = {
  type: string;
  parent_name: string;
  item_name?: string | null;
  component_type_name?: string | null;
  required_units: number;
  detail?: string | null;
};

type ProductionMeal = {
  meal: MealName;
  is_released: boolean;
  is_production_generated: boolean;
  items: ProductionItem[];
  issues: ProductionIssue[];
};

type ProductionPlanResponse = {
  date: string;
  city_code: string;
  period_type?: string | null;
  meals: ProductionMeal[];
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

const describeIssue = (issue: ProductionIssue) => {
  const componentLabel = issue.component_type_name || issue.item_name || "component";
  if (issue.type === "unresolved_generic_component") {
    return `No default ${componentLabel} item is set in Daily Menu for this meal, so production cannot resolve ${issue.parent_name} into a concrete item.`;
  }
  if (issue.type === "missing_item_configuration") {
    return `${issue.parent_name} is missing production setup such as packing quantity, conversion rate, or production UOM.`;
  }
  return issue.detail || `Production could not calculate ${issue.parent_name}.`;
};

const buildPrintMarkup = (
  plan: ProductionPlanResponse | null,
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
              <td>${formatQuantity(item.production_quantity)} ${item.uom_production ?? ""}</td>
            </tr>
          `,
                )
                .join("")
            : `<tr><td colspan="3">No production quantity for this meal.</td></tr>`;

        const issues =
          meal.issues.length > 0
            ? `
          <div class="issues">
            <h4>Issues</h4>
            <ul>
              ${meal.issues
                .map(
                  (issue) =>
                    `<li>${describeIssue(issue)}</li>`,
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
            <span>${meal.is_production_generated ? "Exported" : "Pending"}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Order Units</th>
                <th>Production Qty</th>
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
      <title>Kitchen Production · ${plan?.date ?? ""}</title>
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
      <h1>Kitchen Production Plan</h1>
      <div class="meta">${cityLabel} · ${plan?.date ?? ""}</div>
      ${sections || "<p>No production items found.</p>"}
      <script>
        window.addEventListener("load", () => setTimeout(() => window.print(), 150));
      </script>
    </body>
  </html>`;
};

function KitchenProductionPageContent() {
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");
  const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeDate(new Date()));
  const [plan, setPlan] = useState<ProductionPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"finalize" | "reopen" | null>(null);
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
      const data = (await response.json()) as ProductionPlanResponse;
      setPlan(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Unable to load kitchen production plan.");
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

  const goToDailyMenu = useCallback(
    (meal: MealName) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(
        "dailymenusetup:prefill",
        JSON.stringify({
          date: selectedDateISO,
          bld_type: meal,
        }),
      );
      window.location.href = "/admin/dailymenusetup";
    },
    [selectedDateISO],
  );

  const callMealAction = useCallback(
    async (kind: "finalize" | "reopen") => {
      setActionPending(kind);
      setActionError(null);
      try {
        const targetMeal = plan?.meals.find((entry) => entry.meal === selectedMeal);
        if (!targetMeal?.is_released) {
          throw new Error("Menu not released for selected meal");
        }
        const endpoint =
          kind === "finalize" ? "/api/production/finalize" : "/api/production/reopen";
        const response = await http.post(endpoint, {
          date: selectedDateISO,
          menu_type: selectedMeal,
          city_code: adminCity,
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        await loadPlan();
      } catch (requestError) {
        console.error(requestError);
        setActionError(
          kind === "finalize"
            ? "Unable to mark production as exported."
            : "Unable to reopen production status.",
        );
      } finally {
        setActionPending(null);
      }
    },
    [adminCity, loadPlan, plan?.meals, selectedDateISO, selectedMeal],
  );

  const summaryCards = useMemo(
    () =>
      visibleMeals.map((meal) => {
        const mealData = plan?.meals.find((entry) => entry.meal === meal) ?? null;
        return {
          meal,
          itemCount: mealData?.items.length ?? 0,
          issueCount: mealData?.issues.length ?? 0,
          isReleased: Boolean(mealData?.is_released),
          isExported: Boolean(mealData?.is_production_generated),
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
            <CardTitle>Kitchen Production Plan</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Derived from actual orders and converted to production UOM using
              `orders × unit_packing × packing_to_production_rate`.
              Final display is in production UOM only.
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
            <Button variant="outline" onClick={handlePrint} disabled={!selectedMealData}>
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => void callMealAction("reopen")}
              disabled={actionPending !== null || !selectedMealData?.is_released}
            >
              {actionPending === "reopen" ? "Reopening…" : `Reopen ${selectedMeal}`}
            </Button>
            <Button
              onClick={() => void callMealAction("finalize")}
              disabled={actionPending !== null || !selectedMealData?.is_released}
            >
              {actionPending === "finalize" ? "Marking…" : `Export ${selectedMeal}`}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {cityLabel} · {selectedDateISO}
          </p>
          {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
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
              card.meal === selectedMeal ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              !card.isExported ? "border-2 border-dashed" : "",
            ].join(" ")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{card.meal}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Menu released</span>
                <Badge variant={card.isReleased ? "default" : "outline"}>
                  {card.isReleased ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Exported</span>
                <Badge variant={card.isExported ? "default" : "secondary"}>
                  {card.isExported ? "Yes" : "Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Kitchen items</span>
                <span className="font-medium text-foreground">{card.itemCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Issues</span>
                <span className="font-medium text-foreground">{card.issueCount}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card
        className={[
          "shadow-sm",
          selectedMealData?.is_production_generated
            ? "border border-border"
            : "border-[3px] border-dashed border-primary",
        ].join(" ")}
      >
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{selectedMeal}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Final quantity is shown in production UOM.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={selectedMealData?.is_released ? "default" : "outline"}>
              {selectedMealData?.is_released ? "Released" : "Not Released"}
            </Badge>
            <Badge variant={selectedMealData?.is_production_generated ? "default" : "secondary"}>
              {selectedMealData?.is_production_generated ? "Exported" : "Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedMealData?.is_released ? (
            <p className="text-sm text-muted-foreground">
              Menu not released for this meal on {selectedDateISO}.
            </p>
          ) : selectedMealData.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No production quantity yet for this meal.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Item</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Order Units</th>
                        <th className="py-3 pr-4 font-medium text-muted-foreground">Production Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMealData.items.map((item) => (
                    <tr key={`${selectedMeal}-${item.item_id}`} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">{item.item_name}</td>
                      <td className="py-3 pr-4">
                        {formatQuantity(item.order_units)} {item.uom_customer ?? ""}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-foreground">
                        {formatQuantity(item.production_quantity)} {item.uom_production ?? ""}
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
                  <li
                    key={`${selectedMeal}-issue-${index}`}
                    className="rounded-md border border-amber-200 bg-white/60 p-3"
                  >
                    <div className="font-medium">{issue.parent_name}</div>
                    <div className="mt-1">
                      {describeIssue(issue)}
                      {issue.required_units > 0
                        ? ` Required quantity affected: ${formatQuantity(issue.required_units)} customer units.`
                        : ""}
                    </div>
                    {issue.detail && issue.detail !== describeIssue(issue) ? (
                      <div className="mt-1 text-xs text-amber-800">{issue.detail}</div>
                    ) : null}
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => goToDailyMenu(selectedMeal)}
                      >
                        Go to Daily Menu
                      </Button>
                    </div>
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

export default function KitchenProductionPlanningPage() {
  return (
    <AdminLayout activePage="production">
      <KitchenProductionPageContent />
    </AdminLayout>
  );
}
