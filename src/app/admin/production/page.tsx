"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import type {
  ProductionItem,
  PublishedMenuItem,
} from "@/data/production-mock";
import { AdminLayout } from "@/components/admin-layout";
import { DatePickerWithPresets } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { http } from "@/lib/http";
import { useAuthStore } from "@/store/store";
import { getSupportedMeals } from "@/config/cities";

type Category = ProductionItem["category"];

type PlanItem = {
  item_id: number | null;
  item_name: string;
  unit: string;
  category: Category;
  planned_quantity: number;
  available_quantity: number;
  customer_orders: number;
  buffer_quantity: number;
  final_quantity: number;
};

type SubscriptionReplacement = {
  group: string;
  default_item: string;
};

type MenuApiItem = {
  item_id?: number;
  menu_item_id?: number;

  item_name?: string;
  name?: string;
  max_qty?: number;
  planned_qty?: number; // legacy fallback support
  available_qty?: number;
  quantity?: number;
  planned_quantity?: number;
  item_max_qty?: number;
  buffer_qty: number;
  final_qty: number;
  uom?: string;
  unit?: string;
  unit_name?: string;
  measure_unit?: string;
  quantity_uom?: string;
  buffer_percentage?: number;
};

type MenuApiResponse = {
  items?: MenuApiItem[];
  is_released?: boolean;
};


const categories: Category[] = ["Breakfast", "Lunch", "Dinner", "Condiments"];

