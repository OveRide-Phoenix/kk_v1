export interface Customer {
  name: string
  referredBy?: string
  primaryMobile: string
  alternativeMobile?: string
  email?: string
  recipientName: string
  paymentFrequency: "Daily" | "Weekly" | "Monthly"
  
  addressType: "Home" | "Work" | "Other"
  houseApartmentNo: string
  writtenAddress: string
  city: string
  pinCode: string
  latitude: number | null
  longitude: number | null
  
  routeAssignment?: string
}