import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className ?? ''}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span
          className="spinner"
          style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'currentColor' }}
        />
      )}
      {children}
    </button>
  );
}
