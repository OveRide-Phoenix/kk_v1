"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, BarChart3, Users, Calendar as CalendarIcon, Search, Plus, Eye, Pencil, Trash2, Check } from "lucide-react";
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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const mealTypes = ["breakfast", "lunch", "dinner", "condiments"] as const;
type MealType = typeof mealTypes[number];

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
  const [itemsByMeal, setItemsByMeal] = useState<Record<MealType, MenuItem[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    condiments: [],
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [confirmedDate, setConfirmedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [selectedSection, setSelectedSection] = useState<MealType>("breakfast");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const [editIndexByMeal, setEditIndexByMeal] = useState<Record<MealType, number | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    condiments: null,
  });
  const [viewItem, setViewItem] = useState<MenuItem | null>(null);

  const [loadingItemsAPI, setLoadingItemsAPI] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [togglingRelease, setTogglingRelease] = useState(false);

  const [menuIdByMeal, setMenuIdByMeal] = useState<Record<MealType, number | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    condiments: null,
  });
  const [isReleasedByMeal, setIsReleasedByMeal] = useState<Record<MealType, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false,
    condiments: false,
  });

  const formatISODate = (d: Date) => formatDate(d, "yyyy-MM-dd");

  useEffect(() => {
    if (!confirmedDate) return;
    mealTypes.forEach(fetchMealSection);
  }, [confirmedDate]);

  const fetchMealSection = async (meal: MealType) => {
    setLoadingMenu(true);
    try {
      const iso = formatISODate(confirmedDate!);
      const url = new URL("http://localhost:8000/api/menu");
      url.searchParams.set("date", iso);
      url.searchParams.set("bld_type", meal);
      url.searchParams.set("period_type", "one_day");
      const res = await fetch(url.toString());
      if (res.status === 404) {
        setMenuIdByMeal(prev => ({ ...prev, [meal]: null }));
        setIsReleasedByMeal(prev => ({ ...prev, [meal]: false }));
        setItemsByMeal(prev => ({ ...prev, [meal]: [] }));
      } else if (res.ok) {
        const data = await res.json();
        setMenuIdByMeal(prev => ({ ...prev, [meal]: data.menu_id }));
        setIsReleasedByMeal(prev => ({ ...prev, [meal]: data.is_released }));
        setItemsByMeal(prev => ({
          ...prev,
          [meal]: data.items.map((it: any) => ({
            menu_item_id: it.menu_item_id,
            item_id: it.item_id,
            item_name: it.item_name,
            category_id: it.category_id,
            planned_qty: it.planned_qty,
            available_qty: it.available_qty,
            rate: it.rate,
            is_default: it.is_default,
            sort_order: it.sort_order,
          })),
        }));
      }
    } catch {
      setItemsByMeal(prev => ({ ...prev, [meal]: [] }));
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
    fetch(`http://localhost:8000/api/menu/available-items?bld_type=${selectedSection}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load items for ${selectedSection}`);
        return res.json();
      })
      .then((data) => setAvailableItems(data))
      .catch((err) => {
        console.error(err);
        setAvailableItems([]);
      })
      .finally(() => setLoadingItemsAPI(false));
  }, [itemDialogOpen, selectedSection]);

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
        sort_order: itemsByMeal[selectedSection].length + 1,
      };
    });

    setItemsByMeal((prev) => ({
      ...prev,
      [selectedSection]: [...prev[selectedSection], ...newRows],
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
      const copy = [...prev[meal as MealType]];
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
      const copy = [...prev[meal as MealType]];
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

    const rows = itemsByMeal[meal as MealType];
    const itemsArray = rows.map((row: MenuItem, idx: number) => {
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
const handleToggleRelease = async (meal: MealType, unrelease = false) => {
  // nothing to do if there’s no menu ID
  if (!menuIdByMeal[meal]) return;

  setTogglingRelease(true);
  try {
    // pick the right endpoint
    const endpoint = unrelease
      ? `http://localhost:8000/api/menu/${menuIdByMeal[meal]}/unrelease`
      : `http://localhost:8000/api/menu/${menuIdByMeal[meal]}/release`;

    const res = await fetch(endpoint, { method: "PATCH" });
    if (!res.ok) {
      console.error("Toggle release failed:", await res.text());
      return;
    }
    // consume body
    await res.json();

    // flip the released flag
    setIsReleasedByMeal(prev => ({ ...prev, [meal]: !unrelease }));

    // on a release (not an unrelease), reset available_qty → planned_qty
    if (!unrelease) {
      setItemsByMeal(prev => ({
        ...prev,
        [meal]: prev[meal].map(item => ({
          ...item,
          available_qty: item.planned_qty,
        })),
      }));
    }
  } catch (err) {
    console.error("Error toggling release:", err);
  } finally {
    setTogglingRelease(false);
  }
};

const mealTypes = ["breakfast", "lunch", "dinner", "condiments"] as const;
type MealType = typeof mealTypes[number];

  // ───────────────────────────────────────────────────────────────────────
  // 7) Filtering for dialog tabs
  // ───────────────────────────────────────────────────────────────────────
  const filteredItemsByQuery = (arr: typeof availableItems) =>
    arr.filter(
      (it) =>
        it.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        (it.description || "")
          .toLowerCase()
          .includes(itemSearchQuery.toLowerCase()) ||
        (it.category || "")
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
          <div className="flex justify-between items-center">
            <CardTitle>Setup Daily Menu</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Date Picker */}
          <div className="flex gap-4 mb-6">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={false} className="w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {confirmedDate ? formatDate(confirmedDate, "PPP") : "Pick Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={d => d && setSelectedDate(d)}
                  disabled={d => { const t = new Date(); t.setHours(0,0,0,0); return d < t; }}
                />
                <div className="mt-4 text-right">
                  <Button size="sm" disabled={!selectedDate} onClick={() => { setConfirmedDate(selectedDate); setCalendarOpen(false); }}>
                    OK
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Section selector cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  {mealTypes.map((meal) => (
    <Button
      key={meal}
      variant={selectedSection === meal ? "default" : "outline"}
      className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
      onClick={() => setSelectedSection(meal)}
    >
      {meal === "breakfast" && <Package className="h-8 w-8" />}
      {meal === "lunch"     && <Users className="h-8 w-8" />}
      {meal === "dinner"    && <CalendarIcon className="h-8 w-8" />}
      {meal === "condiments"&& <BarChart3 className="h-8 w-8" />}
      <span className="capitalize">{meal}</span>
    </Button>
  ))}
</div>


                       {/* Section header + Add button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold capitalize">{selectedSection}</h2>
                  <Button
                    onClick={() => setItemDialogOpen(true)}
                    disabled={!confirmedDate || isReleasedByMeal[selectedSection]}
                  >
                    <Plus size={16} className="mr-1" />
                    Add {selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)} Item
                  </Button>
                </div>

                {/* Table */}
                <div className="rounded-md border mb-4">
                  <div className="rounded-md border">
                                  <Table>
                                      <TableHeader>
                                          <TableRow>
                                              <TableHead>Sl.no</TableHead>
                                              <TableHead>Item Name</TableHead>
                                              <TableHead>
                                                <div className="flex items-center space-x-2">
                                                  <span>Planned Qty</span>
                                                  <Input
                                                    type="number"
                                                    placeholder="All"
                                                    className="w-16 h-6 text-sm"
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter") {
                                                        const input = e.target as HTMLInputElement;
                                                        const v = parseInt(input.value, 10);
                                                        if (!isNaN(v)) {
                                                          setItemsByMeal((prev) => ({
                                                            ...prev,
                                                            [selectedSection]: prev[selectedSection].map((r) => ({
                                                              ...r,
                                                              planned_qty: v,
                                                            })),
                                                          }));
                                                        }
                                                        // reset the header‐input
                                                        input.value = "";
                                                      }
                                                    }}
                                                  />
                                                </div>
                                              </TableHead>
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
                                              itemsByMeal[selectedSection as MealType].length ===
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
                                          {itemsByMeal[selectedSection as MealType].map(
                                              (row: MenuItem, index: number) => (
                                                  <TableRow key={index}>
                                                      <TableCell>
                                                          {index + 1}
                                                      </TableCell>
                                                      <TableCell>
                                                          {row.item_name}
                                                      </TableCell>

                                                      <TableCell className="flex items-center space-x-1">
  <Button
    size="icon"
    variant="ghost"
    onClick={() =>
      setItemsByMeal(prev => ({
        ...prev,
        [selectedSection]: prev[selectedSection].map((r, i) =>
          i === index
            ? { ...r, planned_qty: Math.max(0, r.planned_qty - 1) }
            : r
        ),
      }))
    }
  >
    –
  </Button>

  <Input
    type="number"
    value={row.planned_qty}
    onChange={e =>
      handleSave(
        selectedSection,
        index,
        "planned_qty",
        Number(e.target.value)
      )
    }
    className="w-16 text-center p-1"
  />

  <Button
    size="icon"
    variant="ghost"
    onClick={() =>
      setItemsByMeal(prev => ({
        ...prev,
        [selectedSection]: prev[selectedSection].map((r, i) =>
          i === index
            ? { ...r, planned_qty: r.planned_qty + 1 }
            : r
        ),
      }))
    }
  >
    +
  </Button>
</TableCell>

                                                      <TableCell>
                                                          {editIndexByMeal[
                                                              selectedSection
                                                          ] === index ? (
                                                              <InputWithButton
                                                                  value={
                                                                      row.available_qty
                                                                  }
                                                                  onChange={(
                                                                      val: number
                                                                  ) =>
                                                                      handleSave(
                                                                          selectedSection,
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
                                                              selectedSection
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
                                                                          selectedSection,
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
                                                              selectedSection
                                                          ] === index ? (
                                                              <Checkbox
                                                                  checked={
                                                                      row.is_default
                                                                  }
                                                                  onCheckedChange={(
                                                                      checked
                                                                  ) =>
                                                                      handleSave(
                                                                          selectedSection,
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
                                                                      selectedSection
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
                                                              selectedSection
                                                          ] === index ? (
                                                              <Button
                                                                  size="icon"
                                                                  variant="ghost"
                                                                  disabled={
                                                                      isReleasedByMeal[
                                                                          selectedSection
                                                                      ]
                                                                  }
                                                                  onClick={() =>
                                                                      setEditIndexByMeal(
                                                                          (
                                                                              prev
                                                                          ) => ({
                                                                              ...prev,
                                                                              [selectedSection]: null,
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
selectedSection as MealType
                                                                      ]
                                                                  }
                                                                  onClick={() =>
                                                                      handleEdit(
                                                                          selectedSection,
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
selectedSection as MealType
                                                                  ]
                                                              }
                                                              onClick={() =>
                                                                  handleDelete(
                                                                      selectedSection,
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
                </div>

                {/* Save / Release buttons */}
                <div className="flex justify-end gap-4">
                  <Button
                    variant="destructive"
                    onClick={() => handleToggleRelease(selectedSection, false)}
                    disabled={!menuIdByMeal[selectedSection] || togglingRelease}
                  >
                    {togglingRelease && !isReleasedByMeal[selectedSection]
                      ? 'Releasing…'
                      : `Release ${selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)} Menu`}
                  </Button>
                  {isReleasedByMeal[selectedSection] && (
                    <Button variant="outline" onClick={() => handleToggleRelease(selectedSection, true)} disabled={togglingRelease}>
                      {togglingRelease ? 'Unreleasing…' : `Unrelease ${selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)} Menu`}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleSaveMenu(selectedSection)}
                    disabled={!confirmedDate || itemsByMeal[selectedSection].length === 0 || savingMenu || isReleasedByMeal[selectedSection]}
                  >
                    {savingMenu ? 'Saving…' : `Save ${selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)} Menu`}
                  </Button>
                </div>

{/* Item Selection Dialog */}
                  {/* Item Selection Dialog */}
<Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
  <DialogContent className="w-[90vw] max-w-[1200px] sm:max-w-[90vw]">
    <DialogHeader>
      <DialogTitle className="pb-4">
        Select Menu Items for{" "}
   {selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)}
      </DialogTitle>
      <div className="relative mt-4">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
        <Input
          placeholder="Filter items..."
          className="pl-10"
          value={itemSearchQuery}
          onChange={e => setItemSearchQuery(e.target.value)}
          disabled={loadingItemsAPI}
        />
      </div>
    </DialogHeader>

    {/* Kanban-like board: flat grid of cards */}
<ScrollArea className="mt-4 h-[400px]">
  {availableItems
    .filter(it =>
      it.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aSelected = selectedItems.includes(a.item_id) ? 1 : 0;
      const bSelected = selectedItems.includes(b.item_id) ? 1 : 0;
      return bSelected - aSelected;
    }).length === 0 ? (
    <div className="flex items-center justify-center h-full text-gray-500">
      No items available
    </div>
  ) : (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
      {availableItems
        .filter(it =>
          it.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
        )
        .sort((a, b) => {
          const aSelected = selectedItems.includes(a.item_id) ? 1 : 0;
          const bSelected = selectedItems.includes(b.item_id) ? 1 : 0;
          return bSelected - aSelected;
        })
        .map(it => (
          <label
            key={it.item_id}
            className="flex flex-col border rounded-lg p-4 hover:shadow focus-within:shadow cursor-pointer"
          >
            <div className="flex items-start">
              <Checkbox
                checked={selectedItems.includes(it.item_id)}
                onCheckedChange={checked => {
                  if (checked) {
                    setSelectedItems(prev => [...prev, it.item_id]);
                  } else {
                    setSelectedItems(prev =>
                      prev.filter(id => id !== it.item_id)
                    );
                  }
                }}
                className="mt-1 mr-2"
              />
              <div>
                <h4 className="font-medium">{it.name}</h4>
                {it.description && (
                  <p className="text-xs text-gray-500 mt-1">
                    {it.description}
                  </p>
                )}
              </div>
            </div>
          </label>
        ))}
    </div>
  )}
</ScrollArea>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setItemDialogOpen(false);
          setItemSearchQuery("");
          setSelectedItems([]);
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
