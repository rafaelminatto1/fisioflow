
import React from 'react';
import { ExerciseHistoryModalProps } from '/types.js';
import BaseModal from '/components/ui/BaseModal.js';
import Button from '/components/ui/Button.js';

const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({ isOpen, onClose, exercise, logs }) => {
    if (!isOpen) return null;

    const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const footer = (
         <div className="flex justify-end w-full">
            <Button onClick={onClose}>Fechar</Button>
        </div>
    );

    return (
       <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Histórico de: ${exercise.name}`}
            footer={footer}
        >
             {sortedLogs.length > 0 ? (
                <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {sortedLogs.map(log => (
                        <li key={log.id} className="bg-slate-900/70 p-4 rounded-md border border-slate-700">
                            <p className="font-semibold text-slate-200 mb-2">
                                {new Date(log.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-2">
                                <div className="text-sm">
                                    <span className="text-slate-400">Dor: </span>
                                    <span className="font-bold text-slate-100">{log.painLevel}/10</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-slate-400">Dificuldade: </span>
                                    <span className="font-bold text-slate-100">{log.difficultyLevel}/10</span>
                                </div>
                            </div>
                            {log.notes && (
                                <p className="text-sm text-slate-300 bg-slate-800 p-2 rounded-md whitespace-pre-wrap">
                                    "{log.notes}"
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-10">
                    <p className="text-slate-400">Nenhum registro de progresso encontrado para este exercício.</p>
                </div>
            )}
        </BaseModal>
    );
};

export default ExerciseHistoryModal;