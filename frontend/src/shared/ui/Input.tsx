import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useState } from 'react';
import { Icon } from './Icon';

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

/** поле пароля с «глазком» показать/скрыть */
export function PasswordInput({ label, error, className, ...rest }: InputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <div className="password-wrap">
        <input
          className={`field-input ${className ?? ''}`}
          type={visible ? 'text' : 'password'}
          {...rest}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Пинҳон кардан' : 'Нишон додан'}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={19} />
        </button>
      </div>
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
