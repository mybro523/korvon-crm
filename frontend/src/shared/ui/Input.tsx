import { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...rest }: InputProps) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <input className={`field-input ${className ?? ''}`} {...rest} />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, children, className, ...rest }: SelectProps) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <select className={`field-select ${className ?? ''}`} {...rest}>
        {children}
      </select>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
