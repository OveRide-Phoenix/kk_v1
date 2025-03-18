"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import CustomerForm from "@/components/customer-form"

interface EditCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: any
  onCustomerUpdated?: (customer: any) => void
}

export function EditCustomerDialog({ open, onOpenChange, customer, onCustomerUpdated }: EditCustomerDialogProps) {
  const handleSave = (updatedCustomer: any) => {
    // Here you would typically make an API call to update the customer
    if (onCustomerUpdated) {
      onCustomerUpdated(updatedCustomer)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <CustomerForm customer={customer} onSave={handleSave} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

