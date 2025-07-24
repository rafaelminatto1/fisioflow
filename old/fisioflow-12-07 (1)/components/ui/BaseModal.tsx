
import React, { ReactNode } from 'react';
import { usePreventBodyScroll } from '/hooks/usePreventBodyScroll.js';
import { IconX } from '/components/icons/IconComponents.js';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer: ReactNode;
}

const BaseModal: React.FC<BaseModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    usePreventBodyScroll(isOpen);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" 
            role="dialog" 
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700 animate-modal-in"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" aria-label="Fechar modal">
                        <IconX size={20} />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto space-y-4">
                    {children}
                </main>
                
                <footer className="flex items-center justify-between p-4 bg-slate-800 border-t border-slate-700 flex-shrink-0">
                    {footer}
                </footer>
            </div>
        </div>
    );
};

export default BaseModal;