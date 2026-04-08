export type OrderStatus = 'Masuk' | 'Proses' | 'Selesai' | 'Diambil';

export interface Service {
  id: string;
  name: string;
  pricePerKg: number;
  costPerKg: number; // Modal per kg
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  lastVisit?: string;
  totalTransactions?: number;
}

export interface TransactionItem {
  serviceId: string;
  serviceName: string;
  pricePerKg: number;
  costPerKg: number; // Modal per kg
  weight: number;
  total: number;
  totalCost: number; // Total modal for this item
  profit: number; // Total profit for this item
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: TransactionItem[];
  totalPrice: number;
  totalCost: number; // Total modal for the transaction
  totalProfit: number; // Total profit for the transaction
  entryDate: string;
  estimateDate: string;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  serviceName?: string;
  weight?: number;
  pricePerKg?: number;
  costPerKg?: number; // For backward compatibility
}

export interface AppSettings {
  laundryName: string;
  address: string;
  phone: string;
  whatsappMessage: string;
  nextInvoiceNo: number;
}

export interface DashboardStats {
  todayTransactions: number;
  todayRevenue: number;
  todayProfit: number;
  totalCustomers: number;
  activeOrders: number;
  completedOrders: number;
}
