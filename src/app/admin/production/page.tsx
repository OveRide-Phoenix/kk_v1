"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import {
  mockOrders,
  ProductionItem,
  PublishedMenuItem,
  mockPublishedMenus,
  ProductionPlanStatus,
  mockProductionPlanStatus,
} from "@/data/production-mock";
import { AdminLayout } from "@/components/admin-layout";
import { DatePickerWithPresets } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Category = ProductionItem["category"];

type AggregatedOrderItem = {
  item_name: string;
  unit: string;
  category: Category;
  total: number;
};

type PlanItem = {
  item_name: string;
  unit: string;
  category: Category;
  planned_quantity: number;
  available_quantity: number;
  customer_orders: number;
  base_quantity: number;
  buffer_quantity: number;
  final_quantity: number;
};

type SubscriptionReplacement = {
  group: string;
  default_item: string;
};

type MenuApiItem = {
  item_name?: string;
  name?: string;
  planned_qty?: number;
  available_qty?: number;
  quantity?: number;
  planned_quantity?: number;
  uom?: string;
  unit?: string;
  unit_name?: string;
  measure_unit?: string;
  quantity_uom?: string;
};

type MenuApiResponse = {
  items?: MenuApiItem[];
};

const categories: Category[] = ["Breakfast", "Lunch", "Dinner", "Condiments"];

const createEmptyPlanState = (): Record<Category, PlanItem[]> => ({
  Breakfast: [],
  Lunch: [],
  Dinner: [],
  Condiments: [],
});

const createEmptyAggregatedState = (): Record<Category, AggregatedOrderItem[]> => ({
  Breakfast: [],
  Lunch: [],
  Dinner: [],
  Condiments: [],
});

const createCategoryBooleanState = (value: boolean): Record<Category, boolean> => ({
  Breakfast: value,
  Lunch: value,
  Dinner: value,
  Condiments: value,
});

const mockReplacements: SubscriptionReplacement[] = [
  { group: "Breakfast Combo", default_item: "Masala Dosa" },
];

// ────────────────────────────────────────────────────────────────────────
// utils
// ────────────────────────────────────────────────────────────────────────

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function aggregateOrders(orders: ProductionItem[]): AggregatedOrderItem[] {
  const result: Record<
    string,
    { unit: string; category: Category; total: number; item_name: string }
  > = {};

  orders.forEach((order) => {
    if (order.is_combo && order.combo_items?.length) {
      order.combo_items.forEach((comboItem) => {
        const key = `${order.category}::${comboItem.item_name}`;
        const unit = comboItem.unit ?? order.unit;

        if (!result[key]) {
          result[key] = {
            unit,
            category: order.category,
            total: 0,
            item_name: comboItem.item_name,
          };
        }

        result[key].total += comboItem.quantity * order.quantity;
      });
      return;
    }

    const key = `${order.category}::${order.item_name}`;
    if (!result[key]) {
      result[key] = {
        unit: order.unit,
        category: order.category,
        total: 0,
        item_name: order.item_name,
      };
    }

    result[key].total += order.quantity;
  });

  return Object.values(result).map((entry) => ({
    item_name: entry.item_name,
    unit: entry.unit,
    category: entry.category,
    total: Number(entry.total.toFixed(2)),
  }));
}

function applySubscriptionReplacements(
  orders: ProductionItem[],
  replacements: SubscriptionReplacement[],
): ProductionItem[] {
  if (!replacements.length) return orders;

  return orders.map((order) => {
    const replacement = replacements.find((r) => r.group === order.item_name);
    if (!replacement) return order;
    return {
      ...order,
      item_name: replacement.default_item,
    };
  });
}

