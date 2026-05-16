"use client";

import type React from "react";

import { useState, useEffect, useRef, useMemo } from "react";
import { http } from "@/lib/http";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Product, type CategoryProduct } from "@/types/product";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ComponentTypeOption {
  component_type_id: number;
  name: string;
  description?: string | null;
}

type ProductFormScope = "items" | "condiments";

interface ProductFormProps {
  product: Product | null;
  onSave: (product: Product) => Promise<void> | void;
  onCancel: () => void;
  formScope?: ProductFormScope;
}

const normalizeMaxField = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

const CONDIMENTS_BLD_ID = 4;
const EMPTY_OPTION_VALUE = "__none";

const MEAL_OPTIONS = [
  { id: 1, label: "Breakfast", maxField: "max_qty_breakfast" },
  { id: 2, label: "Lunch", maxField: "max_qty_lunch" },
  { id: 3, label: "Dinner", maxField: "max_qty_dinner" },
  { id: CONDIMENTS_BLD_ID, label: "Condiments", maxField: "max_qty_condiments" },
];
const FOOD_MEAL_OPTIONS = MEAL_OPTIONS.filter((meal) => meal.id !== CONDIMENTS_BLD_ID);

const createInitialFormData = (item: Product | null, scope: ProductFormScope) => {
  const existingMeals = item && Array.isArray(item.bld_ids) ? [...item.bld_ids] : [];
  const defaultMeals =
    scope === "condiments"
      ? existingMeals.length > 0
        ? existingMeals
        : [CONDIMENTS_BLD_ID]
      : existingMeals;

  if (item) {
    const initial = {
      ...item,
      bld_ids: defaultMeals,
      max_qty_breakfast: normalizeMaxField(item.max_qty_breakfast),
      max_qty_lunch: normalizeMaxField(item.max_qty_lunch),
      max_qty_dinner: normalizeMaxField(item.max_qty_dinner),
      max_qty_condiments: normalizeMaxField(item.max_qty_condiments),
    };
    return initial;
  }

  return {
    name: "",
    description: "",
    alias: "",
    category_id: "",
    component_type_id: "",
    uom_customer: "",
    unit_packing: 0,
    uom_packing: "",
    hsn_code: "",
    uom_production: "",
    packing_to_production_rate: 1,
    buffer_percentage: 0,
    max_qty_breakfast: 0,
    max_qty_lunch: 0,
    max_qty_dinner: 0,
    max_qty_condiments: 0,
    bld_ids: defaultMeals,
    picture_url: "",
    breakfast_price: 0,
    lunch_price: 0,
    dinner_price: 0,
    condiments_price: 0,
    festival_price: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
  };
};

