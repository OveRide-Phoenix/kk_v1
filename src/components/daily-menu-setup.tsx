"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithButton } from "@/components/ui/input-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Calendar as CalendarIcon, Eye, Pencil, Trash2, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DatePickerWithPresets } from "@/components/ui/date-picker";
import { format as formatDate } from "date-fns";
import { AdminLayout } from "@/components/admin-layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/store";
import { http } from "@/lib/http";
import {
  citySupportsFood,
  citySupportsCondiments,
  getSupportedMeals,
  getCityLabel,
} from "@/config/cities";

interface MenuItem {
  menu_item_id?: number;
  item_id?: number | null;
  combo_id?: number | null;
  item_name: string;
  category_id: number | null;
  component_type_id?: number | null;
  component_type_name?: string | null;
  is_combo?: boolean;
  is_plated?: boolean;
  is_condiment?: boolean;
  max_qty: number;
  available_qty: number;
  rate: number;
  discount_pct: number | null;
  is_default: boolean;
  sort_order: number;
  item_max_qty?: number | null;
}

type MealSection = "breakfast" | "lunch" | "dinner" | "condiments";

const SECTION_TO_BLD_ID: Record<MealSection, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  condiments: 4,
};

const MEALS_REQUIRING_DEFAULT = new Set<MealSection>(["breakfast", "lunch", "dinner"]);

const buildMenuEntryKey = (entry: { item_id?: number | null; combo_id?: number | null }) =>
  entry.combo_id != null ? `combo:${entry.combo_id}` : `item:${entry.item_id}`;

