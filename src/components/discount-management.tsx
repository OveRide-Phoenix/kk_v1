"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface DiscountRule {
  discount_id: number;
  item_id: number;
  item_name: string;
  city_code: string;
  from_date: string;
  to_date: string | null;
  discount_pct: number;
  created_at: string;
}

interface ItemOption {
  item_id: number;
  name: string;
}

const EMPTY_FORM = {
  item_id: "",
  city_code: "MYS" as CityCode,
  from_date: "",
  to_date: "",
  discount_pct: "",
};

function isActive(rule: DiscountRule): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (rule.from_date > today) return false;
  if (rule.to_date && rule.to_date < today) return false;
  return true;
}

export default function DiscountManagement() {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get(`/api/products/discounts${activeOnly ? "?active_only=true" : ""}`);
      if (res.ok) setRules(await res.json());
    } catch {
      // silent — table shows empty state
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await http.get("/api/products/items");
      if (!res.ok) return;
      const data = await res.json();
      setItems((data.items ?? data).map((i: any) => ({ item_id: i.item_id, name: i.name })));
    } catch {}
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(rule: DiscountRule) {
    setEditingId(rule.discount_id);
    setForm({
      item_id: String(rule.item_id),
      city_code: rule.city_code as CityCode,
      from_date: rule.from_date,
      to_date: rule.to_date ?? "",
      discount_pct: String(rule.discount_pct),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.item_id || !form.from_date || !form.discount_pct) {
      toast({
        title: "Validation",
        description: "Item, from date, and discount % are required",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const body = {
        item_id: Number(form.item_id),
        city_code: form.city_code,
        from_date: form.from_date,
        to_date: form.to_date || null,
        discount_pct: Number(form.discount_pct),
      };
      const res = editingId
        ? await http.put(`/api/products/discounts/${editingId}`, body)
        : await http.post("/api/products/discounts", body);
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Saved", description: "Discount rule saved" });
      setDialogOpen(false);
      fetchRules();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this discount rule?")) return;
    try {
      const res = await http.delete(`/api/products/discounts/${id}`);
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Deleted" });
      fetchRules();
    } catch {
      toast({ title: "Error", description: "Could not delete", variant: "destructive" });
    }
  }

  return (
    <AdminLayout activePage="discounts">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Item Discount Rules</h1>
          <div className="flex gap-2">
            <Button
              variant={activeOnly ? "default" : "outline"}
              onClick={() => setActiveOnly((v) => !v)}
              size="sm"
            >
              {activeOnly ? "Showing Active" : "Show All"}
            </Button>
            <Button onClick={openCreate} size="sm">
              <Plus size={16} className="mr-1" /> Add Rule
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No discount rules found
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.discount_id}>
                      <TableCell className="font-medium">{rule.item_name}</TableCell>
                      <TableCell>
                        {CITY_CONFIG[rule.city_code as CityCode]?.label ?? rule.city_code}
                      </TableCell>
                      <TableCell>{rule.from_date}</TableCell>
                      <TableCell>
                        {rule.to_date ?? <span className="text-muted-foreground">Open</span>}
                      </TableCell>
                      <TableCell className="font-semibold">{rule.discount_pct}%</TableCell>
                      <TableCell>
                        {isActive(rule) ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="flex justify-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(rule)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(rule.discount_id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Discount Rule" : "New Discount Rule"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Item</label>
              <Select
                value={form.item_id}
                onValueChange={(v) => setForm((f) => ({ ...f, item_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.item_id} value={String(item.item_id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">City</label>
              <Select
                value={form.city_code}
                onValueChange={(v) => setForm((f) => ({ ...f, city_code: v as CityCode }))}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">From Date</label>
                <Input
                  type="date"
                  value={form.from_date}
                  onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  To Date <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={form.to_date}
                  onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Discount %</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="e.g. 10"
                value={form.discount_pct}
                onChange={(e) => setForm((f) => ({ ...f, discount_pct: e.target.value }))}
              />
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
