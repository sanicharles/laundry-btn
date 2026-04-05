import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  MapPin, 
  History,
  ExternalLink,
  MoreVertical,
  Edit2,
  Trash2
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Customer } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/utils';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'customers'), orderBy('name', 'asc')), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'customers');
    });
    return () => unsub();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Data Pelanggan</h2>
          <p className="text-slate-500">Daftar riwayat pelanggan Laundry Ibu Tini.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama atau nomor HP..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.map((c) => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>
            
            <h3 className="font-bold text-slate-800 text-lg mb-1">{c.name}</h3>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Phone size={14} />
                {c.phone}
              </div>
              {c.address && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">{c.address}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kunjungan Terakhir</p>
                <p className="text-xs font-medium text-slate-700">
                  {c.lastVisit ? format(new Date(c.lastVisit), 'dd MMM yyyy', { locale: id }) : '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Order</p>
                <p className="text-xs font-medium text-slate-700">{c.totalTransactions || 0} Kali</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Lihat Riwayat
              </button>
              <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Users size={48} className="mx-auto mb-4 opacity-10" />
          <p>Belum ada data pelanggan</p>
        </div>
      )}
    </div>
  );
}
