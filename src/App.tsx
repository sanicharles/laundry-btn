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
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import Toast, { ToastType } from './components/Toast';
import { handleFirestoreError, OperationType } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [fallbackUser, setFallbackUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  // Listen for fallback login events
  useEffect(() => {
    const handleFallbackLogin = (event: CustomEvent) => {
      setFallbackUser(event.detail.user);
      setIsAuthReady(true);
    };

    window.addEventListener('fallback_login', handleFallbackLogin as EventListener);
    
    // Check if there's already a fallback session stored
    const storedFallbackUser = localStorage.getItem('fallback_user');
    if (storedFallbackUser) {
      try {
        setFallbackUser(JSON.parse(storedFallbackUser));
        setIsAuthReady(true);
      } catch (e) {
        console.error('Failed to parse fallback user:', e);
      }
    }

    return () => {
      window.removeEventListener('fallback_login', handleFallbackLogin as EventListener);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        setFallbackUser(null);
        setIsAuthReady(true);

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
        } catch (error) {
          // Only handle if it's a permission error, otherwise just log
          if (error instanceof Error && error.message.includes('permission')) {
            handleFirestoreError(error, OperationType.GET, 'services');
          } else {
            console.error('Error initializing services:', error);
          }
        }
      } else if (!fallbackUser) {
        // Only set as not ready if both Firebase user and fallback user are missing
        setIsAuthReady(false);
      }
    });
    return () => unsubscribe();
  }, [fallbackUser]);

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

  if (!user && !fallbackUser) {
    return <Login />;
  }

  // Use Firebase user if available, otherwise use fallback user
  const currentUser = user || fallbackUser;

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
    <>
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
    </>
  );
}
