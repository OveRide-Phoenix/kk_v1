import { Item, Combo, Addon, ItemType, Category } from "@/types/product";

export const sampleCategories: Category[] = [
  {
    id: 1,
    name: "South Indian",
    description: "Traditional South Indian dishes",
    itemCount: 5
  },
  {
    id: 2,
    name: "North Indian",
    description: "Traditional North Indian dishes",
    itemCount: 3
  }
];

export const sampleItems: Item[] = [
  {
    id: 1,
    name: "Rice",
    description: "Steamed rice",
    alias: "rice-350",
    categoryId: 1,
    uom: "Plate",
    weightFactor: 0.35,
    weightUom: "kg",
    itemType: ItemType.LUNCH,
    hsnCode: "1006",
    factor: 1,
    quantityPortion: 1,
    bufferPercentage: 10,
    pictureUrl: "/placeholder.svg",
    lunchPrice: 50,
    breakfastPrice: 0,
    dinnerPrice: 0,
    condimentsPrice: 0,
    festivalPrice: 0,
    cgst: 2.5,
    sgst: 2.5,
    igst: 0,
    netPrice: 55,
    isCombo: false,
    group: "Rice Items"
  },
  {
    id: 2,
    name: "South Indian Thali",
    description: "Complete meal with rice and sides",
    alias: "si-thali",
    categoryId: 1,
    uom: "Plate",
    weightFactor: 0.8,
    weightUom: "kg",
    itemType: ItemType.LUNCH,
    hsnCode: "1006",
    factor: 1,
    quantityPortion: 1,
    bufferPercentage: 15,
    pictureUrl: "/placeholder.svg",
    lunchPrice: 150,
    breakfastPrice: 0,
    dinnerPrice: 150,
    condimentsPrice: 0,
    festivalPrice: 180,
    cgst: 2.5,
    sgst: 2.5,
    igst: 0,
    netPrice: 165,
    isCombo: true,
    group: "Thali"
  }
];

export const sampleCombos: Combo[] = [
  {
    id: 1,
    comboItemId: 2,
    comboName: "South Indian Thali",
    price: 150,
    description: "Complete meal with rice and sides",
    includedItems: [
      { itemId: 1, quantity: 1, name: "Rice" },
      { categoryId: 1, quantity: 2, name: "Curry" },
      { itemId: 3, quantity: 1, name: "Papad" }
    ]
  }
];

export const sampleAddons: Addon[] = [
  {
    id: 1,
    mainItemId: 2,
    mainItemName: "South Indian Thali",
    addOnItemId: 3,
    addOnItemName: "Extra Papad",
    isMandatory: false,
    maxQuantity: 2,
    price: 10
  },
  {
    id: 2,
    mainItemId: 2,
    mainItemName: "South Indian Thali",
    addOnItemId: 4,
    addOnItemName: "Extra Rice",
    isMandatory: false,
    maxQuantity: 1,
    price: 25
  }
];