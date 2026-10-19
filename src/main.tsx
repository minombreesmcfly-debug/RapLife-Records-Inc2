import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global Safety Interceptors for Restricted Sandboxed / Offline environments
const originalConsoleError = console.error;
console.error = function (...args) {
  const msg = args.map(arg => {
    if (arg instanceof Error) {
      return arg.message + " " + arg.stack;
    }
    return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
  }).join(' ');

  if (
    msg.includes('the client is offline') || 
    msg.includes('Failed to get document') || 
    msg.includes('client is offline') ||
    msg.includes('IndexedDB transaction') ||
    msg.includes('IndexedDbTransactionError')
  ) {
    console.warn("[SANDBOX OFFLINE INTERCEPTED]", ...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  if (
    message.includes('the client is offline') || 
    message.includes('Failed to get document') || 
    message.includes('client is offline') ||
    message.includes('IndexedDbTransactionError')
  ) {
    console.warn("[UNHANDLED OFFLINE REJECTION]:", message);
    event.preventDefault(); // Prevent crash signature propagation
  }
});

window.addEventListener('error', (event) => {
  const message = event.error instanceof Error ? event.error.message : event.message;
  if (
    message.includes('the client is offline') || 
    message.includes('Failed to get document') || 
    message.includes('client is offline') ||
    message.includes('IndexedDbTransactionError')
  ) {
    console.warn("[UNHANDLED OFFLINE ERROR]:", message);
    event.preventDefault(); // Suppress runtime exception crash state
  }
});

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RAPLIFE ROOT ERROR BOUNDARY CAUGHT]:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-full bg-brand-yellow/20 border-2 border-brand-yellow flex items-center justify-center mb-4">
            <img src="/assets/Logo.png" alt="RapLife" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-brand-yellow mb-2">
            RAPLIFE RECORDS INC.
          </h1>
          <p className="text-xs text-gray-400 max-w-md mb-6 uppercase tracking-wider font-mono">
            Sintonizando señal de la radio... Haz clic abajo para recargar y restablecer la conexión.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('raplife_demo_session');
                } catch (_) {}
                window.location.reload();
              }}
              className="px-6 py-3 bg-brand-yellow text-black font-black uppercase text-xs rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(248,251,2,0.3)] cursor-pointer"
            >
              🔄 Recargar Sitio Web
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
              className="px-4 py-3 bg-white/10 text-white font-black uppercase text-xs rounded-xl hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
