export enum ProductType {
  BREAKFAST = "Breakfast",
  LUNCH = "Lunch",
  DINNER = "Dinner",
}

export interface Product {
  addonItemName: any;
  maxQuantity: any;
  isMandatory: any;
  mainItemName: any;
  id: string;
  name: string;
  description: string;
  price: number;
  alias: string;
  isSubItem: boolean;
  isCombo: boolean;
  itemType: ProductType;
  group: string;
  uom: string;
  weightFactor: number;
  weightUom: string;
  hsnCode: string;
  factor: number;
  quantityPortion: string;
  bufferPercentage: number;
  image: string;
  items?: Array<{  // Optional property for combo products
    name: string;
    quantity: number;
  }>;
}

export interface ComboProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  includedItems: Array<{
    name: string;
    quantity: number;
    isCategory?: boolean;
  }>;
  itemType: string;
}

export interface AddOnProduct {
  id: string;
  mainItem: string;
  addOnItem: string;
  isMandatory: boolean;
  maxQuantity: number;
  price: number;
}

export interface CategoryProduct {
  id: string;
  name: string;
  description: string;
  itemCount?: number;
}

export enum ItemType {
  BREAKFAST = "Breakfast",
  LUNCH = "Lunch",
  DINNER = "Dinner",
  CONDIMENTS = "Condiments"
}

// Basic category type
export interface Category {
  id: number;
  name: string;
  description?: string;
  itemCount?: number;
}

// Basic item type
export interface Item {
  id: number;
  name: string;
  description?: string;
  alias?: string;
  categoryId?: number;
  uom: string;
  weightFactor?: number;
  weightUom?: string;
  itemType: ItemType;
  hsnCode?: string;
  factor?: number;
  quantityPortion?: number;
  bufferPercentage?: number;
  pictureUrl?: string;
  breakfastPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
  condimentsPrice?: number;
  festivalPrice?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  netPrice?: number;
  isCombo: boolean;
  group?: string;
}

// Combo type
export interface Combo {
  id: number;
  comboItemId: number;
  comboName: string;
  price?: number;
  description?: string;
  includedItems: Array<{
    itemId?: number;
    categoryId?: number;
    quantity: number;
    name: string;
  }>;
}

// Add-on type
export interface Addon {
  id: number;
  mainItemId: number;
  mainItemName: string;
  addOnItemId: number;
  addOnItemName: string;
  isMandatory: boolean;
  maxQuantity: number;
  price?: number;
}

