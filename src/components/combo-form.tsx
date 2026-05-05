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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ComboProduct, Product, CategoryProduct } from "@/types/product";
import { http } from "@/lib/http";

interface ComponentTypeOption {
  component_type_id: number;
  name: string;
  description?: string | null;
}

export interface ComboFormValues {
  combo_id?: number;
  combo_name: string;
  price: number;
  category_id: number;
  bld_ids: number[];
  items: Array<{ item_id?: number; component_type_id?: number; quantity: number }>;
}

interface ComboFormProps {
  onSave: (payload: ComboFormValues) => void | Promise<void>;
  onCancel: () => void;
  combo?: ComboProduct | null;
}

interface SelectedComboItem {
  kind: "item" | "type";
  itemId?: number;
  componentTypeId?: number;
  name: string;
  quantity: number;
}

const MEAL_LABELS: Record<number, string> = {
  1: "Breakfast",
  2: "Lunch",
  3: "Dinner",
  4: "Condiments",
};

export default function ComboForm({ onSave, onCancel, combo }: ComboFormProps) {
  const [availableItems, setAvailableItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryProduct[]>([]);
  const [componentTypes, setComponentTypes] = useState<ComponentTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [comboName, setComboName] = useState(combo?.combo_name ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    combo?.category_id ? String(combo.category_id) : "",
  );
  const [price, setPrice] = useState(combo?.price?.toString() ?? "");
  const [selectedMeals, setSelectedMeals] = useState<number[]>(combo?.bld_ids ?? []);
  const [selectedItems, setSelectedItems] = useState<SelectedComboItem[]>(
    () =>
      combo?.includedItems?.map((item) => ({
        kind: item.kind === "type" ? "type" : "item",
        itemId: item.itemId ?? undefined,
        componentTypeId: item.componentTypeId ?? undefined,
        name:
          item.name ??
          (item.kind === "type"
            ? (item.componentTypeName ?? "Generic Component")
            : `Item #${item.itemId}`),
        quantity: item.quantity ?? 1,
      })) ?? [],
  );
  const [itemSearch, setItemSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

        if (!itemsResponse.ok) {
          throw new Error("Failed to fetch items");
        }
        if (!categoriesResponse.ok) {
          throw new Error("Failed to fetch categories");
        }
        if (!componentTypesResponse.ok) {
          throw new Error("Failed to fetch component types");
        }
        const [itemsData, categoriesData, componentTypesData] = await Promise.all([
          itemsResponse.json(),
          categoriesResponse.json(),
          componentTypesResponse.json(),
        ]);

        if (!isMounted) {
          return;
        }
        setAvailableItems(
          Array.isArray(itemsData) ? itemsData.filter((item) => !item.is_combo) : [],
        );
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setComponentTypes(Array.isArray(componentTypesData) ? componentTypesData : []);
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load combo dependencies",
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

  useEffect(() => {
    setComboName(combo?.combo_name ?? "");
    setCategoryId(combo?.category_id ? String(combo.category_id) : "");
    setPrice(combo?.price?.toString() ?? "");
    setSelectedMeals(combo?.bld_ids ?? []);
    setSelectedItems(
      combo?.includedItems?.map((item) => ({
        kind: item.kind === "type" ? "type" : "item",
        itemId: item.itemId ?? undefined,
        componentTypeId: item.componentTypeId ?? undefined,
        name:
          item.name ??
          (item.kind === "type"
            ? (item.componentTypeName ?? "Generic Component")
            : `Item #${item.itemId}`),
        quantity: item.quantity ?? 1,
      })) ?? [],
    );
    setFormError(null);
  }, [combo]);

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
      const alreadySelected = selectedItems.some(
        (entry) =>
          entry.kind === "type" && entry.componentTypeId === componentType.component_type_id,
      );
      return matchesSearch && !alreadySelected;
    });
  }, [componentTypes, typeSearch, selectedItems]);

  const resolveItemName = (itemId: number): string => {
    const item = itemsMap.get(itemId);
    if (item?.name) {
      return item.name;
    }
    return `Item #${itemId}`;
  };

  const handleQuantityChange = (target: SelectedComboItem, value: string) => {
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
          quantity: Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1,
        };
      }),
    );
  };

  const toggleMeal = (mealId: number) => {
    setSelectedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealId)) {
        next.delete(mealId);
      } else {
        next.add(mealId);
      }
      return Array.from(next).sort((a, b) => a - b);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = comboName.trim();
    const parsedCategory = Number(categoryId);
    const parsedPrice = Number(price);

    if (!trimmedName) {
      setFormError("Combo name is required.");
      return;
    }
    if (!Number.isInteger(parsedCategory) || parsedCategory <= 0) {
      setFormError("Please pick a category.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError("Enter a valid price.");
      return;
    }
    if (selectedMeals.length === 0) {
      setFormError("Select at least one meal.");
      return;
    }
    if (selectedItems.length === 0) {
      setFormError("Add at least one item to the combo.");
      return;
    }
    setFormError(null);

    onSave({
      combo_id: combo?.combo_id,
      combo_name: trimmedName,
      category_id: parsedCategory,
      price: parsedPrice,
      bld_ids: selectedMeals,
      items: selectedItems.map((item) => ({
        item_id: item.kind === "item" ? item.itemId : undefined,
        component_type_id: item.kind === "type" ? item.componentTypeId : undefined,
        quantity: item.quantity,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Loading combo builder…
        <div className="mt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
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
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="combo-name">Combo Name</Label>
          <Input
            id="combo-name"
            value={comboName}
            onChange={(event) => setComboName(event.target.value)}
            placeholder="E.g. South Indian Thali"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
          <div className="space-y-2">
            <Label htmlFor="combo-price">Price (₹)</Label>
            <Input
              id="combo-price"
              type="number"
              min="0"
              step="0.5"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Meals</Label>
          <div className="flex flex-wrap gap-4 rounded-md border p-3">
            {[1, 2, 3].map((mealId) => (
              <label key={mealId} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedMeals.includes(mealId)}
                  onCheckedChange={() => toggleMeal(mealId)}
                />
                <span>{MEAL_LABELS[mealId]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <Label htmlFor="combo-search">Add Concrete Items</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="combo-search"
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
                placeholder="Search items by name"
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="max-h-[320px] rounded-md border">
            {filteredItems.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">No items match that search.</p>
            ) : (
              <div className="divide-y">
                {filteredItems.map((item) => (
                  <button
                    key={item.item_id}
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-muted/70"
                    onClick={() => {
                      setSelectedItems((prev) => [
                        ...prev,
                        { kind: "item", itemId: item.item_id, name: item.name, quantity: 1 },
                      ]);
                      setItemSearch("");
                    }}
                  >
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                    {Array.isArray(item.bld_ids) && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {item.bld_ids.map((mealId) => (
                          <Badge key={`${item.item_id}-${mealId}`} variant="outline">
                            {MEAL_LABELS[mealId] ?? `Meal ${mealId}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          <div>
            <Label htmlFor="combo-type-search">Add Generic Component Types</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="combo-type-search"
                value={typeSearch}
                onChange={(event) => setTypeSearch(event.target.value)}
                placeholder="Search component types"
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="max-h-[220px] rounded-md border">
            {filteredComponentTypes.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">
                No component types match that search.
              </p>
            ) : (
              <div className="divide-y">
                {filteredComponentTypes.map((componentType) => (
                  <button
                    key={componentType.component_type_id}
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-muted/70"
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
            <Label>Selected Components</Label>
            {selectedItems.length > 0 && (
              <span className="text-xs text-muted-foreground">{selectedItems.length} item(s)</span>
            )}
          </div>
          <ScrollArea className="max-h-[320px] rounded-md border">
            {selectedItems.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">No items selected yet.</p>
            ) : (
              <div className="divide-y">
                {selectedItems.map((entry) => (
                  <div
                    key={`${entry.kind}-${entry.itemId ?? entry.componentTypeId}`}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {entry.kind === "item" ? resolveItemName(entry.itemId ?? 0) : entry.name}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {entry.kind === "item"
                          ? `#${(entry.itemId ?? 0).toString().padStart(3, "0")}`
                          : `TYPE #${(entry.componentTypeId ?? 0).toString().padStart(3, "0")}`}
                      </p>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min="1"
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
                          prev.filter(
                            (item) =>
                              !(
                                item.kind === entry.kind &&
                                item.itemId === entry.itemId &&
                                item.componentTypeId === entry.componentTypeId
                              ),
                          ),
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

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{combo ? "Update Combo" : "Create Combo"}</Button>
      </div>
    </form>
  );
}
