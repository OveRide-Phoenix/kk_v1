// Item product from items table
export interface Product {
  isSubItem: boolean // Changed from any
  id: number | string // Changed from any
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
  bld_ids: number[]
  hsn_code?: string
  factor?: number
  quantity_portion?: number
  buffer_percentage?: number
  max_qty_breakfast?: number
  max_qty_lunch?: number
  max_qty_dinner?: number
  max_qty_condiments?: number
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
  is_condiment?: boolean
}

// Combo product from combos/combo_items tables
export interface ComboProduct {
  combo_id: number
  combo_name: string
  price: number
  category_id: number | null
  category_name?: string | null
  includedItems: Array<{
    itemId: number
    name?: string | null
    quantity: number
  }>
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
  hsnCode?: string
  factor?: number
  quantityPortion?: number
  bufferPercentage?: number
  maxQtyCondiments?: number
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
