import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, DashboardStats } from '../types';
import { formatCurrency, cn, handleFirestoreError, OperationType } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayTransactions: 0,
    todayRevenue: 0,
    totalCustomers: 0,
    activeOrders: 0,
    completedOrders: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const today = startOfDay(new Date());
    const endOfToday = endOfDay(new Date());

    // Real-time stats
    const unsubscribeTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const allTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      
      const todayTrans = allTransactions.filter(t => {
        const date = new Date(t.entryDate);
        return date >= today && date <= endOfToday;
      });

      const active = allTransactions.filter(t => t.status === 'Masuk' || t.status === 'Proses');
      const completed = allTransactions.filter(t => t.status === 'Selesai');

      setStats(prev => ({
        ...prev,
        todayTransactions: todayTrans.length,
        todayRevenue: todayTrans.reduce((sum, t) => sum + t.totalPrice, 0),
        activeOrders: active.length,
        completedOrders: completed.length
      }));

      // Recent transactions
      const sorted = [...allTransactions].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 5);
      setRecentTransactions(sorted);

      // Chart data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayStr = format(date, 'dd MMM', { locale: id });
        const dayTrans = allTransactions.filter(t => 
          format(new Date(t.entryDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
        return {
          name: dayStr,
          revenue: dayTrans.reduce((sum, t) => sum + t.totalPrice, 0),
          count: dayTrans.length
        };
      });
      setChartData(last7Days);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setStats(prev => ({ ...prev, totalCustomers: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'customers');
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeCustomers();
    };
  }, []);

  const statCards = [
    { label: 'Transaksi Hari Ini', value: stats.todayTransactions, icon: TrendingUp, color: 'blue' },
    { label: 'Pendapatan Hari Ini', value: formatCurrency(stats.todayRevenue), icon: FileText, color: 'emerald' },
    { label: 'Total Pelanggan', value: stats.totalCustomers, icon: Users, color: 'indigo' },
    { label: 'Pesanan Aktif', value: stats.activeOrders, icon: Clock, color: 'amber' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-800">Ringkasan Dashboard</h2>
        <p className="text-slate-500">Selamat datang kembali! Berikut adalah statistik laundry Anda hari ini.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-${card.color}-50 flex items-center justify-center text-${card.color}-600`}>
                <card.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight size={14} />
                12%
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
            <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800">Pendapatan 7 Hari Terakhir</h3>
            <select className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1.5 focus:ring-0">
              <option>Minggu Ini</option>
              <option>Bulan Ini</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Transaksi Terbaru</h3>
          <div className="space-y-6">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  t.status === 'Selesai' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                )}>
                  {t.status === 'Selesai' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{t.customerName}</p>
                  <p className="text-xs text-slate-500">{t.invoiceNo} • {t.serviceName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(t.totalPrice)}</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{t.status}</p>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Package size={48} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Belum ada transaksi</p>
              </div>
            )}
          </div>
          <button className="w-full mt-8 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
            Lihat Semua Transaksi
          </button>
        </div>
      </div>
    </div>
  );
}

import { FileText } from 'lucide-react';
