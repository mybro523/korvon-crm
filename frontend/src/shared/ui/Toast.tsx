import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { Icon } from './Icon';

interface ToastItem {
  id: number;
  text: string;
  kind: 'success' | 'error';
}

interface ToastContextValue {
  success: (text: string) => void;
  error: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((text: string, kind: 'success' | 'error') => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 4200);
  }, []);

  const success = useCallback((text: string) => push(text, 'success'), [push]);
  const error = useCallback((text: string) => push(text, 'error'), [push]);

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="toast-stack">
        {items.map((i) => (
          <div key={i.id} className={`toast ${i.kind === 'error' ? 'error' : ''}`}>
            <Icon
              name={i.kind === 'error' ? 'alert' : 'check'}
              size={17}
              className=""
            />
            <span>{i.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
