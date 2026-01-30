'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const toastStyles: Record<ToastType, { bg: string; icon: ReactNode; border: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: <FaCheckCircle className="text-emerald-500 text-lg flex-shrink-0" />,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    icon: <FaExclamationCircle className="text-red-500 text-lg flex-shrink-0" />,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <FaInfoCircle className="text-blue-500 text-lg flex-shrink-0" />,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <FaExclamationCircle className="text-amber-500 text-lg flex-shrink-0" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // 자동으로 3초 후 사라짐
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const style = toastStyles[toast.type];
          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto
                flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm
                ${style.bg} ${style.border}
                animate-slideIn
              `}
              role="alert"
            >
              {style.icon}
              <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
