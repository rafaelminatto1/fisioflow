import React from 'react';
import { AppointmentLogModalProps } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const AppointmentLogModal: React.FC<AppointmentLogModalProps> = ({ isOpen, onClose, logs }) => {
    
    const footer = (
        <div className="flex justify-end gap-3">
            <Button onClick={onClose}>Fechar</Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Histórico de Alterações" footer={footer}>
            {logs.length > 0 ? (
                <ul className="space-y-4">
                    {logs.map(log => (
                        <li key={log.id} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                                {log.userName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm">
                                    <strong className="text-slate-200">{log.userName}</strong>
                                    <span className="text-slate-400"> {log.action} o agendamento.</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                                </p>
                                <p className="text-xs text-slate-300 mt-1 italic">
                                    Detalhes: {log.details}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center text-slate-400 p-8">
                    <p>Nenhum histórico de alterações para este agendamento.</p>
                </div>
            )}
        </BaseModal>
    );
};

export default AppointmentLogModal;
