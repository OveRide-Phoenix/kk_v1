export enum ProductType {
  BREAKFAST = "Breakfast",
  LUNCH = "Lunch",
  DINNER = "Dinner",
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  alias: string
  isSubItem: boolean
  isCombo: boolean
  itemType: ProductType
  group: string
  uom: string
  weightFactor: number
  weightUom: string
  hsnCode: string
  factor: number
  quantityPortion: string
  bufferPercentage: number
  image: string
}

