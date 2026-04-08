import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Plus, 
  Trash2, 
  MessageSquare,
  Store,
  Phone,
  MapPin,
  Tag,
  Loader2,
  X,
  Edit2
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Service, AppSettings } from '../types';
import { formatCurrency, handleFirestoreError, OperationType } from '../lib/utils';
import { ToastType } from '../components/Toast';

interface SettingsProps {
  showToast: (message: string, type: ToastType) => void;
}

export default function Settings({ showToast }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [isDeletingService, setIsDeletingService] = useState<string | null>(null);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      } else {
        // If it doesn't exist, it should be initialized by App.tsx, 
        // but we can set a fallback here to avoid infinite loading
        setSettings({
          laundryName: 'Laundry Kita',
          address: '',
          phone: '',
          whatsappMessage: '',
          nextInvoiceNo: 1
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/main');
    });

    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'services');
    });

    return () => {
      unsubSettings();
      unsubServices();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'main'), { ...settings });
      showToast('Pengaturan berhasil disimpan', 'success');
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.UPDATE, 'settings/main');
      }
      console.error('Error saving settings:', error);
      showToast('Gagal menyimpan pengaturan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.name || !editingService?.pricePerKg) return;

    try {
      if (editingService.id) {
        await updateDoc(doc(db, 'services', editingService.id), {
          name: editingService.name,
          pricePerKg: editingService.pricePerKg,
          costPerKg: editingService.costPerKg || 0
        });
        showToast('Layanan berhasil diperbarui', 'success');
      } else {
        await addDoc(collection(db, 'services'), {
          name: editingService.name,
          pricePerKg: editingService.pricePerKg,
          costPerKg: editingService.costPerKg || 0,
          description: ''
        });
        showToast('Layanan berhasil ditambahkan', 'success');
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, 'services');
      }
      console.error('Error saving service:', error);
      showToast('Gagal menyimpan layanan', 'error');
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'services', id));
      showToast('Layanan berhasil dihapus', 'success');
      setIsDeletingService(null);
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.DELETE, `services/${id}`);
      }
      console.error('Error deleting service:', error);
      showToast('Gagal menghapus layanan', 'error');
    }
  };

  if (!settings) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pengaturan Aplikasi</h2>
        <p className="text-slate-500">Konfigurasi profil laundry, harga, dan pesan otomatis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-wider text-sm">
            <Store size={18} />
            Profil Laundry
          </div>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Laundry</label>
              <input 
                type="text" 
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                value={settings.laundryName}
                onChange={(e) => setSettings({...settings, laundryName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Alamat</label>
              <textarea 
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                value={settings.address}
                onChange={(e) => setSettings({...settings, address: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">No WhatsApp</label>
              <input 
                type="text" 
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                value={settings.phone}
                onChange={(e) => setSettings({...settings, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Format Pesan WhatsApp</label>
              <textarea 
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 h-40 font-mono text-xs leading-relaxed"
                value={settings.whatsappMessage}
                onChange={(e) => setSettings({...settings, whatsappMessage: e.target.value})}
              />
              <p className="mt-2 text-[10px] text-slate-400 italic">Gunakan variabel: {"{{no_nota}}, {{nama}}, {{layanan}}, {{berat}}, {{total}}"}</p>
            </div>
            <button 
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Simpan Perubahan
            </button>
          </form>
        </div>

        {/* Service Management */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-wider text-sm">
              <Tag size={18} />
              Manajemen Layanan
            </div>
            <button 
              onClick={() => {
                setEditingService({ name: '', pricePerKg: 0 });
                setIsServiceModalOpen(true);
              }}
              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl group">
                <div>
                  <p className="font-bold text-slate-800">{s.name}</p>
                  <div className="flex gap-3 text-xs font-semibold">
                    <p className="text-blue-600">Jual: {formatCurrency(s.pricePerKg)}</p>
                    <p className="text-slate-400">Modal: {formatCurrency(s.costPerKg || 0)}</p>
                    <p className="text-emerald-600">Profit: {formatCurrency((s.pricePerKg || 0) - (s.costPerKg || 0))}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingService(s);
                      setIsServiceModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setIsDeletingService(s.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Tag size={40} className="mx-auto mb-2 opacity-10" />
                <p className="text-sm">Belum ada layanan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">
                {editingService?.id ? 'Edit Layanan' : 'Tambah Layanan'}
              </h3>
              <button 
                onClick={() => setIsServiceModalOpen(false)} 
                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Layanan</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={editingService?.name || ''}
                  onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Harga Jual per Kg</label>
                <input 
                  type="number" 
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={editingService?.pricePerKg || ''}
                  onChange={(e) => setEditingService({...editingService, pricePerKg: Number(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Harga Modal per Kg</label>
                <input 
                  type="number" 
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                  value={editingService?.costPerKg || ''}
                  onChange={(e) => setEditingService({...editingService, costPerKg: Number(e.target.value) || 0})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeletingService && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Layanan?</h3>
            <p className="text-slate-500 mb-8">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeletingService(null)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => handleDeleteService(isDeletingService)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
