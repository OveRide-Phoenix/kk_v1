"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ComponentTypeProduct } from "@/types/product"

export interface ComponentTypeFormValues {
  component_type_id?: number
  name: string
  description?: string
}

interface ComponentTypeFormProps {
  componentType?: ComponentTypeProduct | null
  onSave: (payload: ComponentTypeFormValues) => void
  onCancel: () => void
}

export default function ComponentTypeForm({
  componentType,
  onSave,
  onCancel,
}: ComponentTypeFormProps) {
  const [name, setName] = useState(componentType?.name ?? "")
  const [description, setDescription] = useState(componentType?.description ?? "")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(componentType?.name ?? "")
    setDescription(componentType?.description ?? "")
    setError(null)
  }, [componentType])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Component type name is required.")
      return
    }
    onSave({
      component_type_id: componentType?.component_type_id,
      name: trimmedName,
      description: description.trim() || undefined,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{componentType ? "Edit Generic Component" : "Create Generic Component"}</DialogTitle>
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
            <Label htmlFor="component_type_description">Description</Label>
            <Textarea
              id="component_type_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain how this generic slot should be resolved."
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
