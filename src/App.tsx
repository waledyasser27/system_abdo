/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  Plus, 
  Minus, 
  X, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Package, 
  Users, 
  LayoutDashboard,
  ShoppingCart,
  Search,
  Beef,
  Wheat,
  Soup,
  Salad,
  Cake,
  CupSoda,
  Drumstick,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  Printer,
  AlertTriangle,
  Settings2,
  User,
  Phone,
  MapPin,
  Briefcase,
  Truck,
  Calendar,
  Star,
  FileBarChart,
  Crown,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  deleteDoc,
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, signInWithGoogle, testFirestoreConnection } from './lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { 
  MenuItem, 
  Order, 
  OrderItem, 
  Category, 
  Ingredient, 
  Staff, 
  Supplier, 
  Reservation, 
  Customer, 
  AppSettings 
} from './types';
import { 
  INITIAL_MENU, 
  INITIAL_INGREDIENTS, 
  INITIAL_STAFF, 
  INITIAL_SUPPLIERS, 
  INITIAL_CUSTOMERS, 
  DEFAULT_SETTINGS, 
  formatCurrency 
} from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Icon Map for Menu Items
const IconMap: Record<string, React.ReactNode> = {
  Beef: <Beef className="w-8 h-8" />,
  Wheat: <Wheat className="w-8 h-8" />,
  Soup: <Soup className="w-8 h-8" />,
  Salad: <Salad className="w-8 h-8" />,
  Cake: <Cake className="w-8 h-8" />,
  CupSoda: <CupSoda className="w-8 h-8" />,
  Drumstick: <Drumstick className="w-8 h-8" />,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'orders' | 'inventory' | 'staff' | 'suppliers' | 'customers' | 'reservations' | 'settings' | 'reports'>('menu');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Category>('الكل');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [receiptToShow, setReceiptToShow] = useState<{ order: Order; type: 'customer' | 'kitchen' } | null>(null);
  
  // Modal States
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);

  const [orderStatusFilter, setOrderStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<'cash' | 'online' | 'all'>('all');

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const updateStaffStatus = (id: string, active: boolean) => {
    updateDoc(doc(db, 'staff', id), { active }).catch(err => console.error("Update staff error:", err));
  };
  const updateSettings = (partial: Partial<AppSettings>) => {
    setDoc(doc(db, 'settings', 'config'), { ...settings, ...partial }, { merge: true }).catch(err => console.error("Update settings error:", err));
  };

  // Firebase Real-time Synchronization
  useEffect(() => {
    testFirestoreConnection();
    
    // Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    // Public Listeners (Always active)
    const sub_menu = onSnapshot(collection(db, 'menu'), (snap) => {
      const items = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem));
      if (items.length > 0) setMenuItems(items);
    });

    const sub_settings = onSnapshot(doc(db, 'settings', 'config'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as AppSettings);
    });

    return () => {
      unsubscribeAuth();
      sub_menu();
      sub_settings();
    };
  }, []);

  // Protected Listeners (Active only when user is signed in)
  useEffect(() => {
    if (!user) {
      setOrders([]);
      setStaff([]);
      setCustomers([]);
      setReservations([]);
      setSuppliers([]);
      return;
    }

    const sub_orders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
      setOrders(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
    });

    const sub_staff = onSnapshot(collection(db, 'staff'), (snap) => {
      setStaff(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Staff)));
    });

    const sub_customers = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
    });

    const sub_reservations = onSnapshot(collection(db, 'reservations'), (snap) => {
      setReservations(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation)));
    });

    const sub_suppliers = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Supplier)));
    });

    return () => {
      sub_orders();
      sub_staff();
      sub_customers();
      sub_reservations();
      sub_suppliers();
    };
  }, [user]);

  // Update Item Price logic for Firebase
  const updateItemPrice = (id: string, newPrice: number) => {
    updateDoc(doc(db, 'menu', id), { price: newPrice }).catch(err => console.error("Update price error:", err));
  };

  const updateIngredientStock = (id: string, newStock: number) => {
    const stockVal = isNaN(newStock) ? 0 : Math.max(0, newStock);
    updateDoc(doc(db, 'inventory', id), { stock: stockVal }).catch(err => console.error("Update stock error:", err));
  };

  const printReceipt = () => {
    const printContent = document.querySelector('.receipt-print-area');
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>طباعة الفاتورة - وجبتي</title>
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 20px;
                direction: rtl;
                color: #333;
              }
              .receipt-print-area { width: 100%; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
              th, td { padding: 10px; border-bottom: 1px dashed #eee; text-align: right; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .text-2xl { font-size: 1.5rem; }
              .text-3xl { font-size: 1.875rem; }
              .text-xs { font-size: 0.75rem; }
              .text-sm { font-size: 0.875rem; }
              .text-lg { font-size: 1.125rem; }
              .opacity-60 { opacity: 0.6; }
              .opacity-40 { opacity: 0.4; }
              .border-t-2 { border-top-width: 2px; }
              .border-b-2 { border-bottom-width: 2px; }
              .border-dashed { border-style: dashed; }
              .border-neutral-200 { border-color: #e5e5e5; }
              .pt-4 { padding-top: 1rem; }
              .pt-8 { padding-top: 2rem; }
              .mt-4 { margin-top: 1rem; }
              .space-y-4 > * + * { margin-top: 1rem; }
              .space-y-2 > * + * { margin-top: 0.5rem; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .flex-col { flex-direction: column; }
              .items-center { align-items: center; }
              .gap-2 { gap: 0.5rem; }
              .bg-[#FF6B35], .text-[#FF6B35] { color: #FF6B35; }
              .w-16 { width: 4rem; }
              .h-16 { height: 4rem; }
              .rounded-2xl { border-radius: 1rem; }
              /* Specific styles for kitchen receipt */
              .bg-neutral-900 { background: #171717; color: #fff; padding: 20px; border-radius: 15px; }
              .bg-orange-50 { background: #fff7ed; padding: 15px; border-radius: 10px; border: 1px solid #ffedd5; }
              .text-white { color: #fff; }
              .w-10 { width: 2.5rem; }
              .h-10 { height: 2.5rem; }
              .rounded-full { border-radius: 9999px; }
              .justify-center { justify-content: center; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="receipt-print-area">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = function() {
                window.focus();
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const addToCart = (item: MenuItem, modifications: string = '') => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.modifications === modifications);
      if (existing) {
        return prev.map(i => (i.id === item.id && i.modifications === modifications) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, modifications }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const updateModification = (id: string, text: string) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, modifications: text } : i));
  };

  // Calculations
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const placeOrder = () => {
    if (cart.length === 0) return;
    
    const subtotal = cartTotal;
    const vatAmount = 0; // Tax removed as requested
    const total = subtotal;

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      orderNumber: (orders.length > 0 ? Math.max(...orders.map(o => o.orderNumber)) : 1000) + 1,
      items: [...cart],
      subtotal,
      vatAmount,
      total,
      status: 'pending',
      paymentMethod: paymentMethod,
      customerName: customerName,
      customerPhone: customerPhone,
      deliveryAddress: deliveryAddress,
      createdAt: new Date().toISOString(),
    };

    addDoc(collection(db, 'orders'), newOrder).then(() => {
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setActiveTab('orders');
    }).catch(err => console.error("Place order Firebase error:", err));
    
    // Update customer loyalty in Firebase
    if (customerPhone) {
      const existingCustomer = customers.find(c => c.phone === customerPhone);
      if (existingCustomer) {
        updateDoc(doc(db, 'customers', existingCustomer.id), {
          loyaltyPoints: existingCustomer.loyaltyPoints + Math.floor(total * settings.pointsPerUnit),
          totalSpent: existingCustomer.totalSpent + total,
          totalOrders: existingCustomer.totalOrders + 1
        });
      } else {
        const newCust: Customer = {
          id: Math.random().toString(36).substr(2, 9),
          name: customerName || 'عميل جديد',
          phone: customerPhone,
          email: '',
          loyaltyPoints: Math.floor(total * settings.pointsPerUnit),
          loyaltyTier: 'bronze',
          totalSpent: total,
          totalOrders: 1
        };
        setDoc(doc(db, 'customers', newCust.id), newCust);
      }
    }
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    updateDoc(doc(db, 'orders', orderId), { status }).catch(err => console.error("Update status error:", err));
  };

  const addStaffMember = (newStaff: Partial<Staff>) => {
    addDoc(collection(db, 'staff'), {
      ...newStaff,
      active: true,
      joinDate: new Date().toISOString()
    }).then(() => setShowStaffModal(false)).catch(err => console.error("Add staff error:", err));
  };

  const addMenuItem = (item: Partial<MenuItem>) => {
    addDoc(collection(db, 'menu'), {
      ...item,
      stock: 100 // Default stock
    }).then(() => setShowMenuModal(false)).catch(err => console.error("Add menu error:", err));
  };

  const addSupplier = (supplier: Partial<Supplier>) => {
    addDoc(collection(db, 'suppliers'), {
      ...supplier,
      active: true
    }).then(() => setShowSupplierModal(false)).catch(err => console.error("Add supplier error:", err));
  };

  const addIngredient = (ing: Partial<Ingredient>) => {
    addDoc(collection(db, 'inventory'), {
      ...ing,
      lastUpdated: new Date().toISOString()
    }).then(() => setShowInventoryModal(false)).catch(err => console.error("Add inventory error:", err));
  };

  const addReservation = (res: Partial<Reservation>) => {
    addDoc(collection(db, 'reservations'), {
      ...res,
      status: 'confirmed'
    }).then(() => setShowReservationModal(false)).catch(err => console.error("Add reservation error:", err));
  };

  const deleteOrder = (id: string) => {
    deleteDoc(doc(db, 'orders', id)).catch(err => console.error("Delete order error:", err));
  };

  const deleteMenuItem = (id: string) => {
    if(confirm('هل أنت متأكد من حذف هذا الصنف من القائمة؟')) {
      deleteDoc(doc(db, 'menu', id)).catch(err => console.error("Delete menu error:", err));
    }
  };

  const deleteStaff = (id: string) => {
    if(confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
      deleteDoc(doc(db, 'staff', id)).catch(err => console.error("Delete staff error:", err));
    }
  };

  const deleteSupplier = (id: string) => {
    if(confirm('هل أنت متأكد من حذف هذا المورد؟')) {
      deleteDoc(doc(db, 'suppliers', id)).catch(err => console.error("Delete supplier error:", err));
    }
  };

  const deleteInventory = (id: string) => {
    if(confirm('هل أنت متأكد من حذف هذه المادة؟')) {
      deleteDoc(doc(db, 'inventory', id)).catch(err => console.error("Delete inventory error:", err));
    }
  };

  const deleteReservation = (id: string) => {
    if(confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) {
      deleteDoc(doc(db, 'reservations', id)).catch(err => console.error("Delete reservation error:", err));
    }
  };

  // Analytics Calculations
  const filteredReportsOrders = orders.filter(o => {
    const date = new Date(o.createdAt).toISOString().split('T')[0];
    return date >= startDate && date <= endDate;
  });

  const dailyStats = filteredReportsOrders.reduce((acc, order) => {
    const day = new Date(order.createdAt).toLocaleDateString('ar-EG', { weekday: 'long' });
    acc[day] = (acc[day] || 0) + order.total;
    return acc;
  }, {} as Record<string, number>);

  const dynamicWeeklyData = [
    'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'
  ].map(name => ({
    name,
    sales: dailyStats[name] || 0
  }));

  const itemSales = filteredReportsOrders.flatMap(o => o.items).reduce((acc, item) => {
    acc[item.name] = (acc[item.name] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  const dynamicTopSoldData = Object.entries(itemSales)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const totalSales = filteredReportsOrders.reduce((sum, o) => sum + o.total, 0);
  const totalTax = filteredReportsOrders.reduce((sum, o) => sum + o.vatAmount, 0);
  const totalProfit = filteredReportsOrders.reduce((sum, o) => {
    const cost = o.items.reduce((s, i) => s + (i.cost || 0) * i.quantity, 0);
    return sum + (o.total - cost - o.vatAmount);
  }, 0);

  // Dashboard specific (Last 7 days)
  const dashboardOrders = orders.filter(o => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return new Date(o.createdAt).getTime() >= d.getTime();
  });

  const dashboardWeeklyStats = dashboardOrders.reduce((acc, order) => {
    const day = new Date(order.createdAt).toLocaleDateString('ar-EG', { weekday: 'long' });
    acc[day] = (acc[day] || 0) + order.total;
    return acc;
  }, {} as Record<string, number>);

  const dashboardWeeklyData = [
    'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'
  ].map(name => ({
    name,
    sales: dashboardWeeklyStats[name] || 0
  }));

  const dashboardItemSales = dashboardOrders.flatMap(o => o.items).reduce((acc, item) => {
    acc[item.name] = (acc[item.name] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  const dashboardTopSoldData = Object.entries(dashboardItemSales)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = filter === 'الكل' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--vibrant-bg)] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="text-[#FF6B35]">
          <Clock size={48} />
        </motion.div>
      </div>
    );
  }

  const isManagementTab = ['dashboard', 'orders', 'inventory', 'staff', 'suppliers', 'customers', 'reservations', 'settings', 'reports'].includes(activeTab);

  return (
    <div className="min-h-screen bg-[var(--vibrant-bg)] text-[#333] font-sans flex flex-col" dir="rtl">
      {/* Login Guard Overlay for Management */}
      <AnimatePresence>
        {isManagementTab && !user && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[var(--vibrant-bg)] flex items-center justify-center p-6 text-center"
          >
            <div className="max-w-md w-full p-12 bg-white rounded-[60px] shadow-2xl border border-neutral-100">
               <ChefHat size={64} className="text-[#FF6B35] mx-auto mb-8" />
               <h2 className="text-3xl font-black mb-4">الدخول للإدارة</h2>
               <p className="text-neutral-500 font-bold mb-10">من فضلك قم بتسجيل الدخول للوصول إلى لوحة التحكم والبيانات الإدارية للمطعم</p>
               <button 
                 onClick={signInWithGoogle}
                 className="w-full bg-[#FF6B35] text-white py-5 rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl shadow-orange-100 hover:scale-105 active:scale-95 transition-all"
               >
                 <User size={24} /> تسجيل الدخول عبر جوجل
               </button>
               <button 
                 onClick={() => setActiveTab('menu')}
                 className="mt-6 text-neutral-400 font-bold hover:text-[#FF6B35] transition-colors"
               >
                 العودة للقائمة العامة
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="bg-[#FF6B35] text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <ChefHat size={32} className="text-[#FFD166]" />
             <h1 className="text-2xl font-black tracking-tighter uppercase">{settings.restaurantName} <span className="text-[10px] block opacity-50 font-black tracking-[0.2em] -mt-1 leading-none">Management System</span></h1>
          </div>

          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[60%]">
            <NavButton active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} icon={<ShoppingCart size={16} />} label="القائمة" />
            <NavButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<Receipt size={16} />} label="الطلبات" />
            <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={16} />} label="الإحصائيات" />
            <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={16} />} label="المخزون" />
            <NavButton active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={<Briefcase size={16} />} label="الموظفون" />
            <NavButton active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={16} />} label="العملاء" />
            <NavButton active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} icon={<Truck size={16} />} label="الموردون" />
            <NavButton active={activeTab === 'reservations'} onClick={() => setActiveTab('reservations')} icon={<Calendar size={16} />} label="الحجوزات" />
            <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileBarChart size={16} />} label="التقارير" />
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings2 size={16} />} label="الإعدادات" />
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-bold">{user.displayName}</p>
                  <button onClick={() => auth.signOut()} className="text-[10px] opacity-80 uppercase tracking-widest text-[#FFD166] hover:underline">تسجيل خروج</button>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden shadow-sm">
                   <img src={user.photoURL || 'https://picsum.photos/seed/user/100/100'} alt="Avatar" referrerPolicy="no-referrer" />
                </div>
              </>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border border-white/20"
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Menu Section */}
              <div className="lg:col-span-8 bg-white rounded-[20px] p-6 shadow-xl shadow-black/5 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="section-title-accent text-xl font-bold text-[#FF6B35]">قائمة الوجبات الرئيسية</h2>
                    {user && (
                      <button 
                        onClick={() => setShowMenuModal(true)}
                        className="bg-[#FF6B35] text-white p-2 rounded-xl shadow-lg shadow-orange-100 hover:scale-105 transition-transform"
                      >
                        <Plus size={20} />
                      </button>
                    )}
                  </div>
                  
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="ابحث..." 
                      className="w-full pr-10 pl-3 py-2 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-2 focus:ring-[#FF6B35] outline-none transition-all text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                  {(['الكل', 'أطباق رئيسية', 'مقبلات', 'حلويات', 'مشروبات'] as Category[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={cn(
                        "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                        filter === cat 
                          ? "bg-[#FF6B35] text-white border-[#FF6B35] shadow-md shadow-orange-100" 
                          : "bg-white text-neutral-600 border-neutral-200 hover:border-orange-200"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative group/carousel">
                  <div 
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-6 px-1 py-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
                  >
                    {filteredItems.map((item) => (
                      <div key={item.id} className="snap-start relative group/card">
                        <MenuCard 
                          item={item} 
                          onAdd={(mods) => addToCart(item, mods)} 
                          onUpdatePrice={(newPrice) => updateItemPrice(item.id, newPrice)}
                          onDelete={deleteMenuItem}
                          showAdminControls={!!user}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Carousel Buttons */}
                  <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={() => scroll('right')}
                      className="bg-white p-3 rounded-full shadow-lg text-[#FF6B35] border border-neutral-100 hover:bg-[#FF6B35] hover:text-white transition-all transform hover:scale-110 active:scale-95"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <div className="absolute top-1/2 -left-4 -translate-y-1/2 opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={() => scroll('left')}
                      className="bg-white p-3 rounded-full shadow-lg text-[#FF6B35] border border-neutral-100 hover:bg-[#FF6B35] hover:text-white transition-all transform hover:scale-110 active:scale-95"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-4">
                     <div className="bg-[#FF6B35]/20 px-4 py-1.5 rounded-full flex items-center gap-2">
                        <ArrowRight size={14} className="text-[#FF6B35] animate-pulse" />
                        <span className="text-[10px] font-bold text-[#FF6B35]">اسحب لليسار لتصفح المزيد</span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Order/Cart Sidebar */}
              <div className="lg:col-span-4 bg-white rounded-[20px] p-6 shadow-xl shadow-black/5 flex flex-col max-h-[calc(100vh-140px)]">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#FF6B35]">سلة الطلبات</h2>
                  <span className="bg-[#FF6B35] text-white text-[10px] font-bold px-2 py-1 rounded-full">{cart.length} أصناف</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                  {cart.length === 0 ? (
                    <div className="text-center py-20 text-neutral-300">
                      <ShoppingCart size={48} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs font-medium border-t border-dashed border-neutral-200 pt-4">السلة فارغة حالياً</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-bold">{item.name}</h3>
                          <button onClick={() => removeFromCart(item.id)} className="text-neutral-300 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#FF6B35]">{formatCurrency(item.price)}</span>
                          <div className="flex items-center bg-white border border-neutral-100 rounded-lg overflow-hidden">
                            <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 hover:bg-neutral-50 text-neutral-400">
                              <Minus size={12} />
                            </button>
                            <span className="px-2 text-xs font-bold min-w-[20px] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 hover:bg-neutral-50 text-neutral-400">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        
                        <textarea 
                          placeholder="اكتب تعديلات إضافية هنا..." 
                          className="w-full text-[10px] p-2 bg-white border border-neutral-200 rounded-lg focus:ring-1 focus:ring-[#FF6B35] outline-none min-h-[60px] resize-none"
                          value={item.modifications}
                          onChange={(e) => updateModification(item.id, e.target.value)}
                        />
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 pt-5 border-t-2 border-dashed border-neutral-100">
                  <div className="space-y-4 mb-6">
                    <p className="text-xs font-bold text-neutral-400 uppercase text-right">بيانات العميل:</p>
                    <div className="space-y-2">
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="اسم العميل" 
                          className="w-full pr-9 pl-3 py-2 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-1 focus:ring-[#FF6B35] outline-none text-xs text-right"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="رقم الهاتف" 
                          className="w-full pr-9 pl-3 py-2 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-1 focus:ring-[#FF6B35] outline-none text-xs text-right"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute right-3 top-3 text-neutral-400" size={14} />
                        <textarea 
                          placeholder="عنوان التوصيل" 
                          className="w-full pr-9 pl-3 py-2 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-1 focus:ring-[#FF6B35] outline-none text-xs text-right min-h-[60px] resize-none"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-bold text-neutral-400 uppercase mb-3 text-right">طريقة الدفع:</p>
                    <div className="grid grid-cols-1 gap-2">
                       <button 
                         className="flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold border border-[#FF6B35] bg-orange-50 text-[#FF6B35] transition-all"
                       >
                         <div className="w-3 h-3 rounded-full border border-[#FF6B35] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                         </div>
                         كاش عند الاستلام
                       </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mb-4">
                    <span className="text-sm font-bold text-neutral-500">إجمالي الطلب:</span>
                    <span className="text-xl font-bold text-[#333]">{formatCurrency(cartTotal)}</span>
                  </div>

                  <button 
                    onClick={placeOrder}
                    disabled={cart.length === 0}
                    className="w-full bg-[#2ECC71] hover:bg-[#27ae60] disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                  >
                    تأكيد الطلب
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 text-right"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">إدارة الطلبات</h2>
                  <p className="text-neutral-500">تم رصد {orders.length} طلبات اليوم</p>
                </div>
                
                <div className="bg-white p-3 rounded-[24px] shadow-sm border border-neutral-100 flex flex-wrap items-center gap-4 justify-end">
                  <div className="flex items-center gap-2 border-l border-neutral-100 pl-4 h-full"> 
                    <span className="text-[10px] font-black text-neutral-400 uppercase">الدفع:</span>
                    <div className="flex bg-neutral-100 p-1 rounded-xl">
                      {(['all', 'cash', 'online'] as const).map(method => (
                        <button
                          key={method}
                          onClick={() => setOrderPaymentFilter(method)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                            orderPaymentFilter === method ? "bg-white text-blue-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                          )}
                        >
                          {method === 'all' ? 'الكل' : method === 'cash' ? 'كاش' : 'أونلاين'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-neutral-400 uppercase">الحالة:</span>
                    <div className="flex bg-neutral-100 p-1 rounded-xl flex-wrap gap-1">
                      {(['all', 'pending', 'preparing', 'ready', 'delivered'] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => setOrderStatusFilter(status)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                            orderStatusFilter === status ? "bg-white text-orange-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                          )}
                        >
                          {status === 'all' ? 'الكل' : 
                           status === 'pending' ? 'انتظار' : 
                           status === 'preparing' ? 'تجهيز' : 
                           status === 'ready' ? 'جاهز' : 'تم التسليم'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orders
                  .filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter)
                  .filter(o => orderPaymentFilter === 'all' || o.paymentMethod === orderPaymentFilter)
                  .map((order) => (
                    <OrderCard 
                      key={order.id} 
                      order={order} 
                      onStatusChange={updateOrderStatus}
                      onDelete={deleteOrder}
                      onPrint={(type) => setReceiptToShow({ order, type })}
                    />
                  ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8 text-right"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-right">
                <StatCard 
                  title="إجمالي المبيعات" 
                  value={formatCurrency(orders.reduce((sum, o) => sum + o.total, 0))} 
                  change="+12%" 
                  icon={<TrendingUp size={24} />}
                  color="bg-[#FF6B35]"
                />
                <StatCard 
                  title="طلبات اليوم" 
                  value={orders.length.toString()} 
                  change="+5%" 
                  icon={<ShoppingCart size={24} />}
                  color="bg-blue-500"
                />
                <StatCard 
                  title="العملاء" 
                  value={customers.length.toString()} 
                  icon={<Users size={24} />}
                  color="bg-green-500"
                />
                <StatCard 
                  title="صافي الربح" 
                  value={formatCurrency(orders.reduce((s,o) => s + (o.total - (o.items.reduce((sum, i) => sum + (i.cost || 0) * i.quantity, 0))), 0))} 
                  icon={<Star size={24} />}
                  color="bg-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-xl shadow-black/5">
                  <h3 className="text-xl font-bold mb-8">مخطط المبيعات الأسبوعي</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboardWeeklyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                        <Line type="monotone" dataKey="sales" stroke="#FF6B35" strokeWidth={4} dot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-black/5 flex flex-col items-center">
                  <h3 className="text-xl font-bold mb-8 w-full">تحليل الأصناف</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardTopSoldData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dashboardTopSoldData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#FF6B35', '#2ECC71', '#3498DB', '#F1C40F'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-4 mt-4">
                    {dashboardTopSoldData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between">
                         <span className="text-xs font-black">{Math.round((Number(item.value) / Math.max(1, dashboardOrders.flatMap(o => o.items).length)) * 100) || 0}%</span>
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-neutral-500">{item.name}</span>
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#FF6B35', '#2ECC71', '#3498DB', '#F1C40F'][idx] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'staff' && (
            <motion.div key="staff" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-right">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black">إدارة فريق العمل</h2>
                <button 
                  onClick={() => setShowStaffModal(true)}
                  className="bg-[#FF6B35] text-white px-5 py-2 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-orange-100"
                >
                  <Plus size={18} /> إضافة موظف
                </button>
              </div>
              <div className="bg-white rounded-[32px] shadow-xl overflow-hidden border border-neutral-100">
                <table className="w-full text-right">
                  <thead className="bg-neutral-50 text-neutral-500 text-xs font-black border-b border-neutral-100">
                    <tr>
                      <th className="px-8 py-5">الاسم</th>
                      <th className="px-8 py-5">الدور الوظيفي</th>
                      <th className="px-8 py-5">رقم الهاتف</th>
                      <th className="px-8 py-5">الوردية</th>
                      <th className="px-8 py-5">الحالة</th>
                      <th className="px-8 py-5 text-left">خيارات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {staff.map(member => ( member &&
                      <tr key={member.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-8 py-5 font-black text-[#333]">{member.name}</td>
                        <td className="px-8 py-5 text-xs font-bold text-neutral-500 truncate max-w-[120px]">{member.role === 'cashier' ? 'كاشير' : member.role === 'chef' ? 'شيف' : member.role}</td>
                        <td className="px-8 py-5 text-xs font-mono font-bold text-neutral-400">{member.phone}</td>
                        <td className="px-8 py-5 text-xs font-bold">{member.shift === 'morning' ? 'صباحية' : member.shift === 'afternoon' ? 'مسائية' : 'ليلية'}</td>
                        <td className="px-8 py-5">
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest", member.active ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100")}>
                            {member.active ? 'نشط' : 'متوقف'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-left">
                           <div className="flex items-center justify-end gap-2">
                             <button onClick={() => updateStaffStatus(member.id, !member.active)} className="text-[#FF6B35] text-[10px] font-black hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 transition-all">
                               تغيير الحالة
                             </button>
                             <button onClick={() => deleteStaff(member.id)} className="p-2 text-red-300 hover:text-red-600 transition-colors">
                               <Trash2 size={16} />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'customers' && (
            <motion.div key="customers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-right">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black">قاعدة بيانات العملاء</h2>
                <div className="bg-yellow-50 border border-yellow-100 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                  <Crown className="text-yellow-600" size={24} />
                  <div className="text-right">
                    <p className="text-[10px] text-yellow-600 font-black uppercase tracking-tight">العملاء المميزين</p>
                    <p className="text-xl font-black text-yellow-700 leading-none mt-0.5">{customers.filter(c => c.loyaltyTier !== 'bronze').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-[32px] shadow-xl overflow-hidden border border-neutral-100">
                <table className="w-full text-right">
                  <thead className="bg-neutral-50 text-neutral-500 text-xs font-black border-b border-neutral-100">
                    <tr>
                      <th className="px-8 py-5">العميل</th>
                      <th className="px-8 py-5">رقم الجوال</th>
                      <th className="px-8 py-5 text-center">المستوى</th>
                      <th className="px-8 py-5 text-center">النقاط</th>
                      <th className="px-8 py-5">إجمالي المشتريات</th>
                      <th className="px-8 py-5 text-left">الطلبات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-neutral-50 transition-all duration-300">
                        <td className="px-8 py-5 font-black text-neutral-700">{c.name}</td>
                        <td className="px-8 py-5 text-xs font-mono font-bold text-neutral-400">{c.phone}</td>
                        <td className="px-8 py-5 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest inline-block",
                            c.loyaltyTier === 'platinum' ? "bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm" :
                            c.loyaltyTier === 'gold' ? "bg-yellow-50 text-yellow-700 border-yellow-100 shadow-sm" :
                            c.loyaltyTier === 'silver' ? "bg-gray-50 text-gray-700 border-gray-100 shadow-sm" : "bg-orange-50 text-orange-700 border-orange-100 shadow-sm"
                          )}>
                            {c.loyaltyTier}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{c.loyaltyPoints}</span>
                        </td>
                        <td className="px-8 py-5 font-black text-neutral-800">{formatCurrency(c.totalSpent)}</td>
                        <td className="px-8 py-5 text-neutral-400 text-left font-black">{c.totalOrders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'reservations' && (
            <motion.div key="reservations" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-right">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black">جدولة الحجوزات</h2>
                <button 
                  onClick={() => setShowReservationModal(true)}
                  className="bg-[#FF6B35] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-orange-100 scale-100 active:scale-95 transition-transform"
                >
                  <Plus size={20} /> حجز طاولات
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {reservations.length === 0 ? (
                  <div className="col-span-full py-28 text-center text-neutral-400 border-2 border-dashed border-neutral-100 rounded-[44px] bg-white/40">
                    <Calendar size={64} className="mx-auto mb-6 opacity-5" />
                    <p className="font-black text-lg">سجل الحجوزات فارغ</p>
                    <p className="text-xs font-bold opacity-40 mt-2">يمكنك بدء استقبال حجوزات الطاولات لليوم</p>
                  </div>
                ) : (
                  reservations.map(res => (
                    <div key={res.id} className="bg-white p-8 rounded-[40px] shadow-2xl border border-neutral-100 group hover:border-orange-200 transition-all">
                      <div className="flex justify-between items-start mb-8">
                        <span className="bg-green-50 text-green-600 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase border border-green-100 tracking-widest">{res.status}</span>
                        <div className="text-right">
                          <p className="font-black text-xl text-[#333] leading-none mb-2">{res.customerName}</p>
                          <p className="text-xs font-bold text-neutral-400 tracking-tighter">{res.customerPhone}</p>
                        </div>
                      </div>
                      <div className="space-y-4 border-t border-dashed border-neutral-50 pt-6">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-neutral-400">الوقت والتاريخ:</span>
                          <span className="font-black text-[#555]">{new Date(res.dateTime).toLocaleString('ar-EG')}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-neutral-400">عدد الضيوف:</span>
                          <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">{res.partySize} أفراد</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-neutral-400">رقم الطاولة:</span>
                          <span className="font-black text-[#FF6B35] bg-orange-50 px-3 py-1 rounded-xl">طاوِلة #{res.tableNumber}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-right pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <h2 className="text-2xl font-black">التحليل المالي والإداري</h2>
                 
                 <div className="bg-white p-4 rounded-[24px] shadow-sm border border-neutral-100 flex flex-wrap items-center gap-4">
                   <div className="flex items-center gap-2">
                     <label className="text-[10px] font-black text-neutral-400 uppercase">إلى</label>
                     <input 
                       type="date" 
                       value={endDate}
                       onChange={(e) => setEndDate(e.target.value)}
                       className="bg-neutral-50 px-3 py-2 rounded-xl text-xs font-bold outline-none border border-neutral-100 focus:border-orange-500 transition-colors"
                     />
                   </div>
                   <div className="flex items-center gap-2">
                     <label className="text-[10px] font-black text-neutral-400 uppercase">من</label>
                     <input 
                       type="date" 
                       value={startDate}
                       onChange={(e) => setStartDate(e.target.value)}
                       className="bg-neutral-50 px-3 py-2 rounded-xl text-xs font-bold outline-none border border-neutral-100 focus:border-orange-500 transition-colors"
                     />
                   </div>
                   <Calendar size={18} className="text-orange-500 ml-2" />
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="المبيعات (الفترة)" value={formatCurrency(totalSales)} icon={<TrendingUp size={24} />} color="bg-orange-500" />
                  <StatCard title="إجمالي الضرائب" value={formatCurrency(totalTax)} icon={<Receipt size={24} />} color="bg-blue-500" />
                  <StatCard title="الأرباح الصافية" value={formatCurrency(totalProfit)} icon={<Star size={24} />} color="bg-green-500" />
                  <StatCard title="قاعدة العملاء" value={customers.length.toString()} icon={<Users size={24} />} color="bg-indigo-500" />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-neutral-50">
                    <h3 className="text-lg font-black mb-10 text-neutral-800 flex items-center justify-end gap-3 uppercase tracking-tighter">
                       نما التوسع المالي <TrendingUp size={24} className="text-[#FF6B35]" />
                    </h3>
                    <div className="h-[320px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={dynamicWeeklyData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} dy={12} />
                           <YAxis hide />
                           <Tooltip contentStyle={{borderRadius: '24px', border: 'none', padding: '15px'}} />
                           <Line type="monotone" dataKey="sales" stroke="#FF6B35" strokeWidth={6} dot={{r: 8, fill: '#FF6B35', border: 'white'}} activeDot={{r: 10}} />
                         </LineChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-neutral-50">
                    <h3 className="text-lg font-black mb-10 text-neutral-800 flex items-center justify-end gap-3 uppercase tracking-tighter">
                       أداء المبيعات <FileBarChart size={24} className="text-blue-500" />
                    </h3>
                    <div className="h-[320px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={dynamicTopSoldData}>
                           <CartesianGrid strokeDasharray="3 6" vertical={false} strokeOpacity={0.3} />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800}} dy={12} />
                           <YAxis hide />
                           <Tooltip cursor={{fill: '#f8f8f8'}} contentStyle={{borderRadius: '24px', border: 'none'}} />
                           <Bar dataKey="value" fill="#3B82F6" radius={[20, 20, 5, 5]} barSize={55} />
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 text-right pb-10">
               <h2 className="text-2xl font-black">إعدادات قصر الكرم</h2>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-neutral-100 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-black text-[#FF6B35] flex items-center justify-end gap-4 mb-10">
                          هوية وبروفايل المطعم <ChefHat size={32} />
                      </h3>
                      <div className="space-y-6">
                         <div>
                           <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-3">الاسم التجاري للمنشأة</label>
                           <input type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-3xl px-6 py-5 outline-none focus:ring-4 focus:ring-orange-50/50 transition-all font-black" value={settings.restaurantName} onChange={e => updateSettings({ restaurantName: e.target.value })} />
                         </div>
                         
                         <div>
                           <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-3">رقم التسجيل الضريبي</label>
                           <input type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-3xl px-6 py-5 outline-none focus:ring-4 focus:ring-orange-50/50 transition-all font-mono font-bold" value={settings.restaurantTaxNumber} onChange={e => updateSettings({ restaurantTaxNumber: e.target.value })} />
                         </div>
                         
                         <div>
                           <label className="block text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-3">بيانات التوصيل والعنوان</label>
                           <textarea className="w-full bg-neutral-50 border border-neutral-100 rounded-3xl px-6 py-5 outline-none focus:ring-4 focus:ring-orange-50/50 transition-all min-h-[140px] font-black" value={settings.restaurantAddress} onChange={e => updateSettings({ restaurantAddress: e.target.value })} />
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-neutral-100 flex flex-col">
                    <h3 className="text-xl font-black text-[#FF6B35] flex items-center justify-end gap-4 mb-12">
                        التحكم المالي والبيانات <Settings2 size={32} />
                    </h3>
                    <div className="space-y-10 flex-1">
                       <div className="flex justify-between items-center bg-neutral-50 p-6 rounded-[36px]">
                          <div className="flex items-center gap-3">
                             <input type="number" className="w-28 bg-white border border-neutral-200 rounded-2xl px-5 py-3 text-center shadow-lg font-black text-xl text-orange-600" value={isNaN(settings.vatRate) ? '' : settings.vatRate} onChange={e => updateSettings({ vatRate: parseFloat(e.target.value) })} />
                             <span className="text-neutral-400 font-bold text-lg">%</span>
                          </div>
                          <p className="font-black text-neutral-700 text-lg">الضريبة (ملغاة)</p>
                       </div>

                       <div className="flex justify-between items-center bg-neutral-50 p-6 rounded-[36px]">
                          <div className="flex items-center gap-3">
                             <input type="number" className="w-28 bg-white border border-neutral-200 rounded-2xl px-5 py-3 text-center shadow-lg font-black text-xl text-orange-600" value={isNaN(settings.pointsPerUnit) ? '' : settings.pointsPerUnit} onChange={e => updateSettings({ pointsPerUnit: parseFloat(e.target.value) })} />
                          </div>
                          <p className="font-black text-neutral-700 text-lg">نقاط الولاء / ج.م</p>
                       </div>

                       <div className="pt-10 flex flex-col gap-5">
                          <button onClick={() => {
                            const db = {menuItems, ingredients, staff, suppliers, customers, reservations, settings, orders};
                            const file = new Blob([JSON.stringify(db, null, 2)], {type: 'application/json'});
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(file);
                            link.download = `karm-palace-db-${new Date().toISOString().split('T')[0]}.json`;
                            link.click();
                          }} className="w-full bg-neutral-900 text-white py-6 rounded-[36px] font-black flex items-center justify-center gap-4 shadow-2xl hover:bg-black transition-all hover:-translate-y-1">
                             تصدير السجل الكامل <Package size={24} />
                          </button>
                          
                          <button onClick={() => {
                            if(confirm('تنبيه: سيتم تصفير كل شيء ليعود التطبيق لحالته الأولى. هل ترغب في الاستمرار؟')) {
                              localStorage.clear();
                              window.location.reload();
                            }
                          }} className="w-full bg-red-50 text-red-600 py-6 rounded-[36px] font-black border-2 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                             ضبط المصنع ومسح الداتا
                          </button>
                       </div>
                    </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'suppliers' && (
            <motion.div key="suppliers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-right">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black">شركاء الإمداد</h2>
                <button 
                  onClick={() => setShowSupplierModal(true)}
                  className="bg-[#FF6B35] text-white px-8 py-3 rounded-2xl flex items-center gap-3 font-black shadow-xl shadow-orange-100 hover:-translate-y-1 transition-all"
                >
                   <Plus size={24} /> مورد جديد
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {suppliers.map(sup => (
                  <div key={sup.id} className="bg-white p-10 rounded-[50px] shadow-2xl border border-neutral-50 flex flex-col justify-between hover:scale-102 hover:border-orange-300 transition-all group relative overflow-hidden">
                    <div className="absolute -left-6 -top-6 w-24 h-24 bg-orange-50 rounded-full opacity-30 group-hover:bg-[#FF6B35] group-hover:opacity-10 transition-all" />
                    <div className="text-right relative z-10">
                       <div className="w-14 h-14 bg-orange-50 rounded-3xl flex items-center justify-center text-[#FF6B35] mb-6 group-hover:bg-[#FF6B35] group-hover:text-white transition-all shadow-sm">
                          <Truck size={28} />
                       </div>
                       <h3 className="text-2xl font-black text-neutral-800 mb-2">{sup.name}</h3>
                       <p className="text-[11px] font-black text-[#FF6B35] bg-orange-50 px-3 py-1 rounded-xl inline-block mb-8 uppercase tracking-widest">{sup.category}</p>
                       
                       <div className="space-y-4 text-sm font-bold text-neutral-500">
                          <p className="flex items-center justify-end gap-4">{sup.contactPerson} <User size={18} className="text-neutral-300" /></p>
                          <p className="flex items-center justify-end gap-4 font-mono">{sup.phone} <Phone size={18} className="text-neutral-300" /></p>
                          <p className="flex items-center justify-end gap-4">{sup.email} <Settings2 size={18} className="text-neutral-300" /></p>
                       </div>
                    </div>
                    <div className="mt-10 pt-8 border-t border-neutral-100 flex gap-3 relative z-10">
                       <button onClick={() => deleteSupplier(sup.id)} className="p-4 bg-red-50 text-red-500 rounded-[24px] hover:bg-red-600 hover:text-white transition-all">
                         <Trash2 size={18} />
                       </button>
                       <button className="flex-1 bg-neutral-50 text-neutral-600 py-4 rounded-[24px] text-[11px] font-black hover:bg-neutral-100 transition-all tracking-tighter">كشف حساب</button>
                       <button className="flex-1 bg-orange-50 text-[#FF6B35] py-4 rounded-[24px] text-[11px] font-black hover:bg-[#FF6B35] hover:text-white transition-all tracking-tighter">أمر توريد</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div 
               key="inventory"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                <h2 className="text-2xl font-bold">إدارة المخزون والمواد الخام</h2>
                <div className="flex gap-2">
                  <span className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2">
                     <AlertTriangle size={14} />
                     {ingredients.filter(i => i.stock <= i.minThreshold).length} نواقص
                  </span>
                  <button 
                    onClick={() => setShowInventoryModal(true)}
                    className="bg-[#FF6B35] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-md shadow-orange-100 scale-100 active:scale-95 transition-transform"
                  >
                     <Plus size={18} />
                     إضافة مادة
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-neutral-100/50 text-neutral-500 text-xs font-bold uppercase tracking-widest border-b border-neutral-100">
                    <tr>
                      <th className="px-8 py-4 font-black">المادة</th>
                      <th className="px-8 py-4 font-black">الكمية الحالية</th>
                      <th className="px-8 py-4 font-black">الوحدة</th>
                      <th className="px-8 py-4 font-black">الحالة</th>
                      <th className="px-8 py-4 text-left font-black">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {ingredients.map((ing) => (
                      <TableRow 
                        key={ing.id}
                        name={ing.name} 
                        qty={ing.stock} 
                        unit={ing.unit} 
                        status={ing.stock <= ing.minThreshold ? "منخفض" : "كافٍ"} 
                        urgent={ing.stock <= ing.minThreshold}
                        onUpdate={(val) => updateIngredientStock(ing.id, val)}
                        onDelete={() => deleteInventory(ing.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Staff Modal */}
          {showStaffModal && (
            <Modal title="إضافة موظف جديد" onClose={() => setShowStaffModal(false)}>
              <StaffForm onSubmit={addStaffMember} onCancel={() => setShowStaffModal(false)} />
            </Modal>
          )}

          {/* Menu Modal */}
          {showMenuModal && (
            <Modal title="إضافة صنف للقائمة" onClose={() => setShowMenuModal(false)}>
              <MenuForm onSubmit={addMenuItem} onCancel={() => setShowMenuModal(false)} />
            </Modal>
          )}

          {/* Supplier Modal */}
          {showSupplierModal && (
            <Modal title="إضافة مورد جديد" onClose={() => setShowSupplierModal(false)}>
              <SupplierForm onSubmit={addSupplier} onCancel={() => setShowSupplierModal(false)} />
            </Modal>
          )}

          {/* Inventory Modal */}
          {showInventoryModal && (
            <Modal title="إضافة مادة خام" onClose={() => setShowInventoryModal(false)}>
              <InventoryForm onSubmit={addIngredient} onCancel={() => setShowInventoryModal(false)} />
            </Modal>
          )}

          {showReservationModal && (
            <Modal title="حجز طاولة جديد" onClose={() => setShowReservationModal(false)}>
              <ReservationForm onSubmit={addReservation} onCancel={() => setShowReservationModal(false)} />
            </Modal>
          )}

          {/* Receipt Modal */}
          {receiptToShow && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setReceiptToShow(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-8 overflow-y-auto no-scrollbar receipt-print-area">
                  {receiptToShow.type === 'customer' ? (
                    <div className="text-center space-y-4 font-mono text-[#333]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 bg-[#FF6B35] rounded-2xl flex items-center justify-center text-white text-3xl font-bold">W</div>
                        <h2 className="text-2xl font-black">وجبتي - Wajbati</h2>
                        <p className="text-xs opacity-60">القاهرة - شارع النيل، المعادي</p>
                        <p className="text-xs opacity-60">ت: 01012345678</p>
                      </div>

                      <div className="border-t-2 border-dashed border-neutral-200 pt-4 text-right">
                        <div className="flex justify-between text-xs mb-1">
                          <span>رقم الطلب:</span>
                          <span className="font-bold">#{receiptToShow.order.id.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>التاريخ:</span>
                          <span>{new Date(receiptToShow.order.createdAt).toLocaleString('ar-EG')}</span>
                        </div>
                        {receiptToShow.order.customerName && (
                          <div className="flex justify-between text-xs mb-1">
                            <span>العميل:</span>
                            <span className="font-bold">{receiptToShow.order.customerName}</span>
                          </div>
                        )}
                        {receiptToShow.order.customerPhone && (
                          <div className="flex justify-between text-xs mb-1">
                            <span>الهاتف:</span>
                            <span>{receiptToShow.order.customerPhone}</span>
                          </div>
                        )}
                        {receiptToShow.order.deliveryAddress && (
                          <div className="flex flex-col text-xs mt-1 border-t border-dotted border-neutral-200 pt-1">
                            <span className="opacity-60 mb-1">عنوان التوصيل:</span>
                            <span className="font-medium text-[10px]">{receiptToShow.order.deliveryAddress}</span>
                          </div>
                        )}
                      </div>

                      <table className="w-full border-t-2 border-b-2 border-dashed border-neutral-200 py-4 mt-4 text-sm">
                        <thead>
                          <tr className="text-right opacity-60 text-xs">
                            <th className="pb-2">الكمية</th>
                            <th className="pb-2">الصنف</th>
                            <th className="pb-2 text-left">السعر</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiptToShow.order.items.map((item, i) => (
                            <tr key={i} className="text-right">
                              <td className="py-1">x{item.quantity}</td>
                              <td className="py-1 font-bold">{item.name}</td>
                              <td className="py-1 text-left">{formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="space-y-2 pt-4 text-right">
                        <div className="flex justify-between text-sm">
                          <span>طريقة الدفع:</span>
                          <span className="font-bold">{receiptToShow.order.paymentMethod === 'cash' ? 'كاش' : 'دفع أونلاين'}</span>
                        </div>
                        <div className="flex justify-between text-lg font-black pt-2">
                          <span>الإجمالي:</span>
                          <span className="text-[#FF6B35]">{formatCurrency(receiptToShow.order.total)}</span>
                        </div>
                      </div>
                      
                      <div className="pt-8 opacity-40 text-[10px]">شكراً لزيارتكم! استمتع بوجبتك.</div>
                    </div>
                  ) : (
                    <div className="text-right space-y-6 text-[#333]">
                      <div className="bg-neutral-900 text-white p-6 rounded-2xl flex justify-between items-center">
                        <div>
                          <p className="text-xs opacity-60">تذكرة المطبخ</p>
                          <h2 className="text-3xl font-black">#{receiptToShow.order.id.toUpperCase().substr(0,4)}</h2>
                          {receiptToShow.order.customerName && <p className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full mt-1 inline-block">{receiptToShow.order.customerName}</p>}
                        </div>
                        <ChefHat size={40} className="opacity-20" />
                      </div>

                      <div className="space-y-6">
                        {receiptToShow.order.items.map((item, i) => (
                          <div key={i} className="border-b border-neutral-100 pb-4 last:border-0">
                            <div className="flex justify-between items-center">
                               <h3 className="text-xl font-black">{item.name}</h3>
                               <span className="bg-[#FF6B35] text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg">x{item.quantity}</span>
                            </div>
                            {item.modifications ? (
                              <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl mt-3 flex items-start gap-2">
                                <AlertTriangle size={18} className="text-[#FF6B35] shrink-0 mt-0.5" />
                                <p className="text-sm font-bold text-[#FF6B35]">{item.modifications}</p>
                              </div>
                            ) : (
                              <p className="text-xs text-neutral-400 mt-2 italic">بدون تعديلات خاصة</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-neutral-200">
                        <p className="text-xs font-bold text-neutral-400">وقت الطلب: {new Date(receiptToShow.order.createdAt).toLocaleTimeString('ar-EG')}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-neutral-50 flex gap-3 border-t border-neutral-100">
                   <button 
                     onClick={printReceipt}
                     className="flex-1 bg-[#2ECC71] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 hover:bg-green-600 transition-colors"
                   >
                     <Printer size={20} />
                     بدء الطباعة
                   </button>
                   <button 
                     onClick={() => setReceiptToShow(null)}
                     className="px-6 bg-white text-neutral-400 py-4 rounded-2xl font-bold border border-neutral-200 hover:bg-neutral-100 transition-colors"
                   >
                     إغلاق
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto py-8 text-center text-neutral-400 text-sm border-t border-neutral-100">
         <p>© {new Date().getFullYear()} قصر الكرم — جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}

// Helper Components
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl relative z-10 overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
           <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-xl transition-colors text-neutral-400">
             <X size={24} />
           </button>
           <h3 className="text-xl font-black text-neutral-800">{title}</h3>
        </div>
        <div className="p-8 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function StaffForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({ name: '', role: 'chef', phone: '', shift: 'morning' });
  return (
    <form className="space-y-6 text-right" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">اسم الموظف</label>
        <input required type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">الدور الوظيفي</label>
          <select className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
            <option value="chef">شيف</option>
            <option value="cashier">كاشير</option>
            <option value="waiter">ويتر</option>
            <option value="manager">مدير</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">الوردية</label>
          <select className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})}>
            <option value="morning">صباحية</option>
            <option value="afternoon">مسائية</option>
            <option value="night">ليلية</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">رقم الهاتف</label>
        <input required type="tel" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
      </div>
      <div className="flex gap-3 pt-6">
        <button type="submit" className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-100 hover:bg-orange-600">حفظ الموظف</button>
        <button type="button" onClick={onCancel} className="px-8 bg-neutral-100 text-neutral-500 py-4 rounded-2xl font-black">إلغاء</button>
      </div>
    </form>
  );
}

function MenuForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({ name: '', category: 'أطباق رئيسية', price: 0, description: '', cost: 0 });
  return (
    <form className="space-y-6 text-right" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
       <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">اسم الصنف</label>
        <input required type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">التصنيف</label>
          <select className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
            <option value="أطباق رئيسية">أطباق رئيسية</option>
            <option value="مقبلات">مقبلات</option>
            <option value="حلويات">حلويات</option>
            <option value="مشروبات">مشروبات</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">سعر البيع</label>
          <input required type="number" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={isNaN(formData.price) ? '' : formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">تكلفة الأصناف (المواد الخام)</label>
        <input required type="number" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={isNaN(formData.cost) ? '' : formData.cost} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">الوصف</label>
        <textarea className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold min-h-[100px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
      </div>
      <div className="flex gap-3 pt-6">
        <button type="submit" className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-100 hover:bg-orange-600">إضافة للقائمة</button>
        <button type="button" onClick={onCancel} className="px-8 bg-neutral-100 text-neutral-500 py-4 rounded-2xl font-black">إلغاء</button>
      </div>
    </form>
  );
}

function SupplierForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({ name: '', category: 'لحوم', contactPerson: '', phone: '', email: '' });
  return (
    <form className="space-y-6 text-right" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
       <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">اسم المورد / الشركة</label>
        <input required type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">التخصص</label>
          <input required type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">مسؤول التواصل</label>
          <input required type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">رقم الهاتف</label>
        <input required type="tel" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
      </div>
      <div className="flex gap-3 pt-6">
        <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100">إضافة مورد</button>
        <button type="button" onClick={onCancel} className="px-8 bg-neutral-100 text-neutral-500 py-4 rounded-2xl font-black">إلغاء</button>
      </div>
    </form>
  );
}

function InventoryForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({ name: '', stock: 0, unit: 'كجم', minThreshold: 5 });
  return (
    <form className="space-y-6 text-right" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
       <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">اسم المادة الخام</label>
        <input required type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">الكمية الحالية</label>
          <input required type="number" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={isNaN(formData.stock) ? '' : formData.stock} onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">الوحدة</label>
          <select className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
            <option value="كجم">كجم</option>
            <option value="لتر">لتر</option>
            <option value="قطعة">قطعة</option>
            <option value="كرتونة">كرتونة</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">الحد الأدنى للتنبيه</label>
        <input required type="number" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={isNaN(formData.minThreshold) ? '' : formData.minThreshold} onChange={e => setFormData({...formData, minThreshold: parseFloat(e.target.value)})} />
      </div>
      <div className="flex gap-3 pt-6">
        <button type="submit" className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-100 hover:bg-orange-600">إضافة للمخزن</button>
        <button type="button" onClick={onCancel} className="px-8 bg-neutral-100 text-neutral-500 py-4 rounded-2xl font-black">إلغاء</button>
      </div>
    </form>
  );
}

function ReservationForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({ customerName: '', customerPhone: '', dateTime: '', partySize: 2, tableNumber: 1 });
  return (
    <form className="space-y-6 text-right" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
       <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">اسم العميل</label>
        <input required type="text" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">رقم الهاتف</label>
        <input required type="tel" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">التاريخ والوقت</label>
          <input required type="datetime-local" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase">عدد الأفراد</label>
          <input required type="number" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={isNaN(formData.partySize) ? '' : formData.partySize} onChange={e => setFormData({...formData, partySize: parseInt(e.target.value)})} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-neutral-400 uppercase">رقم الطاولة</label>
        <input required type="number" className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-3.5 outline-none focus:border-orange-500 font-bold" value={isNaN(formData.tableNumber) ? '' : formData.tableNumber} onChange={e => setFormData({...formData, tableNumber: parseInt(e.target.value)})} />
      </div>
      <div className="flex gap-3 pt-6">
        <button type="submit" className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-100 hover:bg-orange-600">تأكيد الحجز</button>
        <button type="button" onClick={onCancel} className="px-8 bg-neutral-100 text-neutral-500 py-4 rounded-2xl font-black">إلغاء</button>
      </div>
    </form>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all",
        active ? "bg-white text-[#FF6B35] shadow-sm" : "text-white/70 hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

interface MenuCardProps {
  item: MenuItem;
  onAdd: (modifications: string) => void;
  onUpdatePrice: (newPrice: number) => void;
  onDelete?: (id: string) => void;
  showAdminControls?: boolean;
}

const MenuCard: React.FC<MenuCardProps> = ({ item, onAdd, onUpdatePrice, onDelete, showAdminControls }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [priceInput, setPriceInput] = useState(item.price.toString());
  const [customMods, setCustomMods] = useState('');

  const handlePriceSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const val = parseFloat(priceInput);
    if (!isNaN(val) && val > 0) {
      onUpdatePrice(val);
      setIsEditing(false);
    }
  };

  const handleAddWithMods = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(customMods);
    setCustomMods('');
    setIsCustomizing(false);
  };

  const quickMods = ['إضافة جبنة', 'بدون بصل', 'سبايسي', 'زيادة صوص'];

  return (
    <motion.div 
      whileHover={{ scale: 1.05, borderColor: '#FF6B35' }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        if (!isEditing && !isCustomizing) onAdd('');
      }}
      className="bg-white border-2 border-neutral-100 rounded-[24px] overflow-hidden cursor-pointer transition-all flex flex-col group min-w-[280px] md:min-w-[320px] h-[360px] shadow-lg shadow-black/5 relative"
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-xl text-2xl shadow-sm">
          {IconMap[item.icon] || '🍱'}
        </div>
        
        {showAdminControls && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
            className="absolute top-3 left-14 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-all"
          >
            <Trash2 size={18} />
          </button>
        )}

        <button 
          onClick={(e) => { e.stopPropagation(); setIsCustomizing(!isCustomizing); }}
          className={cn(
            "absolute top-3 left-3 p-2 rounded-xl transition-all shadow-sm",
            isCustomizing ? "bg-[#FF6B35] text-white" : "bg-white/90 backdrop-blur-sm text-[#FF6B35] hover:bg-white"
          )}
        >
          <Settings2 size={20} />
        </button>
      </div>
      
      <div className="p-5 flex-1 flex flex-col text-right">
        <h3 className="text-lg font-bold text-[#333] mb-1">{item.name}</h3>
        <p className="text-xs text-neutral-400 line-clamp-2 mb-3">{item.description}</p>
        
        <div className="mt-auto flex justify-between items-center bg-neutral-50 p-2 rounded-xl group/price">
          {isEditing ? (
            <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
              <input 
                type="number"
                className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1 text-sm font-bold focus:ring-1 focus:ring-[#FF6B35] outline-none"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                autoFocus
              />
              <button 
                onClick={handlePriceSave}
                className="bg-green-500 text-white p-1 rounded-lg hover:bg-green-600 transition-colors"
              >
                <CheckCircle2 size={16} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsEditing(false); setPriceInput(item.price.toString()); }}
                className="bg-red-500 text-white p-1 rounded-lg hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#FF6B35]">{formatCurrency(item.price)}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  className="text-neutral-300 hover:text-[#FF6B35] transition-colors p-1"
                >
                  <Plus size={14} className="rotate-45" />
                </button>
              </div>
              <div className="bg-[#FF6B35] text-white p-1 rounded-lg">
                <Plus size={16} />
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isCustomizing && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-white/95 backdrop-blur-md p-6 flex flex-col justify-between z-20"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setIsCustomizing(false)} className="text-neutral-400 hover:text-[#FF6B35]">
                  <X size={20} />
                </button>
                <h4 className="font-black text-[#FF6B35]">تعديل الطلب</h4>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-end">
                  {quickMods.map(mod => (
                    <button
                      key={mod}
                      onClick={() => setCustomMods(prev => prev ? `${prev}، ${mod}` : mod)}
                      className="px-3 py-1.5 rounded-lg border border-neutral-100 bg-neutral-50 text-[10px] font-bold hover:bg-[#FF6B35] hover:text-white transition-all"
                    >
                      {mod}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="اكتب تعديلاتك هنا..."
                  className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-[#FF6B35] outline-none min-h-[100px] text-right"
                  value={customMods}
                  onChange={(e) => setCustomMods(e.target.value)}
                />
              </div>
            </div>

            <button
               onClick={handleAddWithMods}
               className="w-full bg-[#FF6B35] text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
            >
               <Plus size={18} />
               إضافة إلى السلة بالخيارات
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface OrderCardProps {
  order: Order;
  onStatusChange: (id: string, s: Order['status']) => void;
  onDelete: (id: string) => void;
  onPrint: (type: 'customer' | 'kitchen') => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onStatusChange, onDelete, onPrint }) => {
  const statusLabels = {
    pending: 'قيد الانتظار',
    preparing: 'جاري التجهيز',
    ready: 'جاهز للتسليم',
    delivered: 'تم التسليم'
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-[28px] p-6 shadow-xl shadow-black/5 hover:border-[#FF6B35] transition-all relative overflow-hidden flex flex-col">
      {order.status === 'ready' && <div className="absolute top-0 right-0 left-0 h-1.5 bg-green-500 animate-pulse" />}
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-[#333]">
            <span className="text-neutral-300 text-sm font-medium">#</span>{order.orderNumber}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] font-bold text-neutral-400 flex items-center gap-1 bg-neutral-50 px-2 py-0.5 rounded-lg">
              <Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString('ar-EG')}
            </p>
            <span className={cn(
              "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
              order.paymentMethod === 'cash' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-purple-50 text-purple-600 border border-purple-100"
            )}>
              {order.paymentMethod === 'cash' ? 'كاش' : 'أونلاين'}
            </span>
          </div>
        </div>
        <button onClick={() => onDelete(order.id)} className="text-neutral-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all">
           <Trash2 size={18} />
        </button>
      </div>

      {(order.customerName || order.customerPhone || order.deliveryAddress) && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-2xl space-y-2 text-right">
           {order.customerName && (
             <p className="text-[10px] font-bold text-neutral-700 flex items-center justify-end gap-2">
               {order.customerName} <User size={12} className="text-neutral-400" />
             </p>
           )}
           {order.customerPhone && (
             <p className="text-[10px] font-bold text-neutral-500 flex items-center justify-end gap-2">
               {order.customerPhone} <Phone size={12} className="text-neutral-400" />
             </p>
           )}
           {order.deliveryAddress && (
             <p className="text-[10px] text-neutral-400 leading-relaxed flex items-start justify-end gap-2">
               <span className="flex-1 line-clamp-1">{order.deliveryAddress}</span> <MapPin size={12} className="text-neutral-400 shrink-0 mt-0.5" />
             </p>
           )}
        </div>
      )}

      <div className="space-y-3 mb-8 flex-1">
        {order.items.map((item, idx) => (
          <div key={idx} className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-100/50">
            <div className="flex justify-between items-center">
              <p className="text-xs font-black text-neutral-700">{item.name} <span className="text-[#FF6B35] mr-1">x{item.quantity}</span></p>
              <span className="text-[10px] font-black text-neutral-400">{formatCurrency(item.price * item.quantity)}</span>
            </div>
            {item.modifications && (
              <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold text-orange-600">
                <div className="w-1 h-1 bg-orange-600 rounded-full" />
                {item.modifications}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-neutral-100 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold">
           <span>المجموع:</span>
           <span>{formatCurrency(order.subtotal || 0)}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold border-b border-neutral-50 pb-2">
           <span>الضريبة:</span>
           <span>{formatCurrency(order.vatAmount || 0)}</span>
        </div>
        <div className="flex items-center justify-between">
           <span className="text-xs font-bold text-neutral-600 uppercase">الإجمالي:</span>
           <span className="text-lg font-black text-[#FF6B35]">{formatCurrency(order.total)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
           <button 
             onClick={() => onPrint('customer')}
             className="flex items-center justify-center gap-2 py-2.5 bg-neutral-900 text-white rounded-xl text-[10px] font-bold hover:bg-[#333] transition-all"
           >
             <Printer size={14} />
             وصل العميل
           </button>
           <button 
             onClick={() => onPrint('kitchen')}
             className="flex items-center justify-center gap-2 py-2.5 bg-white text-[#FF6B35] border border-orange-100 rounded-xl text-[10px] font-bold hover:bg-orange-50 transition-all"
           >
             <ChefHat size={14} />
             بون المطبخ
           </button>
        </div>

        <select 
          className={cn(
            "w-full text-xs font-black px-4 py-3 rounded-xl outline-none border transition-all cursor-pointer appearance-none text-center mt-2",
            order.status === 'pending' && "bg-orange-50 text-orange-600 border-orange-200",
            order.status === 'preparing' && "bg-blue-50 text-blue-600 border-blue-200",
            order.status === 'ready' && "bg-green-50 text-green-600 border-green-200",
            order.status === 'delivered' && "bg-neutral-50 text-neutral-500 border-neutral-200"
          )}
          value={order.status}
          onChange={(e) => onStatusChange(order.id, e.target.value as any)}
        >
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};


function StatCard({ title, value, icon, change, color }: { title: string; value: string; icon: React.ReactNode; change?: string; color: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-xl shadow-black/5 hover:shadow-black/10 transition-all group overflow-hidden relative">
      <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-110 transition-transform", color)} />
      <div className="flex justify-between items-start relative z-10">
        <div className={cn("p-4 rounded-2xl text-white shadow-lg", color)}>
          {icon}
        </div>
        {change && (
          <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 uppercase tracking-tighter">
            {change}
          </span>
        )}
      </div>
      <div className="mt-5 relative z-10 text-right">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-neutral-800">{value}</p>
      </div>
    </div>
  );
}

interface TableRowProps {
  name: string;
  qty: number;
  unit: string;
  status: string;
  urgent?: boolean;
  onUpdate: (val: number) => void;
  onDelete?: () => void;
}

const TableRow: React.FC<TableRowProps> = ({ name, qty, unit, status, urgent, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(isNaN(qty) ? '' : qty.toString());

  useEffect(() => {
    if (!isEditing) setInputValue(isNaN(qty) ? '' : qty.toString());
  }, [qty, isEditing]);

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-8 py-5 text-sm font-bold text-neutral-700">{name}</td>
      <td className="px-8 py-5">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input 
              type="number"
              className="w-20 bg-white border border-neutral-200 rounded-lg px-2 py-1 text-sm font-bold focus:ring-1 focus:ring-[#FF6B35] outline-none"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
            />
            <button 
              onClick={() => { onUpdate(parseFloat(inputValue)); setIsEditing(false); }}
              className="text-green-500 hover:scale-110"
            >
              <CheckCircle2 size={16} />
            </button>
            <button 
              onClick={() => { setIsEditing(false); setInputValue(qty.toString()); }}
              className="text-red-400 hover:scale-110"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div 
            className={cn("text-sm font-bold cursor-pointer hover:text-[#FF6B35] transition-colors flex items-center gap-2", urgent && "text-red-500")}
            onClick={() => setIsEditing(true)}
          >
            {qty}
            <Plus size={12} className="opacity-30" />
          </div>
        )}
      </td>
      <td className="px-8 py-5 text-sm text-neutral-400 font-bold">{unit}</td>
      <td className="px-8 py-5">
        <span className={cn(
          "text-[9px] font-black px-3 py-1 rounded-full uppercase",
          urgent ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100"
        )}>
          {status}
        </span>
      </td>
      <td className="px-8 py-5 text-left">
        <div className="flex items-center justify-end gap-2">
          <button className="text-neutral-300 hover:text-[#FF6B35] p-2 hover:bg-orange-50 rounded-xl transition-all">
            <TrendingUp size={18} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="text-neutral-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
};

function StatusBadge({ status, count }: { status: string; count: number }) {
  const colors = {
    pending: 'bg-[#FF6B35] text-white border-transparent',
    preparing: 'bg-blue-500 text-white border-transparent',
    ready: 'bg-green-500 text-white border-transparent'
  };
  const labels = { pending: 'انتظار', preparing: 'تجهيز', ready: 'جاهز' };
  
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold", colors[status as keyof typeof colors])}>
       <span>{labels[status as keyof typeof labels]}</span>
       <span className="bg-white/20 px-1.5 py-0.5 rounded-lg">{count}</span>
    </div>
  );
}

// Data for charts
const weeklyData = [
  { name: 'السبت', sales: 4000 },
  { name: 'الأحد', sales: 3000 },
  { name: 'الاثنين', sales: 2000 },
  { name: 'الثلاثاء', sales: 2780 },
  { name: 'الأربعاء', sales: 1890 },
  { name: 'الخميس', sales: 2390 },
  { name: 'الجمعة', sales: 3490 },
];

const topSoldData = [
  { name: 'كفتة مشوية', value: 400 },
  { name: 'فتة', value: 300 },
  { name: 'أرز', value: 300 },
  { name: 'حلويات', value: 200 },
];

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7'];
