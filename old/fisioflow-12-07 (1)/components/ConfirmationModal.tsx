
import React from 'react';
import { ConfirmationModalProps } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import { IconAlertTriangle } from './icons/IconComponents';

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmTextSingle = 'Apenas este',
    confirmTextAll = 'Toda a série',
}) => {
    if (!isOpen) return null;

    const footer = (
        <div className="flex w-full justify-between items-center">
            <Button variant="secondary" onClick={onClose}>
                Cancelar
            </Button>
            <div className="flex gap-3">
                 <Button variant="ghost" onClick={() => onConfirm('single')}>
                    {confirmTextSingle}
                </Button>
                <Button variant="danger" onClick={() => onConfirm('all')}>
                    {confirmTextAll}
                </Button>
            </div>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-500/10">
                    <IconAlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div className="flex-1">
                    <p className="text-sm text-slate-300">
                        {message}
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default ConfirmationModal;
