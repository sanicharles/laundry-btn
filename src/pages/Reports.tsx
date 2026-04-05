import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Package,
  ArrowRight
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction } from '../types';
import { formatCurrency, cn, handleFirestoreError, OperationType } from '../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function Reports() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });
    return () => unsub();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.entryDate);
    return isWithinInterval(date, {
      start: startOfDay(new Date(dateRange.start)),
      end: endOfDay(new Date(dateRange.end))
    });
  });

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.totalPrice, 0);
  const totalWeight = filteredTransactions.reduce((sum, t) => sum + t.weight, 0);

  const exportToExcel = () => {
    const data = filteredTransactions.map(t => ({
      'No Nota': t.invoiceNo,
      'Tanggal': format(new Date(t.entryDate), 'dd/MM/yyyy'),
      'Pelanggan': t.customerName,
      'Layanan': t.serviceName,
      'Berat (kg)': t.weight,
      'Total': t.totalPrice,
      'Status': t.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Laundry');
    XLSX.writeFile(wb, `Laporan_Laundry_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('LAPORAN TRANSAKSI LAUNDRY IBU TINI', 14, 15);
    doc.text(`Periode: ${dateRange.start} s/d ${dateRange.end}`, 14, 22);
    
    const tableData = filteredTransactions.map(t => [
      t.invoiceNo,
      format(new Date(t.entryDate), 'dd/MM/yy'),
      t.customerName,
      t.serviceName,
      `${t.weight}kg`,
      formatCurrency(t.totalPrice),
      t.status
    ]);

    doc.autoTable({
      startY: 30,
      head: [['Nota', 'Tgl', 'Pelanggan', 'Layanan', 'Berat', 'Total', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: [37, 99, 235] }
    });

    doc.save(`Laporan_Laundry_${dateRange.start}_to_${dateRange.end}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laporan Keuangan</h2>
          <p className="text-slate-500">Analisis pendapatan dan performa laundry Anda.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors"
          >
            <Download size={18} />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
          >
            <FileText size={18} />
            PDF
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-3 flex-1 w-full">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dari Tanggal</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            />
          </div>
          <ArrowRight className="text-slate-300 mt-4" size={20} />
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sampai Tanggal</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            />
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => {
              setDateRange({
                start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
              });
            }}
            className="flex-1 md:flex-none px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200"
          >
            Tampilkan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <DollarSign size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Pendapatan</p>
          <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalRevenue)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Berat</p>
          <h3 className="text-2xl font-bold text-slate-800">{totalWeight.toFixed(1)} kg</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <Package size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Transaksi</p>
          <h3 className="text-2xl font-bold text-slate-800">{filteredTransactions.length} Nota</h3>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nota</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pelanggan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Layanan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-blue-600">{t.invoiceNo}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{format(new Date(t.entryDate), 'dd/MM/yy')}</td>
                  <td className="px-6 py-4 text-sm text-slate-800 font-medium">{t.customerName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{t.serviceName}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{formatCurrency(t.totalPrice)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                      t.status === 'Selesai' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-10" />
              <p>Tidak ada data untuk periode ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
