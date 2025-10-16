"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import {
  mockOrders,
  ProductionItem,
  PublishedMenuItem,
  mockPublishedMenus,
} from "@/data/production-mock";
import { AdminLayout } from "@/components/admin-layout";
import { DatePickerWithPresets } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return menuItems.map((menuItem) => {
    const aggregated = aggregatedMap.get(menuItem.item_name);
    const baseQuantity = aggregated
      ? aggregated.total
      : menuItem.planned_quantity;

    return {
      item_name: menuItem.item_name,
      unit: menuItem.unit,
      category: menuItem.category,
      planned_quantity: Number(menuItem.planned_quantity.toFixed(2)),
      base_quantity: Number(baseQuantity.toFixed(2)),
      buffer_quantity: 0,
      final_quantity: Number(baseQuantity.toFixed(2)),
    };
  });
}

function exportToCSV(data: PlanItem[]) {
  if (!data.length) return;

  const csv = [
    [
      "Item Name",
      "Unit",
      "Planned Quantity",
      "Base Quantity",
      "Buffer Quantity",
      "Final Quantity",
    ].join(","),
    ...data.map((item) =>
      [
        item.item_name,
        item.unit,
        item.planned_quantity,
        item.base_quantity,
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
        .map(
          (item) => `<article class="card">
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
    <div><span class="label">Planned</span><span class="value">${escapeHtml(formatQuantity(item.planned_quantity))}</span></div>
    <div><span class="label">Base Orders</span><span class="value">${escapeHtml(formatQuantity(item.base_quantity))}</span></div>
    <div><span class="label">Buffer</span><span class="value">${escapeHtml(formatQuantity(item.buffer_quantity))}</span></div>
  </div>
</article>`,
        )
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
        color: #b91c1c;
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
        border: 1px solid #fecaca;
        border-radius: 16px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 12px 24px -18px rgba(185, 28, 28, 0.35);
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
        color: #b91c1c;
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

function PlanItemCard({ item, onBufferChange, readOnly = false }: PlanItemCardProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-red-100 bg-white p-4 shadow-sm">
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
          <p className="text-muted-foreground">Planned</p>
          <p className="font-medium text-gray-900">
            {formatQuantity(item.planned_quantity)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Base Orders</p>
          <p className="font-medium text-gray-900">
            {formatQuantity(item.base_quantity)}
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
            item.planned_qty ??
            item.available_qty ??
            item.quantity ??
            item.planned_quantity ??
            0;
          const plannedQuantity = Number(plannedQtyRaw) || 0;
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
            category,
          });
        });
      }),
    );

    return collected;
  } catch (error) {
    console.warn("Falling back to mock published menu", error);
    return mockPublishedMenus.filter((menu) => menu.date === date);
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

function KitchenProductionPlanningContent() {
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    normalizeDate(new Date()),
  );
  const [activeTab, setActiveTab] = useState<Category>("Breakfast");
  const [planData, setPlanData] = useState<Record<Category, PlanItem[]>>(
    createEmptyPlanState,
  );
  const [menuAvailability, setMenuAvailability] = useState<
    Record<Category, boolean>
  >(() => createCategoryBooleanState(false));
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
        const [publishedMenu, orders, replacements] = await Promise.all([
          fetchPublishedMenu(selectedDateISO),
          fetchAggregatedOrders(),
          fetchSubscriptionReplacements(),
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

  const totals = useMemo(() => {
    const totalItems = flattenedPlan.length;
    const totalPlanned = flattenedPlan.reduce(
      (acc, item) => acc + item.planned_quantity,
      0,
    );
    const totalBase = flattenedPlan.reduce(
      (acc, item) => acc + item.base_quantity,
      0,
    );
    return {
      totalItems,
      totalPlanned: Number(totalPlanned.toFixed(2)),
      totalBase: Number(totalBase.toFixed(2)),
    };
  }, [flattenedPlan]);

  const categoryTotals = useMemo(
    () =>
      categories.reduce<Record<Category, { planned: number; base: number }>>(
        (acc, category) => {
          const planned = planData[category].reduce(
            (total, item) => total + item.planned_quantity,
            0,
          );
          const base = planData[category].reduce(
            (total, item) => total + item.base_quantity,
            0,
          );
          acc[category] = {
            planned: Number(planned.toFixed(2)),
            base: Number(base.toFixed(2)),
          };
          return acc;
        },
        {
          Breakfast: { planned: 0, base: 0 },
          Lunch: { planned: 0, base: 0 },
          Dinner: { planned: 0, base: 0 },
          Condiments: { planned: 0, base: 0 },
        },
      ),
    [planData],
  );

  const categorySummaries = useMemo(
    () =>
      categories.map((category) => ({
        category,
        items: planData[category].length,
        planned: categoryTotals[category].planned,
        base: categoryTotals[category].base,
      })),
    [planData, categoryTotals],
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
        const finalQuantity = Number((item.base_quantity + buffer).toFixed(2));
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
            ((item.base_quantity * percentValue) / 100).toFixed(2),
          );
          const finalQuantity = Number(
            (item.base_quantity + bufferQuantity).toFixed(2),
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-card/60 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Kitchen Production Planning
          </h2>
          
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
            <DatePickerWithPresets
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(normalizeDate(date))}
              showQuickSelect={false}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setGlobalBufferDialogOpen(true)}
          >
            Set Global Buffer %
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleExportCSV}>
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportPDF}>
                Print Layout (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categorySummaries.map((summary) => (
          <Card key={summary.category} className="border-red-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-red-700">
                {summary.category}
                <Badge variant="outline" className="text-xs">
                  {summary.items} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <div>
                Planned{" "}
                <span className="font-semibold text-gray-900">
                  {formatQuantity(summary.planned)}
                </span>
              </div>
              <div>
                Orders (Base){" "}
                <span className="font-semibold text-gray-900">
                  {formatQuantity(summary.base)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as Category)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 md:w-auto">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1">
                    {category}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {planData[category].length} items
                  </span>
                </div>
                {isLoading && (
                  <span className="text-sm text-muted-foreground">
                    Loading…
                  </span>
                )}
              </div>

              {loadError ? (
                <div className="px-4 py-6 text-sm text-red-600">{loadError}</div>
              ) : !menuAvailability[category] ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  Menu not planned for {category.toLowerCase()} on this date.
                </div>
              ) : planData[category].length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  No published items for {category.toLowerCase()} on this date.
                </div>
              ) : (
                <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {planData[category].map((item, index) => (
                    <PlanItemCard
                      key={`${item.item_name}-${index}`}
                      item={item}
                      onBufferChange={(value) =>
                        handleBufferChange(category, index, value)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Total Items: {totals.totalItems}</span>
          <span>
            Total Planned:{" "}
            <span className="font-semibold text-gray-900">
              {formatQuantity(totals.totalPlanned)}
            </span>
          </span>
          <span>
            Total Base Orders:{" "}
            <span className="font-semibold text-gray-900">
              {formatQuantity(totals.totalBase)}
            </span>
          </span>
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
                        {items.length} items · Planned{" "}
                        {formatQuantity(categoryTotals[category].planned)} · Base{" "}
                        {formatQuantity(categoryTotals[category].base)}
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlanPreviewOpen(false)}
            >
              Close
            </Button>
            <Button onClick={handleExportPDF}>Print Layout</Button>
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
