import { createContext, useCallback, useContext, useState } from 'react';
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3600);
  }, []);
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </ToastContext.Provider>
  );
}
