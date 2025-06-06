"use client";

import { useState, useEffect } from "react";
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
import {
  Search,
  Plus,
  Calendar as CalendarIcon,
  Eye,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
}

export function DailyMenuSetup() {
  // ───────────────────────────────────────────────────────────────────────
  // Local state
  // ───────────────────────────────────────────────────────────────────────

  // items grouped by meal section
  const [itemsByMeal, setItemsByMeal] = useState<Record<string, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  });

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [confirmedDate, setConfirmedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Controls for “Add Menu Item” dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [availableItems, setAvailableItems] = useState<
    {
      item_id: number;
      bld_id: number;
      name: string;
      description: string;
      alias: string | null;
      category_id: number | null;
      uom: string;
      weight_factor: number | null;
      weight_uom: string | null;
      item_type: string | null;
      hsn_code: string | null;
      factor: number | null;
      quantity_portion: number | null;
      buffer_percentage: number | null;
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
    }[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [currentSection, setCurrentSection] = useState<string>("breakfast");

  // Edit / view states
  const [editIndexByMeal, setEditIndexByMeal] = useState<Record<string, number | null>>({
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
  const [menuIdByMeal, setMenuIdByMeal] = useState<Record<string, number | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    condiments: null,
  });
  const [isReleasedByMeal, setIsReleasedByMeal] = useState<Record<string, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false,
    condiments: false,
  });

  // ───────────────────────────────────────────────────────────────────────
  // Helpers: format date → "YYYY-MM-DD"
  // ───────────────────────────────────────────────────────────────────────
  const formatISODate = (d: Date) => formatDate(d, "yyyy-MM-dd");

  // ───────────────────────────────────────────────────────────────────────
  // 1) Fetch for all meal sections when date is confirmed
  // ───────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!confirmedDate) return;

    const mealTypes = ["breakfast", "lunch", "dinner", "condiments"];
    mealTypes.forEach((meal) => {
      fetchMealSection(meal);
    });
  }, [confirmedDate]);

  const fetchMealSection = async (meal: string) => {
    setLoadingMenu(true);
    try {
      const isoDate = formatISODate(confirmedDate!);
      const url = new URL("http://localhost:8000/api/menu");
      url.searchParams.set("date", isoDate);
      url.searchParams.set("bld_type", meal);
      url.searchParams.set("period_type", "one_day");

      const res = await fetch(url.toString());
      if (res.status === 404) {
        setMenuIdByMeal((prev) => ({ ...prev, [meal]: null }));
        setIsReleasedByMeal((prev) => ({ ...prev, [meal]: false }));
        setItemsByMeal((prev) => ({ ...prev, [meal]: [] }));
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch ${meal}`);
      }

      const data = await res.json();
      setMenuIdByMeal((prev) => ({ ...prev, [meal]: data.menu_id }));
      setIsReleasedByMeal((prev) => ({ ...prev, [meal]: data.is_released }));
      const mapped = data.items.map((it: any) => ({
        menu_item_id: it.menu_item_id,
        item_id: it.item_id,
        item_name: it.item_name,
        category_id: it.category_id,
        planned_qty: it.planned_qty,
        available_qty: it.available_qty,
        rate: it.rate,
        is_default: it.is_default,
        sort_order: it.sort_order,
      }));
      setItemsByMeal((prev) => ({ ...prev, [meal]: mapped }));
    } catch (err) {
      console.error(err);
      setItemsByMeal((prev) => ({ ...prev, [meal]: [] }));
    } finally {
      setLoadingMenu(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // 2) Open “Add Menu Item” dialog for a given section
  // ───────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!itemDialogOpen) return;
    setLoadingItemsAPI(true);
    fetch(`http://localhost:8000/api/menu/available-items?bld_type=${currentSection}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load items for ${currentSection}`);
        return res.json();
      })
      .then((data) => setAvailableItems(data))
      .catch((err) => {
        console.error(err);
        setAvailableItems([]);
      })
      .finally(() => setLoadingItemsAPI(false));
  }, [itemDialogOpen, currentSection]);

  // ───────────────────────────────────────────────────────────────────────
  // 3) Add selected items into the correct section
  // ───────────────────────────────────────────────────────────────────────
  const handleItemSelection = () => {
    const newRows: MenuItem[] = selectedItems.map((id) => {
      const found = availableItems.find((i) => i.item_id === id)!;
      return {
        item_id: found.item_id,
        item_name: found.name,
        category_id: found.category_id,
        planned_qty: 1,
        available_qty: 1,
        rate: found.net_price ?? 0,
        is_default: false,
        sort_order: itemsByMeal[currentSection].length + 1,
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
    value: string | number
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
  const handleSaveMenu = async (meal: string) => {
    if (!confirmedDate) return;
    setSavingMenu(true);

    const rows = itemsByMeal[meal];
    const itemsArray = rows.map((row, idx) => {
      if (row.menu_item_id == null) {
        return {
          item_id: row.item_id,
          category_id: row.category_id,
          planned_qty: row.planned_qty,
          available_qty: row.planned_qty,
          rate: row.rate,
          is_default: row.is_default,
          sort_order: row.sort_order || idx + 1,
        };
      }
      return {
        item_id: row.item_id,
        category_id: row.category_id,
        planned_qty: row.planned_qty,
        available_qty: row.available_qty,
        rate: row.rate,
        is_default: row.is_default,
        sort_order: row.sort_order || idx + 1,
      };
    });

    const payload = {
      date: formatISODate(confirmedDate),
      bld_type: meal,
      is_festival: false,
      period_type: "one_day",
      items: itemsArray,
    };

    try {
      const res = await fetch("http://localhost:8000/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Save failed:", await res.text());
        return;
      }

      const data = await res.json();
      setMenuIdByMeal((prev) => ({ ...prev, [meal]: data.menu_id }));
      setIsReleasedByMeal((prev) => ({ ...prev, [meal]: data.is_released }));

      const mapped = data.items.map((it: any) => ({
        menu_item_id: it.menu_item_id,
        item_id: it.item_id,
        item_name: it.item_name,
        category_id: it.category_id,
        planned_qty: it.planned_qty,
        available_qty: it.available_qty,
        rate: it.rate,
        is_default: it.is_default,
        sort_order: it.sort_order,
      }));
      setItemsByMeal((prev) => ({ ...prev, [meal]: mapped }));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMenu(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // 6) Release / Unrelease for a specific meal
  // ───────────────────────────────────────────────────────────────────────
  const handleToggleRelease = async (meal: string, unrelease = false) => {
    if (!menuIdByMeal[meal]) return;
    setTogglingRelease(true);
    try {
      const endpoint = unrelease
        ? `http://localhost:8000/api/menu/${menuIdByMeal[meal]}/unrelease`
        : `http://localhost:8000/api/menu/${menuIdByMeal[meal]}/release`;
      const res = await fetch(endpoint, { method: "PATCH" });
      if (!res.ok) {
        console.error("Toggle release failed:", await res.text());
        return;
      }
      const result = await res.json();
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
  const filteredItemsByQuery = (arr: typeof availableItems) =>
    arr.filter(
      (it) =>
        it.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        (it.description || "")
          .toLowerCase()
          .includes(itemSearchQuery.toLowerCase())
    );

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
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <Popover
                          open={calendarOpen}
                          onOpenChange={setCalendarOpen}
                      >
                          <PopoverTrigger asChild>
                              <Button
                                  variant="outline"
                                  className="w-[200px] justify-start text-left font-normal"
                                  disabled={false}
                              >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {confirmedDate
                                      ? formatDate(confirmedDate, "PPP")
                                      : "Pick Date"}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4" align="start">
                              <Calendar
                                  mode="single"
                                  selected={selectedDate || undefined}
                                  onSelect={(date: Date | undefined) => {
                                      if (!date) return;
                                      setSelectedDate(date);
                                  }}
                                  disabled={(date) => {
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      return date < today;
                                  }}
                                  initialFocus
                                  className="text-center"
                                  classNames={{
                                      day: "p-0 mx-auto inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted",
                                      day_today: "font-bold underline",
                                      day_selected:
                                          "bg-blue-600 text-white rounded-full",
                                  }}
                              />
                              <div className="mt-4 flex justify-end">
                                  <Button
                                      onClick={() => {
                                          setConfirmedDate(selectedDate);
                                          setCalendarOpen(false);
                                      }}
                                      size="sm"
                                      disabled={!selectedDate}
                                  >
                                      OK
                                  </Button>
                              </div>
                          </PopoverContent>
                      </Popover>
                  </div>

                  {/* Four Sections: Breakfast, Lunch, Dinner, Condiments temp */}
                  {["breakfast", "lunch", "dinner", "condiments"].map(
                      (meal) => (
                          <section key={meal} className="mb-8">
                              <div className="flex items-center justify-between mb-4">
                                  <h2 className="text-lg font-semibold capitalize">
                                      {meal}
                                  </h2>
                                  <Button
                                      onClick={() => {
                                          setCurrentSection(meal);
                                          setItemDialogOpen(true);
                                      }}
                                      disabled={
                                          !confirmedDate ||
                                          isReleasedByMeal[meal]
                                      }
                                  >
                                      <Plus size={16} className="mr-1" />
                                      Add{" "}
                                      {meal.slice(0, 1).toUpperCase() +
                                          meal.slice(1)}{" "}
                                      Item
                                  </Button>
                              </div>

                              <div className="rounded-md border">
                                  <Table>
                                      <TableHeader>
                                          <TableRow>
                                              <TableHead>Sl.no</TableHead>
                                              <TableHead>Item Name</TableHead>
                                              <TableHead>Planned Qty</TableHead>
                                              <TableHead>
                                                  Available Qty
                                              </TableHead>
                                              <TableHead>Menu Rate</TableHead>
                                              <TableHead>Default</TableHead>
                                              <TableHead>Actions</TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {(!confirmedDate ||
                                              itemsByMeal[meal].length ===
                                                  0) && (
                                              <TableRow>
                                                  <TableCell
                                                      colSpan={7}
                                                      className="text-center text-gray-500"
                                                  >
                                                      {!confirmedDate
                                                          ? "Please pick a date to see or add items"
                                                          : "No items added yet"}
                                                  </TableCell>
                                              </TableRow>
                                          )}
                                          {itemsByMeal[meal].map(
                                              (row, index) => (
                                                  <TableRow key={index}>
                                                      <TableCell>
                                                          {index + 1}
                                                      </TableCell>
                                                      <TableCell>
                                                          {row.item_name}
                                                      </TableCell>

                                                      <TableCell>
                                                          {editIndexByMeal[
                                                              meal
                                                          ] === index ? (
                                                              <InputWithButton
                                                                  value={
                                                                      row.planned_qty
                                                                  }
                                                                  onChange={(
                                                                      val: number
                                                                  ) =>
                                                                      handleSave(
                                                                          meal,
                                                                          index,
                                                                          "planned_qty",
                                                                          val
                                                                      )
                                                                  }
                                                              />
                                                          ) : (
                                                              row.planned_qty
                                                          )}
                                                      </TableCell>

                                                      <TableCell>
                                                          {editIndexByMeal[
                                                              meal
                                                          ] === index ? (
                                                              <InputWithButton
                                                                  value={
                                                                      row.available_qty
                                                                  }
                                                                  onChange={(
                                                                      val: number
                                                                  ) =>
                                                                      handleSave(
                                                                          meal,
                                                                          index,
                                                                          "available_qty",
                                                                          val
                                                                      )
                                                                  }
                                                              />
                                                          ) : (
                                                              row.available_qty
                                                          )}
                                                      </TableCell>

                                                      <TableCell>
                                                          {editIndexByMeal[
                                                              meal
                                                          ] === index ? (
                                                              <Input
                                                                  type="number"
                                                                  value={
                                                                      row.rate
                                                                  }
                                                                  onChange={(
                                                                      e
                                                                  ) =>
                                                                      handleSave(
                                                                          meal,
                                                                          index,
                                                                          "rate",
                                                                          Number(
                                                                              e
                                                                                  .target
                                                                                  .value
                                                                          )
                                                                      )
                                                                  }
                                                              />
                                                          ) : (
                                                              `₹${row.rate}`
                                                          )}
                                                      </TableCell>

                                                      <TableCell>
                                                          {editIndexByMeal[
                                                              meal
                                                          ] === index ? (
                                                              <Checkbox
                                                                  checked={
                                                                      row.is_default
                                                                  }
                                                                  onCheckedChange={(
                                                                      checked
                                                                  ) =>
                                                                      handleSave(
                                                                          meal,
                                                                          index,
                                                                          "is_default",
                                                                          checked
                                                                              ? 1
                                                                              : 0
                                                                      )
                                                                  }
                                                              />
                                                          ) : row.is_default ? (
                                                              <Badge variant="secondary">
                                                                  Yes
                                                              </Badge>
                                                          ) : (
                                                              <Badge variant="outline">
                                                                  No
                                                              </Badge>
                                                          )}
                                                      </TableCell>

                                                      <TableCell className="flex gap-2">
                                                          <Button
                                                              size="icon"
                                                              variant="ghost"
                                                              disabled={
                                                                  isReleasedByMeal[
                                                                      meal
                                                                  ]
                                                              }
                                                              onClick={() =>
                                                                  setViewItem(
                                                                      row
                                                                  )
                                                              }
                                                          >
                                                              <Eye className="h-4 w-4" />
                                                          </Button>
                                                          {editIndexByMeal[
                                                              meal
                                                          ] === index ? (
                                                              <Button
                                                                  size="icon"
                                                                  variant="ghost"
                                                                  disabled={
                                                                      isReleasedByMeal[
                                                                          meal
                                                                      ]
                                                                  }
                                                                  onClick={() =>
                                                                      setEditIndexByMeal(
                                                                          (
                                                                              prev
                                                                          ) => ({
                                                                              ...prev,
                                                                              [meal]: null,
                                                                          })
                                                                      )
                                                                  }
                                                              >
                                                                  <Check className="h-4 w-4" />
                                                              </Button>
                                                          ) : (
                                                              <Button
                                                                  size="icon"
                                                                  variant="ghost"
                                                                  disabled={
                                                                      isReleasedByMeal[
                                                                          meal
                                                                      ]
                                                                  }
                                                                  onClick={() =>
                                                                      handleEdit(
                                                                          meal,
                                                                          index
                                                                      )
                                                                  }
                                                              >
                                                                  <Pencil className="h-4 w-4" />
                                                              </Button>
                                                          )}
                                                          <Button
                                                              size="icon"
                                                              variant="destructive"
                                                              disabled={
                                                                  isReleasedByMeal[
                                                                      meal
                                                                  ]
                                                              }
                                                              onClick={() =>
                                                                  handleDelete(
                                                                      meal,
                                                                      index
                                                                  )
                                                              }
                                                          >
                                                              <Trash2 className="h-4 w-4" />
                                                          </Button>
                                                      </TableCell>
                                                  </TableRow>
                                              )
                                          )}
                                      </TableBody>
                                  </Table>
                              </div>

                              {/* Save / Release Buttons for this section */}
                              <div className="mt-4 flex justify-end gap-4">
                                  <Button
                                      variant="destructive"
                                      onClick={() =>
                                          handleToggleRelease(meal, false)
                                      }
                                      disabled={
                                          !menuIdByMeal[meal] || togglingRelease
                                      }
                                  >
                                      {togglingRelease &&
                                      !isReleasedByMeal[meal]
                                          ? "Releasing…"
                                          : `Release ${meal}`}
                                  </Button>
                                  {isReleasedByMeal[meal] && (
                                      <Button
                                          variant="outline"
                                          onClick={() =>
                                              handleToggleRelease(meal, true)
                                          }
                                          disabled={togglingRelease}
                                      >
                                          {togglingRelease
                                              ? "Unreleasing…"
                                              : `Unrelease ${meal}`}
                                      </Button>
                                  )}
                                  <Button
                                      onClick={() => handleSaveMenu(meal)}
                                      disabled={
                                          !confirmedDate ||
                                          itemsByMeal[meal].length === 0 ||
                                          savingMenu ||
                                          isReleasedByMeal[meal]
                                      }
                                  >
                                      {savingMenu ? "Saving…" : `Save ${meal}`}
                                  </Button>
                              </div>
                          </section>
                      )
                  )}

                  {/* Item Selection Dialog */}
                  <Dialog
                      open={itemDialogOpen}
                      onOpenChange={setItemDialogOpen}
                  >
                      <DialogContent className="sm:max-w-[700px]">
                          <DialogHeader>
                              <DialogTitle>
                                  Select Menu Items for {currentSection}
                              </DialogTitle>
                              <div className="relative mt-4">
                                  <Search
                                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                      size={18}
                                  />
                                  <Input
                                      placeholder="Search items..."
                                      className="pl-10"
                                      value={itemSearchQuery}
                                      onChange={(e) =>
                                          setItemSearchQuery(e.target.value)
                                      }
                                      disabled={loadingItemsAPI}
                                  />
                              </div>
                          </DialogHeader>

                          <Tabs defaultValue="all" className="mt-2">
                              <TabsList className="grid w-full grid-cols-3">
                                  <TabsTrigger value="all">All</TabsTrigger>
                                  <TabsTrigger value="available">
                                      Available
                                  </TabsTrigger>
                                  <TabsTrigger value="picked">
                                      Picked
                                  </TabsTrigger>
                              </TabsList>

                              <TabsContent value="all">
                                  <ScrollArea className="h-[400px] pr-4">
                                      <div className="space-y-4">
                                          {filteredItemsByQuery(
                                              availableItems
                                          ).map((it) => (
                                              <div
                                                  key={it.item_id}
                                                  className="flex items-center space-x-4 p-4 border rounded-lg"
                                              >
                                                  <Checkbox
                                                      checked={selectedItems.includes(
                                                          it.item_id
                                                      )}
                                                      onCheckedChange={(
                                                          checked
                                                      ) => {
                                                          if (checked) {
                                                              setSelectedItems(
                                                                  (prev) => [
                                                                      ...prev,
                                                                      it.item_id,
                                                                  ]
                                                              );
                                                          } else {
                                                              setSelectedItems(
                                                                  (prev) =>
                                                                      prev.filter(
                                                                          (
                                                                              id
                                                                          ) =>
                                                                              id !==
                                                                              it.item_id
                                                                      )
                                                              );
                                                          }
                                                      }}
                                                  />
                                                  <div>
                                                      <h4 className="font-medium">
                                                          {it.name}
                                                      </h4>
                                                      {it.description && (
                                                          <p className="text-sm text-gray-500">
                                                              {it.description}
                                                          </p>
                                                      )}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </ScrollArea>
                              </TabsContent>
                          </Tabs>

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
