import React, { useState } from 'react';
import { Droplets, LogIn, Loader2 } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('[v0] Login error details:', error);
      
      let errorMessage = 'Gagal masuk. Pastikan Anda menggunakan akun Google yang valid.';
      
      if (error instanceof Error) {
        if (error.message.includes('auth/popup-closed-by-user')) {
          errorMessage = 'Pop-up login ditutup. Silakan coba lagi.';
        } else if (error.message.includes('auth/popup-blocked')) {
          errorMessage = 'Pop-up login diblokir oleh browser. Harap izinkan pop-up untuk domain ini.';
        } else if (error.message.includes('auth/operation-not-allowed')) {
          errorMessage = 'Google Sign-in belum diaktifkan. Hubungi administrator.';
        } else if (error.message.includes('auth/invalid-api-key')) {
          errorMessage = 'Konfigurasi Firebase tidak valid. Harap periksa pengaturan.';
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-200 mx-auto mb-6 animate-bounce">
            <Droplets size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">LAUNDRY IBU TINI</h1>
          <p className="text-slate-500 mt-2">Sistem Kasir Laundry Profesional</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-800">Selamat Datang</h2>
            <p className="text-sm text-slate-500 mt-1">Silakan masuk untuk mengelola laundry Anda.</p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 hover:border-blue-100 hover:bg-blue-50 py-4 rounded-2xl font-bold text-slate-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="animate-spin text-blue-600" size={24} />
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                Masuk dengan Google
              </>
            )}
          </button>

          <div className="mt-8 pt-8 border-t border-slate-50 text-center">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Bersih • Wangi • Rapi</p>
          </div>
        </div>

        <p className="text-center mt-8 text-sm text-slate-400">
          &copy; 2024 Laundry Ibu Tini. All rights reserved.
        </p>
      </div>
    </div>
  );
}
