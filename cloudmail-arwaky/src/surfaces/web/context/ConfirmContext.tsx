// surfaces/web/context/ConfirmContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
  return context;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setModalState({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalState?.isOpen) {
        handleCancel();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (modalState?.isOpen) {
        modalState.resolve(false);
      }
    };
  }, [modalState]);

  const handleConfirm = () => {
    if (modalState) {
      modalState.resolve(true);
      setModalState(null);
    }
  };

  const handleCancel = () => {
    if (modalState) {
      modalState.resolve(false);
      setModalState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalState?.isOpen && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className={`material-symbols-outlined ${modalState.options.type === 'danger' ? 'danger' : ''}`}>
                {modalState.options.type === 'danger' ? 'report' : 'help'}
              </span>
              <h3 className="modal-title">{modalState.options.title || 'Confirmation'}</h3>
            </div>
            <div className="modal-body">
              {modalState.options.message}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={handleCancel}>
                {modalState.options.cancelText || 'Cancel'}
              </button>
              <button 
                className={`btn ${modalState.options.type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
                onClick={handleConfirm}
              >
                {modalState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
