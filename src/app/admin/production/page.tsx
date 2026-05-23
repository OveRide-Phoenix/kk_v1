"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

import { AdminLayout } from "@/components/admin-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DatePickerWithPresets } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  buffer_percentage: number;
  buffer_quantity: number;
  with_buffer_quantity: number;
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
  buffer_override_pct: number | null;
  items: ProductionItem[];
  issues: ProductionIssue[];
};

type ProductionPlanResponse = {
  date: string;
  city_code: string;
  period_type?: string | null;
  meals: ProductionMeal[];
};

// Only these UOMs are treated as whole-unit (pieces) and get ceiling rounding
const PIECE_UNITS = new Set(["pcs", "pc", "piece", "pieces", "no", "nos", "unit", "units"]);

const isPieceUnit = (uom: string | null | undefined): boolean => {
  if (!uom) return false;
  return PIECE_UNITS.has(uom.toLowerCase().trim());
};

const formatQuantity = (value: number, uom?: string | null) => {
  if (!Number.isFinite(value)) return "0";
  if (isPieceUnit(uom)) return String(Math.ceil(value));
  const ceiled2dp = Math.ceil(value * 100) / 100;
  return Number.isInteger(ceiled2dp) ? String(ceiled2dp) : ceiled2dp.toFixed(2).replace(/0+$/, "");
};

// Same rounding logic as formatQuantity but returns a number for storage
const roundedQty = (value: number, uom: string | null | undefined): number => {
  if (!Number.isFinite(value)) return 0;
  if (isPieceUnit(uom)) return Math.ceil(value);
  return Math.ceil(value * 100) / 100;
};

const parseBufferInput = (raw: string): number | null => {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && raw.trim() !== "" ? Math.max(0, parsed) : null;
};

const normalizeDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const describeIssue = (issue: ProductionIssue) => {
  const componentLabel = issue.component_type_name || issue.item_name || "component";
  if (issue.type === "unresolved_generic_component") {
    return `No default item is set for the ${componentLabel} item group in Daily Menu for this meal, so production cannot resolve ${issue.parent_name} into a concrete item.`;
  }
  if (issue.type === "missing_item_configuration") {
    return `${issue.parent_name} is missing production setup such as packing quantity, conversion rate, or production UOM.`;
  }
  return issue.detail || `Production could not calculate ${issue.parent_name}.`;
};

// Compute effective buffer % and derived quantities for an item given a global override
function applyBuffer(
  item: ProductionItem,
  globalBufferPct: number | null,
): { effectivePct: number; bufferQty: number; finalQty: number } {
  const effectivePct = globalBufferPct !== null ? globalBufferPct : item.buffer_percentage;
  const bufferQty = item.production_quantity * (effectivePct / 100);
  const finalQty = item.production_quantity + bufferQty;
  return {
    effectivePct,
    bufferQty,
    finalQty,
  };
}

