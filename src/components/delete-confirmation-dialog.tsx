"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onCloseAction: () => void
  onConfirmAction: () => void  // ✅ Renamed to follow Next.js convention
  productName: string
}

export default function DeleteConfirmationDialog({
  isOpen,
  onCloseAction,
  onConfirmAction,  // ✅ Updated name
  productName,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium">{productName}</span>? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
          <Button variant="outline" onClick={onCloseAction}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirmAction}>  {/* ✅ Updated */}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
