import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { Loader2 } from 'lucide-react';
import { collection, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import Toast, { ToastType } from './components/Toast';
import { handleFirestoreError, OperationType } from './lib/utils';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthReady(true);

      if (user) {
        try {
          // Initialize default services if empty
          const servicesSnap = await getDocs(collection(db, 'services'));
          if (servicesSnap.empty) {
            const defaultServices = [
              { name: 'Cuci + Setrika', pricePerKg: 5000, description: 'Layanan cuci bersih dan setrika rapi' },
              { name: 'Setrika Saja', pricePerKg: 4000, description: 'Layanan setrika rapi saja' }
            ];
            for (const s of defaultServices) {
              await setDoc(doc(collection(db, 'services')), s);
            }
          }

          // Initialize default settings if empty
          const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
          if (!settingsDoc.exists()) {
            await setDoc(doc(db, 'settings', 'main'), {
              laundryName: 'Laundry Kita',
              address: 'Jl. Contoh No. 123, Kota',
              phone: '08123456789',
              whatsappMessage: 'Halo {{nama}},\n\nPesanan laundry Anda dengan No. Nota {{no_nota}} ({{layanan}}) seberat {{berat}}kg telah kami terima.\n\nTotal: {{total}}\n\nTerima kasih telah menggunakan layanan kami!',
              nextInvoiceNo: 1
            });
          }
        } catch (error) {
          // Only handle if it's a permission error, otherwise just log
          if (error instanceof Error && error.message.includes('permission')) {
            handleFirestoreError(error, OperationType.GET, 'services');
          } else {
            console.error('Error initializing services:', error);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Menyiapkan aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'transactions': return <Transactions showToast={showToast} />;
      case 'customers': return <Customers />;
      case 'settings': return <Settings showToast={showToast} />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout activePage={activePage} setActivePage={setActivePage}>
        {renderPage()}
      </Layout>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </ErrorBoundary>
  );
}
