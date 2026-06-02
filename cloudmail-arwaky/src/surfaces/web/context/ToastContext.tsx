// surfaces/web/context/ToastContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeouts.current.delete(id);
    }, 4000);
    
    timeouts.current.set(id, timeout);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timeouts.current.has(id)) {
      clearTimeout(timeouts.current.get(id));
      timeouts.current.delete(id);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current.clear();
    };
  }, []);

   return (
     <ToastContext.Provider value={{ showToast }}>
       {children}
       <div className="toast-container" role="status" aria-live="polite">
         {toasts.map((toast) => (
           <div key={toast.id} className={`toast toast-${toast.type}`}>
             <span className="material-symbols-outlined">
               {toast.type === 'success' ? 'check_circle' : 
                toast.type === 'error' ? 'error' : 
                toast.type === 'warning' ? 'warning' : 'info'}
             </span>
             <span className="toast-message">{toast.message}</span>
             <button className="toast-close" onClick={() => removeToast(toast.id)}>
               <span className="material-symbols-outlined">close</span>
             </button>
           </div>
         ))}
       </div>
     </ToastContext.Provider>
   );
};
