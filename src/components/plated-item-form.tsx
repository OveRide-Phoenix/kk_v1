"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryProduct, PlatedProduct, Product } from "@/types/product";
import { http } from "@/lib/http";

interface ComponentTypeOption {
  component_type_id: number;
  name: string;
  description?: string | null;
  category_id?: number | null;
  category_name?: string | null;
}

export interface PlatedItemFormValues {
  item_id?: number;
  name: string;
  description?: string;
  alias?: string;
  category_id: number;
  bld_ids: number[];
  uom_customer: string;
  unit_packing?: number;
  uom_packing?: string;
  uom_production?: string;
  packing_to_production_rate?: number;
  buffer_percentage?: number;
  max_qty_breakfast?: number;
  max_qty_lunch?: number;
  max_qty_dinner?: number;
  max_qty_condiments?: number;
  breakfast_price?: number;
  lunch_price?: number;
  dinner_price?: number;
  components: Array<{ item_id?: number; component_type_id?: number; quantity: number }>;
}

interface PlatedItemFormProps {
  onSave: (payload: PlatedItemFormValues) => void | Promise<void>;
  onCancel: () => void;
  platedItem?: PlatedProduct | null;
}

interface SelectedComponent {
  kind: "item" | "type";
  itemId?: number;
  componentTypeId?: number;
  name: string;
  quantity: number;
}

const MEAL_OPTIONS = [
  { id: 1, label: "Breakfast", maxField: "max_qty_breakfast" },
  { id: 2, label: "Lunch", maxField: "max_qty_lunch" },
  { id: 3, label: "Dinner", maxField: "max_qty_dinner" },
] as const;
const FOOD_MEAL_IDS = new Set<number>(MEAL_OPTIONS.map((meal) => meal.id));
const ALL_CATEGORIES_VALUE = "all";