export default function ProductForm({
  product,
  onSave,
  onCancel,
  formScope = "items",
}: ProductFormProps) {
  const isEditing = !!product;
  const [formData, setFormData] = useState<any>(() => createInitialFormData(product, formScope));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const previousMealsRef = useRef<number[]>([]);
  const isCondimentScope = formScope === "condiments";
  const selectedMeals = Array.isArray(formData.bld_ids) ? formData.bld_ids : [];
  const isCondiment = isCondimentScope || selectedMeals.includes(CONDIMENTS_BLD_ID);
  const [categoryOptions, setCategoryOptions] = useState<CategoryProduct[]>([]);
  const [componentTypeOptions, setComponentTypeOptions] = useState<ComponentTypeOption[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleMealSelection = (mealId: number) => {
    setFormData((prev: any) => {
      const current: number[] = Array.isArray(prev.bld_ids) ? prev.bld_ids : [];
      const normalized = current.filter((id): id is number => typeof id === "number");
      const set = new Set(normalized);

      if (mealId === CONDIMENTS_BLD_ID) {
        if (set.has(CONDIMENTS_BLD_ID)) {
          const restored = previousMealsRef.current.length ? [...previousMealsRef.current] : [];
          return { ...prev, bld_ids: restored };
        }
        previousMealsRef.current = Array.from(set).filter((id) => id !== CONDIMENTS_BLD_ID);
        return { ...prev, bld_ids: [CONDIMENTS_BLD_ID] };
      }

      const next = new Set(Array.from(set).filter((id) => id !== CONDIMENTS_BLD_ID));
      if (next.has(mealId)) {
        next.delete(mealId);
      } else {
        next.add(mealId);
      }
      const sorted = Array.from(next).sort((a, b) => a - b);
      previousMealsRef.current = [...sorted];
      return { ...prev, bld_ids: sorted };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    if (!isCondiment) {
      const componentTypeId =
        typeof formData.component_type_id === "number" && formData.component_type_id > 0
          ? formData.component_type_id
          : null;
      if (componentTypeId == null) {
        setFormError("Item group is required for non-condiment items.");
        setSubmitting(false);
        return;
      }
    }
    try {
      await Promise.resolve(onSave(formData));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save item";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Generate alias from name
  useEffect(() => {
    if (formData.name && !isEditing) {
      const alias = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      handleChange("alias", alias);
    }
  }, [formData.name, isEditing]);

  useEffect(() => {
    setFormData(createInitialFormData(product, formScope));
    setFormError(null);
    setSubmitting(false);
    previousMealsRef.current = [];
  }, [product, formScope]);

  useEffect(() => {
    let cancelled = false;
    const fetchReferences = async () => {
      setLoadingReferences(true);
      try {
        const [categoriesRes, componentTypesRes] = await Promise.all([
          http.get("/api/products/categories"),
          http.get("/api/products/component-types"),
        ]);
        if (!categoriesRes.ok) {
          throw new Error("Failed to load categories");
        }
        if (!componentTypesRes.ok) {
          throw new Error("Failed to load item groups");
        }
        const [categoriesData, componentTypesData] = await Promise.all([
          categoriesRes.json(),
          componentTypesRes.json(),
        ]);
        if (cancelled) {
          return;
        }
        setCategoryOptions(Array.isArray(categoriesData) ? categoriesData : []);
        setComponentTypeOptions(Array.isArray(componentTypesData) ? componentTypesData : []);
      } catch (error) {
        console.error("Failed to load reference data", error);
        if (!cancelled) {
          setCategoryOptions([]);
          setComponentTypeOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingReferences(false);
        }
      }
    };
    fetchReferences();
    return () => {
      cancelled = true;
    };
  }, []);

  const snacksCategoryId = useMemo(() => {
    const match = categoryOptions.find((cat) => cat.category_name.toLowerCase() === "snacks");
    return match?.category_id ?? null;
  }, [categoryOptions]);

  useEffect(() => {
    if (isCondiment && snacksCategoryId && !formData.category_id) {
      handleChange("category_id", snacksCategoryId);
    }
  }, [isCondiment, snacksCategoryId, formData.category_id]);

  useEffect(() => {
    if (!isCondimentScope) {
      return;
    }
    const hasOnlyCondiment =
      Array.isArray(formData.bld_ids) &&
      formData.bld_ids.length === 1 &&
      formData.bld_ids[0] === CONDIMENTS_BLD_ID;
    if (!hasOnlyCondiment) {
      setFormData((prev: any) => ({ ...prev, bld_ids: [CONDIMENTS_BLD_ID] }));
    }
  }, [isCondimentScope, formData.bld_ids]);

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Details</TabsTrigger>
              <TabsTrigger value="pricing">Packaging & Pricing</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Details Tab */}
            <TabsContent value="basic">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description ?? ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alias">Alias</Label>
                  <Input
                    id="alias"
                    value={formData.alias ?? ""}
                    onChange={(e) => handleChange("alias", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <p className="text-xs text-muted-foreground">
                    Stored as <code>category_id</code>
                  </p>
                  <Select
                    value={
                      typeof formData.category_id === "number" && formData.category_id > 0
                        ? String(formData.category_id)
                        : EMPTY_OPTION_VALUE
                    }
                    onValueChange={(value) =>
                      handleChange("category_id", value === EMPTY_OPTION_VALUE ? "" : Number(value))
                    }
                    disabled={loadingReferences}
                  >
                    <SelectTrigger id="category_id">
                      <SelectValue
                        placeholder={loadingReferences ? "Loading…" : "Select category"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_OPTION_VALUE}>None</SelectItem>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category.category_id} value={String(category.category_id)}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="component_type_id">
                    Item Group {!isCondiment && <span className="text-red-500">*</span>}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use this when the item fulfills an item group, for example Paneer Curry to
                    Curry.
                  </p>
                  <Select
                    value={
                      typeof formData.component_type_id === "number" &&
                      formData.component_type_id > 0
                        ? String(formData.component_type_id)
                        : EMPTY_OPTION_VALUE
                    }
                    onValueChange={(value) =>
                      handleChange(
                        "component_type_id",
                        value === EMPTY_OPTION_VALUE ? "" : Number(value),
                      )
                    }
                    disabled={loadingReferences}
                  >
                    <SelectTrigger id="component_type_id">
                      <SelectValue
                        placeholder={loadingReferences ? "Loading…" : "Select item group"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {isCondiment ? (
                        <SelectItem value={EMPTY_OPTION_VALUE}>None</SelectItem>
                      ) : null}
                      {componentTypeOptions.map((componentType) => (
                        <SelectItem
                          key={componentType.component_type_id}
                          value={String(componentType.component_type_id)}
                        >
                          {componentType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isCondimentScope && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Applies to BLD</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose the meals where this catalog item should appear.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {FOOD_MEAL_OPTIONS.map((option) => {
                        const selected = selectedMeals.includes(option.id);
                        return (
                          <Button
                            key={option.id}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            className="px-4"
                            onClick={() => handleMealSelection(option.id)}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {!isCondimentScope &&
                  FOOD_MEAL_OPTIONS.map(
                    (meal) =>
                      selectedMeals.includes(meal.id) && (
                        <div className="space-y-2" key={`max-field-${meal.id}`}>
                          <Label htmlFor={meal.maxField}>Max Qty · {meal.label}</Label>
                          <Input
                            id={meal.maxField}
                            type="number"
                            min={0}
                            value={formData[meal.maxField] ?? 0}
                            onChange={(e) => {
                              const parsed = Number.parseInt(e.target.value, 10);
                              handleChange(
                                meal.maxField,
                                Number.isNaN(parsed) ? 0 : Math.max(parsed, 0),
                              );
                            }}
                          />
                        </div>
                      ),
                  )}
                {isCondiment && (
                  <div className="space-y-2">
                    <Label htmlFor="max_qty_condiments">Max Qty · Condiments</Label>
                    <Input
                      id="max_qty_condiments"
                      type="number"
                      min={0}
                      value={formData.max_qty_condiments ?? 0}
                      onChange={(e) => {
                        const parsed = Number.parseInt(e.target.value, 10);
                        handleChange(
                          "max_qty_condiments",
                          Number.isNaN(parsed) ? 0 : Math.max(parsed, 0),
                        );
                      }}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="picture_url">Upload Picture</Label>
                  <Input
                    id="picture_url"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleChange("picture_url", file);
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Packaging & Pricing Tab */}
            <TabsContent value="pricing">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <h3 className="text-sm font-semibold text-foreground">Packaging</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uom_customer">
                    Customer UOM <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="uom_customer"
                    value={formData.uom_customer ?? ""}
                    onChange={(e) => handleChange("uom_customer", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_packing">Unit Packing</Label>
                  <Input
                    id="unit_packing"
                    type="number"
                    value={formData.unit_packing ?? ""}
                    onChange={(e) =>
                      handleChange("unit_packing", Number.parseFloat(e.target.value) || 0)
                    }
                    step="0.001"
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uom_packing">Packing UOM</Label>
                  <Input
                    id="uom_packing"
                    value={formData.uom_packing ?? ""}
                    onChange={(e) => handleChange("uom_packing", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uom_production">Production UOM</Label>
                  <Input
                    id="uom_production"
                    value={formData.uom_production ?? ""}
                    onChange={(e) => handleChange("uom_production", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packing_to_production_rate">Packing to Production Rate</Label>
                  <Input
                    id="packing_to_production_rate"
                    type="number"
                    value={formData.packing_to_production_rate ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "packing_to_production_rate",
                        Number.parseFloat(e.target.value) || 1,
                      )
                    }
                    min={0}
                    step="0.000001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buffer_percentage">Buffer Percentage (%)</Label>
                  <Input
                    id="buffer_percentage"
                    type="number"
                    value={formData.buffer_percentage ?? ""}
                    onChange={(e) =>
                      handleChange("buffer_percentage", Number.parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    max={100}
                    step="0.01"
                  />
                </div>
                <div className="border-t pt-4 sm:col-span-2">
                  <h3 className="text-sm font-semibold text-foreground">Pricing</h3>
                </div>
                {!isCondimentScope && (
                  <>
                    {selectedMeals.includes(1) && (
                      <div className="space-y-2">
                        <Label htmlFor="breakfast_price">Breakfast Price</Label>
                        <Input
                          id="breakfast_price"
                          type="number"
                          value={formData.breakfast_price ?? ""}
                          onChange={(e) =>
                            handleChange("breakfast_price", Number.parseFloat(e.target.value) || 0)
                          }
                          min={0}
                          step="0.01"
                        />
                      </div>
                    )}
                    {selectedMeals.includes(2) && (
                      <div className="space-y-2">
                        <Label htmlFor="lunch_price">Lunch Price</Label>
                        <Input
                          id="lunch_price"
                          type="number"
                          value={formData.lunch_price ?? ""}
                          onChange={(e) =>
                            handleChange("lunch_price", Number.parseFloat(e.target.value) || 0)
                          }
                          min={0}
                          step="0.01"
                        />
                      </div>
                    )}
                    {selectedMeals.includes(3) && (
                      <div className="space-y-2">
                        <Label htmlFor="dinner_price">Dinner Price</Label>
                        <Input
                          id="dinner_price"
                          type="number"
                          value={formData.dinner_price ?? ""}
                          onChange={(e) =>
                            handleChange("dinner_price", Number.parseFloat(e.target.value) || 0)
                          }
                          min={0}
                          step="0.01"
                        />
                      </div>
                    )}
                  </>
                )}
                {isCondiment && (
                  <div className="space-y-2">
                    <Label htmlFor="condiments_price">Condiments Price</Label>
                    <Input
                      id="condiments_price"
                      type="number"
                      value={formData.condiments_price ?? ""}
                      onChange={(e) =>
                        handleChange("condiments_price", Number.parseFloat(e.target.value) || 0)
                      }
                      min={0}
                      step="0.01"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="festival_price">Festival Price</Label>
                  <Input
                    id="festival_price"
                    type="number"
                    value={formData.festival_price ?? ""}
                    onChange={(e) =>
                      handleChange("festival_price", Number.parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hsn_code">HSN Code</Label>
                  <Input
                    id="hsn_code"
                    value={formData.hsn_code ?? ""}
                    onChange={(e) => handleChange("hsn_code", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cgst">CGST (%)</Label>
                  <Input
                    id="cgst"
                    type="number"
                    value={formData.cgst ?? ""}
                    onChange={(e) => handleChange("cgst", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sgst">SGST (%)</Label>
                  <Input
                    id="sgst"
                    type="number"
                    value={formData.sgst ?? ""}
                    onChange={(e) => handleChange("sgst", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="igst">IGST (%)</Label>
                  <Input
                    id="igst"
                    type="number"
                    value={formData.igst ?? ""}
                    onChange={(e) => handleChange("igst", Number.parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? isEditing
                  ? "Updating…"
                  : "Creating…"
                : isEditing
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
