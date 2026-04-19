
import { MenuItem, Ingredient, Staff, Supplier, Customer, AppSettings } from './types';

export const CURRENCY = 'ج.م';

export const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('ar-EG')} ${CURRENCY}`;
};

export const INITIAL_MENU: MenuItem[] = [
  { 
    id: '1', name: 'كفتة مشوية', price: 150, cost: 75, stock: 50, category: 'أطباق رئيسية', icon: 'Beef', 
    image: 'https://picsum.photos/seed/kebab/600/400', 
    description: 'كفتة لحم بلدي مشوية على الفحم' 
  },
  { 
    id: '2', name: 'أرز بسمتي', price: 40, cost: 15, stock: 100, category: 'أطباق رئيسية', icon: 'Wheat', 
    image: 'https://picsum.photos/seed/rice/600/400', 
    description: 'أرز بسمتي فاخر مطهو بالبهارات' 
  },
  { 
    id: '3', name: 'فتة مصرية', price: 180, cost: 90, stock: 30, category: 'أطباق رئيسية', icon: 'Soup', 
    image: 'https://picsum.photos/seed/fatteh/600/400', 
    description: 'لحم ضأن مع الأرز والصلصة' 
  },
  { 
    id: '4', name: 'سلطة خضراء', price: 25, cost: 10, stock: 60, category: 'مقبلات', icon: 'Salad', 
    image: 'https://picsum.photos/seed/salad/600/400', 
    description: 'خضروات طازجة' 
  },
  { 
    id: '6', name: 'كنافة بالمنجا', price: 60, cost: 25, stock: 40, category: 'حلويات', icon: 'Cake', 
    image: 'https://picsum.photos/seed/kunafa/600/400', 
    description: 'كنافة كريمة مع قطع المانجا' 
  },
  { 
    id: '7', name: 'عصير برتقال', price: 30, cost: 12, stock: 80, category: 'مشروبات', icon: 'CupSoda', 
    image: 'https://picsum.photos/seed/orange/600/400', 
    description: 'برتقال فريش' 
  },
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'i1', name: 'لحم بلدي', stock: 15.5, unit: 'كجم', minThreshold: 5, costPerUnit: 350, category: 'لحوم' },
  { id: 'i2', name: 'أرز بسمتي', stock: 4.0, unit: 'كجم', minThreshold: 10, costPerUnit: 60, category: 'حبوب' },
  { id: 'i3', name: 'زيت ذرة', stock: 22, unit: 'لتر', minThreshold: 5, costPerUnit: 80, category: 'زيوت' },
  { id: 'i4', name: 'سكر', stock: 50, unit: 'كجم', minThreshold: 15, costPerUnit: 30, category: 'بقالة' },
];

export const INITIAL_STAFF: Staff[] = [
  { id: 's1', name: 'أحمد علي', role: 'cashier', phone: '01012345678', email: 'ahmed@karm.com', shift: 'morning', salary: 5000, active: true, hireDate: '2023-01-15' },
  { id: 's2', name: 'محمود حسن', role: 'chef', phone: '01122334455', email: 'mahmoud@karm.com', shift: 'morning', salary: 8000, active: true, hireDate: '2022-11-10' },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'sup1', name: 'شركة النور للمواد الغذائية', contactPerson: 'الأستاذ إبراهيم', phone: '01234567890', email: 'info@alnoor.com', category: 'خضروات ولحوم' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'محمد خالد', phone: '01555667788', email: 'm.khaled@gmail.com', loyaltyPoints: 250, loyaltyTier: 'silver', totalSpent: 1250, totalOrders: 8 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  restaurantName: 'قصر الكرم',
  restaurantTaxNumber: '123-456-789',
  restaurantAddress: 'القاهرة، المعادي، شارع 9',
  restaurantPhone: '01009988776',
  restaurantEmail: 'contact@alkarm-palace.com',
  vatRate: 15,
  lowStockThreshold: 10,
  pointsPerUnit: 1
};
