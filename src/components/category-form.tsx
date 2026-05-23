"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CategoryProduct } from "@/types/product"

export interface CategoryFormValues {
  category_id?: number
  category_name: string
}

interface CategoryFormProps {
  category?: CategoryProduct | null
  onSave: (payload: CategoryFormValues) => void
  onCancel: () => void
}

export default function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.category_name ?? "")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(category?.category_name ?? "")
    setError(null)
  }, [category])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Category name is required.")
      return
    }
    onSave({
      category_id: category?.category_id,
      category_name: trimmed,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Create Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="category_name">Category Name</Label>
            <Input
              id="category_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., Breakfast Specials"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{category ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
