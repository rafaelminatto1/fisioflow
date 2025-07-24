import React, { useState } from 'react';
import { DestructiveConfirmationModalProps } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import { IconAlertTriangle } from './icons/IconComponents';

const DestructiveConfirmationModal: React.FC<DestructiveConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmationWord,
}) => {
    const [input, setInput] = useState('');
    const isConfirmed = input === confirmationWord;

    const footer = (
        <div className="flex w-full justify-between items-center">
            <Button variant="secondary" onClick={onClose}>
                Cancelar
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={!isConfirmed}>
                Confirmar Ação
            </Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <IconAlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
                    <p className="text-sm text-red-200">{message}</p>
                </div>
                <div className="space-y-2">
                    <label htmlFor="confirmation-input" className="text-sm font-medium text-slate-300">
                        Para confirmar, digite <strong className="text-red-400">{confirmationWord}</strong> abaixo:
                    </label>
                    <input
                        type="text"
                        id="confirmation-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-red-500 outline-none transition"
                        autoComplete="off"
                    />
                </div>
            </div>
        </BaseModal>
    );
};

export default DestructiveConfirmationModal;