function mergeMenuWithOrders(
  menuItems: PublishedMenuItem[],
  aggregatedItems: AggregatedOrderItem[],
): PlanItem[] {
  const aggregatedMap = new Map<string, AggregatedOrderItem>();
  aggregatedItems.forEach((item) => {
    aggregatedMap.set(item.item_name, item);
  });

  const seen = new Set<string>();

  const planItems = menuItems.map((menuItem) => {
    const aggregated = aggregatedMap.get(menuItem.item_name);
    const fallbackOrders = Math.max(
      menuItem.planned_quantity - menuItem.available_quantity,
      0,
    );
    const customerOrders = aggregated ? aggregated.total : fallbackOrders;
    const roundedCustomerOrders = Number(customerOrders.toFixed(2));

    return {
      item_name: menuItem.item_name,
      unit: menuItem.unit,
      category: menuItem.category,
      planned_quantity: Number(menuItem.planned_quantity.toFixed(2)),
      available_quantity: Number(menuItem.available_quantity.toFixed(2)),
      customer_orders: roundedCustomerOrders,
      base_quantity: roundedCustomerOrders,
      buffer_quantity: 0,
      final_quantity: roundedCustomerOrders,
    };
  });

  planItems.forEach((item) => seen.add(item.item_name));

  const additionalItems = aggregatedItems
    .filter((item) => !seen.has(item.item_name))
    .map((item) => {
      const roundedTotal = Number(item.total.toFixed(2));
      return {
        item_name: item.item_name,
        unit: item.unit,
        category: item.category,
        planned_quantity: 0,
        available_quantity: 0,
        customer_orders: roundedTotal,
        base_quantity: roundedTotal,
        buffer_quantity: 0,
        final_quantity: roundedTotal,
      };
    });

  return [...planItems, ...additionalItems];
}