function KitchenProductionPageContent() {
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");
  const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeDate(new Date()));
  const [plan, setPlan] = useState<ProductionPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"finalize" | "reopen" | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealName>("Breakfast");
  const [bufferInputs, setBufferInputs] = useState<Record<MealName, string>>({
    Breakfast: "",
    Lunch: "",
    Dinner: "",
  });
  const printTargetRef = useRef<HTMLDivElement>(null);
  const hasUnsavedBufferRef = useRef(false);

  const bufferPctByMeal = useMemo<Record<MealName, number | null>>(() => {
    const result = {} as Record<MealName, number | null>;
    for (const meal of ["Breakfast", "Lunch", "Dinner"] as MealName[]) {
      result[meal] = parseBufferInput(bufferInputs[meal] ?? "");
    }
    return result;
  }, [bufferInputs]);

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

  // Sync buffer inputs from saved DB values whenever the plan loads
  useEffect(() => {
    if (!plan) return;
    setBufferInputs((prev) => {
      const next = { ...prev };
      for (const mealData of plan.meals) {
        const meal = mealData.meal as MealName;
        next[meal] =
          mealData.buffer_override_pct !== null && mealData.buffer_override_pct !== undefined
            ? String(mealData.buffer_override_pct)
            : "";
      }
      return next;
    });
  }, [plan]);

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined" || !printTargetRef.current) return;
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        [data-print-target], [data-print-target] * { visibility: visible !important; }
        [data-print-target] { position: fixed !important; inset: 0 !important; padding: 24px !important; overflow: visible !important; }
      }
    `;
    document.head.appendChild(style);
    window.addEventListener("afterprint", () => document.head.removeChild(style), { once: true });
    window.print();
  }, []);

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

        const body: Record<string, unknown> = {
          date: selectedDateISO,
          menu_type: selectedMeal,
          city_code: adminCity,
        };

        if (kind === "finalize" && targetMeal.items.length > 0) {
          const mealBufferPct = bufferPctByMeal[selectedMeal];
          body.buffer_override_pct = mealBufferPct;
          body.plans = targetMeal.items.map((item) => {
            const { bufferQty } = applyBuffer(item, mealBufferPct);
            const base = roundedQty(item.production_quantity, item.uom_production);
            const buffer = roundedQty(bufferQty, item.uom_production);
            const final = roundedQty(base + buffer, item.uom_production);
            return {
              item_name: item.item_name,
              planned_quantity: base,
              buffer_quantity: buffer,
              final_quantity: final,
              available_quantity: final,
            };
          });
        }

        const response = await http.post(endpoint, body);
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
    [adminCity, bufferPctByMeal, loadPlan, plan?.meals, selectedDateISO, selectedMeal],
  );

  const summaryCards = useMemo(
    () =>
      visibleMeals.map((meal) => {
        const mealData = plan?.meals.find((entry) => entry.meal === meal) ?? null;
        const storedBuffer = mealData?.buffer_override_pct ?? null;
        const currentBuffer = bufferPctByMeal[meal];
        const isBufferDirty = storedBuffer !== currentBuffer;
        return {
          meal,
          itemCount: mealData?.items.length ?? 0,
          issueCount: mealData?.issues.length ?? 0,
          isReleased: Boolean(mealData?.is_released),
          isExported: Boolean(mealData?.is_production_generated),
          isBufferDirty,
        };
      }),
    [plan?.meals, visibleMeals, bufferPctByMeal],
  );

  const hasUnsavedBuffer = useMemo(
    () => summaryCards.some((card) => card.isBufferDirty),
    [summaryCards],
  );

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    hasUnsavedBufferRef.current = hasUnsavedBuffer;
  }, [hasUnsavedBuffer]);

  const handleBufferInputChange = useCallback(
    (meal: MealName, value: string) => {
      setBufferInputs((prev) => {
        const next = { ...prev, [meal]: value };
        hasUnsavedBufferRef.current = visibleMeals.some((visibleMeal) => {
          const mealData = plan?.meals.find((entry) => entry.meal === visibleMeal) ?? null;
          const storedBuffer = mealData?.buffer_override_pct ?? null;
          return storedBuffer !== parseBufferInput(next[visibleMeal] ?? "");
        });
        return next;
      });
    },
    [plan?.meals, visibleMeals],
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!hasUnsavedBufferRef.current) return;
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
      setLeaveDialogOpen(true);
    };

    // Catch keyboard reload shortcuts (F5, Ctrl+R, Cmd+R)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasUnsavedBufferRef.current) return;
      const isReload = e.key === "F5" || (e.key === "r" && (e.ctrlKey || e.metaKey));
      if (!isReload) return;
      e.preventDefault();
      setPendingHref(null); // null = reload, not navigate
      setLeaveDialogOpen(true);
    };

    // Use window (above document) in capture so we fire before Next.js's router handler
    window.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedMealData = useMemo(
    () => plan?.meals.find((entry) => entry.meal === selectedMeal) ?? null,
    [plan?.meals, selectedMeal],
  );

  return (
    <div ref={printTargetRef} data-print-target className="flex flex-col gap-6">
      <Card className="border border-border shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Kitchen Production Plan</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Base production quantity ={" "}
              <code>orders × unit_packing × packing_to_production_rate</code>. Buffer is applied on
              top of the base quantity. Final Qty = Base + Buffer.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <DatePickerWithPresets
                selectedDate={selectedDate}
                onSelectDate={(date) => setSelectedDate(normalizeDate(date))}
                showQuickSelect={false}
              />
              <Button variant="outline" onClick={() => void loadPlan()} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
              <Button variant="outline" onClick={handlePrint} disabled={!plan}>
                Print
              </Button>
            </div>
            <div className="flex flex-col items-end gap-1">
              {selectedMealData?.is_production_generated ? (
                <Button
                  variant="outline"
                  onClick={() => void callMealAction("reopen")}
                  disabled={actionPending !== null}
                >
                  {actionPending === "reopen" ? "Reopening…" : `Reopen ${selectedMeal}`}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => void callMealAction("finalize")}
                    disabled={
                      actionPending !== null ||
                      !selectedMealData?.is_released ||
                      (selectedMealData?.issues?.length ?? 0) > 0
                    }
                  >
                    {actionPending === "finalize" ? "Marking…" : `Export ${selectedMeal}`}
                  </Button>
                  {(selectedMealData?.issues?.length ?? 0) > 0 && (
                    <p className="text-xs text-amber-600">Resolve all issues before exporting</p>
                  )}
                </>
              )}
            </div>
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
              card.meal === selectedMeal
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
              !card.isExported ? "border-2 border-dashed" : "",
            ].join(" ")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-base">
                {card.meal}
                {card.issueCount > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              </CardTitle>
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
              <div
                className="flex items-center justify-between pt-1"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1">
                  <Label
                    htmlFor={`buffer-${card.meal}`}
                    className={[
                      "text-sm cursor-default",
                      card.isExported ? "text-muted-foreground/50" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    Buffer %
                  </Label>
                  {card.isBufferDirty && (
                    <span title="Buffer changed — re-export to apply this value">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    </span>
                  )}
                </div>
                <Input
                  id={`buffer-${card.meal}`}
                  type="text"
                  inputMode="decimal"
                  placeholder={card.isExported ? "Exported" : "Per-item"}
                  value={bufferInputs[card.meal]}
                  disabled={card.isExported}
                  onChange={(e) => handleBufferInputChange(card.meal, e.target.value)}
                  className="h-7 w-24 text-sm"
                />
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
              Final Qty = Base Production Qty + Buffer. Quantities in production UOM.
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
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Item</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Order Units</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Base Prod Qty</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Buffer %</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Buffer Qty</th>
                    <th className="py-3 pr-4 font-medium text-muted-foreground">Final Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMealData.items.map((item) => {
                    const isExported = Boolean(selectedMealData.is_production_generated);
                    const mealBufferPct = bufferPctByMeal[selectedMeal];
                    // Exported: use values stored in DB; otherwise compute client-side
                    const bufferQty = isExported
                      ? item.buffer_quantity
                      : applyBuffer(item, mealBufferPct).bufferQty;
                    const finalQty = isExported
                      ? item.with_buffer_quantity
                      : applyBuffer(item, mealBufferPct).finalQty;
                    // Effective % for display: stored override (exported) or active input
                    const savedOverride = selectedMealData.buffer_override_pct;
                    const effectivePct = isExported
                      ? (savedOverride ?? item.buffer_percentage)
                      : (mealBufferPct ?? item.buffer_percentage);
                    const isOverridden = effectivePct !== item.buffer_percentage;
                    return (
                      <tr
                        key={`${selectedMeal}-${item.item_id}`}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-foreground">{item.item_name}</td>
                        <td className="py-3 pr-4">
                          {formatQuantity(item.order_units, item.uom_customer)}{" "}
                          {item.uom_customer ?? ""}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatQuantity(item.production_quantity, item.uom_production)}{" "}
                          {item.uom_production ?? ""}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={
                              isOverridden ? "font-medium text-amber-700" : "text-muted-foreground"
                            }
                          >
                            {effectivePct.toFixed(1)}%
                          </span>
                          {isOverridden && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (was {item.buffer_percentage.toFixed(1)}%)
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatQuantity(bufferQty, item.uom_production)}{" "}
                          {item.uom_production ?? ""}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-foreground">
                          {formatQuantity(finalQty, item.uom_production)}{" "}
                          {item.uom_production ?? ""}
                        </td>
                      </tr>
                    );
                  })}
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

      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buffer not applied</AlertDialogTitle>
            <AlertDialogDescription>
              You have buffer changes that haven&apos;t been exported yet. If you leave now, those
              changes will be lost. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingHref(null)}>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingHref) {
                  window.location.href = pendingHref;
                } else {
                  window.location.reload();
                }
              }}
            >
              Leave anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
