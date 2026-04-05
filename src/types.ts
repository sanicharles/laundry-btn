export type OrderStatus = 'Masuk' | 'Proses' | 'Selesai' | 'Diambil';

export interface Service {
  id: string;
  name: string;
  pricePerKg: number;
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

export interface Transaction {
  id: string;
  invoiceNo: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  serviceId?: string;
  serviceName: string;
  weight: number;
  pricePerKg: number;
  totalPrice: number;
  entryDate: string;
  estimateDate: string;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
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
  totalCustomers: number;
  activeOrders: number;
  completedOrders: number;
}
