import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Printer, 
  MessageCircle, 
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  FileText
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  getDocs,
  where,
  setDoc,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, Service, Customer, AppSettings, OrderStatus, TransactionItem } from '../types';
import { formatCurrency, generateInvoiceNo, getWhatsAppLink, cn, handleFirestoreError, OperationType } from '../lib/utils';
import { format, addDays } from 'date-fns';
import { id } from 'date-fns/locale';
import Receipt from '../components/Receipt';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ToastType } from '../components/Toast';

interface TransactionsProps {
  showToast: (message: string, type: ToastType) => void;
}

export default function Transactions({ showToast }: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [] as TransactionItem[],
    notes: '',
    status: 'Masuk' as OrderStatus
  });

  // Current item state for modal
  const [currentItem, setCurrentItem] = useState({
    serviceId: '',
    weight: 0
  });

  useEffect(() => {
    const unsubTrans = onSnapshot(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'services');
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'customers');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (snapshot: any) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      } else {
        // Initialize default settings if not exists
        const defaultSettings = {
          laundryName: 'Laundry Ibu Tini',
          address: 'Jl. Kebersihan No. 123, Jakarta',
          phone: '081234567890',
          whatsappMessage: 'Halo Kak 👋\nBerikut struk Laundry Anda:\n\nNo Nota: {{no_nota}}\nNama: {{nama}}\nLayanan: {{layanan}}\nBerat: {{berat}} kg\nTotal: Rp {{total}}\n\nTerima kasih 🙏\nLaundry Ibu Tini',
          nextInvoiceNo: 1
        };
        setDoc(snapshot.ref, defaultSettings);
        setSettings(defaultSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/main');
    });

    return () => {
      unsubTrans();
      unsubServices();
      unsubCustomers();
      unsubSettings();
    };
  }, []);

  const handleCustomerSearch = (name: string) => {
    const existing = customers.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setFormData(prev => ({
        ...prev,
        customerName: existing.name,
        customerPhone: existing.phone,
        customerAddress: existing.address || ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent, shouldPrint: boolean = false) => {
    if (e) e.preventDefault();
    if (!settings) return;
    if (formData.items.length === 0) {
      showToast('Tambahkan minimal satu layanan', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const invoiceNo = generateInvoiceNo(settings.nextInvoiceNo);
      const totalPrice = formData.items.reduce((sum, item) => sum + item.total, 0);
      const totalCost = formData.items.reduce((sum, item) => sum + item.totalCost, 0);
      const totalProfit = totalPrice - totalCost;
      const totalWeight = formData.items.reduce((sum, item) => sum + item.weight, 0);
      const entryDate = new Date().toISOString();
      const estimateDate = addDays(new Date(), 2).toISOString(); // Default 2 days

      // Create a summary service name for backward compatibility
      const serviceNameSummary = formData.items.length > 1 
        ? `${formData.items[0].serviceName} + ${formData.items.length - 1} lainnya`
        : formData.items[0].serviceName;

      const newTransaction: Omit<Transaction, 'id'> = {
        invoiceNo,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        items: formData.items,
        totalPrice,
        totalCost,
        totalProfit,
        entryDate,
        estimateDate,
        status: formData.status,
        notes: formData.notes,
        createdAt: entryDate,
        serviceName: serviceNameSummary,
        weight: totalWeight,
        pricePerKg: formData.items[0].pricePerKg,
        costPerKg: formData.items[0].costPerKg
      };

      // Add transaction
      const docRef = await addDoc(collection(db, 'transactions'), newTransaction);
      const transactionWithId = { ...newTransaction, id: docRef.id } as Transaction;
      
      // Update next invoice number
      await updateDoc(doc(db, 'settings', 'main'), {
        nextInvoiceNo: settings.nextInvoiceNo + 1
      });

      // Update or Add Customer
      const existingCustomer = customers.find(c => c.phone === formData.customerPhone);
      if (existingCustomer) {
        await updateDoc(doc(db, 'customers', existingCustomer.id), {
          lastVisit: entryDate,
          totalTransactions: (existingCustomer.totalTransactions || 0) + 1
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          name: formData.customerName,
          phone: formData.customerPhone,
          address: formData.customerAddress,
          lastVisit: entryDate,
          totalTransactions: 1
        });
      }

      if (shouldPrint) {
        await printReceipt(transactionWithId);
      } else {
        // Auto WhatsApp
        const waMessage = settings.whatsappMessage
          .replace('{{no_nota}}', invoiceNo)
          .replace('{{nama}}', formData.customerName)
          .replace('{{layanan}}', serviceNameSummary)
          .replace('{{berat}}', totalWeight.toString())
          .replace('{{total}}', totalPrice.toLocaleString('id-ID'));
        
        window.open(getWhatsAppLink(formData.customerPhone, waMessage), '_blank');
      }

      setIsModalOpen(false);
      setFormData({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        items: [],
        notes: '',
        status: 'Masuk'
      });
      setCurrentItem({ serviceId: '', weight: 0 });
      showToast('Transaksi berhasil disimpan', 'success');
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, 'transactions');
      }
      console.error('Error saving transaction:', error);
      showToast('Gagal menyimpan transaksi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: OrderStatus, transaction: Transaction) => {
    try {
      await updateDoc(doc(db, 'transactions', id), { status: newStatus });
      
      if (newStatus === 'Selesai' && settings) {
        const waMessage = `Laundry Kakak sudah selesai ya 😊\nSilakan diambil / kami antar.\n\nNo Nota: ${transaction.invoiceNo}\nTotal: ${formatCurrency(transaction.totalPrice)}`;
        window.open(getWhatsAppLink(transaction.customerPhone, waMessage), '_blank');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`);
      }
      console.error('Error updating status:', error);
    }
  };

  const printReceipt = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsReceiptOpen(true);
    
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        const element = document.getElementById('receipt-content');
        if (element) {
          try {
            const canvas = await html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
              unit: 'mm',
              format: [58, Math.max(200, (canvas.height * 58) / canvas.width)]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, 58, (canvas.height * 58) / canvas.width);
            pdf.save(`Struk-${transaction.invoiceNo}.pdf`);
            
            const blobUrl = pdf.output('bloburl');
            window.open(blobUrl, '_blank');
          } catch (error) {
            console.error('Error generating PDF:', error);
            showToast('Gagal membuat PDF struk', 'error');
          }
        }
        setIsReceiptOpen(false);
        resolve();
      }, 500);
    });
  };

  const addItem = () => {
    const selectedService = services.find(s => s.id === currentItem.serviceId);
    if (!selectedService || currentItem.weight <= 0) return;

    const newItem: TransactionItem = {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      pricePerKg: selectedService.pricePerKg,
      costPerKg: selectedService.costPerKg || 0,
      weight: currentItem.weight,
      total: selectedService.pricePerKg * currentItem.weight,
      totalCost: (selectedService.costPerKg || 0) * currentItem.weight,
      profit: (selectedService.pricePerKg - (selectedService.costPerKg || 0)) * currentItem.weight
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setCurrentItem({ serviceId: '', weight: 0 });
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const filteredTransactions = transactions.filter(t => 
    t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Transaksi Laundry</h2>
          <p className="text-slate-500">Kelola pesanan laundry masuk dan keluar.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={20} />
          Transaksi Baru
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama pelanggan atau no nota..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100">
            <Filter size={18} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">No Nota</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pelanggan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Layanan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Berat</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-blue-600">{t.invoiceNo}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{format(new Date(t.entryDate), 'dd MMM yyyy')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{t.customerName}</p>
                    <p className="text-xs text-slate-500">{t.customerPhone}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {t.items ? (
                      <div className="max-w-[200px]">
                        <p className="truncate font-medium">{t.items[0].serviceName}</p>
                        {t.items.length > 1 && (
                          <p className="text-[10px] text-blue-600">+{t.items.length - 1} layanan lainnya</p>
                        )}
                      </div>
                    ) : (
                      t.serviceName
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                    {t.items ? t.items.reduce((sum, item) => sum + item.weight, 0).toFixed(1) : t.weight} kg
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{formatCurrency(t.totalPrice)}</td>
                  <td className="px-6 py-4">
                    <select 
                      value={t.status}
                      onChange={(e) => updateStatus(t.id, e.target.value as OrderStatus, t)}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-none focus:ring-0 cursor-pointer",
                        t.status === 'Masuk' && "bg-blue-50 text-blue-600",
                        t.status === 'Proses' && "bg-amber-50 text-amber-600",
                        t.status === 'Selesai' && "bg-emerald-50 text-emerald-600",
                        t.status === 'Diambil' && "bg-slate-100 text-slate-500"
                      )}
                    >
                      <option value="Masuk">Masuk</option>
                      <option value="Proses">Proses</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Diambil">Diambil</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => printReceipt(t)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Print Struk"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Kirim WA"
                        onClick={() => {
                          const waMessage = `Halo Kak ${t.customerName} 👋\nBerikut info laundry Anda:\n\nNo Nota: ${t.invoiceNo}\nStatus: ${t.status}\nTotal: ${formatCurrency(t.totalPrice)}\n\nTerima kasih 🙏`;
                          window.open(getWhatsAppLink(t.customerPhone, waMessage), '_blank');
                        }}
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-10" />
              <p>Tidak ada transaksi ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Transaksi Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Buat Transaksi Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Data Pelanggan</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Pelanggan</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                      value={formData.customerName}
                      onChange={(e) => {
                        setFormData({...formData, customerName: e.target.value});
                        handleCustomerSearch(e.target.value);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">No WhatsApp</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="0812..."
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Alamat (Opsional)</label>
                    <textarea 
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                    />
                  </div>
                </div>

                {/* Order Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Detail Pesanan</h4>
                  
                  {/* Add Item Section */}
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Layanan</label>
                        <select 
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                          value={currentItem.serviceId}
                          onChange={(e) => setCurrentItem({...currentItem, serviceId: e.target.value})}
                        >
                          <option value="">Pilih Layanan</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.pricePerKg)}/kg</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Berat (kg)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                            value={currentItem.weight || ''}
                            onChange={(e) => setCurrentItem({...currentItem, weight: parseFloat(e.target.value)})}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={addItem}
                          disabled={!currentItem.serviceId || currentItem.weight <= 0}
                          className="mt-5 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{item.serviceName}</p>
                          <p className="text-[10px] text-slate-500">{item.weight}kg x {formatCurrency(item.pricePerKg)}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <p className="text-sm font-bold text-blue-600">{formatCurrency(item.total)}</p>
                          <button 
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {formData.items.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                        <p className="text-xs text-slate-400">Belum ada layanan ditambahkan</p>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500">Total Bayar</span>
                      <span className="text-xl font-black text-blue-600">
                        {formatCurrency(formData.items.reduce((sum, item) => sum + item.total, 0))}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Catatan</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors order-3 sm:order-1"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  disabled={isLoading}
                  onClick={(e) => handleSubmit(e as any, true)}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 order-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      <Printer size={18} />
                      Simpan & Cetak
                    </>
                  )}
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 order-1 sm:order-3"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      <MessageCircle size={18} />
                      Simpan & WA
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Receipt for Printing */}
      {isReceiptOpen && selectedTransaction && settings && (
        <div className="fixed -left-[1000px] top-0">
          <Receipt transaction={selectedTransaction} settings={settings} />
        </div>
      )}
    </div>
  );
}
