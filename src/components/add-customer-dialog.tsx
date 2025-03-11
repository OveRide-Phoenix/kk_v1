"use client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, ControllerRenderProps } from "react-hook-form"
import * as z from "zod"

const formSchema = z.object({
  referredBy: z.string().optional(),
  primaryMobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  alternativeMobile: z.string().optional(),
  customerName: z.string().min(2, "Customer name is required"),
  receiverName: z.string().min(2, "Receiver name is required"),
  addressType: z.string().min(1, "Address type is required"),
  houseApartment: z.string().optional(),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  pinCode: z.string().min(6, "Pin code must be at least 6 digits"),
  customerType: z.string().min(1, "Customer type is required"),
  paymentFrequency: z.string().min(1, "Payment frequency is required"),
  routeAssignment: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
})

type CustomerFormValues = z.infer<typeof formSchema>

interface AddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCustomerDialog({ open, onOpenChange }: AddCustomerDialogProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      referredBy: "",
      primaryMobile: "",
      alternativeMobile: "",
      customerName: "",
      receiverName: "",
      addressType: "HOME",
      houseApartment: "",
      address: "",
      city: "",
      pinCode: "",
      customerType: "Regular",
      paymentFrequency: "Daily",
      routeAssignment: "",
      email: "",
    },
  })

  function onSubmit(values: CustomerFormValues) {
    console.log(values)
    alert("Customer added successfully!")
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>Enter the customer details to add them to your database.</DialogDescription>
        </DialogHeader>

        <FormField
              control={form.control}
              name="customerName"
              render={({ field }: { field: ControllerRenderProps<CustomerFormValues, "customerName"> }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Referral Information */}
            <FormField
              control={form.control}
              name="referredBy"
              render={({ field }: { field: ControllerRenderProps<CustomerFormValues, "referredBy"> }) => (
                <FormItem>
                  <FormLabel>Referred By (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter referrer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Information */}
            <FormField
              control={form.control}
              name="primaryMobile"
              render={({ field }: { field: ControllerRenderProps<CustomerFormValues, "primaryMobile"> }) => (
                <FormItem>
                  <FormLabel>Primary Mobile Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter mobile number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="alternativeMobile"
              render={({ field }: { field: ControllerRenderProps<CustomerFormValues, "alternativeMobile"> }) => (
                <FormItem>
                  <FormLabel>Alternative Mobile (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter alternative number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Delivery Information */}
            <FormField
              control={form.control}
              name="receiverName"
              render={({ field }: { field: ControllerRenderProps<CustomerFormValues, "receiverName"> }) => (
                <FormItem>
                  <FormLabel>Deliver To / Food Receiver Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter receiver name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressType"
              render={({ field }: { field: ControllerRenderProps<CustomerFormValues, "addressType"> }) => (
                <FormItem>
                  <FormLabel>Address Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select address type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="HOME">HOME</SelectItem>
                      <SelectItem value="WORK">WORK</SelectItem>
                      <SelectItem value="OTHER">OTHER</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Details */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }: { field: ControllerRenderProps<CustomerFormValues, "address"> }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Settings */}
            <FormField
              control={form.control}
              name="customerType"
              render={({ field }: { field: ControllerRenderProps<CustomerFormValues, "customerType"> }) => (
                <FormItem>
                  <FormLabel>Customer Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Reseller">Reseller (15% discount on condiments)</SelectItem>
                      <SelectItem value="Agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Customer</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
