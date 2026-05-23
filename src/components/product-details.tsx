"use client";

import { X, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComboProduct, PlatedProduct, Product } from "@/types/product";

interface ProductDetailsProps {
  product: Product | PlatedProduct | ComboProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductDetails({ product, open, onOpenChange }: ProductDetailsProps) {
  if (!product || !open) return null;

  const MEAL_LABELS: Record<number, string> = {
    1: "Breakfast",
    2: "Lunch",
    3: "Dinner",
    4: "Condiments",
  };
  const productDetails = product as Partial<Product & PlatedProduct> & { uom?: string | null };

  const mealIds = Array.isArray((product as { bld_ids?: unknown }).bld_ids)
    ? ((product as { bld_ids?: unknown[] }).bld_ids ?? [])
        .map((mealId) => Number(mealId))
        .filter((mealId) => Number.isInteger(mealId))
    : [];
  const mealBadges = Array.from(new Set(mealIds)).map((mealId) => (
    <Badge key={`meal-${mealId}`} variant="outline">
      {MEAL_LABELS[mealId] ?? `BLD ${mealId}`}
    </Badge>
  ));
  const isComboProduct = typeof (product as any).combo_id === "number";
  const displayName = isComboProduct ? (product as any).combo_name : (product as any).name;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto"
      onClick={() => onOpenChange(false)}
    >
      <Card
        className="w-full max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Product Details</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(product as any).picture_url || "/placeholder.svg"}
                alt={displayName}
                className="w-full aspect-square object-cover rounded-md border"
              />
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {mealBadges}
                  {(product as any).is_combo && <Badge variant="outline">Combo</Badge>}
                  {isComboProduct && <Badge variant="outline">Combo</Badge>}
                  {(product as any).is_plated && <Badge variant="outline">Plated</Badge>}
                  {(product as any).is_condiment && <Badge variant="secondary">Condiment</Badge>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1">{(product as any).description ?? "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Alias</h3>
                  <p className="mt-1">{(product as any).alias ?? "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Category</h3>
                  <p className="mt-1">{(product as any).category_name ?? "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Item Group</h3>
                  <p className="mt-1">{(product as any).component_type_name ?? "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Customer UOM</h3>
                  <p className="mt-1">{productDetails.uom_customer ?? productDetails.uom ?? "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Unit Packing</h3>
                  <p className="mt-1">{productDetails.unit_packing ?? "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Packing UOM</h3>
                  <p className="mt-1">{productDetails.uom_packing ?? "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">HSN Code</h3>
                  <p className="mt-1">{productDetails.hsn_code ?? "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Production UOM</h3>
                  <p className="mt-1">{productDetails.uom_production ?? "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
                  <p className="mt-1">{productDetails.packing_to_production_rate ?? "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Buffer Percentage</h3>
                  <p className="mt-1">{productDetails.buffer_percentage ?? "—"}%</p>
                </div>
              </div>

              {Array.isArray((product as any).platedComponents) &&
                (product as any).platedComponents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Plated Components</h3>
                    <div className="mt-2 space-y-2">
                      {(product as any).platedComponents.map((component: any) => (
                        <div
                          key={`component-${component.itemId}`}
                          className="rounded-md border p-3"
                        >
                          <p className="font-medium">
                            {component.name ?? `Item #${component.itemId}`}
                          </p>
                          <p className="text-sm text-muted-foreground">Qty: {component.quantity}</p>
                          {component.kind === "type" && (
                            <p className="text-xs text-muted-foreground">
                              Resolves from item group:{" "}
                              {component.componentTypeName ?? "Item group"}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {component.kind === "type"
                              ? "Resolved to the item of the day"
                              : component.unitPacking != null && component.uomPacking
                                ? `1 qty = ${component.unitPacking} ${component.uomPacking}`
                                : component.uomCustomer
                                  ? `1 qty = 1 ${component.uomCustomer}`
                                  : "1 qty"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {Array.isArray((product as any).includedItems) &&
                (product as any).includedItems.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Combo Components</h3>
                    <div className="mt-2 space-y-2">
                      {(product as any).includedItems.map((component: any, index: number) => (
                        <div
                          key={`combo-component-${component.itemId ?? component.componentTypeId ?? index}`}
                          className="rounded-md border p-3"
                        >
                          <p className="font-medium">
                            {component.name ??
                              (component.kind === "type"
                                ? "Item Group"
                                : `Item #${component.itemId}`)}
                          </p>
                          <p className="text-sm text-muted-foreground">Qty: {component.quantity}</p>
                          {component.kind === "type" && (
                            <p className="text-xs text-muted-foreground">
                              Resolves from item group:{" "}
                              {component.componentTypeName ?? "Item group"}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {(product as any).is_condiment ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Max Qty · Condiments</h3>
                    <p className="mt-1">{(product as any).max_qty_condiments ?? "—"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Net Price</h3>
                    <p className="mt-1">
                      {(product as any).net_price ?? (product as any).price ?? "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Max Qty · Breakfast</h3>
                      <p className="mt-1">{(product as any).max_qty_breakfast ?? "—"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Max Qty · Lunch</h3>
                      <p className="mt-1">{(product as any).max_qty_lunch ?? "—"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Max Qty · Dinner</h3>
                      <p className="mt-1">{(product as any).max_qty_dinner ?? "—"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        {isComboProduct ? "Price" : "Net Price"}
                      </h3>
                      <p className="mt-1">
                        {(product as any).net_price ?? (product as any).price ?? "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t p-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
