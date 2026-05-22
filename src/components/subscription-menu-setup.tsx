"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format as formatDate } from "date-fns";
import {
  Check,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { AdminLayout } from "@/components/admin-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputWithButton } from "@/components/ui/input-button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getCityLabel, getSupportedMeals } from "@/config/cities";
import { http } from "@/lib/http";
import { useAuthStore } from "@/store/store";

type MealSection = "breakfast" | "lunch" | "dinner" | "condiments";

type MenuItem = {
  menu_item_id?: number;
  item_id?: number | null;
  combo_id?: number | null;
  item_name: string;
  category_id: number | null;
  component_type_id?: number | null;
  component_type_name?: string | null;
  is_combo?: boolean;
  is_plated?: boolean;
  max_qty: number;
  available_qty: number;
  rate: number;
  is_default: boolean;
  sort_order: number;
  item_max_qty?: number | null;
};

type AvailableItem = {
  item_id?: number | null;
  combo_id?: number | null;
  name: string;
  description: string | null;
  category_id: number | null;
  component_type_id?: number | null;
  component_type_name?: string | null;
  max_qty_breakfast: number | null;
  max_qty_lunch: number | null;
  max_qty_dinner: number | null;
  breakfast_price: number | null;
  lunch_price: number | null;
  dinner_price: number | null;
  festival_price: number | null;
  net_price: number | null;
  is_combo: boolean;
  is_plated?: boolean;
  bld_ids: number[];
};

type ItemGroupOption = {
  component_type_id: number;
  name: string;
  description?: string | null;
  category_id: number | null;
};

type CustomerOption = {
  customer_id: number;
  name: string;
  primary_mobile?: string | null;
};

type PauseWindow = {
  pause_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  meal_type?: string | null;
  start_date: string;
  end_date: string;
  reason?: string | null;
  is_active: boolean;
};

const FOOD_MEALS: MealSection[] = ["breakfast", "lunch", "dinner"];
const SECTION_TO_BLD_ID: Record<MealSection, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  condiments: 4,
};

const buildMenuEntryKey = (entry: {
  item_id?: number | null;
  combo_id?: number | null;
  component_type_id?: number | null;
}) => {
  if (entry.combo_id != null) return `combo:${entry.combo_id}`;
  if (entry.item_id != null) return `item:${entry.item_id}`;
  return `group:${entry.component_type_id}`;
};

const mealLabel = (meal: MealSection) => meal.charAt(0).toUpperCase() + meal.slice(1);

const parseMaxField = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const floored = Math.floor(parsed);
  return floored < 0 ? 0 : floored;
};

const emptyMenuState = (): Record<MealSection, MenuItem[]> => ({
  breakfast: [],
  lunch: [],
  dinner: [],
  condiments: [],
});

