"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import CustomerForm from "./customer-form"

interface AddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerAdded?: (customer: any) => void
}

export function AddCustomerDialog({ open, onOpenChange, onCustomerAdded }: AddCustomerDialogProps) {
  const handleSave = (customer: any) => {
    // Here you would typically make an API call to save the customer
    if (onCustomerAdded) {
      onCustomerAdded(customer)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <CustomerForm customer={null} onSave={handleSave} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

