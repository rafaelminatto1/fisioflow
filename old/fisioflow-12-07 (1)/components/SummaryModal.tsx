
import React from 'react';
import { SummaryModalProps } from '/types.js';
import BaseModal from '/components/ui/BaseModal.js';
import Button from '/components/ui/Button.js';
import { IconSparkles } from '/components/icons/IconComponents.js';

const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose, title, content, isLoading }) => {
    
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleCopy}>Copiar Texto</Button>
            <Button onClick={onClose}>Fechar</Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <IconSparkles className="animate-spin text-blue-400" size={32} />
                    <p className="mt-4 text-slate-300">Gerando resumo, por favor aguarde...</p>
                </div>
            ) : (
                 <div className="prose prose-sm prose-invert max-w-none text-slate-300 whitespace-pre-wrap">
                    {content}
                 </div>
            )}
        </BaseModal>
    );
};

export default SummaryModal;