function exportToCSV(data: PlanItem[]) {
  if (!data.length) return;

  const csv = [
    [
      "Item Name",
      "Unit",
      "Planned Quantity",
      "Customer Orders",
      "Buffer Quantity",
      "Final Quantity",
    ].join(","),
    ...data.map((item) =>
      [
        item.item_name,
        item.unit,
        item.planned_quantity,
        item.customer_orders,
        item.buffer_quantity,
        item.final_quantity,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "production_plan.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPrintableMarkup(
  planByCategory: Record<Category, PlanItem[]>,
  dateLabel: string,
  menuAvailability: Record<Category, boolean>,
) {
  const sections = categories
    .map((category) => {
      if (!menuAvailability[category] || !planByCategory[category].length) {
        return "";
      }

      const cards = planByCategory[category]
        .map((item) => {
          const detailRows = [
            `<div><span class="label">Planned Qty</span><span class="value">${escapeHtml(formatQuantity(item.planned_quantity))}</span></div>`,
            `<div><span class="label">Customer orders</span><span class="value">${escapeHtml(formatQuantity(item.customer_orders))}</span></div>`,
            `<div><span class="label">Buffer</span><span class="value">${escapeHtml(formatQuantity(item.buffer_quantity))}</span></div>`,
          ].join("\n    ");

          return `<article class="card">
  <div class="card-top">
    <div>
      <h3 class="card-title">${escapeHtml(item.item_name)}</h3>
      <p class="card-unit">Unit: ${escapeHtml(item.unit)}</p>
    </div>
    <div class="card-final">
      <span class="card-final-label">Final Qty</span>
      <span class="card-final-value">${escapeHtml(formatQuantity(item.final_quantity))}</span>
    </div>
  </div>
  <div class="card-details">
    ${detailRows}
  </div>
</article>`;
        })
        .join("");

      return `<section class="section">
  <header class="section-header">
    <h2>${escapeHtml(category)}</h2>
    <p>${planByCategory[category].length} items scheduled</p>
  </header>
  <div class="cards">${cards}</div>
</section>`;
    })
    .filter(Boolean)
    .join("");

  const bodyContent =
    sections || `<p class="empty">No published items are available for this date.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Kitchen Production Planning · ${escapeHtml(dateLabel)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #1f2937;
        margin: 0;
        padding: 32px;
      }
      h1 {
        font-size: 24px;
        font-weight: 600;
        margin: 0 0 8px;
      }
      .subtitle {
        margin: 0 0 24px;
        color: #64748b;
        font-size: 14px;
      }
      .section {
        margin-top: 32px;
        page-break-inside: avoid;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        color: #0f172a;
      }
      .section-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      .cards {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 8px 20px -16px rgba(15, 23, 42, 0.18);
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .card-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 4px;
        color: #111827;
      }
      .card-unit {
        margin: 0;
        font-size: 12px;
        color: #6b7280;
      }
      .card-final {
        text-align: right;
      }
      .card-final-label {
        font-size: 11px;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        display: block;
      }
      .card-final-value {
        font-size: 22px;
        font-weight: 700;
        color: #111827;
      }
      .card-details {
        display: grid;
        gap: 10px;
        font-size: 14px;
      }
      .card-details div {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .label {
        color: #6b7280;
      }
      .value {
        font-weight: 600;
        color: #111827;
      }
      .empty {
        margin-top: 48px;
        font-size: 16px;
        text-align: center;
        color: #475569;
      }
      @media print {
        body {
          background: #ffffff;
        }
        .card {
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <h1>Kitchen Production Planning</h1>
    <p class="subtitle">Finalised plan for ${escapeHtml(dateLabel)}</p>
    ${bodyContent}
    <script>
      window.addEventListener("load", function () {
        setTimeout(function () {
          window.print();
        }, 250);
      });
    </script>
  </body>
</html>`;
}

function exportCardLayout(
  planByCategory: Record<Category, PlanItem[]>,
  dateLabel: string,
  menuAvailability: Record<Category, boolean>,
) {
  const printableWindow = window.open("", "_blank", "noopener=yes,width=1024,height=768");
  if (!printableWindow) return;

  const markup = buildPrintableMarkup(planByCategory, dateLabel, menuAvailability);
  printableWindow.document.write(markup);
  printableWindow.document.close();
  printableWindow.focus();
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

type PlanItemCardProps = {
  item: PlanItem;
  onBufferChange?: (value: string) => void;
  readOnly?: boolean;
};

type SummaryHighlight = "success" | "info" | "muted" | "none";

type SummaryRowProps = {
  label: string;
  value: string;
  highlight: SummaryHighlight;
};

function SummaryRow({ label, value, highlight }: SummaryRowProps) {
  const highlightClass: Record<Exclude<SummaryHighlight, "none">, string> = {
    success: "border-green-200 bg-green-50 text-green-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    muted: "border-border bg-muted text-muted-foreground",
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      {highlight === "none" ? (
        <span className="font-medium text-foreground">{value}</span>
      ) : (
        <Badge variant="outline" className={`text-xs ${highlightClass[highlight]}`}>
          {value}
        </Badge>
      )}
    </div>
  );
}

function PlanItemCard({ item, onBufferChange, readOnly = false }: PlanItemCardProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {item.item_name}
          </h3>
          <p className="text-xs text-muted-foreground">Unit: {item.unit}</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Final Qty
          </span>
          <p className="text-2xl font-bold text-gray-900">
            {formatQuantity(item.final_quantity)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">Planned Qty</p>
          <p className="font-medium text-gray-900">
            {formatQuantity(item.planned_quantity)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Customer orders</p>
          <p className="font-medium text-gray-900">
            {formatQuantity(item.customer_orders)}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-muted-foreground">Buffer</p>
          {readOnly ? (
            <p className="font-medium text-gray-900">
              {formatQuantity(item.buffer_quantity)}
            </p>
          ) : (
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="mt-1 h-9"
              value={
                Number.isNaN(item.buffer_quantity)
                  ? ""
                  : item.buffer_quantity.toString()
              }
              onChange={(event) => onBufferChange?.(event.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchAggregatedOrders(): Promise<ProductionItem[]> {
  try {
    const response = await fetch("/api/orders/aggregate");
    if (!response.ok) throw new Error("Failed to fetch orders");
    const data = (await response.json()) as ProductionItem[];
    return data;
  } catch (error) {
    console.warn("Falling back to mock orders", error);
    return mockOrders;
  }
}

async function fetchPublishedMenu(date: string): Promise<PublishedMenuItem[]> {
  const collected: PublishedMenuItem[] = [];
  try {
    await Promise.all(
      categories.map(async (category) => {
        const url = new URL("http://localhost:8000/api/menu");
        url.searchParams.set("date", date);
        url.searchParams.set("bld_type", category.toLowerCase());
        url.searchParams.set("period_type", "one_day");

        const response = await fetch(url.toString());
        if (response.status === 404) {
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch published menu for ${category}`);
        }
        const data = (await response.json()) as MenuApiResponse;
        if (!data?.items?.length) return;

        data.items.forEach((item) => {
          const plannedQtyRaw =
            item.planned_qty ?? item.planned_quantity ?? item.quantity ?? 0;
          const availableQtyRaw =
            item.available_qty ?? item.quantity ?? item.available_qty ?? 0;
          const plannedQuantity = Number(plannedQtyRaw) || 0;
          const availableQuantity = Math.max(Number(availableQtyRaw) || 0, 0);
          const unit =
            item.uom ??
            item.unit ??
            item.unit_name ??
            item.measure_unit ??
            item.quantity_uom ??
            "Nos";
          const itemName = item.item_name ?? item.name ?? "Unnamed Item";
          collected.push({
            date,
            item_name: itemName,
            unit,
            planned_quantity: plannedQuantity,
            available_quantity: availableQuantity,
            category,
          });
        });
      }),
    );

    return collected;
  } catch (error) {
    console.warn("Falling back to mock published menu", error);
    return mockPublishedMenus.filter((item) => item.date === date) || [];
  }
}

async function fetchSubscriptionReplacements(): Promise<
  SubscriptionReplacement[]
> {
  try {
    const response = await fetch("/api/subscriptions/replacements");
    if (!response.ok) throw new Error("Failed to fetch replacements");
    const data = (await response.json()) as SubscriptionReplacement[];
    return data;
  } catch (error) {
    console.warn("Falling back to mock subscription replacements", error);
    return mockReplacements;
  }
}

async function fetchProductionPlanStatus(
  date: string,
): Promise<Record<Category, boolean>> {
  const initial = createCategoryBooleanState(false);
  try {
    const response = await fetch(`/api/production-plan/status?date=${date}`);
    if (!response.ok) throw new Error("Failed to fetch production plan status");
    const data = (await response.json()) as ProductionPlanStatus[];
    const mapped = { ...initial };
    data
      .filter((entry) => entry.date === date)
      .forEach((entry) => {
        mapped[entry.category] = entry.is_generated;
      });
    return mapped;
  } catch (error) {
    console.warn("Falling back to mock production plan status", error);
    const mapped = { ...initial };
    mockProductionPlanStatus
      .filter((entry) => entry.date === date)
      .forEach((entry) => {
        mapped[entry.category] = entry.is_generated;
      });
    return mapped;
  }
}

function KitchenProductionPlanningContent() {
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    normalizeDate(new Date()),
  );
  const [selectedCategory, setSelectedCategory] = useState<Category>("Breakfast");
  const [planData, setPlanData] = useState<Record<Category, PlanItem[]>>(
    createEmptyPlanState,
  );
  const [menuAvailability, setMenuAvailability] = useState<
    Record<Category, boolean>
  >(() => createCategoryBooleanState(false));
  const [planGeneratedState, setPlanGeneratedState] = useState<
    Record<Category, boolean>
  >(() => createCategoryBooleanState(false));
  const [savingCategory, setSavingCategory] = useState<Record<Category, boolean>>(
    () => createCategoryBooleanState(false),
  );
  const [lastSavedAt, setLastSavedAt] = useState<Record<Category, number | null>>({
    Breakfast: null,
    Lunch: null,
    Dinner: null,
    Condiments: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [globalBufferDialogOpen, setGlobalBufferDialogOpen] = useState(false);
  const [bufferPercentInput, setBufferPercentInput] = useState("5");
  const [planPreviewOpen, setPlanPreviewOpen] = useState(false);

  const selectedDateISO = useMemo(
    () => format(selectedDate, "yyyy-MM-dd"),
    [selectedDate],
  );

  const selectedDateLabel = useMemo(
    () => format(selectedDate, "PPP"),
    [selectedDate],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [publishedMenu, orders, replacements, planStatus] = await Promise.all([
          fetchPublishedMenu(selectedDateISO),
          fetchAggregatedOrders(),
          fetchSubscriptionReplacements(),
          fetchProductionPlanStatus(selectedDateISO),
        ]);

        const normalizedOrders = applySubscriptionReplacements(
          orders,
          replacements,
        );
        const aggregatedOrders = aggregateOrders(normalizedOrders);
        const aggregatedByCategory = createEmptyAggregatedState();
        aggregatedOrders.forEach((item) => {
          aggregatedByCategory[item.category].push(item);
        });

        const menuByCategory: Record<Category, PublishedMenuItem[]> = {
          Breakfast: [],
          Lunch: [],
          Dinner: [],
          Condiments: [],
        };
        publishedMenu.forEach((item) => {
          menuByCategory[item.category].push(item);
        });

        const availability = createCategoryBooleanState(false);
        const nextState = createEmptyPlanState();

        categories.forEach((category) => {
          const menuItems = menuByCategory[category];
          if (menuItems.length > 0) {
            availability[category] = true;
            nextState[category] = mergeMenuWithOrders(
              menuItems,
              aggregatedByCategory[category],
            );
          } else {
            availability[category] = false;
            nextState[category] = [];
          }
        });

        if (!cancelled) {
          setMenuAvailability(availability);
          setPlanData(nextState);
          setPlanGeneratedState(planStatus);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setLoadError("Unable to load production data.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedDateISO]);

  const flattenedPlan = useMemo(
    () => categories.flatMap((category) => planData[category]),
    [planData],
  );

  const categorySummaries = useMemo(
    () =>
      categories.map((category) => ({
        category,
        items: planData[category].length,
        menuPublished: menuAvailability[category],
        planGenerated: planGeneratedState[category],
      })),
    [planData, menuAvailability, planGeneratedState],
  );

  const quickDateOptions = useMemo(() => {
    const today = normalizeDate(new Date());
    return [
      { label: "Today", date: today },
      { label: "Tomorrow", date: normalizeDate(addDays(today, 1)) },
    ];
  }, []);

  const previewCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          menuAvailability[category] && planData[category].length > 0,
      ),
    [menuAvailability, planData],
  );

  const handleBufferChange = (
    category: Category,
    index: number,
    value: string,
  ) => {
    const numericValue = Number.parseFloat(value);
    const buffer = Number.isNaN(numericValue) ? 0 : numericValue;

    setPlanData((prev) => {
      const updatedCategory = prev[category].map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const finalQuantity = Number((item.customer_orders + buffer).toFixed(2));
        return {
          ...item,
          buffer_quantity: Number(buffer.toFixed(2)),
          final_quantity: finalQuantity,
        };
      });

      return {
        ...prev,
        [category]: updatedCategory,
      };
    });
  };

  const applyGlobalBuffer = () => {
    const percentValue = Number.parseFloat(bufferPercentInput);
    if (Number.isNaN(percentValue)) return;

    setPlanData((prev) => {
      const nextState = createEmptyPlanState();

      categories.forEach((category) => {
        nextState[category] = prev[category].map((item) => {
          const bufferQuantity = Number(
            ((item.customer_orders * percentValue) / 100).toFixed(2),
          );
          const finalQuantity = Number(
            (item.customer_orders + bufferQuantity).toFixed(2),
          );
          return {
            ...item,
            buffer_quantity: bufferQuantity,
            final_quantity: finalQuantity,
          };
        });
      });

      return nextState;
    });
    setGlobalBufferDialogOpen(false);
  };

  const handleExportCSV = () => {
    exportToCSV(flattenedPlan);
  };

  const handleExportPDF = () => {
    exportCardLayout(planData, selectedDateLabel, menuAvailability);
  };

  const handleSaveCategory = async (category: Category) => {
    setSavingCategory((prev) => ({ ...prev, [category]: true }));
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setLastSavedAt((prev) => ({ ...prev, [category]: Date.now() }));
      setPlanGeneratedState((prev) => ({ ...prev, [category]: true }));
    } finally {
      setSavingCategory((prev) => ({ ...prev, [category]: false }));
    }
  };

  const currentItems = planData[selectedCategory];
  const currentMenuAvailable = menuAvailability[selectedCategory];
  const currentPlanGenerated = planGeneratedState[selectedCategory];
  const isSavingCategory = savingCategory[selectedCategory];
  const lastSavedTimestamp = lastSavedAt[selectedCategory];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-card/50 p-4 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Kitchen Production Planning
          </h2>
          <p className="text-sm text-muted-foreground">
            Select a service date, adjust buffers, and save the kitchen plan for each meal.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DatePickerWithPresets
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(normalizeDate(date))}
            showQuickSelect={false}
          />
          {quickDateOptions.map((option) => {
            const isActive = isSameDay(selectedDate, option.date);
            return (
              <Button
                key={option.label}
                size="sm"
                variant={isActive ? "default" : "ghost"}
                onClick={() => setSelectedDate(normalizeDate(option.date))}
              >
                {option.label}
              </Button>
            );
          })}
          <Button
            variant="outline"
            onClick={() => setGlobalBufferDialogOpen(true)}
          >
            Set Global Buffer %
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categorySummaries.map((summary) => {
          const isSelected = summary.category === selectedCategory;
          return (
            <Card
              key={summary.category}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedCategory(summary.category)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedCategory(summary.category);
                }
              }}
              className={cn(
                "border border-border shadow-none transition-colors",
                "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/5 focus-visible:ring-primary"
                  : "hover:border-primary/60",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base font-semibold text-foreground">
                  {summary.category}
                  <Badge variant="secondary" className="text-xs">
                    {summary.items} items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <SummaryRow
                  label="Menu published"
                  value={summary.menuPublished ? "Yes" : "No"}
                  highlight={summary.menuPublished ? "success" : "muted"}
                />
                <SummaryRow
                  label="Items planned"
                  value={`${summary.items}`}
                  highlight="none"
                />
                <SummaryRow
                  label="Plan generated"
                  value={summary.planGenerated ? "Yes" : "Not yet"}
                  highlight={summary.planGenerated ? "info" : "muted"}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="px-4 py-1 text-base font-semibold">
                {selectedCategory}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentItems.length} items · {currentPlanGenerated ? "Plan generated" : "Plan pending"}
              </span>
              {lastSavedTimestamp && (
                <span className="text-xs text-muted-foreground">
                  Last saved {format(new Date(lastSavedTimestamp), "p")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="text-sm text-muted-foreground">Loading…</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveCategory(selectedCategory)}
                disabled={isSavingCategory || !currentMenuAvailable}
              >
                {isSavingCategory ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          {loadError ? (
            <div className="px-4 py-6 text-sm text-red-600">{loadError}</div>
          ) : !currentMenuAvailable ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Menu not planned for {selectedCategory.toLowerCase()} on this date.
            </div>
          ) : currentItems.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No published items for {selectedCategory.toLowerCase()} on this date.
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {currentItems.map((item, index) => (
                <PlanItemCard
                  key={`${item.item_name}-${index}`}
                  item={item}
                  onBufferChange={(value) =>
                    handleBufferChange(selectedCategory, index, value)
                  }
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setPlanPreviewOpen(true)}>Generate Plan</Button>
        </div>
      </div>

      <Dialog
        open={globalBufferDialogOpen}
        onOpenChange={setGlobalBufferDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Global Buffer Percentage</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Buffer %
            </label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={bufferPercentInput}
              onChange={(event) => setBufferPercentInput(event.target.value)}
              placeholder="Enter percentage"
            />
            <p className="text-xs text-muted-foreground">
              Applies the percentage to every item&apos;s base quantity.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGlobalBufferDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={applyGlobalBuffer}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planPreviewOpen} onOpenChange={setPlanPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Production Plan Preview · {selectedDateLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {previewCategories.length === 0 ? (
              <p className="text-muted-foreground">
                Menu not planned for the selected date.
              </p>
            ) : (
              previewCategories.map((category) => {
                const items = planData[category];
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className="px-3 py-1">
                        {category}
                      </Badge>
                      <span className="text-muted-foreground">
                        {items.length} items ·{" "}
                        {planGeneratedState[category] ? "Plan generated" : "Plan pending"}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((item, index) => (
                        <PlanItemCard
                          key={`${item.item_name}-${index}-preview`}
                          item={item}
                          readOnly
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={handleExportCSV}>
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleExportPDF}>
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={() => setPlanPreviewOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function KitchenProductionPlanningPage() {
  return (
    <AdminLayout activePage="production">
      <KitchenProductionPlanningContent />
    </AdminLayout>
  );
}
