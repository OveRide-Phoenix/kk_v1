"use client";

import { useState, useEffect, useCallback } from "react";
import { http } from "@/lib/http";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Search, Plus, Settings2, Pencil, Trash2, PackageOpen } from "lucide-react";
import ProductForm from "@/components/product-form";
import ProductTable from "@/components/product-table";
import type { Product } from "@/types/product";

interface CondimentType {
  condiment_type_id: number;
  name: string;
  description: string | null;
  sort_order: number;
  item_count: number;
}

export default function CondimentsPage() {
  const { toast } = useToast();

  // ── condiment types ────────────────────────────────────────────────────────
  const [condimentTypes, setCondimentTypes] = useState<CondimentType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  // ── items ──────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Product[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── manage-types dialog ────────────────────────────────────────────────────
  const [manageOpen, setManageOpen] = useState(false);
  const [typeForm, setTypeForm] = useState<{
    name: string;
    description: string;
    sort_order: string;
  }>({
    name: "",
    description: "",
    sort_order: "0",
  });
  const [editingType, setEditingType] = useState<CondimentType | null>(null);
  const [savingType, setSavingType] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<CondimentType | null>(null);

  // ── item form ──────────────────────────────────────────────────────────────
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Product | null>(null);

  // ── fetch types ────────────────────────────────────────────────────────────
  const fetchTypes = useCallback(async () => {
    setLoadingTypes(true);
    try {
      const res = await http.get("/api/products/condiment-types");
      if (!res.ok) throw new Error("Failed to load condiment types");
      const data = await res.json();
      setCondimentTypes(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Could not load condiment types", variant: "destructive" });
    } finally {
      setLoadingTypes(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // ── fetch items ────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const params = new URLSearchParams({ only_condiments: "1" });
      if (selectedTypeId !== null) {
        params.set("condiment_type_id", String(selectedTypeId));
      }
      const res = await http.get(`/api/products/items?${params}`);
      if (!res.ok) throw new Error("Failed to load items");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Could not load condiment items", variant: "destructive" });
    } finally {
      setLoadingItems(false);
    }
  }, [selectedTypeId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ── filtered items by search ───────────────────────────────────────────────
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      (item as any).alias?.toLowerCase().includes(q) ||
      (item as any).condiment_type_name?.toLowerCase().includes(q)
    );
  });

  // ── type form helpers ──────────────────────────────────────────────────────
  const openAddType = () => {
    setEditingType(null);
    setTypeForm({ name: "", description: "", sort_order: String(condimentTypes.length) });
    setManageOpen(true);
  };

  const openEditType = (ct: CondimentType) => {
    setEditingType(ct);
    setTypeForm({
      name: ct.name,
      description: ct.description ?? "",
      sort_order: String(ct.sort_order),
    });
    setManageOpen(true);
  };

  const handleSaveType = async () => {
    const name = typeForm.name.trim();
    if (!name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSavingType(true);
    try {
      const body = {
        name,
        description: typeForm.description.trim() || null,
        sort_order: parseInt(typeForm.sort_order, 10) || 0,
      };
      const res = editingType
        ? await http.patch(`/api/products/condiment-types/${editingType.condiment_type_id}`, body)
        : await http.post("/api/products/condiment-types", body);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? "Save failed");
      }
      toast({ title: editingType ? "Type updated" : "Type created" });
      setManageOpen(false);
      await fetchTypes();
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to save type", variant: "destructive" });
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteType = async (ct: CondimentType) => {
    try {
      const res = await http.delete(`/api/products/condiment-types/${ct.condiment_type_id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? "Delete failed");
      }
      toast({ title: `"${ct.name}" deleted` });
      if (selectedTypeId === ct.condiment_type_id) setSelectedTypeId(null);
      await fetchTypes();
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to delete type", variant: "destructive" });
    } finally {
      setTypeToDelete(null);
    }
  };

  // ── item CRUD ──────────────────────────────────────────────────────────────
  const handleSaveItem = async (product: Product) => {
    const isNew = !product.item_id;
    const url = isNew ? "/api/products/items" : `/api/products/items/${product.item_id}`;
    const method = isNew ? http.post : http.put;
    const res = await method(url, product as unknown as Record<string, unknown>);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail ?? "Save failed");
    }
    toast({ title: isNew ? "Item created" : "Item updated" });
    setItemFormOpen(false);
    setSelectedItem(null);
    await Promise.all([fetchItems(), fetchTypes()]);
  };

  const handleDeleteItem = async (product: Product) => {
    try {
      const res = await http.delete(`/api/products/items/${product.item_id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? "Delete failed");
      }
      toast({ title: `"${product.name}" deleted` });
      await Promise.all([fetchItems(), fetchTypes()]);
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to delete item", variant: "destructive" });
    } finally {
      setItemToDelete(null);
    }
  };

  const selectedTypeName =
    selectedTypeId === null
      ? "All Condiments"
      : (condimentTypes.find((t) => t.condiment_type_id === selectedTypeId)?.name ?? "Condiments");

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Condiments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage condiment items and their types
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openAddType}>
            <Settings2 className="mr-2 h-4 w-4" />
            Manage Types
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setSelectedItem(null);
              setItemFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Condiment
          </Button>
        </div>
      </div>

      {/* Type filter cards */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedTypeId(null)}
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            selectedTypeId === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-accent"
          }`}
        >
          All
          <Badge variant="secondary" className="ml-2">
            {items.length}
          </Badge>
        </button>
        {loadingTypes
          ? null
          : condimentTypes.map((ct) => (
              <button
                key={ct.condiment_type_id}
                onClick={() =>
                  setSelectedTypeId(
                    selectedTypeId === ct.condiment_type_id ? null : ct.condiment_type_id,
                  )
                }
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedTypeId === ct.condiment_type_id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-accent"
                }`}
              >
                {ct.name}
                <Badge variant="secondary" className="ml-2">
                  {ct.item_count}
                </Badge>
              </button>
            ))}
      </div>

      {/* Items section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">{selectedTypeName}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingItems ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <PackageOpen className="h-8 w-8" />
              <p className="text-sm">
                {searchQuery ? "No items match your search." : "No condiment items here yet."}
              </p>
              {!searchQuery && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1"
                  onClick={() => {
                    setSelectedItem(null);
                    setItemFormOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add first item
                </Button>
              )}
            </div>
          ) : (
            <ProductTable
              products={filteredItems}
              tableType="condiments"
              onEdit={(p) => {
                setSelectedItem(p as Product);
                setItemFormOpen(true);
              }}
              onDelete={(p) => setItemToDelete(p as Product)}
            />
          )}
        </CardContent>
      </Card>

      {/* Manage Types dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Type" : "Add Condiment Type"}</DialogTitle>
            <DialogDescription>
              {editingType
                ? `Editing "${editingType.name}"`
                : "Create a new condiment type to help organise your condiment catalog."}
            </DialogDescription>
          </DialogHeader>

          {/* Existing types list (when adding) */}
          {!editingType && condimentTypes.length > 0 && (
            <div className="rounded-md border">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                Existing types
              </div>
              <ul className="divide-y max-h-48 overflow-y-auto">
                {condimentTypes.map((ct) => (
                  <li
                    key={ct.condiment_type_id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-medium">{ct.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {ct.item_count} item{ct.item_count !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEditType(ct)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          setManageOpen(false);
                          setTypeToDelete(ct);
                        }}
                        disabled={ct.item_count > 0}
                        title={ct.item_count > 0 ? "Remove all items before deleting" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="type-name">Name</Label>
              <Input
                id="type-name"
                value={typeForm.name}
                onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sweets"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-description">Description (optional)</Label>
              <Input
                id="type-description"
                value={typeForm.description}
                onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short description"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-sort">Sort Order</Label>
              <Input
                id="type-sort"
                type="number"
                value={typeForm.sort_order}
                onChange={(e) => setTypeForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveType} disabled={savingType}>
              {savingType ? "Saving…" : editingType ? "Save Changes" : "Create Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete type confirmation */}
      <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{typeToDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This condiment type will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => typeToDelete && handleDeleteType(typeToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item form */}
      {itemFormOpen && (
        <ProductForm
          product={selectedItem}
          formScope="condiments"
          onSave={handleSaveItem}
          onCancel={() => {
            setItemFormOpen(false);
            setSelectedItem(null);
          }}
        />
      )}

      {/* Delete item confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{itemToDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This condiment item will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => itemToDelete && handleDeleteItem(itemToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
