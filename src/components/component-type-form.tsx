"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { http } from "@/lib/http"
import type { CategoryProduct, ComponentTypeProduct } from "@/types/product"

export interface ComponentTypeFormValues {
  component_type_id?: number
  name: string
  description?: string
  category_id?: number | null
}

interface ComponentTypeFormProps {
  componentType?: ComponentTypeProduct | null
  onSave: (payload: ComponentTypeFormValues) => void
  onCancel: () => void
}

const EMPTY_OPTION_VALUE = "__none"

export default function ComponentTypeForm({
  componentType,
  onSave,
  onCancel,
}: ComponentTypeFormProps) {
  const [name, setName] = useState(componentType?.name ?? "")
  const [description, setDescription] = useState(componentType?.description ?? "")
  const [categoryId, setCategoryId] = useState(
    componentType?.category_id ? String(componentType.category_id) : EMPTY_OPTION_VALUE,
  )
  const [categories, setCategories] = useState<CategoryProduct[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(componentType?.name ?? "")
    setDescription(componentType?.description ?? "")
    setCategoryId(componentType?.category_id ? String(componentType.category_id) : EMPTY_OPTION_VALUE)
    setError(null)
  }, [componentType])

  useEffect(() => {
    let cancelled = false

    const fetchCategories = async () => {
      setLoadingCategories(true)
      try {
        const response = await http.get("/api/products/categories")
        if (!response.ok) {
          throw new Error("Failed to load categories")
        }
        const data = await response.json()
        if (!cancelled) {
          setCategories(Array.isArray(data) ? data : [])
        }
      } catch {
        if (!cancelled) {
          setCategories([])
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false)
        }
      }
    }

    void fetchCategories()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Item group name is required.")
      return
    }
    onSave({
      component_type_id: componentType?.component_type_id,
      name: trimmedName,
      description: description.trim() || undefined,
      category_id: categoryId === EMPTY_OPTION_VALUE ? null : Number(categoryId),
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{componentType ? "Edit Item Group" : "Create Item Group"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="component_type_name">Name</Label>
            <Input
              id="component_type_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Curry"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="component_type_category">Category</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={loadingCategories}
            >
              <SelectTrigger id="component_type_category">
                <SelectValue placeholder={loadingCategories ? "Loading..." : "Select category"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_OPTION_VALUE}>None</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.category_id} value={String(category.category_id)}>
                    {category.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="component_type_description">Description</Label>
            <Textarea
              id="component_type_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain how this item group should be resolved."
              rows={4}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{componentType ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
