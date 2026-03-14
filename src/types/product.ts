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
  component_type_id?: number | null
  component_type_name?: string | null
  uom_customer: string
  unit_packing?: number
  uom_packing?: string
  bld_ids: number[]
  hsn_code?: string
  uom_production?: string
  packing_to_production_rate?: number
  uom?: string
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
  bld_ids?: number[]
  includedItems: Array<{
    kind?: "item" | "type"
    itemId?: number | null
    componentTypeId?: number | null
    componentTypeName?: string | null
    name?: string | null
    quantity: number
  }>
}

export interface PlatedProduct {
  plated_item_id: number
  item_id: number
  name: string
  description?: string
  alias?: string
  category_id?: number | null
  category_name?: string | null
  component_type_id?: number | null
  component_type_name?: string | null
  uom_customer: string
  unit_packing?: number
  uom_packing?: string | null
  hsn_code?: string | null
  uom_production?: string | null
  packing_to_production_rate?: number | null
  buffer_percentage?: number | null
  max_qty_breakfast?: number | null
  max_qty_lunch?: number | null
  max_qty_dinner?: number | null
  max_qty_condiments?: number | null
  picture_url?: string | null
  breakfast_price?: number | null
  lunch_price?: number | null
  dinner_price?: number | null
  condiments_price?: number | null
  festival_price?: number | null
  cgst?: number | null
  sgst?: number | null
  igst?: number | null
  net_price?: number | null
  bld_ids?: number[]
  is_plated: boolean
  is_condiment?: boolean
  platedComponents: Array<{
    kind?: "item" | "type"
    itemId?: number | null
    componentTypeId?: number | null
    componentTypeName?: string | null
    name?: string | null
    quantity: number
    uomCustomer?: string | null
    unitPacking?: number | null
    uomPacking?: string | null
    uomProduction?: string | null
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

export interface ComponentTypeProduct {
  component_type_id: number
  name: string
  description?: string | null
  is_active?: boolean
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
  uomCustomer: string
  unitPacking?: number
  uomPacking?: string
  hsnCode?: string
  uomProduction?: string
  packingToProductionRate?: number
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
