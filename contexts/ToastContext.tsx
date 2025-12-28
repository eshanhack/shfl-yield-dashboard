"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const COLORS = {
  success: "bg-terminal-positive/20 border-terminal-positive/50 text-terminal-positive",
  error: "bg-terminal-negative/20 border-terminal-negative/50 text-terminal-negative",
  warning: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
  info: "bg-terminal-accent/20 border-terminal-accent/50 text-terminal-accent",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast, index) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto
                flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm
                shadow-lg shadow-black/20
                animate-toast-enter
                min-w-[280px] max-w-[400px]
                ${COLORS[toast.type]}
              `}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
              role="alert"
              aria-live="polite"
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1 text-terminal-text">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

