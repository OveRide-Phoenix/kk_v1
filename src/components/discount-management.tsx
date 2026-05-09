"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, X } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { http } from "@/lib/http";
import { CITY_CONFIG, type CityCode } from "@/config/cities";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Dimension = "item" | "category" | "meal_type" | "global";

interface Condition {
  condition_id?: number;
  dimension: Dimension;
  entity_id: number | null;
  entity_label: string | null;
  item_name?: string | null;
  category_name?: string | null;
}

interface DiscountCode {
  code_id: number;
  code: string;
  name: string;
  discount_pct: number;
  city_code: string;
  from_date: string;
  to_date: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: number;
  conditions: Condition[];
}

interface SelectOption {
  id: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "condiments"];

const DIMENSION_META: Record<Dimension, { label: string; color: string }> = {
  item: { label: "Item", color: "bg-blue-100 text-blue-800" },
  category: { label: "Category", color: "bg-purple-100 text-purple-800" },
  meal_type: { label: "Meal Type", color: "bg-amber-100 text-amber-800" },
  global: { label: "Global", color: "bg-green-100 text-green-800" },
};

const EMPTY_CONDITION: Omit<Condition, "condition_id"> = {
  dimension: "item",
  entity_id: null,
  entity_label: null,
};

const EMPTY_FORM = {
  code: "",
  name: "",
  discount_pct: "",
  city_code: "MYS" as CityCode,
  from_date: "",
  to_date: "",
  max_uses: "",
  is_active: true,
  conditions: [{ ...EMPTY_CONDITION }] as Omit<Condition, "condition_id">[],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isActive(dc: DiscountCode): boolean {
  if (!dc.is_active) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (dc.from_date > today) return false;
  if (dc.to_date && dc.to_date < today) return false;
  if (dc.max_uses !== null && dc.use_count >= dc.max_uses) return false;
  return true;
}

function conditionLabel(c: Condition): string {
  if (c.dimension === "item") return c.item_name ?? `Item #${c.entity_id}`;
  if (c.dimension === "category") return c.category_name ?? `Category #${c.entity_id}`;
  if (c.dimension === "meal_type")
    return c.entity_label ? c.entity_label.charAt(0).toUpperCase() + c.entity_label.slice(1) : "—";
  return "All products";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiscountManagement() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [items, setItems] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // -------------------------------------------------------------------------
  // Fetching
  // -------------------------------------------------------------------------

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeOnly ? "?active_only=true" : "";
      const res = await http.get(`/api/products/discount-codes${params}`);
      if (res.ok) setCodes(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  useEffect(() => {
    http.get("/api/products/items").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      setItems(
        (data.items ?? data).map((i: { item_id: number; name: string }) => ({
          id: i.item_id,
          label: i.name,
        })),
      );
    });
    http.get("/api/products/categories").then(async (res) => {
      if (!res.ok) return;
      const data: { category_id: number; category_name: string }[] = await res.json();
      setCategories(data.map((c) => ({ id: c.category_id, label: c.category_name })));
    });
  }, []);

  // -------------------------------------------------------------------------
  // Dialog helpers
  // -------------------------------------------------------------------------

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, conditions: [{ ...EMPTY_CONDITION }] });
    setDialogOpen(true);
  }

  function openEdit(dc: DiscountCode) {
    setEditingId(dc.code_id);
    setForm({
      code: dc.code,
      name: dc.name,
      discount_pct: String(dc.discount_pct),
      city_code: dc.city_code as CityCode,
      from_date: dc.from_date,
      to_date: dc.to_date ?? "",
      max_uses: dc.max_uses != null ? String(dc.max_uses) : "",
      is_active: Boolean(dc.is_active),
      conditions:
        dc.conditions.length > 0
          ? dc.conditions.map((c) => ({
              dimension: c.dimension,
              entity_id: c.entity_id,
              entity_label: c.entity_label,
            }))
          : [{ ...EMPTY_CONDITION }],
    });
    setDialogOpen(true);
  }

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addCondition() {
    setForm((f) => ({ ...f, conditions: [...f.conditions, { ...EMPTY_CONDITION }] }));
  }

  function removeCondition(idx: number) {
    setForm((f) => ({ ...f, conditions: f.conditions.filter((_, i) => i !== idx) }));
  }

  function updateCondition(idx: number, patch: Partial<Omit<Condition, "condition_id">>) {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  }

  // -------------------------------------------------------------------------
  // Save / Delete
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!form.code || !form.name || !form.discount_pct || !form.from_date) {
      toast({
        title: "Validation",
        description: "Code, name, discount %, and from date are required",
        variant: "destructive",
      });
      return;
    }
    for (const c of form.conditions) {
      if (c.dimension === "item" && !c.entity_id) {
        toast({
          title: "Validation",
          description: "Select an item for each item condition",
          variant: "destructive",
        });
        return;
      }
      if (c.dimension === "category" && !c.entity_id) {
        toast({
          title: "Validation",
          description: "Select a category for each category condition",
          variant: "destructive",
        });
        return;
      }
      if (c.dimension === "meal_type" && !c.entity_label) {
        toast({
          title: "Validation",
          description: "Select a meal type for each meal type condition",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        name: form.name,
        discount_pct: Number(form.discount_pct),
        city_code: form.city_code,
        from_date: form.from_date,
        to_date: form.to_date || null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        is_active: form.is_active,
        conditions: form.conditions.map((c) => ({
          dimension: c.dimension,
          entity_id: c.dimension === "item" || c.dimension === "category" ? c.entity_id : null,
          entity_label: c.dimension === "meal_type" ? c.entity_label : null,
        })),
      };
      const res = editingId
        ? await http.put(`/api/products/discount-codes/${editingId}`, body)
        : await http.post("/api/products/discount-codes", body);
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Saved" });
      setDialogOpen(false);
      fetchCodes();
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this discount code? This cannot be undone.")) return;
    try {
      const res = await http.delete(`/api/products/discount-codes/${id}`);
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Deleted" });
      fetchCodes();
    } catch {
      toast({ title: "Error", description: "Could not delete", variant: "destructive" });
    }
  }

  // -------------------------------------------------------------------------
  // Condition row in the dialog
  // -------------------------------------------------------------------------

  function ConditionRow({
    cond,
    idx,
    canRemove,
  }: {
    cond: Omit<Condition, "condition_id">;
    idx: number;
    canRemove: boolean;
  }) {
    return (
      <div className="flex gap-2 items-start">
        {/* Dimension */}
        <Select
          value={cond.dimension}
          onValueChange={(v) =>
            updateCondition(idx, {
              dimension: v as Dimension,
              entity_id: null,
              entity_label: null,
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(DIMENSION_META) as Dimension[]).map((d) => (
              <SelectItem key={d} value={d}>
                {DIMENSION_META[d].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Entity */}
        <div className="flex-1">
          {cond.dimension === "item" && (
            <Select
              value={cond.entity_id != null ? String(cond.entity_id) : ""}
              onValueChange={(v) => updateCondition(idx, { entity_id: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {cond.dimension === "category" && (
            <Select
              value={cond.entity_id != null ? String(cond.entity_id) : ""}
              onValueChange={(v) => updateCondition(idx, { entity_id: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {cond.dimension === "meal_type" && (
            <Select
              value={cond.entity_label ?? ""}
              onValueChange={(v) => updateCondition(idx, { entity_label: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select meal type" />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((mt) => (
                  <SelectItem key={mt} value={mt}>
                    {mt.charAt(0).toUpperCase() + mt.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {cond.dimension === "global" && (
            <p className="text-sm text-muted-foreground rounded-md bg-muted px-3 py-2 h-10 flex items-center">
              Applies to all products
            </p>
          )}
        </div>

        {/* Remove */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          disabled={!canRemove}
          onClick={() => removeCondition(idx)}
        >
          <X size={14} />
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AdminLayout activePage="discounts">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Discount Codes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              One code per rule. Each code has conditions that determine which items qualify.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeOnly ? "default" : "outline"}
              onClick={() => setActiveOnly((v) => !v)}
              size="sm"
            >
              {activeOnly ? "Active only" : "All"}
            </Button>
            <Button onClick={openCreate} size="sm">
              <Plus size={16} className="mr-1" /> New Code
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      No discount codes yet
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((dc) => (
                    <>
                      <TableRow
                        key={dc.code_id}
                        className="cursor-pointer"
                        onClick={() => setExpandedId(expandedId === dc.code_id ? null : dc.code_id)}
                      >
                        <TableCell className="text-muted-foreground">
                          {expandedId === dc.code_id ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-semibold">{dc.code}</TableCell>
                        <TableCell>{dc.name}</TableCell>
                        <TableCell>
                          {CITY_CONFIG[dc.city_code as CityCode]?.label ?? dc.city_code}
                        </TableCell>
                        <TableCell className="font-semibold">{dc.discount_pct}%</TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {dc.from_date} →{" "}
                          {dc.to_date ?? <span className="text-muted-foreground">open</span>}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {dc.use_count}
                          {dc.max_uses != null && (
                            <span className="text-muted-foreground"> / {dc.max_uses}</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isActive(dc) ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell
                          className="flex justify-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="icon" variant="ghost" onClick={() => openEdit(dc)}>
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDelete(dc.code_id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expanded conditions */}
                      {expandedId === dc.code_id && (
                        <TableRow key={`${dc.code_id}-conditions`}>
                          <TableCell />
                          <TableCell colSpan={8} className="pb-4 pt-0">
                            <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                Applies to{" "}
                                {dc.conditions.length === 0
                                  ? "all products (no conditions)"
                                  : `items matching any of these conditions`}
                              </p>
                              {dc.conditions.length === 0 ? (
                                <span className="text-sm text-muted-foreground">
                                  Global — applies to everything in the cart
                                </span>
                              ) : (
                                dc.conditions.map((c, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DIMENSION_META[c.dimension]?.color}`}
                                    >
                                      {DIMENSION_META[c.dimension]?.label}
                                    </span>
                                    <span>{conditionLabel(c)}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Discount Code" : "New Discount Code"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Code + Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Code</label>
                <Input
                  placeholder="BREAKFAST10"
                  value={form.code}
                  className="font-mono uppercase"
                  onChange={(e) => setField("code", e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Breakfast early-bird"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>
            </div>

            {/* Discount + City */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Discount %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="10"
                  value={form.discount_pct}
                  onChange={(e) => setField("discount_pct", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City</label>
                <Select
                  value={form.city_code}
                  onValueChange={(v) => setField("city_code", v as CityCode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CITY_CONFIG).map(([code, cfg]) => (
                      <SelectItem key={code} value={code}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">From Date</label>
                <Input
                  type="date"
                  value={form.from_date}
                  onChange={(e) => setField("from_date", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  To Date <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={form.to_date}
                  onChange={(e) => setField("to_date", e.target.value)}
                />
              </div>
            </div>

            {/* Max uses + Active */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Max Uses <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.max_uses}
                  onChange={(e) => setField("max_uses", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={form.is_active ? "1" : "0"}
                  onValueChange={(v) => setField("is_active", v === "1")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Conditions{" "}
                  <span className="text-muted-foreground font-normal">
                    — discount fires if any match (OR)
                  </span>
                </label>
                <Button type="button" size="sm" variant="outline" onClick={addCondition}>
                  <Plus size={13} className="mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.conditions.map((cond, idx) => (
                  <ConditionRow
                    key={idx}
                    cond={cond}
                    idx={idx}
                    canRemove={form.conditions.length > 1}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave a single Global condition to apply the code to all items in the cart.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
