import React, { ReactNode } from 'react';

import { IconX } from '../icons/IconComponents';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
}

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>

        <main className="space-y-4 overflow-y-auto p-6">{children}</main>

        <footer className="flex flex-shrink-0 items-center justify-between border-t border-slate-700 bg-slate-800 p-4">
          {footer}
        </footer>
      </div>
    </div>
  );
};

export default BaseModal;
