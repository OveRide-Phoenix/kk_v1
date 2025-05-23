export enum ProductType {
  BREAKFAST = "BREAKFAST",
  LUNCH = "LUNCH",
  DINNER = "DINNER",
  SNACK = "SNACK",
  CONDIMENTS = "CONDIMENTS",
  OTHER = "OTHER"
}

export enum ItemType {
  BREAKFAST = "Breakfast",
  LUNCH = "Lunch",
  DINNER = "Dinner",
  SNACK = "Snack",
  CONDIMENTS = "Condiments",
  OTHER = "Other"
}

// Item product from items table
export interface Product {
  isSubItem: any
  id: any
  group: string
  item_id: number
  name: string
  description?: string
  alias?: string
  category_id: number
  category_name: string
  uom: string
  weight_factor?: number
  weight_uom?: string
  item_type: ItemType | string
  hsn_code?: string
  factor?: number
  quantity_portion?: number
  buffer_percentage?: number
  picture_url?: string
  breakfast_price?: number
  lunch_price?: number
  dinner_price?: number
  condiments_price?: number
  festival_price?: number
  cgst?: number
  sgst?: number
  igst?: number
  net_price?: number
  is_combo: boolean
}

// Combo product from item_combos table
export interface ComboProduct {
  combo_id: number
  combo_item_id: number
  combo_name: string | null
  included_category_id: number | null
  included_item_id: number | null
  quantity: number
}

// Addon product from item_add_ons
export interface AddonProduct {
  add_on_id: number
  main_item_name: string
  add_on_item_name: string
  is_mandatory: boolean
  max_quantity: number
}

// Category product from categories
export interface CategoryProduct {
  category_id: number
  category_name: string
}

// Category base type
export interface Category {
  id: number
  name: string
  description?: string
  itemCount?: number
}

// Item base type (used internally)
export interface Item {
  id: number
  name: string
  description?: string
  alias?: string
  categoryId?: number
  uom: string
  weightFactor?: number
  weightUom?: string
  itemType: ItemType
  hsnCode?: string
  factor?: number
  quantityPortion?: number
  bufferPercentage?: number
  pictureUrl?: string
  breakfastPrice?: number
  lunchPrice?: number
  dinnerPrice?: number
  condimentsPrice?: number
  festivalPrice?: number
  cgst?: number
  sgst?: number
  igst?: number
  netPrice?: number
  isCombo: boolean
  group?: string
}

// Combo detailed structure for editing
export interface Combo {
  id: number
  comboItemId: number
  comboName: string
  price?: number
  description?: string
  includedItems: Array<{
    itemId?: number
    categoryId?: number
    quantity: number
    name: string
  }>
}

// Add-on detailed structure for editing
export interface Addon {
  id: number
  mainItemId: number
  mainItemName: string
  addOnItemId: number
  addOnItemName: string
  isMandatory: boolean
  maxQuantity: number
  price?: number
}