export default function PlatedItemForm({ onSave, onCancel, platedItem }: PlatedItemFormProps) {
  const [availableItems, setAvailableItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryProduct[]>([]);
  const [componentTypes, setComponentTypes] = useState<ComponentTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState(platedItem?.name ?? "");
  const [description, setDescription] = useState(platedItem?.description ?? "");
  const [alias, setAlias] = useState(platedItem?.alias ?? "");
  const [categoryId, setCategoryId] = useState(
    platedItem?.category_id ? String(platedItem.category_id) : "",
  );
  const [selectedMeals, setSelectedMeals] = useState<number[]>(
    () => platedItem?.bld_ids?.filter((id) => FOOD_MEAL_IDS.has(id)) ?? [],
  );
  const [uomCustomer, setUomCustomer] = useState(platedItem?.uom_customer ?? "");
  const [unitPacking, setUnitPacking] = useState(
    platedItem?.unit_packing != null ? String(platedItem.unit_packing) : "",
  );
  const [uomPacking, setUomPacking] = useState(platedItem?.uom_packing ?? "");
  const [uomProduction, setUomProduction] = useState(platedItem?.uom_production ?? "");
  const [conversionRate, setConversionRate] = useState(
    platedItem?.packing_to_production_rate != null
      ? String(platedItem.packing_to_production_rate)
      : "1",
  );
  const [bufferPercentage, setBufferPercentage] = useState(
    platedItem?.buffer_percentage != null ? String(platedItem.buffer_percentage) : "",
  );
  const [maxBreakfast, setMaxBreakfast] = useState(
    platedItem?.max_qty_breakfast != null ? String(platedItem.max_qty_breakfast) : "",
  );
  const [maxLunch, setMaxLunch] = useState(
    platedItem?.max_qty_lunch != null ? String(platedItem.max_qty_lunch) : "",
  );
  const [maxDinner, setMaxDinner] = useState(
    platedItem?.max_qty_dinner != null ? String(platedItem.max_qty_dinner) : "",
  );
  const [breakfastPrice, setBreakfastPrice] = useState(
    platedItem?.breakfast_price != null ? String(platedItem.breakfast_price) : "",
  );
  const [lunchPrice, setLunchPrice] = useState(
    platedItem?.lunch_price != null ? String(platedItem.lunch_price) : "",
  );
  const [dinnerPrice, setDinnerPrice] = useState(
    platedItem?.dinner_price != null ? String(platedItem.dinner_price) : "",
  );
  const [itemSearch, setItemSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [typeCategoryFilter, setTypeCategoryFilter] = useState(ALL_CATEGORIES_VALUE);
  const [selectedItems, setSelectedItems] = useState<SelectedComponent[]>(
    () =>
      platedItem?.platedComponents?.map((item) => ({
        kind: item.kind === "type" ? "type" : "item",
        itemId: item.itemId ?? undefined,
        componentTypeId: item.componentTypeId ?? undefined,
        name:
          item.name ??
          (item.kind === "type"
            ? (item.componentTypeName ?? "Item Group")
            : `Item #${item.itemId}`),
        quantity: item.quantity ?? 1,
      })) ?? [],
  );

  useEffect(() => {
    let isMounted = true;

    const loadDependencies = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [itemsResponse, categoriesResponse, componentTypesResponse] = await Promise.all([
          http.get("/api/products/items"),
          http.get("/api/products/categories"),
          http.get("/api/products/component-types"),
        ]);

        if (!itemsResponse.ok) throw new Error("Failed to fetch items");
        if (!categoriesResponse.ok) throw new Error("Failed to fetch categories");
        if (!componentTypesResponse.ok) throw new Error("Failed to fetch item groups");

        const [itemsData, categoriesData, componentTypesData] = await Promise.all([
          itemsResponse.json(),
          categoriesResponse.json(),
          componentTypesResponse.json(),
        ]);

        if (!isMounted) return;
        setAvailableItems(
          Array.isArray(itemsData)
            ? itemsData.filter((item) => !item.is_combo && !item.is_plated)
            : [],
        );
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setComponentTypes(Array.isArray(componentTypesData) ? componentTypesData : []);
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load plated item dependencies",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDependencies();

    return () => {
      isMounted = false;
    };
  }, []);

  const itemsMap = useMemo(() => {
    const map = new Map<number, Product>();
    availableItems.forEach((item) => {
      if (typeof item.item_id === "number") {
        map.set(item.item_id, item);
      }
    });
    return map;
  }, [availableItems]);

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    return availableItems.filter((item) => {
      if (!item.name) return false;
      const matchesSearch = item.name.toLowerCase().includes(query) || !query;
      const alreadySelected = selectedItems.some(
        (entry) => entry.kind === "item" && entry.itemId === item.item_id,
      );
      return matchesSearch && !alreadySelected;
    });
  }, [availableItems, itemSearch, selectedItems]);

  const filteredComponentTypes = useMemo(() => {
    const query = typeSearch.trim().toLowerCase();
    return componentTypes.filter((componentType) => {
      const matchesSearch = componentType.name.toLowerCase().includes(query) || !query;
      const matchesCategory =
        typeCategoryFilter === ALL_CATEGORIES_VALUE ||
        String(componentType.category_id ?? "") === typeCategoryFilter;
      const alreadySelected = selectedItems.some(
        (entry) =>
          entry.kind === "type" && entry.componentTypeId === componentType.component_type_id,
      );
      return matchesSearch && matchesCategory && !alreadySelected;
    });
  }, [componentTypes, typeSearch, typeCategoryFilter, selectedItems]);

  const toggleMeal = (mealId: number) => {
    setSelectedMeals((prev) => {
      const set = new Set(prev);
      if (set.has(mealId)) {
        set.delete(mealId);
      } else {
        set.add(mealId);
      }
      return Array.from(set).sort((a, b) => a - b);
    });
  };

  const resolveItemComponentNote = (itemId: number) => {
    const item = itemsMap.get(itemId);
    if (!item) return "";
    const unitPackingLabel =
      item.unit_packing != null && item.uom_packing
        ? `1 qty = ${item.unit_packing} ${item.uom_packing}`
        : item.uom_customer
          ? `1 qty = 1 ${item.uom_customer}`
          : "1 qty";
    return `${unitPackingLabel}${item.uom_production ? ` -> ${item.uom_production}` : ""}`;
  };

  const resolveItemGroupNote = (componentTypeId?: number) => {
    const componentType = componentTypes.find(
      (entry) => entry.component_type_id === componentTypeId,
    );
    return componentType?.description ?? "Resolves to the item of the day";
  };

  const handleQuantityChange = (target: SelectedComponent, value: string) => {
    setSelectedItems((prev) =>
      prev.map((entry) => {
        const isSameEntry =
          entry.kind === target.kind &&
          entry.itemId === target.itemId &&
          entry.componentTypeId === target.componentTypeId;
        if (!isSameEntry) return entry;
        const parsed = Number(value);
        return {
          ...entry,
          quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
        };
      }),
    );
  };

  const parseNumber = (value: string): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const parseInteger = (value: string): number | undefined => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const parsedCategory = Number(categoryId);
    if (!trimmedName) {
      setFormError("Plated item name is required.");
      return;
    }
    if (!Number.isInteger(parsedCategory) || parsedCategory <= 0) {
      setFormError("Please pick a category.");
      return;
    }
    if (selectedMeals.length === 0) {
      setFormError("Pick at least one meal.");
      return;
    }
    if (!uomCustomer.trim()) {
      setFormError("Customer UOM is required.");
      return;
    }
    if (selectedItems.length === 0) {
      setFormError("Add at least one component item.");
      return;
    }

    setFormError(null);
    onSave({
      item_id: platedItem?.item_id,
      name: trimmedName,
      description: description.trim() || undefined,
      alias: alias.trim() || undefined,
      category_id: parsedCategory,
      bld_ids: selectedMeals,
      uom_customer: uomCustomer.trim(),
      unit_packing: parseNumber(unitPacking),
      uom_packing: uomPacking.trim() || undefined,
      uom_production: uomProduction.trim() || undefined,
      packing_to_production_rate: parseNumber(conversionRate),
      buffer_percentage: parseNumber(bufferPercentage),
      max_qty_breakfast: parseInteger(maxBreakfast),
      max_qty_lunch: parseInteger(maxLunch),
      max_qty_dinner: parseInteger(maxDinner),
      breakfast_price: parseNumber(breakfastPrice),
      lunch_price: parseNumber(lunchPrice),
      dinner_price: parseNumber(dinnerPrice),
      components: selectedItems.map((item) => ({
        item_id: item.kind === "item" ? item.itemId : undefined,
        component_type_id: item.kind === "type" ? item.componentTypeId : undefined,
        quantity: item.quantity,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">Loading plated item builder…</div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <p className="text-center text-destructive">{loadError}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="pricing">Packaging & Pricing</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plated-name">Plated Item Name</Label>
              <Input
                id="plated-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.category_id} value={String(category.category_id)}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="plated-description">Description</Label>
              <Input
                id="plated-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-alias">Alias</Label>
              <Input
                id="plated-alias"
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Meals</Label>
              <div className="flex flex-wrap gap-2">
                {MEAL_OPTIONS.map((meal) => (
                  <Button
                    key={meal.id}
                    type="button"
                    variant={selectedMeals.includes(meal.id) ? "default" : "outline"}
                    onClick={() => toggleMeal(meal.id)}
                  >
                    {meal.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-max-breakfast">Max Qty Breakfast</Label>
              <Input
                id="plated-max-breakfast"
                type="number"
                min="0"
                value={maxBreakfast}
                onChange={(event) => setMaxBreakfast(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-max-lunch">Max Qty Lunch</Label>
              <Input
                id="plated-max-lunch"
                type="number"
                min="0"
                value={maxLunch}
                onChange={(event) => setMaxLunch(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-max-dinner">Max Qty Dinner</Label>
              <Input
                id="plated-max-dinner"
                type="number"
                min="0"
                value={maxDinner}
                onChange={(event) => setMaxDinner(event.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground">Packaging</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-uom-customer">Customer UOM</Label>
              <Input
                id="plated-uom-customer"
                value={uomCustomer}
                onChange={(event) => setUomCustomer(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-unit-packing">Unit Packing</Label>
              <Input
                id="plated-unit-packing"
                type="number"
                step="0.001"
                min="0"
                value={unitPacking}
                onChange={(event) => setUnitPacking(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-uom-packing">Packing UOM</Label>
              <Input
                id="plated-uom-packing"
                value={uomPacking}
                onChange={(event) => setUomPacking(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-uom-production">Production UOM</Label>
              <Input
                id="plated-uom-production"
                value={uomProduction}
                onChange={(event) => setUomProduction(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-conversion-rate">Conversion Rate</Label>
              <Input
                id="plated-conversion-rate"
                type="number"
                step="0.000001"
                min="0"
                value={conversionRate}
                onChange={(event) => setConversionRate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plated-buffer">Buffer Percentage</Label>
              <Input
                id="plated-buffer"
                type="number"
                step="0.01"
                min="0"
                value={bufferPercentage}
                onChange={(event) => setBufferPercentage(event.target.value)}
              />
            </div>
            <div className="border-t pt-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground">Pricing</h3>
            </div>
            {selectedMeals.includes(1) && (
              <div className="space-y-2">
                <Label htmlFor="plated-breakfast-price">Breakfast Price</Label>
                <Input
                  id="plated-breakfast-price"
                  type="number"
                  min="0"
                  step="0.5"
                  value={breakfastPrice}
                  onChange={(event) => setBreakfastPrice(event.target.value)}
                />
              </div>
            )}
            {selectedMeals.includes(2) && (
              <div className="space-y-2">
                <Label htmlFor="plated-lunch-price">Lunch Price</Label>
                <Input
                  id="plated-lunch-price"
                  type="number"
                  min="0"
                  step="0.5"
                  value={lunchPrice}
                  onChange={(event) => setLunchPrice(event.target.value)}
                />
              </div>
            )}
            {selectedMeals.includes(3) && (
              <div className="space-y-2">
                <Label htmlFor="plated-dinner-price">Dinner Price</Label>
                <Input
                  id="plated-dinner-price"
                  type="number"
                  min="0"
                  step="0.5"
                  value={dinnerPrice}
                  onChange={(event) => setDinnerPrice(event.target.value)}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="components" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <Label htmlFor="plated-search">Add Concrete Items</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="plated-search"
                    value={itemSearch}
                    onChange={(event) => setItemSearch(event.target.value)}
                    placeholder="Search items by name"
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="max-h-[320px] rounded-md border">
                {filteredItems.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">
                    No items match that search.
                  </p>
                ) : (
                  <div className="divide-y">
                    {filteredItems.map((item) => (
                      <button
                        key={item.item_id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-muted/70"
                        onClick={() => {
                          setSelectedItems((prev) => [
                            ...prev,
                            { kind: "item", itemId: item.item_id, name: item.name, quantity: 1 },
                          ]);
                          setItemSearch("");
                        }}
                      >
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {resolveItemComponentNote(item.item_id)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div>
                <Label htmlFor="plated-type-search">Add Item Groups</Label>
                <div className="mt-1 grid gap-2 sm:grid-cols-[180px_1fr]">
                  <Select value={typeCategoryFilter} onValueChange={setTypeCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.category_id} value={String(category.category_id)}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="plated-type-search"
                      value={typeSearch}
                      onChange={(event) => setTypeSearch(event.target.value)}
                      placeholder="Search item groups"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <ScrollArea className="max-h-[220px] rounded-md border">
                {filteredComponentTypes.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">
                    No item groups match that search.
                  </p>
                ) : (
                  <div className="divide-y">
                    {filteredComponentTypes.map((componentType) => (
                      <button
                        key={componentType.component_type_id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-muted/70"
                        onClick={() => {
                          setSelectedItems((prev) => [
                            ...prev,
                            {
                              kind: "type",
                              componentTypeId: componentType.component_type_id,
                              name: componentType.name,
                              quantity: 1,
                            },
                          ]);
                          setTypeSearch("");
                        }}
                      >
                        <p className="font-medium">{componentType.name}</p>
                        {componentType.category_name ? (
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {componentType.category_name}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {componentType.description ?? "Resolves to the item of the day"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Selected Items and Groups</Label>
                {selectedItems.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedItems.length} item(s)
                  </span>
                )}
              </div>
              <ScrollArea className="max-h-[320px] rounded-md border">
                {selectedItems.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">
                    No items or item groups selected yet.
                  </p>
                ) : (
                  <div className="divide-y">
                    {selectedItems.map((entry) => (
                      <div
                        key={`${entry.kind}-${entry.itemId ?? entry.componentTypeId}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.kind === "item"
                              ? resolveItemComponentNote(entry.itemId ?? 0)
                              : resolveItemGroupNote(entry.componentTypeId)}
                          </p>
                        </div>
                        <div className="w-24">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={entry.quantity}
                            onChange={(event) => handleQuantityChange(entry, event.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() =>
                            setSelectedItems((prev) =>
                              prev.filter((item) => {
                                return !(
                                  item.kind === entry.kind &&
                                  item.itemId === entry.itemId &&
                                  item.componentTypeId === entry.componentTypeId
                                );
                              }),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{platedItem ? "Update Plated Item" : "Create Plated Item"}</Button>
      </div>
    </form>
  );
}