export function SubscriptionMenuSetup() {
  const adminCity = useAuthStore((state) => state.adminCity || state.user?.city_code || "MYS");
  const adminCityLabel = getCityLabel(adminCity);
  const visibleMeals = useMemo(
    () => getSupportedMeals(adminCity).filter((meal) => FOOD_MEALS.includes(meal)),
    [adminCity],
  );

  const [itemsByMeal, setItemsByMeal] = useState<Record<MealSection, MenuItem[]>>(emptyMenuState);
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
  const [editIndexByMeal, setEditIndexByMeal] = useState<Record<MealSection, number | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    condiments: null,
  });

  const [currentSection, setCurrentSection] = useState<MealSection>("breakfast");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [addDialogTab, setAddDialogTab] = useState<"groups" | "plated" | "combos">("groups");
  const [loadingItemsAPI, setLoadingItemsAPI] = useState(false);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [savingMeal, setSavingMeal] = useState<MealSection | null>(null);
  const [togglingMeal, setTogglingMeal] = useState<MealSection | null>(null);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [pauses, setPauses] = useState<PauseWindow[]>([]);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [editingPauseId, setEditingPauseId] = useState<number | null>(null);
  const [pauseCustomerId, setPauseCustomerId] = useState("");
  const [pauseMeal, setPauseMeal] = useState("all");
  const [pauseStartDate, setPauseStartDate] = useState("");
  const [pauseEndDate, setPauseEndDate] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [savingPause, setSavingPause] = useState(false);

  useEffect(() => {
    setItemsByMeal(emptyMenuState());
    setMenuIdByMeal({ breakfast: null, lunch: null, dinner: null, condiments: null });
    setIsReleasedByMeal({ breakfast: false, lunch: false, dinner: false, condiments: false });
    setCurrentSection(visibleMeals[0] ?? "breakfast");
  }, [adminCity, visibleMeals]);

  const fetchMealSection = useCallback(
    async (meal: MealSection) => {
      try {
        const params = new URLSearchParams({
          bld_type: meal,
          city_code: adminCity,
          menu_type: "SUBSCRIPTION",
          period_type: "subscription",
          include_combos: "1",
        });
        const res = await http.get(`/api/menu?${params.toString()}`);
        if (res.status === 404) {
          setMenuIdByMeal((prev) => ({ ...prev, [meal]: null }));
          setIsReleasedByMeal((prev) => ({ ...prev, [meal]: false }));
          setItemsByMeal((prev) => ({ ...prev, [meal]: [] }));
          return;
        }
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
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
            max_qty: resolvedMax,
            available_qty: Number.isFinite(availableQty) ? availableQty : resolvedMax,
            rate: Number(it.rate ?? 0),
            is_default: Boolean(it.is_default),
            sort_order: it.sort_order,
            item_max_qty: catalogMax,
          };
        });
        setMenuIdByMeal((prev) => ({ ...prev, [meal]: data.menu_id }));
        setIsReleasedByMeal((prev) => ({ ...prev, [meal]: Boolean(data.is_released) }));
        setItemsByMeal((prev) => ({ ...prev, [meal]: mapped }));
      } catch (error) {
        console.error(`Failed to fetch subscription ${meal}`, error);
      }
    },
    [adminCity],
  );

  const loadPauses = useCallback(async () => {
    try {
      const res = await http.get(`/api/subscription-pauses?city_code=${adminCity}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPauses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load subscription pauses", error);
      setPauses([]);
    }
  }, [adminCity]);

  useEffect(() => {
    visibleMeals.forEach((meal) => {
      void fetchMealSection(meal);
    });
  }, [fetchMealSection, visibleMeals]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await http.get(`/api/admin/customers?city_code=${adminCity}&limit=500`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
      } catch (error) {
        console.error("Failed to load customers", error);
        setCustomers([]);
      }
    };

    void loadCustomers();
    void loadPauses();
  }, [adminCity, loadPauses]);

  useEffect(() => {
    if (!itemDialogOpen) return;
    const fetchAvailable = async () => {
      setLoadingItemsAPI(true);
      try {
        const params = new URLSearchParams({ bld_type: currentSection, include_combos: "1" });
        const res = await http.get(`/api/menu/available-items?${params.toString()}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setAvailableItems(
          data.map((item: any) => ({
            ...item,
            max_qty_breakfast: parseMaxField(item.max_qty_breakfast),
            max_qty_lunch: parseMaxField(item.max_qty_lunch),
            max_qty_dinner: parseMaxField(item.max_qty_dinner),
            bld_ids: Array.isArray(item.bld_ids) ? [...item.bld_ids] : [],
          })),
        );
        setSelectedItems([]);
      } catch (error) {
        console.error("Failed to load available subscription items", error);
        setAvailableItems([]);
        toast({
          title: "Unable to load items",
          description: `Failed to load ${mealLabel(currentSection)} items. Please try again.`,
          variant: "destructive",
        });
      } finally {
        setLoadingItemsAPI(false);
      }
    };
    void fetchAvailable();
  }, [currentSection, itemDialogOpen]);

  const filteredAvailableItems = availableItems.filter((item) => {
    const mealId = SECTION_TO_BLD_ID[currentSection];
    const matchesMeal = Array.isArray(item.bld_ids) && item.bld_ids.includes(mealId);
    const query = itemSearchQuery.trim().toLowerCase();
    const matchesQuery =
      query.length === 0 ||
      item.name.toLowerCase().includes(query) ||
      (item.description ?? "").toLowerCase().includes(query);
    return matchesMeal && matchesQuery;
  });

  const availableItemGroups = Array.from(
    filteredAvailableItems
      .reduce((groups, item) => {
        if (item.component_type_id == null || !item.component_type_name) return groups;
        if (!groups.has(item.component_type_id)) {
          groups.set(item.component_type_id, {
            component_type_id: item.component_type_id,
            name: item.component_type_name,
            category_id: item.category_id,
          });
        }
        return groups;
      }, new Map<number, ItemGroupOption>())
      .values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const availablePlatedItems = filteredAvailableItems.filter(
    (item) => item.item_id != null && Boolean(item.is_plated),
  );

  const availableCombos = filteredAvailableItems.filter(
    (item) => item.combo_id != null && Boolean(item.is_combo),
  );

  const handleGroupSelection = () => {
    const existingIds = new Set(itemsByMeal[currentSection].map((row) => buildMenuEntryKey(row)));
    const uniqueSelections = selectedItems.filter((id) => !existingIds.has(id));
    if (uniqueSelections.length === 0) {
      setSelectedItems([]);
      return;
    }

    const newRows = uniqueSelections.map((selectedKey, index) => {
      const componentTypeId = Number(selectedKey.replace("group:", ""));
      const found = availableItemGroups.find((group) => group.component_type_id === componentTypeId)!;
      return {
        item_id: null,
        combo_id: null,
        component_type_id: found.component_type_id,
        component_type_name: found.name,
        item_name: found.name,
        category_id: found.category_id,
        is_combo: false,
        is_plated: false,
        max_qty: 1,
        available_qty: 1,
        rate: 0,
        is_default: false,
        sort_order: itemsByMeal[currentSection].length + index + 1,
        item_max_qty: null,
      };
    });

    setItemsByMeal((prev) => ({
      ...prev,
      [currentSection]: [...prev[currentSection], ...newRows],
    }));
    setItemDialogOpen(false);
    setItemSearchQuery("");
    setSelectedItems([]);
  };

  const handleProductSelection = (sourceItems: AvailableItem[]) => {
    const existingIds = new Set(itemsByMeal[currentSection].map((row) => buildMenuEntryKey(row)));
    const uniqueSelections = selectedItems.filter((id) => !existingIds.has(id));
    if (uniqueSelections.length === 0) {
      setSelectedItems([]);
      return;
    }

    const newRows = uniqueSelections.map((selectedKey, index) => {
      const found = sourceItems.find((item) => buildMenuEntryKey(item) === selectedKey)!;
      const catalogMax =
        currentSection === "breakfast"
          ? found.max_qty_breakfast
          : currentSection === "lunch"
            ? found.max_qty_lunch
            : found.max_qty_dinner;
      const resolvedMax = catalogMax == null || catalogMax <= 0 ? 1 : Math.floor(catalogMax);
      const resolvedRate =
        currentSection === "breakfast"
          ? Number(found.breakfast_price ?? found.net_price ?? 0)
          : currentSection === "lunch"
            ? Number(found.lunch_price ?? found.net_price ?? 0)
            : Number(found.dinner_price ?? found.net_price ?? 0);
      return {
        item_id: found.item_id,
        combo_id: found.combo_id ?? null,
        item_name: found.name,
        category_id: found.category_id,
        component_type_id: found.component_type_id ?? null,
        component_type_name: found.component_type_name ?? null,
        is_combo: Boolean(found.is_combo),
        is_plated: Boolean(found.is_plated),
        max_qty: resolvedMax,
        available_qty: resolvedMax,
        rate: resolvedRate,
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
    setItemSearchQuery("");
    setSelectedItems([]);
  };

  const handleDialogSelection = () => {
    if (addDialogTab === "groups") {
      handleGroupSelection();
      return;
    }
    handleProductSelection(addDialogTab === "plated" ? availablePlatedItems : availableCombos);
  };

  const handleSave = (meal: MealSection, index: number, field: keyof MenuItem, value: unknown) => {
    setItemsByMeal((prev) => {
      const copy = [...prev[meal]];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, [meal]: copy };
    });
  };

  const saveMenu = async (meal: MealSection): Promise<number | null> => {
    setSavingMeal(meal);
    try {
      const payload = {
        bld_type: meal,
        is_festival: false,
        period_type: "subscription",
        city_code: adminCity,
        menu_type: "SUBSCRIPTION",
        items: itemsByMeal[meal].map((row, idx) => ({
          item_id: row.item_id ?? undefined,
          combo_id: row.combo_id ?? undefined,
          component_type_id:
            row.item_id == null && row.combo_id == null ? row.component_type_id : undefined,
          category_id: row.category_id,
          max_qty: row.max_qty,
          available_qty: row.available_qty,
          rate: row.rate,
          is_default: row.is_default,
          sort_order: row.sort_order || idx + 1,
        })),
      };
      const res = await http.post("/api/menu", payload);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMenuIdByMeal((prev) => ({ ...prev, [meal]: data.menu_id }));
      setIsReleasedByMeal((prev) => ({ ...prev, [meal]: Boolean(data.is_released) }));
      await fetchMealSection(meal);
      toast({
        title: "Subscription menu saved",
        description: `${mealLabel(meal)} will apply going forward for ${adminCityLabel}.`,
      });
      return Number(data.menu_id);
    } catch (error) {
      console.error("Failed to save subscription menu", error);
      toast({
        title: "Save failed",
        description: "The subscription menu could not be saved.",
        variant: "destructive",
      });
      return null;
    } finally {
      setSavingMeal(null);
    }
  };

  const toggleRelease = async (meal: MealSection, unrelease = false) => {
    setTogglingMeal(meal);
    try {
      let menuId = menuIdByMeal[meal];
      if (!unrelease) {
        menuId = await saveMenu(meal);
        if (!menuId) return;
      }
      if (!menuId) {
        await fetchMealSection(meal);
        menuId = menuIdByMeal[meal];
      }
      if (!menuId) return;
      const endpoint = unrelease ? `/api/menu/${menuId}/unrelease` : `/api/menu/${menuId}/release`;
      const res = await http.patch(endpoint);
      if (!res.ok) throw new Error(await res.text());
      await fetchMealSection(meal);
    } catch (error) {
      console.error("Failed to update subscription release state", error);
      toast({
        title: "Status update failed",
        description: "The subscription menu status could not be changed.",
        variant: "destructive",
      });
    } finally {
      setTogglingMeal(null);
    }
  };

  const resetPauseForm = () => {
    setEditingPauseId(null);
    setPauseCustomerId("");
    setPauseMeal("all");
    setPauseStartDate("");
    setPauseEndDate("");
    setPauseReason("");
  };

  const openPauseEditor = (pause?: PauseWindow) => {
    if (!pause) {
      resetPauseForm();
      setPauseDialogOpen(true);
      return;
    }
    setEditingPauseId(pause.pause_id);
    setPauseCustomerId(String(pause.customer_id));
    setPauseMeal(pause.meal_type ? pause.meal_type.toLowerCase() : "all");
    setPauseStartDate(pause.start_date);
    setPauseEndDate(pause.end_date);
    setPauseReason(pause.reason ?? "");
    setPauseDialogOpen(true);
  };

  const savePause = async () => {
    if (!pauseCustomerId || !pauseStartDate || !pauseEndDate) {
      toast({
        title: "Missing pause details",
        description: "Choose a customer and date range before saving.",
        variant: "destructive",
      });
      return;
    }
    setSavingPause(true);
    try {
      const payload = {
        customer_id: Number(pauseCustomerId),
        start_date: pauseStartDate,
        end_date: pauseEndDate,
        meal_type: pauseMeal === "all" ? undefined : pauseMeal,
        reason: pauseReason.trim() || undefined,
        city_code: adminCity,
      };
      const res = editingPauseId
        ? await http.put(`/api/subscription-pauses/${editingPauseId}`, payload)
        : await http.post("/api/subscription-pauses", payload);
      if (!res.ok) throw new Error(await res.text());
      setPauseDialogOpen(false);
      resetPauseForm();
      await loadPauses();
    } catch (error) {
      console.error("Failed to save subscription pause", error);
      toast({
        title: "Pause not saved",
        description: "Please check the customer and date range.",
        variant: "destructive",
      });
    } finally {
      setSavingPause(false);
    }
  };

  const resumePause = async (pauseId: number) => {
    const res = await http.patch(`/api/subscription-pauses/${pauseId}/resume`);
    if (!res.ok) {
      toast({
        title: "Could not resume",
        description: "The pause window could not be cancelled.",
        variant: "destructive",
      });
      return;
    }
    await loadPauses();
  };

  const activeTab = visibleMeals.includes(currentSection) ? currentSection : visibleMeals[0];

  const getMealTabStatus = (meal: MealSection) => {
    const hasItems = itemsByMeal[meal].length > 0;
    if (!hasItems) {
      return {
        className:
          "border border-muted-foreground/45 bg-background shadow-[0_0_0_1px_rgba(148,163,184,0.1)]",
        label: "No items",
      };
    }
    if (menuIdByMeal[meal] != null && isReleasedByMeal[meal]) {
      return {
        className:
          "border border-emerald-300 bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.14),0_0_6px_rgba(16,185,129,0.65)]",
        label: "Released",
      };
    }
    return {
      className:
        "border border-amber-300 bg-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.14),0_0_6px_rgba(245,158,11,0.62)]",
      label: menuIdByMeal[meal] != null ? "Saved draft" : "Unsaved draft",
    };
  };

  return (
    <AdminLayout activePage="subscription-menu">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Subscription Menu</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Persistent menus for {adminCityLabel}; updates apply only to future subscription
                  service.
                </p>
              </div>
              <Badge variant="secondary">Open ended</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {visibleMeals.length === 0 ? (
              <Alert>
                <AlertTitle>Food menus are not enabled for this city</AlertTitle>
                <AlertDescription>
                  Switch to a food-enabled city to manage subscription breakfast, lunch, or dinner.
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={(value) => setCurrentSection(value as MealSection)}
              >
                <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
                  {visibleMeals.map((meal) => {
                    const status = getMealTabStatus(meal);
                    return (
                    <TabsTrigger
                      key={meal}
                      value={meal}
                      className="gap-2 rounded-md border px-4 py-2 data-[state=active]:border-primary data-[state=active]:shadow-sm"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ring-1 ring-white/70 ${status.className}`}
                        aria-label={status.label}
                        title={status.label}
                      />
                      {mealLabel(meal)}
                    </TabsTrigger>
                    );
                  })}
                </TabsList>
                {visibleMeals.map((meal) => {
                  const rows = itemsByMeal[meal];
                  const isReleased = isReleasedByMeal[meal];
                  const isBusy = savingMeal === meal || togglingMeal === meal;
                  const hasMenuId = menuIdByMeal[meal] != null;
                  return (
                    <TabsContent key={meal} value={meal}>
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold">{mealLabel(meal)}</h2>
                          <p className="text-sm text-muted-foreground">
                            {isReleased
                              ? "Released and active for subscription orders."
                              : "Draft until released."}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setCurrentSection(meal);
                            setAddDialogTab("groups");
                            setSelectedItems([]);
                            setItemSearchQuery("");
                            setItemDialogOpen(true);
                          }}
                          disabled={isReleased}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Item
                        </Button>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16 text-center">Sl.no</TableHead>
                              <TableHead>Item Name</TableHead>
                              <TableHead>Item Threshold</TableHead>
                              <TableHead>Menu Rate</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                  No subscription items added yet
                                </TableCell>
                              </TableRow>
                            ) : (
                              rows.map((row, index) => {
                                const isRowEditing = editIndexByMeal[meal] === index && !isReleased;
                                return (
                                  <TableRow key={buildMenuEntryKey(row)}>
                                    <TableCell className="text-center">{index + 1}</TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span>{row.item_name}</span>
                                        {row.item_id == null && row.combo_id == null ? (
                                          <Badge variant="secondary">Item Group</Badge>
                                        ) : null}
                                        {row.is_combo ? <Badge variant="secondary">Combo</Badge> : null}
                                        {row.is_plated ? <Badge variant="secondary">Plated</Badge> : null}
                                        {row.component_type_name && row.item_id != null ? (
                                          <Badge variant="outline">{row.component_type_name}</Badge>
                                        ) : null}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {isRowEditing ? (
                                        <InputWithButton
                                          value={row.max_qty}
                                          onChange={(value: number) =>
                                            handleSave(meal, index, "max_qty", value)
                                          }
                                        />
                                      ) : (
                                        row.max_qty
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {isRowEditing ? (
                                        <Input
                                          type="number"
                                          value={row.rate}
                                          onChange={(event) =>
                                            handleSave(meal, index, "rate", Number(event.target.value))
                                          }
                                        />
                                      ) : (
                                        `₹${row.rate}`
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {row.item_id == null && row.combo_id == null ? (
                                        <Badge variant="secondary">Group</Badge>
                                      ) : (
                                        <Badge variant="outline">Specific</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex justify-center gap-2">
                                        {isRowEditing ? (
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() =>
                                              setEditIndexByMeal((prev) => ({ ...prev, [meal]: null }))
                                            }
                                          >
                                            <Check className="h-4 w-4" />
                                          </Button>
                                        ) : (
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            disabled={isReleased}
                                            onClick={() =>
                                              setEditIndexByMeal((prev) => ({ ...prev, [meal]: index }))
                                            }
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button
                                          size="icon"
                                          variant="destructive"
                                          disabled={isReleased}
                                          onClick={() =>
                                            setItemsByMeal((prev) => ({
                                              ...prev,
                                              [meal]: prev[meal].filter((_, rowIndex) => rowIndex !== index),
                                            }))
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="mt-4 flex justify-end gap-3">
                        {isReleased ? (
                          <Button variant="outline" onClick={() => void toggleRelease(meal, true)} disabled={isBusy}>
                            {isBusy ? "Unreleasing..." : `Unrelease ${mealLabel(meal)}`}
                          </Button>
                        ) : null}
                        {!isReleased ? (
                          <>
                            <Button
                              onClick={() => void saveMenu(meal)}
                              disabled={isBusy || rows.length === 0}
                            >
                              {savingMeal === meal ? "Saving..." : `Save ${mealLabel(meal)}`}
                            </Button>
                            {hasMenuId ? (
                              <Button
                                variant="destructive"
                                onClick={() => void toggleRelease(meal)}
                                disabled={isBusy || rows.length === 0}
                              >
                                {togglingMeal === meal
                                  ? "Releasing..."
                                  : `Release ${mealLabel(meal)}`}
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Pause & Resume</CardTitle>
              <Button onClick={() => openPauseEditor()}>
                <PauseCircle className="mr-2 h-4 w-4" />
                Add Pause
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Meal</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pauses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No active pause windows
                      </TableCell>
                    </TableRow>
                  ) : (
                    pauses.map((pause) => (
                      <TableRow key={pause.pause_id}>
                        <TableCell>
                          <div className="font-medium">{pause.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{pause.customer_phone}</div>
                        </TableCell>
                        <TableCell>{pause.meal_type ?? "All meals"}</TableCell>
                        <TableCell>
                          {formatDate(new Date(pause.start_date), "dd MMM yyyy")} -{" "}
                          {formatDate(new Date(pause.end_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>{pause.reason || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={pause.is_active ? "secondary" : "outline"}>
                            {pause.is_active ? "Paused" : "Resumed"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openPauseEditor(pause)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => void resumePause(pause.pause_id)}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[1000px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Subscription Entries for {mealLabel(currentSection)}</DialogTitle>
              <div className="relative !mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search item groups, plated items, or combos..."
                  className="pl-9"
                  value={itemSearchQuery}
                  onChange={(event) => setItemSearchQuery(event.target.value)}
                  disabled={loadingItemsAPI}
                />
              </div>
            </DialogHeader>
            <Tabs
              value={addDialogTab}
              onValueChange={(value) => {
                setAddDialogTab(value as "groups" | "plated" | "combos");
                setSelectedItems([]);
              }}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="groups">Item Groups</TabsTrigger>
                <TabsTrigger value="plated">Plated Items</TabsTrigger>
                <TabsTrigger value="combos">Combos</TabsTrigger>
              </TabsList>
              <TabsContent value="groups" className="mt-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableItemGroups.map((entry) => {
                    const entryKey = `group:${entry.component_type_id}`;
                    const checked = selectedItems.includes(entryKey);
                    return (
                      <label
                        key={entryKey}
                        className="flex cursor-pointer items-center gap-3 rounded-md border bg-amber-50/70 px-4 py-3 transition-colors hover:bg-amber-50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            setSelectedItems((prev) =>
                              isChecked
                                ? prev.includes(entryKey)
                                  ? prev
                                  : [...prev, entryKey]
                                : prev.filter((id) => id !== entryKey),
                            );
                          }}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{entry.name}</div>
                          {entry.description ? (
                            <div className="line-clamp-2 text-xs text-muted-foreground">
                              {entry.description}
                            </div>
                          ) : null}
                          <div className="text-xs text-muted-foreground">
                            Resolves from Daily Menu default item of the day
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </TabsContent>
              <TabsContent value="plated" className="mt-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availablePlatedItems.map((entry) => {
                    const entryKey = buildMenuEntryKey(entry);
                    const checked = selectedItems.includes(entryKey);
                    return (
                      <label
                        key={entryKey}
                        className="flex cursor-pointer items-center gap-3 rounded-md border bg-amber-50/70 px-4 py-3 transition-colors hover:bg-amber-50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            setSelectedItems((prev) =>
                              isChecked
                                ? prev.includes(entryKey)
                                  ? prev
                                  : [...prev, entryKey]
                                : prev.filter((id) => id !== entryKey),
                            );
                          }}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{entry.name}</div>
                          {entry.description ? (
                            <div className="line-clamp-2 text-xs text-muted-foreground">
                              {entry.description}
                            </div>
                          ) : null}
                          {entry.component_type_name ? (
                            <div className="text-xs text-muted-foreground">
                              {entry.component_type_name}
                            </div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </TabsContent>
              <TabsContent value="combos" className="mt-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableCombos.map((entry) => {
                    const entryKey = buildMenuEntryKey(entry);
                    const checked = selectedItems.includes(entryKey);
                    return (
                      <label
                        key={entryKey}
                        className="flex cursor-pointer items-center gap-3 rounded-md border bg-amber-50/70 px-4 py-3 transition-colors hover:bg-amber-50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            setSelectedItems((prev) =>
                              isChecked
                                ? prev.includes(entryKey)
                                  ? prev
                                  : [...prev, entryKey]
                                : prev.filter((id) => id !== entryKey),
                            );
                          }}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{entry.name}</div>
                          {entry.description ? (
                            <div className="line-clamp-2 text-xs text-muted-foreground">
                              {entry.description}
                            </div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDialogSelection} disabled={selectedItems.length === 0}>
                Add Selected ({selectedItems.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingPauseId ? "Edit Pause" : "Add Pause"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Customer</Label>
                <Select value={pauseCustomerId} onValueChange={setPauseCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.customer_id} value={String(customer.customer_id)}>
                        {customer.name} {customer.primary_mobile ? `- ${customer.primary_mobile}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Meal</Label>
                  <Select value={pauseMeal} onValueChange={setPauseMeal}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All meals</SelectItem>
                      {visibleMeals.map((meal) => (
                        <SelectItem key={meal} value={meal}>
                          {mealLabel(meal)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={pauseStartDate}
                    onChange={(event) => setPauseStartDate(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={pauseEndDate}
                    onChange={(event) => setPauseEndDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Textarea value={pauseReason} onChange={(event) => setPauseReason(event.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPauseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void savePause()} disabled={savingPause}>
                {savingPause ? "Saving..." : "Save Pause"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
