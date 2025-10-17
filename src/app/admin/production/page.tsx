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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Category = ProductionItem["category"];

type PlanItem = {
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

  item_name?: string;
  name?: string;
  planned_qty?: number;
  available_qty?: number;
  quantity?: number;
  planned_quantity?: number;
  buffer_qty: number;
  final_qty: number;
  uom?: string;
  unit?: string;
  unit_name?: string;
  measure_unit?: string;
  quantity_uom?: string;
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

// ────────────────────────────────────────────────────────────────────────
// utils
// ────────────────────────────────────────────────────────────────────────

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function mapMenuItems(menuItems: PublishedMenuItem[]): PlanItem[] {
  if (menuItems.length === 0) return [];

  return menuItems.map((menuItem) => {
    const plannedQuantity = Number(menuItem.planned_quantity.toFixed(2));
    const availableQuantity = Number(menuItem.available_quantity.toFixed(2));
    const rawBufferQuantity = Number(menuItem.buffer_quantity ?? 0);
    const bufferQuantity = Math.round(rawBufferQuantity);
    const finalQuantity =
      menuItem.final_quantity != null
        ? Number(Number(menuItem.final_quantity).toFixed(2))
        : Number((plannedQuantity + bufferQuantity).toFixed(2));
    const customerOrders = Math.max(plannedQuantity - availableQuantity, 0);
    const roundedCustomerOrders = Number(customerOrders.toFixed(2));

    return {
      item_name: menuItem.item_name,
      unit: menuItem.unit,
      category: menuItem.category,
      planned_quantity: plannedQuantity,
      available_quantity: availableQuantity,
      customer_orders: roundedCustomerOrders,
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
      item_name: replacement.default_item,
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
  setPlanGeneratedState: React.Dispatch<React.SetStateAction<Record<Category, boolean>>>,
): Promise<PublishedMenuLookup> {
  const itemsByCategory: Record<Category, PublishedMenuItem[]> = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Condiments: [],
  };
  const releaseStatus = createCategoryBooleanState(false);

  await Promise.all(
    categories.map(async (category) => {
      const url = new URL("http://localhost:8000/api/menu");
      url.searchParams.set("date", date);
      url.searchParams.set("bld_type", category.toLowerCase());
      url.searchParams.set("period_type", "one_day");

      try {
        const response = await fetch(url.toString());

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
          throw new Error(`Failed to fetch published menu for ${category}`);
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

        // ✅ If no items, just return
        if (!data?.items?.length) {
          itemsByCategory[category] = [];
          return;
        }

        // ✅ Collect items per category
        itemsByCategory[category] = data.items.map((item) => {
          const plannedQtyRaw =
            item.planned_qty ?? item.planned_quantity ?? item.quantity ?? 0;
          const availableQtyRaw =
            item.available_qty ?? item.available_qty ?? item.quantity ?? 0;
          const bufferQtyRaw =
            item.buffer_qty ?? item.buffer_qty ?? 0;
          const finalQtyRaw =
            item.final_qty ?? item.final_qty ?? null;
          const plannedQuantity = Number(plannedQtyRaw) || 0;
          const availableQuantity = Math.max(Number(availableQtyRaw) || 0, 0);
          const bufferQuantity = Math.max(Math.round(Number(bufferQtyRaw) || 0), 0);
          const finalQuantity =
            finalQtyRaw != null
              ? Number(finalQtyRaw) || 0
              : plannedQuantity + bufferQuantity;
          const unit =
            item.uom ??
            item.unit ??
            item.unit_name ??
            item.measure_unit ??
            item.quantity_uom ??
            "Nos";
          const itemName = item.item_name ?? item.name ?? "Unnamed Item";

          return {
            date,
            item_name: itemName,
            unit,
            planned_quantity: plannedQuantity,
            available_quantity: availableQuantity,
            buffer_quantity: bufferQuantity,
            final_quantity: Number(finalQuantity.toFixed(2)),
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



async function fetchSubscriptionReplacements(): Promise<
  SubscriptionReplacement[]
> {
  const response = await fetch("/api/subscriptions/replacements");
  if (!response.ok) {
    console.warn("Subscription replacements unavailable, continuing without them");
    return [];
  }
  const data = (await response.json()) as SubscriptionReplacement[];
  return data;
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
  createCategoryBooleanState(false)
);

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
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const pendingExitCategoryRef = useRef<Category | null>(null);
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
        setPlanGeneratedState
      );

      const replacements = await fetchSubscriptionReplacements();

      const availability = { ...releaseStatus };
      const nextState = createEmptyPlanState();

      categories.forEach((category) => {
        const menuItems = itemsByCategory[category];
        if (menuItems.length > 0) {
          const mappedItems = mapMenuItems(menuItems);
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
      categories.map((category) => ({
        category,
        items: planData[category].length,
        menuPublished: menuAvailability[category],
        planGenerated: planGeneratedState[category],
        editing: editingState[category],
      })),
    [planData, menuAvailability, planGeneratedState, editingState],
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
    const buffer = Number.isNaN(numericValue) ? 0 : Math.round(numericValue);

    setPlanData((prev) => {
      const updatedCategory = prev[category].map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const finalQuantity = Number((item.planned_quantity + buffer).toFixed(2));
        return {
          ...item,
          buffer_quantity: buffer,
          final_quantity: finalQuantity,
        };
      });

      return {
        ...prev,
        [category]: updatedCategory,
      };
    });
    setUnsavedChanges((prev) => ({ ...prev, [category]: true }));
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
        const finalQuantity = Number(
          (item.planned_quantity + bufferQuantity).toFixed(2),
        );
        return {
          ...item,
          buffer_quantity: bufferQuantity,
          final_quantity: finalQuantity,
        };
      });
      return {
        ...prev,
        [selectedCategory]: updated,
      };
    });
    if (applied) {
      setUnsavedChanges((prev) => ({ ...prev, [selectedCategory]: true }));
    }
    setGlobalBufferDialogOpen(false);
  };

  const handleOpenLastMinuteDialog = () => {
    if (
      !planGeneratedState[selectedCategory] ||
      !editingState[selectedCategory]
    ) {
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
    try {
      const response = await fetch("http://localhost:8000/api/production/update-planned", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDateISO,
          menu_type: selectedCategory,
          updates,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update planned quantities");
      }

      const data = await response.json();
      const updatedItems = (data?.updated_items ?? []) as Array<{
        item_name: string;
        new_planned_qty: number;
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
          const newPlanned = Number(updated.new_planned_qty);
          const finalQuantity = Number((newPlanned + item.buffer_quantity).toFixed(2));
          return {
            ...item,
            planned_quantity: Number(newPlanned.toFixed(2)),
            final_quantity: finalQuantity,
          };
        });
        return nextState;
      });

      setLastMinuteDialogOpen(false);
      setLastMinuteAdjustments({});
      setUnsavedChanges((prev) => ({ ...prev, [selectedCategory]: true }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update planned quantities";
      setLastMinuteError(message);
    } finally {
      setIsApplyingLastMinute(false);
    }
  };

  const toggleCategoryEdit = (category: Category) => {
    if (editingState[category]) {
      if (unsavedChanges[category]) {
        pendingExitCategoryRef.current = category;
        setConfirmExitOpen(true);
        return;
      }
      const baselineItems = editBaselines.current[category] ?? [];
      setPlanData((prev) => ({
        ...prev,
        [category]: clonePlanItems(baselineItems),
      }));
      setUnsavedChanges((prev) => ({ ...prev, [category]: false }));
      setLastMinuteDialogOpen(false);
      setLastMinuteAdjustments({});
      setLastMinuteError(null);
      setEditingState((prev) => ({ ...prev, [category]: false }));
      pendingExitCategoryRef.current = null;
    } else {
      editBaselines.current[category] = clonePlanItems(planData[category]);
      setUnsavedChanges((prev) => ({ ...prev, [category]: false }));
      setEditingState((prev) => ({ ...prev, [category]: true }));
      pendingExitCategoryRef.current = null;
    }
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
      const response = await fetch("http://localhost:8000/api/production/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDateISO,
          menu_type: category,
          plans: planData[category],
        }),
      });

    if (!response.ok) throw new Error("Failed to save production plan");

    const data = await response.json();
    console.log("✅ Production plan saved:", data);

    setLastSavedAt((prev) => ({ ...prev, [category]: Date.now() }));
    setPlanGeneratedState((prev) => ({ ...prev, [category]: true }));
    setUnsavedChanges((prev) => ({ ...prev, [category]: false }));
    editBaselines.current[category] = clonePlanItems(planData[category]);
    setEditingState((prev) => ({ ...prev, [category]: false }));
  } catch (err) {
      console.error(err);
      alert("Error saving production plan");
    } finally {
      setSavingCategory((prev) => ({ ...prev, [category]: false }));
    }
  };

  const currentItems = planData[selectedCategory];
  const currentMenuAvailable = menuAvailability[selectedCategory];
  const planGenerated = planGeneratedState[selectedCategory];
  const isSavingCategory = savingCategory[selectedCategory];
  const lastSavedTimestamp = lastSavedAt[selectedCategory];
  const isCurrentCategoryEditable =
    !planGenerated || editingState[selectedCategory];
  const categoryStatusLabel = planGenerated
    ? editingState[selectedCategory]
      ? `Plan generated · Editing${
          unsavedChanges[selectedCategory] ? " (unsaved changes)" : ""
        }`
      : "Plan generated"
    : "Plan pending";

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
                    summary.planGenerated
                      ? summary.editing
                        ? "Editing…"
                        : "Yes"
                      : "Not yet"
                  }
                  highlight={
                    summary.planGenerated
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
                {currentItems.length} items · {categoryStatusLabel}
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
                disabled={!isCurrentCategoryEditable}
              >
                Set Global Buffer %
              </Button>
              {planGenerated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenLastMinuteDialog}
                  disabled={!isCurrentCategoryEditable}
                >
                  Adjust Planned Qty
                </Button>
              )}
              {planGenerated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleCategoryEdit(selectedCategory)}
                >
                  {editingState[selectedCategory] ? "Stop Editing" : "Edit"}
                </Button>
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
          ) : currentItems.length === 0 ? (
            <div className="w-full px-4 py-6 text-sm text-left text-muted-foreground">
              No menu published for {selectedCategory.toLowerCase()} on this date.
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
        </div>
        <div className="flex justify-end">
          <Button
  onClick={async () => {
    await handleSaveCategory(selectedCategory); // Save first
    setPlanPreviewOpen(true);                   // Then open preview
  }}
>
  Export Plan
</Button>

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

      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits for {pendingExitCategoryRef.current}. Save your
              changes before leaving, or discard them to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                pendingExitCategoryRef.current = null;
              }}
            >
              Continue editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const pendingCategory = pendingExitCategoryRef.current;
                if (!pendingCategory) return;
                const baselineItems = editBaselines.current[pendingCategory] ?? [];
                setPlanData((prev) => ({
                  ...prev,
                  [pendingCategory]: clonePlanItems(baselineItems),
                }));
                setUnsavedChanges((prev) => ({ ...prev, [pendingCategory]: false }));
                setEditingState((prev) => ({ ...prev, [pendingCategory]: false }));
                if (pendingCategory === selectedCategory) {
                  setLastMinuteDialogOpen(false);
                  setLastMinuteAdjustments({});
                  setLastMinuteError(null);
                }
                pendingExitCategoryRef.current = null;
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={lastMinuteDialogOpen} onOpenChange={setLastMinuteDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Adjust Planned Quantities · {selectedCategory}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Increase planned quantities for items to cover last-minute orders. Buffer values remain unchanged.
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
                        Planned: {formatQuantity(item.planned_quantity)} {item.unit}
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
                        {planGeneratedState[category]
                          ? editingState[category]
                            ? `Plan generated · Editing${
                                unsavedChanges[category] ? " (unsaved changes)" : ""
                              }`
                            : "Plan generated"
                          : "Plan pending"}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((item, index) => (
                        <PlanItemCard
                          key={`${item.item_name}-${index}-preview`}
                          item={item}
                          readOnly
                          planGenerated={
                            planGeneratedState[category] && !editingState[category]
                          }
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
              <Button
                variant="outline"
                onClick={() => setPlanPreviewOpen(false)}
              >
                Close
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
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
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
