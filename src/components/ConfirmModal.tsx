'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from './Icons';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  const variantStyles = {
    danger: {
      bg: '#ff6b6b',
      bgLight: 'rgba(255, 107, 107, 0.1)',
      color: '#ff6b6b',
    },
    warning: {
      bg: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.1)',
      color: '#f59e0b',
    },
    info: {
      bg: '#4d96ff',
      bgLight: 'rgba(77, 150, 255, 0.1)',
      color: '#4d96ff',
    },
  };

  const styles = variantStyles[variant];

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl animate-slideUp overflow-hidden bg-white"
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-lg transition-colors hover:bg-gray-100 z-10"
          style={{ color: styles.color }}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>

        <div className="p-6 pt-8 text-center">
          {/* Icon */}
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center"
            style={{ background: styles.bgLight }}
          >
            <XMarkIcon className="w-7 h-7" style={{ color: styles.color }} />
          </div>

          {/* Title */}
          <h3
            className="text-lg font-bold mb-2"
            style={{
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              color: styles.color,
            }}
          >
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200"
              style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors hover:opacity-90"
              style={{
                background: styles.bg,
                fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
