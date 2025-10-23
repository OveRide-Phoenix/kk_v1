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
  available_quantity: number;
  buffer_quantity?: number;
  final_quantity?: number;
  buffer_percentage?: number;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Condiments';
}

export interface ProductionPlanStatus {
  date: string;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Condiments';
  is_generated: boolean;
}

export const mockOrders: ProductionItem[] = [
 
];

export const mockPublishedMenus: PublishedMenuItem[] = [

];

export const mockProductionPlanStatus: ProductionPlanStatus[] = [
  { date: '2024-11-18', category: 'Breakfast', is_generated: true },
  { date: '2024-11-18', category: 'Lunch', is_generated: false },
  { date: '2024-11-18', category: 'Dinner', is_generated: false },
  { date: '2024-11-18', category: 'Condiments', is_generated: true },
  { date: '2024-11-19', category: 'Breakfast', is_generated: false },
  { date: '2024-11-19', category: 'Lunch', is_generated: false },
  { date: '2024-11-19', category: 'Dinner', is_generated: false },
  { date: '2024-11-19', category: 'Condiments', is_generated: false },
];