export function DailyMenuSetup() {
  // ───────────────────────────────────────────────────────────────────────
  // Local state
  // ───────────────────────────────────────────────────────────────────────
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");

  // items grouped by meal section
  const [itemsByMeal, setItemsByMeal] = useState<Record<MealSection, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  });

  // Calendar state
  const [draftDate, setDraftDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [confirmedDate, setConfirmedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Controls for “Add Menu Item” dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [availableItems, setAvailableItems] = useState<
    {
      item_id?: number | null;
      combo_id?: number | null;
      name: string;
      description: string;
      alias: string | null;
      category_id: number | null;
      component_type_id?: number | null;
      component_type_name?: string | null;
      uom: string;
      weight_factor: number | null;
      weight_uom: string | null;
      hsn_code: string | null;
      factor: number | null;
      quantity_portion: number | null;
      buffer_percentage: number | null;
      max_qty_breakfast: number | null;
      max_qty_lunch: number | null;
      max_qty_dinner: number | null;
      max_qty_condiments: number | null;
      picture_url: string | null;
      breakfast_price: number | null;
      lunch_price: number | null;
      dinner_price: number | null;
      condiments_price: number | null;
      festival_price: number | null;
      cgst: number | null;
      sgst: number | null;
      igst: number | null;
      net_price: number | null;
      is_combo: boolean;
      is_plated?: boolean;
      is_condiment?: boolean;
      bld_ids: number[];
    }[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentSection, setCurrentSection] = useState<MealSection>(() =>
    citySupportsFood(adminCity) ? "breakfast" : "condiments",
  );

  // Edit / view states
  const [editIndexByMeal, setEditIndexByMeal] = useState<Record<MealSection, number | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    condiments: null,
  });
  const [viewItem, setViewItem] = useState<null | MenuItem>(null);

  // Loading flags
  const [loadingItemsAPI, setLoadingItemsAPI] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [togglingRelease, setTogglingRelease] = useState(false);

  // Menu metadata
  const [menuIdByMeal, setMenuIdByMeal] = useState<Record<MealSection, number | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    condiments: null,
  });
  const [isReleasedByMeal, setIsReleasedByMeal] = useState<Record<MealSection, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false,
    condiments: false,
  });

  const supportsFood = citySupportsFood(adminCity);
  const supportsCondiments = citySupportsCondiments(adminCity);
  const visibleMeals = getSupportedMeals(adminCity);
  const adminCityLabel = getCityLabel(adminCity);

  const mealLabel = (meal: MealSection) => meal.charAt(0).toUpperCase() + meal.slice(1);

  const ensureDefaultSelection = (meal: MealSection) => {
    if (!MEALS_REQUIRING_DEFAULT.has(meal)) {
      return true;
    }
    const rows = itemsByMeal[meal] ?? [];
    const hasDefault = rows.some((row) => Boolean(row.is_default));
    if (hasDefault) {
      return true;
    }

    toast({
      title: "Select a default item",
      description: `Please mark one ${mealLabel(meal)} item as default before continuing.`,
      variant: "destructive",
    });
    return false;
  };

  // ───────────────────────────────────────────────────────────────────────
  // Helpers: format date → "YYYY-MM-DD"
  // ───────────────────────────────────────────────────────────────────────
  const normalizeToMidnight = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const formatISODate = (d: Date) => formatDate(normalizeToMidnight(d), "yyyy-MM-dd");

  const parseMaxField = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const floored = Math.floor(parsed);
    return floored < 0 ? 0 : floored;
  };

  useEffect(() => {
    if (!supportsFood) {
      setCurrentSection("condiments");
    }
  }, [supportsFood]);

  useEffect(() => {
    setItemsByMeal({
      breakfast: [],
      lunch: [],
      dinner: [],
      condiments: [],
    });
    setMenuIdByMeal({
      breakfast: null,
      lunch: null,
      dinner: null,
      condiments: null,
    });
    setIsReleasedByMeal({
      breakfast: false,
      lunch: false,
      dinner: false,
      condiments: false,
    });
  }, [adminCity]);

  useEffect(() => {
    if (!calendarOpen) return;
    const base = confirmedDate
      ? normalizeToMidnight(confirmedDate)
      : normalizeToMidnight(new Date());
    setDraftDate(base);
  }, [calendarOpen, confirmedDate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = "dailymenusetup:prefill";
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    window.localStorage.removeItem(storageKey);
    try {
      const payload = JSON.parse(raw) as {
        date?: string;
        bld_type?: string;
      };

      if (payload?.date) {
        const parsed = new Date(payload.date);
        if (!Number.isNaN(parsed.getTime())) {
          const normalized = normalizeToMidnight(parsed);
          setDraftDate(new Date(normalized));
          setConfirmedDate(new Date(normalized));
        }
      }

      if (payload?.bld_type) {
        const normalizedMeal = payload.bld_type.toLowerCase();
        const validMeals = ["breakfast", "lunch", "dinner", "condiments"];
        if (validMeals.includes(normalizedMeal)) {
          setCurrentSection(normalizedMeal);
        }
      }
    } catch (error) {
      console.error("Failed to apply daily menu prefill", error);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────
  // 1) Fetch for all meal sections when date is confirmed
  // ───────────────────────────────────────────────────────────────────────
  const fetchMealSection = useCallback(
    async (meal: MealSection) => {
      const isCondimentsSection = meal === "condiments";
      if (!isCondimentsSection && !confirmedDate) return;
      setLoadingMenu(true);
      try {
        const params = new URLSearchParams({
          bld_type: meal,
          city_code: adminCity,
          menu_type: isCondimentsSection ? "CONDIMENTS" : "ONE_DAY",
          include_combos: "1",
        });
        if (!isCondimentsSection && confirmedDate) {
          params.set("date", formatISODate(confirmedDate));
          params.set("period_type", "one_day");
        }

        const res = await http.get(`/api/menu?${params.toString()}`);
        if (res.status === 404) {
          setMenuIdByMeal((prev) => ({ ...prev, [meal]: null }));
          setIsReleasedByMeal((prev) => ({ ...prev, [meal]: false }));
          setItemsByMeal((prev) => ({ ...prev, [meal]: [] }));
          return;
        }
        if (!res.ok) {
          console.warn(`Failed to fetch ${meal} menu`, await res.text());
          setMenuIdByMeal((prev) => ({ ...prev, [meal]: null }));
          setIsReleasedByMeal((prev) => ({ ...prev, [meal]: false }));
          setItemsByMeal((prev) => ({ ...prev, [meal]: [] }));
          return;
        }

        const data = await res.json();
        setMenuIdByMeal((prev) => ({ ...prev, [meal]: data.menu_id }));
        setIsReleasedByMeal((prev) => ({ ...prev, [meal]: data.is_released }));
        const mapped = data.items.map((it: any) => {
          const persistedMax = parseMaxField(it.max_qty);
          const catalogMax = parseMaxField(it.item_max_qty);
          const resolvedMax = persistedMax ?? catalogMax ?? 0;
          const availableQty = Number(it.available_qty);
          return {
            menu_item_id: it.menu_item_id,
            item_id: it.item_id,
            combo_id: it.combo_id ?? null,
            item_name: it.item_name,
            category_id: it.category_id,
            component_type_id: it.component_type_id ?? null,
            component_type_name: it.component_type_name ?? null,
            is_combo: Boolean(it.is_combo),
            is_plated: Boolean(it.is_plated),
            is_condiment: isCondimentsSection,
            max_qty: resolvedMax,
            available_qty: Number.isFinite(availableQty) ? availableQty : resolvedMax,
            rate: Number(it.rate ?? 0),
            discount_pct: it.discount_pct != null ? Number(it.discount_pct) : null,
            is_default: Boolean(it.is_default),
            sort_order: it.sort_order,
            item_max_qty: catalogMax,
          };
        });
        setItemsByMeal((prev) => ({ ...prev, [meal]: mapped }));
      } catch (err) {
        console.error(`Failed to fetch ${meal}`, err);
        setMenuIdByMeal((prev) => ({ ...prev, [meal]: null }));
        setIsReleasedByMeal((prev) => ({ ...prev, [meal]: false }));
        setItemsByMeal((prev) => ({ ...prev, [meal]: [] }));
      } finally {
        setLoadingMenu(false);
      }
    },
    [adminCity, confirmedDate],
  );

  useEffect(() => {
    if (!supportsFood) {
      setItemsByMeal((prev) => ({
        ...prev,
        breakfast: [],
        lunch: [],
        dinner: [],
      }));
      setMenuIdByMeal((prev) => ({
        ...prev,
        breakfast: null,
        lunch: null,
        dinner: null,
      }));
      setIsReleasedByMeal((prev) => ({
        ...prev,
        breakfast: false,
        lunch: false,
        dinner: false,
      }));
      return;
    }
    if (!confirmedDate) return;
    (["breakfast", "lunch", "dinner"] as MealSection[]).forEach((meal) => {
      void fetchMealSection(meal);
    });
  }, [supportsFood, confirmedDate, fetchMealSection]);

  useEffect(() => {
    if (!supportsCondiments) {
      setItemsByMeal((prev) => ({ ...prev, condiments: [] }));
      setMenuIdByMeal((prev) => ({ ...prev, condiments: null }));
      setIsReleasedByMeal((prev) => ({ ...prev, condiments: false }));
      return;
    }
    void fetchMealSection("condiments");
  }, [supportsCondiments, fetchMealSection]);

  // ───────────────────────────────────────────────────────────────────────
  // 2) Open “Add Menu Item” dialog for a given section
  // ───────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!itemDialogOpen) return;
    setLoadingItemsAPI(true);
    const fetchAvailable = async () => {
      try {
        const params = new URLSearchParams({ bld_type: currentSection, include_combos: "1" });
        const res = await http.get(`/api/menu/available-items?${params.toString()}`);
        if (res.status === 404) {
          setAvailableItems([]);
          setSelectedItems([]);
          if (currentSection === "condiments") {
            toast({
              title: "No condiments available",
              description:
                "Please create condiment items in Product Management before adding them here.",
            });
          }
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to load items for ${currentSection}`);
        }
        const data = await res.json();
        setAvailableItems(
          data.map((item: any) => ({
            ...item,
            max_qty_breakfast: parseMaxField(item.max_qty_breakfast),
            max_qty_lunch: parseMaxField(item.max_qty_lunch),
            max_qty_dinner: parseMaxField(item.max_qty_dinner),
            max_qty_condiments: parseMaxField(item.max_qty_condiments),
            bld_ids: Array.isArray(item.bld_ids) ? [...item.bld_ids] : [],
          })),
        );
        setSelectedItems([]);
      } catch (err) {
        console.error(`Failed to load available items for ${currentSection}`, err);
        setAvailableItems([]);
        toast({
          title: "Unable to load items",
          description:
            currentSection === "condiments"
              ? "We couldn’t find any condiment items yet."
              : `Failed to load items for ${currentSection}. Please try again.`,
          variant: currentSection === "condiments" ? "default" : "destructive",
        });
      } finally {
        setLoadingItemsAPI(false);
      }
    };
    fetchAvailable();
  }, [itemDialogOpen, currentSection, adminCity]);

  // ───────────────────────────────────────────────────────────────────────
  // 3) Add selected items into the correct section
  // ───────────────────────────────────────────────────────────────────────
  const handleItemSelection = () => {
    const existingIds = new Set(itemsByMeal[currentSection].map((row) => buildMenuEntryKey(row)));

    const uniqueSelections = selectedItems.filter((id) => !existingIds.has(id));
    const duplicates = selectedItems.length - uniqueSelections.length;

    if (duplicates > 0) {
      toast({
        title: "Already added",
        description: "Duplicate items were skipped. Each menu item can appear only once per meal.",
      });
    }

    if (uniqueSelections.length === 0) {
      setSelectedItems([]);
      return;
    }

    const newRows: MenuItem[] = uniqueSelections.map((selectedKey, index) => {
      const found = availableItems.find((i) => buildMenuEntryKey(i) === selectedKey)!;
      const catalogMax = (() => {
        switch (currentSection) {
          case "breakfast":
            return found.max_qty_breakfast;
          case "lunch":
            return found.max_qty_lunch;
          case "dinner":
            return found.max_qty_dinner;
          case "condiments":
            return found.max_qty_condiments;
          default:
            return null;
        }
      })();

      const resolvedMax = (() => {
        if (catalogMax == null) return 1;
        const numeric = Number(catalogMax);
        if (!Number.isFinite(numeric) || numeric <= 0) return 1;
        return Math.floor(numeric);
      })();
      const resolvedRate = (() => {
        switch (currentSection) {
          case "breakfast":
            return Number(found.breakfast_price ?? found.net_price ?? 0);
          case "lunch":
            return Number(found.lunch_price ?? found.net_price ?? 0);
          case "dinner":
            return Number(found.dinner_price ?? found.net_price ?? 0);
          case "condiments":
            return Number(found.condiments_price ?? found.net_price ?? 0);
          default:
            return Number(found.net_price ?? 0);
        }
      })();
      return {
        item_id: found.item_id,
        combo_id: found.combo_id ?? null,
        item_name: found.name,
        category_id: found.category_id,
        component_type_id: found.component_type_id ?? null,
        component_type_name: found.component_type_name ?? null,
        is_combo: Boolean(found.is_combo),
        is_plated: Boolean(found.is_plated),
        is_condiment: Boolean(found.is_condiment),
        max_qty: resolvedMax,
        available_qty: resolvedMax,
        rate: resolvedRate,
        discount_pct: null,
        is_default: false,
        sort_order: itemsByMeal[currentSection].length + index + 1,
        item_max_qty: catalogMax ?? null,
      };
    });

    setItemsByMeal((prev) => ({
      ...prev,
      [currentSection]: [...prev[currentSection], ...newRows],
    }));
    setItemDialogOpen(false);
    setSelectedItems([]);
  };

  // ───────────────────────────────────────────────────────────────────────
  // 4) Edit / Delete / Save in a given section
  // ───────────────────────────────────────────────────────────────────────
  const handleEdit = (meal: string, index: number) => {
    setEditIndexByMeal((prev) => ({ ...prev, [meal]: index }));
  };
  const handleDelete = (meal: string, index: number) => {
    setItemsByMeal((prev) => {
      const copy = [...prev[meal]];
      copy.splice(index, 1);
      return { ...prev, [meal]: copy };
    });
  };
  const handleSave = (
    meal: string,
    index: number,
    field: keyof MenuItem,
    value: string | number,
  ) => {
    setItemsByMeal((prev) => {
      const copy = [...prev[meal]];
      (copy[index] as any)[field] = value;
      return { ...prev, [meal]: copy };
    });
  };

  // ───────────────────────────────────────────────────────────────────────
  // 5) Save (Upsert) for a specific meal section
  // ───────────────────────────────────────────────────────────────────────
  const handleSaveMenu = async (meal: MealSection): Promise<boolean> => {
    const isCondimentsSection = meal === "condiments";
    if (!isCondimentsSection && !confirmedDate) return false;
    if (!isCondimentsSection && !ensureDefaultSelection(meal)) {
      return false;
    }
    setSavingMenu(true);

    const rows = itemsByMeal[meal];
    const itemsArray = rows.map((row, idx) => {
      if (row.menu_item_id == null) {
        return {
          item_id: row.item_id ?? undefined,
          combo_id: row.combo_id ?? undefined,
          category_id: row.category_id,
          max_qty: row.max_qty,
          available_qty:
            typeof row.available_qty === "number" && Number.isFinite(row.available_qty)
              ? row.available_qty
              : row.max_qty,
          rate: row.rate,
          is_default: row.is_default,
          sort_order: row.sort_order || idx + 1,
        };
      }
      return {
        item_id: row.item_id ?? undefined,
        combo_id: row.combo_id ?? undefined,
        category_id: row.category_id,
        max_qty: row.max_qty,
        available_qty: row.available_qty, // keep any later adjustments
        rate: row.rate,
        is_default: row.is_default,
        sort_order: row.sort_order || idx + 1,
      };
    });

    const payload: Record<string, unknown> = {
      bld_type: meal,
      is_festival: false,
      period_type: isCondimentsSection ? null : "one_day",
      items: itemsArray,
      city_code: adminCity,
      menu_type: isCondimentsSection ? "CONDIMENTS" : "ONE_DAY",
    };
    if (!isCondimentsSection && confirmedDate) {
      payload.date = formatISODate(confirmedDate);
    }

    try {
      const res = await http.post("/api/menu", payload);

      if (!res.ok) {
        console.error("Save failed:", await res.text());
        return false;
      }

      const data = await res.json();
      setMenuIdByMeal((prev) => ({ ...prev, [meal]: data.menu_id }));
      setIsReleasedByMeal((prev) => ({ ...prev, [meal]: data.is_released }));

      const mapped = data.items.map((it: any) => {
        const persistedMax = parseMaxField(it.max_qty);
        const catalogMax = parseMaxField(it.item_max_qty);
        const resolvedMax = persistedMax ?? catalogMax ?? 0;
        const availableQty = Number(it.available_qty);
        return {
          menu_item_id: it.menu_item_id,
          item_id: it.item_id,
          combo_id: it.combo_id ?? null,
          item_name: it.item_name,
          category_id: it.category_id,
          component_type_id: it.component_type_id ?? null,
          component_type_name: it.component_type_name ?? null,
          is_combo: Boolean(it.is_combo),
          is_plated: Boolean(it.is_plated),
          is_condiment: isCondimentsSection,
          max_qty: resolvedMax,
          available_qty: Number.isFinite(availableQty) ? availableQty : resolvedMax,
          rate: Number(it.rate ?? 0),
          discount_pct: it.discount_pct != null ? Number(it.discount_pct) : null,
          is_default: Boolean(it.is_default),
          sort_order: it.sort_order,
          item_max_qty: catalogMax,
        };
      });
      setItemsByMeal((prev) => ({ ...prev, [meal]: mapped }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setSavingMenu(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // 6) Release / Unrelease for a specific meal
  // ───────────────────────────────────────────────────────────────────────
  const handleToggleRelease = async (meal: MealSection, unrelease = false) => {
    if (!menuIdByMeal[meal]) return; // keep your existing guard
    setTogglingRelease(true);
    try {
      // On release, always save first so UI changes are persisted
      if (!unrelease) {
        const saved = await handleSaveMenu(meal);
        if (!saved) {
          return;
        }
      }

      const endpoint = unrelease
        ? `/api/menu/${menuIdByMeal[meal]}/unrelease`
        : `/api/menu/${menuIdByMeal[meal]}/release`;

      const res = await http.patch(endpoint);
      if (!res.ok) {
        console.error("Toggle release failed:", await res.text());
        return;
      }
      await res.json();
      setIsReleasedByMeal((prev) => ({ ...prev, [meal]: !unrelease }));
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingRelease(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // 7) Filtering for dialog tabs
  // ───────────────────────────────────────────────────────────────────────
  const filteredItemsByQuery = (arr: typeof availableItems) => {
    const mealId = SECTION_TO_BLD_ID[currentSection] ?? null;
    const byMeal = mealId
      ? arr.filter((item) => Array.isArray(item.bld_ids) && item.bld_ids.includes(mealId))
      : arr;
    return byMeal.filter(
      (it) =>
        it.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        (it.description || "").toLowerCase().includes(itemSearchQuery.toLowerCase()),
    );
  };

  const displayDate = confirmedDate ?? draftDate;
  const computeMidnightTimestamp = (offsetDays = 0) => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    if (offsetDays !== 0) {
      base.setDate(base.getDate() + offsetDays);
    }
    return base.getTime();
  };
  const todayTimestamp = computeMidnightTimestamp();
  const tomorrowTimestamp = computeMidnightTimestamp(1);
  const selectedTimestamp = confirmedDate ? confirmedDate.getTime() : null;
  const isTodaySelected = selectedTimestamp === todayTimestamp;
  const isTomorrowSelected = selectedTimestamp === tomorrowTimestamp;
  const isReadOnlyMode = selectedTimestamp !== null && selectedTimestamp < todayTimestamp;

  // ───────────────────────────────────────────────────────────────────────
  // JSX
  // ───────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout activePage="dailymenusetup">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Setup Daily Menu</CardTitle>
            <div />
          </div>
        </CardHeader>

        <CardContent>
          {/* Date Picker */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick actions */}
              <Button
                variant={isTodaySelected ? "default" : "outline"}
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  setDraftDate(new Date(today));
                  setConfirmedDate(new Date(today));
                }}
              >
                Today
              </Button>

              <Button
                variant={isTomorrowSelected ? "default" : "outline"}
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setHours(0, 0, 0, 0);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setDraftDate(new Date(tomorrow));
                  setConfirmedDate(new Date(tomorrow));
                }}
              >
                Tomorrow
              </Button>

              {/* Custom date via calendar */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    className="w-[220px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {displayDate ? formatDate(displayDate, "PPP") : "Pick custom date"}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                  <div className="flex flex-col">
                    {/* Calendar area with small top/side padding */}
                    <div className="px-3 pt-3">
                      <Calendar
                        mode="single"
                        selected={draftDate ?? undefined}
                        defaultMonth={draftDate ?? new Date()}
                        onSelect={(date: Date | undefined) => {
                          if (!date) return;
                          const normalized = normalizeToMidnight(date);
                          setDraftDate(normalized);
                          setConfirmedDate(normalized);
                          setCalendarOpen(false);
                        }}
                        initialFocus
                        className="text-center"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Sections adapt based on city capabilities */}
          {visibleMeals.map((meal) => {
            const isCondimentsSection = meal === "condiments";
            const requiresDate = !isCondimentsSection;
            const rows = itemsByMeal[meal];
            const hasItems = rows.length > 0;
            const hasMenuId = menuIdByMeal[meal] != null;
            const showSaveButton =
              !isReadOnlyMode && hasItems && (!requiresDate || Boolean(confirmedDate));
            const showReleaseControls = !isReadOnlyMode && hasMenuId;
            const showButtonRow = showSaveButton || showReleaseControls;
            const disableAdd = isReleasedByMeal[meal] || (requiresDate && !confirmedDate);
            const showDefaultColumn = !isCondimentsSection;

            return (
              <section key={meal} className="mb-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold capitalize">
                      {isCondimentsSection ? "Condiments · Till stocks last" : mealLabel(meal)}
                    </h2>
                    {isCondimentsSection ? (
                      <p className="text-sm text-muted-foreground">
                        Applies to all future days for {adminCityLabel}. Changing the calendar date
                        won't affect this list.
                      </p>
                    ) : (
                      confirmedDate && (
                        <p className="text-sm text-muted-foreground">
                          Menu for {formatDate(confirmedDate, "PPP")}
                        </p>
                      )
                    )}
                  </div>
                  {!isReadOnlyMode && (
                    <Button
                      onClick={() => {
                        setCurrentSection(meal);
                        setItemDialogOpen(true);
                      }}
                      disabled={disableAdd}
                    >
                      <Plus size={16} className="mr-1" />
                      Add {isCondimentsSection ? "Condiment" : `${mealLabel(meal)} Item`}
                    </Button>
                  )}
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Sl.no</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Item Threshold</TableHead>
                        <TableHead>Available Qty</TableHead>
                        <TableHead>Menu Rate</TableHead>
                        {showDefaultColumn && <TableHead>Default</TableHead>}
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={showDefaultColumn ? 7 : 6}
                            className="text-center text-gray-500"
                          >
                            {requiresDate && !confirmedDate
                              ? "Please pick a date to see or add items"
                              : "No items added yet"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((row, index) => {
                          const canEditRow = !isReadOnlyMode && !isReleasedByMeal[meal];
                          const isRowEditing = canEditRow && editIndexByMeal[meal] === index;
                          return (
                            <TableRow key={index}>
                              <TableCell className="text-center">{index + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span>{row.item_name}</span>
                                  {row.is_plated ? <Badge variant="secondary">Plated</Badge> : null}
                                  {row.component_type_name ? (
                                    <Badge variant="outline">{row.component_type_name}</Badge>
                                  ) : null}
                                </div>
                              </TableCell>

                              <TableCell>
                                {canEditRow && (row.menu_item_id == null || isRowEditing) ? (
                                  <InputWithButton
                                    value={row.max_qty}
                                    onChange={(val: number) =>
                                      handleSave(meal, index, "max_qty", val)
                                    }
                                  />
                                ) : (
                                  row.max_qty
                                )}
                              </TableCell>

                              <TableCell>
                                {isReadOnlyMode ? (
                                  row.available_qty
                                ) : row.menu_item_id == null ? (
                                  row.max_qty
                                ) : isReleasedByMeal[meal] ? (
                                  row.available_qty
                                ) : (
                                  <InputWithButton
                                    value={row.available_qty}
                                    onChange={(val: number) =>
                                      handleSave(meal, index, "available_qty", val)
                                    }
                                  />
                                )}
                              </TableCell>

                              <TableCell>
                                {isRowEditing ? (
                                  <Input
                                    type="number"
                                    value={row.rate}
                                    onChange={(e) =>
                                      handleSave(meal, index, "rate", Number(e.target.value))
                                    }
                                  />
                                ) : row.discount_pct ? (
                                  <span className="flex flex-col gap-0.5">
                                    <span className="line-through text-muted-foreground text-xs">
                                      ₹{row.rate}
                                    </span>
                                    <span className="font-medium">
                                      ₹{(row.rate * (1 - row.discount_pct / 100)).toFixed(2)}
                                    </span>
                                    <Badge variant="secondary" className="w-fit text-xs">
                                      {row.discount_pct}% off
                                    </Badge>
                                  </span>
                                ) : (
                                  `₹${row.rate}`
                                )}
                              </TableCell>

                              {showDefaultColumn && (
                                <TableCell>
                                  {isRowEditing ? (
                                    <Checkbox
                                      checked={row.is_default}
                                      onCheckedChange={(checked) =>
                                        handleSave(meal, index, "is_default", checked ? 1 : 0)
                                      }
                                    />
                                  ) : row.is_default ? (
                                    <Badge variant="secondary">Yes</Badge>
                                  ) : (
                                    <Badge variant="outline">No</Badge>
                                  )}
                                </TableCell>
                              )}

                              <TableCell className="flex justify-center gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setViewItem(row)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {isRowEditing ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled={!canEditRow}
                                    onClick={() =>
                                      setEditIndexByMeal((prev) => ({
                                        ...prev,
                                        [meal]: null,
                                      }))
                                    }
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled={!canEditRow}
                                    onClick={() => handleEdit(meal, index)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  disabled={!canEditRow}
                                  onClick={() => handleDelete(meal, index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Save / Release Buttons for this section */}
                {showButtonRow && (
                  <div className="mt-4 flex justify-end gap-4">
                    {showReleaseControls && (
                      <Button
                        variant="destructive"
                        onClick={() => handleToggleRelease(meal, false)}
                        disabled={!menuIdByMeal[meal] || togglingRelease}
                      >
                        {togglingRelease && !isReleasedByMeal[meal]
                          ? "Releasing…"
                          : `Release ${mealLabel(meal)}`}
                      </Button>
                    )}
                    {showReleaseControls && isReleasedByMeal[meal] && (
                      <Button
                        variant="outline"
                        onClick={() => handleToggleRelease(meal, true)}
                        disabled={togglingRelease}
                      >
                        {togglingRelease ? "Unreleasing…" : `Unrelease ${mealLabel(meal)}`}
                      </Button>
                    )}
                    {showSaveButton && (
                      <Button
                        onClick={() => handleSaveMenu(meal)}
                        disabled={
                          isCondimentsSection
                            ? rows.length === 0 || savingMenu || isReleasedByMeal[meal]
                            : !confirmedDate ||
                              rows.length === 0 ||
                              savingMenu ||
                              isReleasedByMeal[meal]
                        }
                      >
                        {savingMenu ? "Saving…" : `Save ${mealLabel(meal)}`}
                      </Button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
          {/* Item Selection Dialog */}
          <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
            <DialogContent className="w-[95vw] sm:max-w-[1100px] max-h-[85vh] overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle>
                  Select Menu Items for <span className="capitalize">{currentSection}</span>
                </DialogTitle>

                {/* Search */}
                <div className="relative !mt-6 sm:!mt-6">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <Input
                    placeholder="Search items..."
                    className="pl-10"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    disabled={loadingItemsAPI}
                  />
                </div>
              </DialogHeader>

              {/* Grid like the sketch: NO grouping, NO ScrollArea */}
              <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredItemsByQuery(availableItems).map((it) => {
                  const entryKey = buildMenuEntryKey(it);
                  const checked = selectedItems.includes(entryKey);
                  return (
                    <label
                      key={entryKey}
                      className={[
                        "flex items-center gap-3 rounded-xl",
                        "border border-border/60 bg-amber-50/70 hover:bg-amber-50",
                        "px-4 py-3 cursor-pointer transition-colors",
                      ].join(" ")}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(isChecked) => {
                          if (isChecked) {
                            setSelectedItems((prev) =>
                              prev.includes(entryKey) ? prev : [...prev, entryKey],
                            );
                          } else {
                            setSelectedItems((prev) => prev.filter((id) => id !== entryKey));
                          }
                        }}
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{it.name}</div>
                          {it.is_plated ? <Badge variant="secondary">Plated</Badge> : null}
                          {it.component_type_name ? (
                            <Badge variant="outline">{it.component_type_name}</Badge>
                          ) : null}
                        </div>
                        {it.description ? (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {it.description}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setItemDialogOpen(false);
                    setItemSearchQuery("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleItemSelection();
                    setItemSearchQuery("");
                  }}
                  disabled={selectedItems.length === 0}
                >
                  Add Selected ({selectedItems.length})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
