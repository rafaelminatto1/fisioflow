

import React from 'react';
import { ProtocolDetailModalProps } from '../types';
import { useExercises } from '../hooks/useExercises';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const ProtocolDetailModal: React.FC<ProtocolDetailModalProps> = ({ isOpen, onClose, onEdit, protocol }) => {
    const { exercises = [] } = useExercises();

    if (!isOpen || !protocol) return null;

    const associatedExercises = exercises.filter(ex => protocol.exerciseIds?.includes(ex.id));

    const footer = (
        <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
            <Button onClick={() => onEdit(protocol)}>Editar Protocolo</Button>
        </div>
    );
    
    const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
        <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-400 uppercase">{title}</h4>
            <div className="text-slate-200 whitespace-pre-wrap">{children}</div>
        </div>
    );
    
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={protocol.name} footer={footer}>
            <div className="space-y-6">
                <Section title="Descrição">
                    {protocol.description || <i className="text-slate-500">Sem descrição.</i>}
                </Section>
                
                <div className="pt-4 border-t border-slate-700">
                    <h3 className="text-base font-semibold text-slate-300 mb-2">Modelo de Nota (SOAP)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Section title="Subjetivo (S)">{protocol.subjective || <i className="text-slate-500">Vazio.</i>}</Section>
                        <Section title="Objetivo (O)">{protocol.objective || <i className="text-slate-500">Vazio.</i>}</Section>
                        <Section title="Avaliação (A)">{protocol.assessment || <i className="text-slate-500">Vazio.</i>}</Section>
                        <Section title="Plano (P)">{protocol.plan || <i className="text-slate-500">Vazio.</i>}</Section>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                     <h3 className="text-base font-semibold text-slate-300 mb-2">Estrutura do Tratamento</h3>
                     {protocol.phases && protocol.phases.length > 0 ? (
                        <div className="space-y-4">
                            {protocol.phases.map((phase) => {
                                const phaseExercises = exercises.filter(ex => phase.exerciseIds.includes(ex.id));
                                return (
                                    <div key={phase.id} className="p-3 bg-slate-900/50 rounded-md border border-slate-700">
                                        <h4 className="font-semibold text-slate-200">{phase.name} <span className="text-sm text-slate-400 font-normal">({phase.durationDays} dias)</span></h4>
                                        {phaseExercises.length > 0 ? (
                                            <ul className="list-disc list-inside pl-4 mt-1 text-sm text-slate-300">
                                                {phaseExercises.map(ex => <li key={ex.id}>{ex.name}</li>)}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic mt-1">Nenhum exercício nesta fase.</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div>
                            <h4 className="text-base font-semibold text-slate-300 mb-2">Exercícios Associados</h4>
                            {associatedExercises.length > 0 ? (
                                <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {associatedExercises.map(ex => (
                                        <li key={ex.id} className="p-2 bg-slate-900/50 rounded-md text-slate-300">{ex.name}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-500 italic">Nenhum exercício associado a este protocolo.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};

export default ProtocolDetailModal;