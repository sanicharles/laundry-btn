import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100',
    error: 'bg-red-50 border-red-100',
    info: 'bg-blue-50 border-blue-100'
  };

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg animate-in slide-in-from-right-full duration-300",
      bgColors[type]
    )}>
      {icons[type]}
      <p className="text-sm font-bold text-slate-700">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
        <X size={16} className="text-slate-400" />
      </button>
    </div>
  );
}
