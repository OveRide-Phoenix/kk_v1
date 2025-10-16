export interface ProductionItem {
  item_name: string;
  unit: string;
  quantity: number;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Condiments';
  is_combo?: boolean;
  combo_items?: { item_name: string; quantity: number; unit?: string }[];
}

export interface PublishedMenuItem {
  date: string;
  item_name: string;
  unit: string;
  planned_quantity: number;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Condiments';
}

export const mockOrders: ProductionItem[] = [
  { item_name: 'Idli', unit: 'Nos', quantity: 120, category: 'Breakfast' },
  { item_name: 'Vada', unit: 'Nos', quantity: 60, category: 'Breakfast' },
  { item_name: 'Breakfast Combo', unit: 'Nos', quantity: 25, category: 'Breakfast' },
  { item_name: 'Sambar', unit: 'Litre', quantity: 8, category: 'Condiments' },
  {
    item_name: 'Mini Meal Combo',
    unit: 'Combo',
    quantity: 40,
    category: 'Lunch',
    is_combo: true,
    combo_items: [
      { item_name: 'Rice', quantity: 1, unit: 'Portion' },
      { item_name: 'Sambar', quantity: 0.2, unit: 'Litre' },
      { item_name: 'Rasam', quantity: 0.1, unit: 'Litre' },
    ],
  },
];

export const mockPublishedMenus: PublishedMenuItem[] = [
  {
    date: '2024-11-18',
    item_name: 'Idli',
    unit: 'Nos',
    planned_quantity: 150,
    category: 'Breakfast',
  },
  {
    date: '2024-11-18',
    item_name: 'Vada',
    unit: 'Nos',
    planned_quantity: 80,
    category: 'Breakfast',
  },
  {
    date: '2024-11-18',
    item_name: 'Masala Dosa',
    unit: 'Nos',
    planned_quantity: 90,
    category: 'Breakfast',
  },
  {
    date: '2024-11-18',
    item_name: 'Mini Meal Combo',
    unit: 'Combo',
    planned_quantity: 50,
    category: 'Lunch',
  },
  {
    date: '2024-11-18',
    item_name: 'Rice',
    unit: 'Portion',
    planned_quantity: 200,
    category: 'Lunch',
  },
  {
    date: '2024-11-18',
    item_name: 'Sambar',
    unit: 'Litre',
    planned_quantity: 12,
    category: 'Condiments',
  },
  {
    date: '2024-11-18',
    item_name: 'Rasam',
    unit: 'Litre',
    planned_quantity: 10,
    category: 'Condiments',
  },
  {
    date: '2024-11-19',
    item_name: 'Poha',
    unit: 'Kg',
    planned_quantity: 6,
    category: 'Breakfast',
  },
  {
    date: '2024-11-19',
    item_name: 'Upma',
    unit: 'Kg',
    planned_quantity: 5,
    category: 'Breakfast',
  },
  {
    date: '2024-11-19',
    item_name: 'Veg Thali Combo',
    unit: 'Combo',
    planned_quantity: 60,
    category: 'Lunch',
  },
  {
    date: '2024-11-19',
    item_name: 'Curd',
    unit: 'Litre',
    planned_quantity: 8,
    category: 'Condiments',
  },
];
