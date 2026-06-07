import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ToastType = 'error' | 'success';

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Axiosインターセプター（Reactコンテキスト外）からのイベントを受け取る
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      showToast(detail.message, 'error');
    };
    window.addEventListener('api-error', handler);
    return () => window.removeEventListener('api-error', handler);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg ${
              t.type === 'success' ? 'bg-[#00ba7c]' : 'bg-[#f4212e]'
            }`}
          >
            <span>{t.type === 'success' ? '✓' : '✕'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
