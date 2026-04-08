import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorInfo = null;
      try {
        if (this.state.error?.message) {
          errorInfo = JSON.parse(this.state.error.message);
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h2>
            <p className="text-slate-500 mb-6">
              {errorInfo?.error || this.state.error?.message || 'Terjadi kesalahan sistem yang tidak terduga.'}
            </p>
            
            {errorInfo && (
              <div className="bg-slate-50 p-4 rounded-xl text-left mb-6 overflow-auto max-h-40">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Detail Teknis</p>
                <pre className="text-[10px] font-mono text-slate-600 whitespace-pre-wrap">
                  {JSON.stringify(errorInfo, null, 2)}
                </pre>
              </div>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    const { children } = this.props;
    return children;
  }
}