const createEmptyPlanState = (): Record<Category, PlanItem[]> => ({
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

type OrdersSummaryMap = Record<Category, Record<number, number>>;

const createEmptyOrdersSummary = (): OrdersSummaryMap => ({
  Breakfast: {},
  Lunch: {},
  Dinner: {},
  Condiments: {},
});

// ────────────────────────────────────────────────────────────────────────
// utils
// ────────────────────────────────────────────────────────────────────────

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function mapMenuItems(
  menuItems: PublishedMenuItem[],
  ordersByItemId: Record<number, number> = {},
): PlanItem[] {
  if (menuItems.length === 0) return [];

  return menuItems.map((menuItem) => {
    const toNumber = (value: unknown, fallback = 0) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    };

    const itemId = typeof menuItem.item_id === "number" ? menuItem.item_id : null;
    const rawBufferQuantity = toNumber(menuItem.buffer_quantity, 0);
    const bufferQuantity = Math.max(Math.round(rawBufferQuantity), 0);

    const persistedPlanRaw =
      menuItem.planned_quantity ??
      menuItem.final_quantity ??
      0;
    const persistedPlan = Math.max(toNumber(persistedPlanRaw, 0), 0);

    const finalSource =
      menuItem.final_quantity ??
      menuItem.planned_quantity ??
      toNumber(menuItem.available_quantity, 0) + bufferQuantity;
    const finalNumeric = Math.max(
      toNumber(
        finalSource,
        toNumber(menuItem.available_quantity, 0) + bufferQuantity,
      ),
      0,
    );

    const finalQuantity = Number(
      Math.max(finalNumeric, persistedPlan).toFixed(2),
    );

    const rawAvailableFromApi = toNumber(menuItem.available_quantity, Number.NaN);
    const overrideOrders =
      itemId !== null && Object.prototype.hasOwnProperty.call(ordersByItemId, itemId)
        ? ordersByItemId[itemId]
        : undefined;

    let ordersNumeric =
      typeof overrideOrders === "number" && Number.isFinite(overrideOrders)
        ? Math.max(overrideOrders, 0)
        : 0;

    ordersNumeric = Math.min(ordersNumeric, finalQuantity);

    const normalizedOrders = Number(ordersNumeric.toFixed(2));
    const fallbackAvailable = Math.max(finalQuantity - normalizedOrders, 0);
    const normalizedAvailable = Number(
      (
        Number.isFinite(rawAvailableFromApi)
          ? Math.min(Math.max(rawAvailableFromApi, 0), finalQuantity)
          : fallbackAvailable
      ).toFixed(2),
    );
    const normalizedPlan = Number(persistedPlan.toFixed(2));

    return {
      item_id: itemId,
      item_name: menuItem.item_name,
      unit: menuItem.unit,
      category: menuItem.category,
      planned_quantity: normalizedPlan,
      available_quantity: normalizedAvailable,
      customer_orders: normalizedOrders,
      buffer_quantity: bufferQuantity,
      final_quantity: finalQuantity,
    };
  });
}

function clonePlanItems(items: PlanItem[]): PlanItem[] {
  return items.map((item) => ({ ...item }));
}


function applyReplacementsToPlan(
  items: PlanItem[],
  replacements: SubscriptionReplacement[],
): PlanItem[] {
  if (!replacements.length) return items;

  return items.map((item) => {
    const replacement = replacements.find((r) => r.group === item.item_name);
    if (!replacement) return item;

    return {
      ...item,
      item_id: null,
      item_name: replacement.default_item,
    };
  });
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
  scopedCategories: Category[],
) {
  const categoriesToRender =
    scopedCategories.length > 0 ? scopedCategories : categories;

  const sections = categoriesToRender
    .map((category) => {
      if (!menuAvailability[category] || !planByCategory[category].length) {
        return "";
      }

      const cards = planByCategory[category]
        .map((item) => {
          const detailRows = [
            ["Max Qty", formatQuantity(item.planned_quantity)],
            ["Customer orders", formatQuantity(item.customer_orders)],
            ["Buffer", formatQuantity(item.buffer_quantity)],
          ]
            .map(
              ([label, value]) => `
              <div>
                <span class="label">${escapeHtml(label)}</span>
                <span class="value">${escapeHtml(value)}</span>
              </div>
            `,
            )
            .join("");

          return `
            <article class="card">
              <header class="card-top">
                <div>
                  <h3 class="card-title">${escapeHtml(item.item_name)}</h3>
                  <p class="card-unit">Unit: ${escapeHtml(item.unit)}</p>
                </div>
                <div class="card-final">
                  <span class="card-final-label">Final Qty</span>
                  <span class="card-final-value">${escapeHtml(formatQuantity(item.final_quantity))}</span>
                </div>
              </header>
              <div class="card-details">
                ${detailRows}
              </div>
            </article>
          `;
        })
        .join("");

      return `
        <section class="section">
          <header class="section-header">
            <h2>${escapeHtml(category)}</h2>
            <span>${planByCategory[category].length} items</span>
          </header>
          <div class="cards">
            ${cards}
          </div>
        </section>
      `;
    })
    .filter(Boolean)
    .join("");

  const bodyContent =
    sections || `<p class="empty">No items are available for this selection.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Kitchen Production Planning · ${escapeHtml(dateLabel)}</title>
    <style>
      :root { color-scheme: light; }
      body {
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0 auto;
        padding: 32px;
        max-width: 960px;
        background: #f8fafc;
        color: #0f172a;
      }
      h1 {
        font-size: 26px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .subtitle {
        font-size: 14px;
        color: #475569;
        margin-bottom: 24px;
      }
      .section {
        margin-bottom: 32px;
        page-break-inside: avoid;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .section-header h2 {
        margin: 0;
        font-size: 18px;
      }
      .cards {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      .card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 18px 24px -20px rgba(15, 23, 42, 0.25);
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .card-title {
        margin: 0 0 4px;
        font-size: 16px;
        font-weight: 600;
      }
      .card-unit {
        margin: 0;
        font-size: 13px;
        color: #64748b;
      }
      .card-final-label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
      }
      .card-final-value {
        font-size: 22px;
        font-weight: 700;
        color: #0f172a;
      }
      .card-details {
        margin-top: 16px;
        display: grid;
        gap: 10px;
        font-size: 13px;
      }
      .label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        color: #94a3b8;
      }
      .value {
        font-weight: 600;
        color: #111827;
      }
      .empty {
        text-align: center;
        padding: 64px 0;
        color: #94a3b8;
      }
      @media print {
        body {
          background: #fff;
        }
        .card {
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <h1>Kitchen Production Planning</h1>
    <p class="subtitle">${escapeHtml(dateLabel)}</p>
    ${bodyContent}
    <script>
      window.addEventListener("load", () => {
        setTimeout(() => window.print(), 200);
      });
    </script>
  </body>
</html>`;
}

function exportCardLayout(
  planByCategory: Record<Category, PlanItem[]>,
  dateLabel: string,
  menuAvailability: Record<Category, boolean>,
  scopedCategories: Category[],
) {
  if (typeof window === "undefined") return;
  const printableWindow = window.open("", "_blank", "noopener=yes,width=1024,height=768");
  if (!printableWindow) return;
  printableWindow.document.write(
    buildPrintableMarkup(planByCategory, dateLabel, menuAvailability, scopedCategories),
  );
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
  planGenerated?: boolean;
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

function PlanItemCard({
  item,
  onBufferChange,
  readOnly = false,
  planGenerated = false,
}: PlanItemCardProps) {
  return (
    <div
      className={cn(
        "flex h-full min-w-[260px] flex-col rounded-lg border-2 bg-card p-5 shadow-sm sm:min-w-[300px]",
        planGenerated
          ? "border-border border-solid"
          : "border-[3px] border-dotted border-primary",
      )}
    >
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
          <p className="text-muted-foreground">Max Qty</p>
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
              inputMode="numeric"
              step="1"
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

type PublishedMenuLookup = {
  itemsByCategory: Record<Category, PublishedMenuItem[]>;
  releaseStatus: Record<Category, boolean>;
};

async function fetchPublishedMenu(
  date: string,
  cityCode: string,
  setPlanGeneratedState: React.Dispatch<React.SetStateAction<Record<Category, boolean>>>,
): Promise<PublishedMenuLookup> {
  const itemsByCategory: Record<Category, PublishedMenuItem[]> = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Condiments: [],
  };
  const releaseStatus = createCategoryBooleanState(false);
  const supportedCategorySet = new Set(
    getSupportedMeals(cityCode).map((meal) =>
      meal === "condiments"
        ? "Condiments"
        : (meal.charAt(0).toUpperCase() + meal.slice(1)) as Category,
    ),
  );

  await Promise.all(
    categories.map(async (category) => {
      if (!supportedCategorySet.has(category)) {
        setPlanGeneratedState((prev) => ({
          ...prev,
          [category]: false,
        }));
        releaseStatus[category] = false;
        itemsByCategory[category] = [];
        return;
      }

      const params = new URLSearchParams({
        date,
        bld_type: category.toLowerCase(),
        period_type: "one_day",
      });
      params.set("city_code", cityCode);

      try {
        const response = await http.get(`/api/menu?${params.toString()}`);

        // ✅ If menu doesn't exist, explicitly set false
        if (response.status === 404) {
          setPlanGeneratedState((prev) => ({
            ...prev,
            [category]: false,
          }));
          releaseStatus[category] = false;
          itemsByCategory[category] = [];
          return;
        }

        if (!response.ok) {
          console.warn(
            `Failed to fetch published menu for ${category}`,
            await response.text().catch(() => ""),
          );
          setPlanGeneratedState((prev) => ({
            ...prev,
            [category]: false,
          }));
          releaseStatus[category] = false;
          itemsByCategory[category] = [];
          return;
        }

        const data = (await response.json()) as MenuApiResponse & {
          is_production_generated?: boolean;
        };

        releaseStatus[category] = !!data?.is_released;

        // ✅ Always set the planGenerated flag (true/false)
        setPlanGeneratedState((prev) => ({
          ...prev,
          [category]: !!data?.is_production_generated,
        }));

        const planGenerated = !!data?.is_production_generated;

        // ✅ If no items, just return
        if (!data?.items?.length) {
          itemsByCategory[category] = [];
          return;
        }

        // ✅ Collect items per category
        itemsByCategory[category] = data.items.map((item) => {
          const itemName = item.item_name ?? item.name ?? "Unnamed Item";
          const itemId =
            typeof item.item_id === "number" ? item.item_id : null;
          const unit =
            item.uom ??
            item.unit ??
            item.unit_name ??
            item.measure_unit ??
            item.quantity_uom ??
            "Nos";

          const maxRaw =
            item.max_qty ??
            item.item_max_qty ??
            item.planned_qty ?? // legacy fallback
            item.planned_quantity ??
            item.final_qty ??
            item.final_quantity ??
            item.quantity ??
            0;
          const resolvedMax = Math.max(Number(maxRaw) || 0, 0);

          const bufferPercentage = Number(item.buffer_percentage ?? 0) || 0;
          const storedBufferRaw =
            item.buffer_qty ??
            item.buffer_quantity ??
            0;

          let bufferQuantity = Math.max(
            Math.round(Number(storedBufferRaw) || 0),
            0,
          );

          if (!planGenerated && bufferQuantity === 0 && bufferPercentage > 0) {
            bufferQuantity = Math.max(
              Math.round((resolvedMax * bufferPercentage) / 100),
              0,
            );
          }

          const storedFinalRaw =
            item.final_qty ??
            item.final_quantity;

          let finalQuantity = Number(storedFinalRaw);
          if (!Number.isFinite(finalQuantity) || finalQuantity <= 0) {
            finalQuantity = resolvedMax + bufferQuantity;
          }

          if (!planGenerated) {
            finalQuantity = Math.max(finalQuantity, resolvedMax + bufferQuantity);
          }

          const availableRaw =
            item.available_qty ??
            item.available_quantity ??
            null;
          let availableQuantity = Number(availableRaw);
          if (!Number.isFinite(availableQuantity)) {
            availableQuantity = finalQuantity;
          }
          availableQuantity = Math.min(
            Math.max(availableQuantity, 0),
            finalQuantity,
          );

          return {
            date,
            item_id: itemId ?? undefined,
            item_name: itemName,
            unit,
            planned_quantity: Number(resolvedMax.toFixed(2)),
            available_quantity: Number(availableQuantity.toFixed(2)),
            buffer_quantity: bufferQuantity,
            final_quantity: Number(finalQuantity.toFixed(2)),
            buffer_percentage: bufferPercentage,
            category,
          };
        });
      } catch (error) {
        console.error(`Error fetching menu for ${category}:`, error);

        // ✅ On any failure, set planGenerated to false
        setPlanGeneratedState((prev) => ({
          ...prev,
          [category]: false,
        }));
        releaseStatus[category] = false;
        itemsByCategory[category] = [];
      }
    }),
  );

  return { itemsByCategory, releaseStatus };
}



async function fetchOrdersSummary(
  date: string,
  cityCode: string,
  periodType?: string,
): Promise<OrdersSummaryMap> {
  try {
    const params = new URLSearchParams({ date });
    if (periodType) {
      params.set("period_type", periodType);
    }
    params.set("city_code", cityCode);
    const response = await http.get(`/api/production/orders-summary?${params.toString()}`);
    if (!response.ok) {
      return createEmptyOrdersSummary();
    }
    const data = (await response.json()) as {
      orders?: Array<{
        menu_type?: string | null;
        item_id?: number | null;
        order_quantity?: number | null;
      }>;
    };
    const summary = createEmptyOrdersSummary();
    for (const entry of data.orders ?? []) {
      const rawCategory = (entry.menu_type ?? "").trim();
      if (!rawCategory) continue;
      const category = categories.find(
        (cat) => cat.toLowerCase() === rawCategory.toLowerCase(),
      );
      if (!category) continue;
      if (typeof entry.item_id !== "number") continue;
      const quantity = Number(entry.order_quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity < 0) continue;
      summary[category][entry.item_id] = quantity;
    }
    return summary;
  } catch (error) {
    console.warn("Failed to load production order summary", error);
    return createEmptyOrdersSummary();
  }
}

async function fetchSubscriptionReplacements(): Promise<
  SubscriptionReplacement[]
> {
  try {
    const response = await http.get("/api/subscriptions/replacements");
    if (!response.ok) {
      console.warn(
        "Subscription replacements unavailable, continuing without them",
      );
      return [];
    }
    const data = (await response.json()) as SubscriptionReplacement[];
    return data;
  } catch (error) {
    console.warn(
      "Failed to load subscription replacements, continuing without them",
      error,
    );
    return [];
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
  const [editingState, setEditingState] = useState<Record<Category, boolean>>(
    () => createCategoryBooleanState(false),
  );
  const [unsavedChanges, setUnsavedChanges] = useState<Record<Category, boolean>>(
    () => createCategoryBooleanState(false),
  );
  const [menuAvailability, setMenuAvailability] = useState<
    Record<Category, boolean>
  >(() => createCategoryBooleanState(false));
  const [planGeneratedState, setPlanGeneratedState] = useState(
    createCategoryBooleanState(false),
  );
  const [planNeedsRegeneration, setPlanNeedsRegeneration] = useState<
    Record<Category, boolean>
  >(() => createCategoryBooleanState(false));
  const [reopenPlanPending, setReopenPlanPending] = useState<Record<Category, boolean>>(
    () => createCategoryBooleanState(false),
  );
  const [finalizingCategory, setFinalizingCategory] = useState<
    Record<Category, boolean>
  >(() => createCategoryBooleanState(false));
  const [actionError, setActionError] = useState<string | null>(null);
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");
  const supportedMeals = useMemo(() => getSupportedMeals(adminCity), [adminCity]);
  const visibleCategories = useMemo<Category[]>(() => {
    const mapped = supportedMeals.map((meal) =>
      meal === "condiments"
        ? "Condiments"
        : (meal.charAt(0).toUpperCase() + meal.slice(1)) as Category,
    );
    return mapped.length ? mapped : ["Condiments"];
  }, [supportedMeals]);

  useEffect(() => {
    if (!visibleCategories.length) {
      return;
    }
    if (!visibleCategories.includes(selectedCategory)) {
      setSelectedCategory(visibleCategories[0]);
    }
  }, [selectedCategory, setSelectedCategory, visibleCategories]);

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
  const [bufferPercentInput, setBufferPercentInput] = useState("10");
  const [planPreviewOpen, setPlanPreviewOpen] = useState(false);
  const [lastMinuteDialogOpen, setLastMinuteDialogOpen] = useState(false);
  const [lastMinuteAdjustments, setLastMinuteAdjustments] = useState<Record<string, string>>({});
  const [isApplyingLastMinute, setIsApplyingLastMinute] = useState(false);
  const [lastMinuteError, setLastMinuteError] = useState<string | null>(null);
  const editBaselines = useRef<Record<Category, PlanItem[]>>(createEmptyPlanState());

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
      // ✅ Fetch all menus for the date, and auto-update planGeneratedState
      const { itemsByCategory, releaseStatus } = await fetchPublishedMenu(
        selectedDateISO,
        adminCity,
        setPlanGeneratedState,
      );

      const ordersSummary = await fetchOrdersSummary(
        selectedDateISO,
        adminCity,
        "one_day",
      );

      const replacements = await fetchSubscriptionReplacements();

      const availability = { ...releaseStatus };
      const nextState = createEmptyPlanState();

      categories.forEach((category) => {
        const menuItems = itemsByCategory[category];
        if (menuItems.length > 0) {
          const mappedItems = mapMenuItems(menuItems, ordersSummary[category]);
          const replacedItems = applyReplacementsToPlan(
            mappedItems,
            replacements
          );
          nextState[category] = replacedItems;
        } else {
          nextState[category] = [];
        }
      });

      if (!cancelled) {
        setMenuAvailability(availability);
        setPlanData(nextState);
        setEditingState(createCategoryBooleanState(false));
        setUnsavedChanges(createCategoryBooleanState(false));
        const baseline = createEmptyPlanState();
        categories.forEach((category) => {
          baseline[category] = clonePlanItems(nextState[category]);
        });
        editBaselines.current = baseline;
        setLastMinuteAdjustments({});
        setLastMinuteDialogOpen(false);
        setLastMinuteError(null);
        setPlanNeedsRegeneration(createCategoryBooleanState(false));
        setReopenPlanPending(createCategoryBooleanState(false));
        setFinalizingCategory(createCategoryBooleanState(false));
        setActionError(null);
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
}, [selectedDateISO, adminCity, setPlanGeneratedState]);


useEffect(() => {
  setActionError(null);
}, [selectedCategory, selectedDateISO, adminCity]);

  useEffect(() => {
    if (!lastMinuteDialogOpen) {
      setLastMinuteAdjustments({});
      setLastMinuteError(null);
      return;
    }
    const base: Record<string, string> = {};
    planData[selectedCategory].forEach((item) => {
      base[item.item_name] = "";
    });
    setLastMinuteAdjustments(base);
    setLastMinuteError(null);
  }, [lastMinuteDialogOpen, planData, selectedCategory]);

  const categorySummaries = useMemo(
    () =>
      visibleCategories.map((category) => ({
        category,
        items: menuAvailability[category] ? planData[category].length : 0,
        menuPublished: menuAvailability[category],
        planGenerated: planGeneratedState[category],
        needsReexport: planNeedsRegeneration[category],
        editing: editingState[category],
      })),
    [
      planData,
      menuAvailability,
      planGeneratedState,
      planNeedsRegeneration,
      editingState,
      visibleCategories,
    ],
  );

  const quickDateOptions = useMemo(() => {
    const today = normalizeDate(new Date());
    return [
      { label: "Today", date: today },
      { label: "Tomorrow", date: normalizeDate(addDays(today, 1)) },
    ];
  }, []);

  const reopenPlanForCategory = async (category: Category): Promise<boolean> => {
    if (planNeedsRegeneration[category] || reopenPlanPending[category]) {
      return true;
    }
    if (!planGeneratedState[category]) {
      return true;
    }
    setActionError(null);
    setReopenPlanPending((prev) => ({ ...prev, [category]: true }));
    try {
      const response = await http.post("/api/production/reopen", {
        date: selectedDateISO,
        menu_type: category,
        city_code: adminCity,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to reopen plan");
      }
      setPlanGeneratedState((prev) => ({ ...prev, [category]: false }));
      setPlanNeedsRegeneration((prev) => ({ ...prev, [category]: true }));
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reopen plan";
      setActionError(message);
      return false;
    } finally {
      setReopenPlanPending((prev) => ({ ...prev, [category]: false }));
    }
  };

  const markPlanAsNeedingReexport = (category: Category) => {
    setPlanNeedsRegeneration((prev) =>
      prev[category] ? prev : { ...prev, [category]: true },
    );
    if (planGeneratedState[category] && !planNeedsRegeneration[category]) {
      void reopenPlanForCategory(category);
    }
  };

  const handleBufferChange = (
    category: Category,
    index: number,
    value: string,
  ) => {
    const numericValue = Number.parseFloat(value);
    const buffer = Number.isNaN(numericValue) ? 0 : Math.round(numericValue);

    setPlanData((prev) => {
      const updatedCategory = prev[category].map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const finalNumeric = Math.max(item.planned_quantity + buffer, 0);
        const normalizedFinal = Number(finalNumeric.toFixed(2));
        const existingOrders = Math.max(Number(item.customer_orders) || 0, 0);
        const cappedOrders = Math.min(existingOrders, normalizedFinal);
        const normalizedOrders = Number(cappedOrders.toFixed(2));
        const normalizedAvailable = Number(
          (normalizedFinal - normalizedOrders).toFixed(2),
        );
        return {
          ...item,
          buffer_quantity: buffer,
          final_quantity: normalizedFinal,
          customer_orders: normalizedOrders,
          available_quantity: normalizedAvailable,
        };
      });

      return {
        ...prev,
        [category]: updatedCategory,
      };
    });
    setUnsavedChanges((prev) => ({ ...prev, [category]: true }));
    markPlanAsNeedingReexport(category);
  };

  const applyGlobalBuffer = () => {
    const percentValue = Number.parseFloat(bufferPercentInput);
    if (Number.isNaN(percentValue)) return;

    let applied = false;
    setPlanData((prev) => {
      const items = prev[selectedCategory];
      if (!items.length) return prev;
      applied = true;
      const updated = items.map((item) => {
        const bufferQuantity = Math.round(
          (item.planned_quantity * percentValue) / 100,
        );
        const finalNumeric = Math.max(item.planned_quantity + bufferQuantity, 0);
        const normalizedFinal = Number(finalNumeric.toFixed(2));
        const existingOrders = Math.max(Number(item.customer_orders) || 0, 0);
        const cappedOrders = Math.min(existingOrders, normalizedFinal);
        const normalizedOrders = Number(cappedOrders.toFixed(2));
        const normalizedAvailable = Number(
          (normalizedFinal - normalizedOrders).toFixed(2),
        );
        return {
          ...item,
          buffer_quantity: bufferQuantity,
          final_quantity: normalizedFinal,
          customer_orders: normalizedOrders,
          available_quantity: normalizedAvailable,
        };
      });
      return {
        ...prev,
        [selectedCategory]: updated,
      };
    });
    if (applied) {
      setUnsavedChanges((prev) => ({ ...prev, [selectedCategory]: true }));
      markPlanAsNeedingReexport(selectedCategory);
    }
    setGlobalBufferDialogOpen(false);
  };

  const handleOpenLastMinuteDialog = () => {
    if (!editingState[selectedCategory]) {
      return;
    }
    setLastMinuteDialogOpen(true);
  };

  const handleLastMinuteInputChange = (itemName: string, value: string) => {
    setLastMinuteAdjustments((prev) => ({
      ...prev,
      [itemName]: value,
    }));
  };

  const handleApplyLastMinuteAdjustments = async () => {
    const updates: { item_name: string; additional_qty: number }[] = [];
    let invalid = false;

    planData[selectedCategory].forEach((item) => {
      if (invalid) return;
      const raw = lastMinuteAdjustments[item.item_name];
      if (!raw || raw.trim() === "") {
        return;
      }
      const parsed = Number.parseFloat(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        invalid = true;
        return;
      }
      updates.push({
        item_name: item.item_name,
        additional_qty: Number(parsed.toFixed(2)),
      });
    });

    if (invalid) {
      setLastMinuteError("Additional quantities must be greater than zero.");
      return;
    }

    if (!updates.length) {
      setLastMinuteError("Enter a quantity greater than zero for at least one item.");
      return;
    }

    setIsApplyingLastMinute(true);
    setLastMinuteError(null);

    const reopened = await reopenPlanForCategory(selectedCategory);
    if (!reopened) {
      setIsApplyingLastMinute(false);
      setLastMinuteError("Unable to reopen the plan. Please try again.");
      return;
    }

    try {
      const response = await http.patch("/api/production/update-planned", {
        date: selectedDateISO,
        menu_type: selectedCategory,
        updates,
        city_code: adminCity,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update max quantities");
      }

      const data = await response.json();
      const updatedItems = (data?.updated_items ?? []) as Array<{
        item_name: string;
        new_max_qty: number;
      }>;

      if (!updatedItems.length) {
        setLastMinuteError("No menu items were updated.");
        return;
      }

      setPlanData((prev) => {
        const nextState = { ...prev };
        nextState[selectedCategory] = prev[selectedCategory].map((item) => {
          const updated = updatedItems.find(
            (entry) => entry.item_name.toLowerCase() === item.item_name.toLowerCase(),
          );
          if (!updated) return item;
          const newFinalRaw = Number(updated.new_max_qty);
          const finalQuantity = Number.isFinite(newFinalRaw)
            ? Number(newFinalRaw.toFixed(2))
            : Number((item.planned_quantity + item.buffer_quantity).toFixed(2));
          const basePlan = Math.max(finalQuantity - item.buffer_quantity, 0);
          const normalizedPlan = Number(basePlan.toFixed(2));
          const existingOrders = Math.max(Number(item.customer_orders) || 0, 0);
          const cappedOrders = Math.min(existingOrders, finalQuantity);
          const normalizedOrders = Number(cappedOrders.toFixed(2));
          const normalizedAvailable = Number(
            (finalQuantity - normalizedOrders).toFixed(2),
          );
          return {
            ...item,
            planned_quantity: normalizedPlan,
            available_quantity: normalizedAvailable,
            customer_orders: normalizedOrders,
            final_quantity: finalQuantity,
          };
        });
        return nextState;
      });

      setLastMinuteDialogOpen(false);
      setLastMinuteAdjustments({});
      setUnsavedChanges((prev) => ({ ...prev, [selectedCategory]: true }));
      markPlanAsNeedingReexport(selectedCategory);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update max quantities";
      setLastMinuteError(message);
    } finally {
      setIsApplyingLastMinute(false);
    }
  };

  const beginCategoryEdit = async (category: Category) => {
    if (editingState[category]) return;
    editBaselines.current[category] = clonePlanItems(planData[category]);
    setUnsavedChanges((prev) => ({ ...prev, [category]: false }));
    setEditingState((prev) => ({ ...prev, [category]: true }));
    if (planGeneratedState[category] && !planNeedsRegeneration[category]) {
      await reopenPlanForCategory(category);
    }
  };

  const handleSaveCategory = async (category: Category) => {
    setSavingCategory((prev) => ({ ...prev, [category]: true }));
    try {
      const response = await http.post("/api/production/generate", {
        date: selectedDateISO,
        menu_type: category,
        plans: planData[category],
        city_code: adminCity,
      });

    if (!response.ok) throw new Error("Failed to save production plan");

    const data = await response.json();
    console.log("✅ Production plan saved:", data);

    setLastSavedAt((prev) => ({ ...prev, [category]: Date.now() }));
    setPlanGeneratedState((prev) => ({ ...prev, [category]: false }));
    setPlanNeedsRegeneration((prev) => ({ ...prev, [category]: true }));
    setUnsavedChanges((prev) => ({ ...prev, [category]: false }));
    editBaselines.current[category] = clonePlanItems(planData[category]);
    setEditingState((prev) => ({ ...prev, [category]: false }));
    setActionError(null);
  } catch (err) {
      console.error(err);
      alert("Error saving production plan");
    } finally {
      setSavingCategory((prev) => ({ ...prev, [category]: false }));
    }
  };

  const handleExportSelectedCategoryReport = () => {
    exportCardLayout(planData, selectedDateLabel, menuAvailability, [selectedCategory]);
  };

  const handleFinalizeCategory = async (category: Category) => {
    setFinalizingCategory((prev) => ({ ...prev, [category]: true }));
    setActionError(null);
    try {
      const response = await http.post("/api/production/finalize", {
        date: selectedDateISO,
        menu_type: category,
        city_code: adminCity,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to export plan");
      }
      setPlanGeneratedState((prev) => ({ ...prev, [category]: true }));
      setPlanNeedsRegeneration((prev) => ({ ...prev, [category]: false }));
      setUnsavedChanges((prev) => ({ ...prev, [category]: false }));
      editBaselines.current[category] = clonePlanItems(planData[category]);
      setPlanPreviewOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export plan";
      setActionError(message);
    } finally {
      setFinalizingCategory((prev) => ({ ...prev, [category]: false }));
    }
  };

  const currentItems = planData[selectedCategory];
  const currentMenuAvailable = menuAvailability[selectedCategory];
  const visibleItemCount = currentMenuAvailable ? currentItems.length : 0;
  const planGenerated = planGeneratedState[selectedCategory];
  const needsReexport = planNeedsRegeneration[selectedCategory];
  const isSavingCategory = savingCategory[selectedCategory];
  const lastSavedTimestamp = lastSavedAt[selectedCategory];
  const isCurrentCategoryEditable = editingState[selectedCategory];
  const categoryStatusLabel = needsReexport
    ? "Edited · Needs re-export"
    : planGenerated
      ? editingState[selectedCategory]
        ? `Plan generated · Editing${
            unsavedChanges[selectedCategory] ? " (unsaved changes)" : ""
          }`
        : "Plan generated"
      : "Plan pending";
  const canExportCurrentCategory =
    currentMenuAvailable &&
    currentItems.length > 0 &&
    !unsavedChanges[selectedCategory] &&
    !finalizingCategory[selectedCategory];

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full rounded-lg border border-border bg-card/50 p-4 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Kitchen Production Planning
          </h2>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
                <CardTitle className="text-base font-semibold text-foreground">
                  {summary.category}
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
                  value={
                    summary.needsReexport
                      ? "Needs re-export"
                      : summary.planGenerated
                        ? summary.editing
                          ? "Editing…"
                          : "Yes"
                        : "Not yet"
                  }
                  highlight={
                    summary.needsReexport
                      ? "info"
                      : summary.planGenerated
                        ? summary.editing
                          ? "info"
                          : "success"
                        : "muted"
                  }
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="w-full rounded-lg border border-border bg-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="px-4 py-1 text-base font-semibold">
                {selectedCategory}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {visibleItemCount} items · {categoryStatusLabel}
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
                onClick={() => setGlobalBufferDialogOpen(true)}
                disabled={!editingState[selectedCategory]}
              >
                Set Global Buffer %
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenLastMinuteDialog}
                disabled={!editingState[selectedCategory]}
              >
                Adjust Max Qty
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void beginCategoryEdit(selectedCategory);
                }}
                disabled={editingState[selectedCategory] || reopenPlanPending[selectedCategory]}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveCategory(selectedCategory)}
                disabled={
                  isSavingCategory ||
                  !currentMenuAvailable ||
                  !editingState[selectedCategory]
                }
              >
                {isSavingCategory ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                onClick={() => setPlanPreviewOpen(true)}
                disabled={!canExportCurrentCategory}
              >
                Export plan
              </Button>
            </div>
          </div>

          {unsavedChanges[selectedCategory] && (
            <p className="px-4 text-sm text-amber-600">
              Save changes before exporting this plan.
            </p>
          )}

          {loadError ? (
            <div className="px-4 py-6 text-sm text-red-600">{loadError}</div>
          ) : !currentMenuAvailable ? (
            <div className="w-full px-4 py-6 text-sm text-left text-muted-foreground">
              Menu not released for {selectedCategory.toLowerCase()} on {selectedDateLabel}.{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-medium text-primary"
                onClick={() => {
                  if (typeof window === "undefined") return;
                  if (selectedDateISO) {
                    try {
                      window.localStorage.setItem(
                        "dailymenusetup:prefill",
                        JSON.stringify({
                          date: selectedDateISO,
                          bld_type: selectedCategory,
                        }),
                      );
                    } catch (error) {
                      console.error("Failed to persist menu prefill", error);
                    }
                  }
                  window.location.href = "/admin/dailymenusetup";
                }}
              >
                Please release the menu
              </Button>
              .
            </div>
          ) : currentItems.length === 0 ? (
            <div className="w-full px-4 py-6 text-sm text-left text-muted-foreground">
              No menu items available for {selectedCategory.toLowerCase()} on this date.
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
                  readOnly={!isCurrentCategoryEditable}
                  planGenerated={planGenerated && !editingState[selectedCategory]}
                />
              ))}
            </div>
          )}
          {actionError && (
            <div className="px-4 pb-4 text-sm text-red-600">{actionError}</div>
          )}
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
              Applies the percentage to every item&apos;s planned quantity.
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

      <Dialog
        open={planPreviewOpen}
        onOpenChange={(open) => {
          setPlanPreviewOpen(open);
          if (!open) {
            setActionError(null);
          }
        }}
      >
        <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-hidden sm:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory} · {selectedDateLabel}
            </DialogTitle>
          </DialogHeader>
          {actionError && planPreviewOpen && (
            <p className="pb-2 text-sm text-red-600">{actionError}</p>
          )}
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {!currentMenuAvailable ? (
              <p className="text-sm text-muted-foreground">
                Menu not released for this meal.
              </p>
            ) : currentItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No items available for this meal.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {currentItems.map((item, index) => (
                  <PlanItemCard
                    key={`${item.item_name}-${index}-preview`}
                    item={item}
                    readOnly
                    planGenerated
                  />
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPlanPreviewOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleExportSelectedCategoryReport}
              disabled={!currentMenuAvailable || currentItems.length === 0}
            >
              Printable report
            </Button>
            <Button
              onClick={() => handleFinalizeCategory(selectedCategory)}
              disabled={
                !currentMenuAvailable ||
                currentItems.length === 0 ||
                finalizingCategory[selectedCategory]
              }
            >
              {finalizingCategory[selectedCategory] ? "Exporting…" : "Mark as exported"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lastMinuteDialogOpen} onOpenChange={setLastMinuteDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Adjust Max Quantities · {selectedCategory}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Increase max quantities for items to cover last-minute orders. Buffer values remain unchanged.
            </p>
            {currentItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No items available for this category.
              </p>
            ) : (
              <div className="space-y-3">
                {currentItems.map((item) => (
                  <div
                    key={item.item_name}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Max: {formatQuantity(item.planned_quantity)} {item.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="+ qty"
                      value={lastMinuteAdjustments[item.item_name] ?? ""}
                      onChange={(event) =>
                        handleLastMinuteInputChange(item.item_name, event.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            {lastMinuteError && (
              <p className="text-sm text-red-600">{lastMinuteError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLastMinuteDialogOpen(false)}
              disabled={isApplyingLastMinute}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyLastMinuteAdjustments}
              disabled={isApplyingLastMinute || currentItems.length === 0}
            >
              {isApplyingLastMinute ? "Updating…" : "Apply Increases"}
            </Button>
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
