import React from 'react';
import { XIcon } from '../Icons';

type StatusVariant = 'success' | 'error' | 'warning' | 'info';

const variantClasses: Record<StatusVariant, string> = {
  success: 'border-green-300 bg-green-50 text-green-700',
  error: 'border-red-300 bg-red-50 text-red-700',
  warning: 'border-amber-300 bg-amber-50 text-amber-700',
  info: 'border-blue-300 bg-blue-50 text-blue-700',
};

interface StatusToastProps {
  title?: string;
  message: string;
  variant?: StatusVariant;
  onClose?: () => void;
}

export const StatusToast: React.FC<StatusToastProps> = ({
  title,
  message,
  variant = 'info',
  onClose,
}) => {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg transition transform ${variantClasses[variant]}`} role="status" aria-live="polite">
      <div className="flex-1">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="mt-1 text-sm uppercase tracking-wide text-inherit hover:opacity-80"
          aria-label="Luk besked"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
};
