
export type Category = 'الكل' | 'أطباق رئيسية' | 'مقبلات' | 'حلويات' | 'مشروبات';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  icon: string;
  image: string;
  description: string;
  cost?: number; // Added cost for profit analysis
  stock: number; // For basic inventory
}

export interface OrderItem extends MenuItem {
  quantity: number;
  modifications: string;
}

export interface Order {
  id: string;
  orderNumber: number; // Added incremental order number
  items: OrderItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  paymentMethod: 'cash' | 'online';
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  cashierName?: string;
  tableNumber?: string;
  createdAt: string;
  notes?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minThreshold: number;
  costPerUnit: number;
  category: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'cashier' | 'waiter' | 'chef' | 'manager';
  phone: string;
  email: string;
  shift: 'morning' | 'afternoon' | 'night';
  salary: number;
  active: boolean;
  hireDate: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  taxNumber?: string;
  address?: string;
}

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  dateTime: string;
  partySize: number;
  tableNumber: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  totalOrders: number;
}

export interface AppSettings {
  restaurantName: string;
  restaurantTaxNumber: string;
  restaurantAddress: string;
  restaurantPhone: string;
  restaurantEmail: string;
  vatRate: number;
  lowStockThreshold: number;
  pointsPerUnit: number;
}
