

import React, { useState, useMemo } from 'react';
import { ClinicalProtocol, Exercise, ProtocolPhase } from '../types';
import { useClinicalProtocols } from '../hooks/useClinicalProtocols';
import { IconPlus, IconFileText, IconPencil, IconTrash, IconActivity, IconAlertTriangle, IconSearch } from './icons/IconComponents';
import EmptyState from './ui/EmptyState';
import BaseModal from './ui/BaseModal';
import FormField from './ui/FormField';
import Button from './ui/Button';
import { useExercises } from '../hooks/useExercises';
import ProtocolDetailModal from './ProtocolDetailModal';
import Skeleton from './ui/Skeleton';

const ProtocolModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (protocol: ClinicalProtocol) => void;
    protocol: Partial<ClinicalProtocol> | null;
}> = ({ isOpen, onClose, onSave, protocol }) => {
    const [editedProtocol, setEditedProtocol] = useState<Partial<ClinicalProtocol> | null>(protocol);
    const { exercises = [] } = useExercises();
    const [exerciseFilters, setExerciseFilters] = useState<Record<string, string>>({});

    React.useEffect(() => {
        setEditedProtocol(protocol);
    }, [protocol]);

    if (!isOpen || !editedProtocol) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumeric = name === 'defaultPrice';
        setEditedProtocol(prev => prev ? { ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value } : null);
    };

    const handleAddPhase = () => {
        setEditedProtocol(prev => {
            if (!prev) return null;
            const newPhase: ProtocolPhase = {
                id: `phase-${crypto.randomUUID()}`,
                name: `Fase ${(prev.phases?.length || 0) + 1}`,
                durationDays: 14,
                exerciseIds: []
            };
            return { ...prev, phases: [...(prev.phases || []), newPhase] };
        });
    };

    const handleRemovePhase = (phaseId: string) => {
        setEditedProtocol(prev => {
            if (!prev) return null;
            return { ...prev, phases: (prev.phases || []).filter(p => p.id !== phaseId) };
        });
    };

    const handlePhaseChange = (phaseId: string, field: 'name' | 'durationDays', value: string | number) => {
        setEditedProtocol(prev => {
            if (!prev) return null;
            const newPhases = (prev.phases || []).map(p =>
                p.id === phaseId ? { ...p, [field]: value } : p
            );
            return { ...prev, phases: newPhases };
        });
    };
    
    const handlePhaseExerciseToggle = (phaseId: string, exerciseId: string) => {
        setEditedProtocol(prev => {
            if (!prev) return null;
            const newPhases = (prev.phases || []).map(p => {
                if (p.id === phaseId) {
                    const currentIds = p.exerciseIds || [];
                    const newIds = currentIds.includes(exerciseId)
                        ? currentIds.filter(id => id !== exerciseId)
                        : [...currentIds, exerciseId];
                    return { ...p, exerciseIds: newIds };
                }
                return p;
            });
            return { ...prev, phases: newPhases };
        });
    };

     const handleExerciseFilterChange = (phaseId: string, value: string) => {
        setExerciseFilters(prev => ({ ...prev, [phaseId]: value }));
    };

    const handleSave = () => {
        if (editedProtocol.name?.trim()) {
            // Consolidate exerciseIds from phases into the main exerciseIds for backwards compatibility or simple views
            const allExerciseIds = (editedProtocol.phases || []).flatMap(p => p.exerciseIds);
            const finalProtocol = {
                ...editedProtocol,
                exerciseIds: Array.from(new Set(allExerciseIds))
            };
            onSave(finalProtocol as ClinicalProtocol);
        }
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Protocolo</Button>
        </div>
    );
    
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={editedProtocol.id ? 'Editar Protocolo' : 'Novo Protocolo'} footer={footer}>
            <div className="space-y-4">
                 <FormField
                    label="Nome do Protocolo" name="name" id="name"
                    value={editedProtocol.name || ''} onChange={handleChange}
                    placeholder="Ex: Pós-operatório de LCA"
                />
                 <FormField
                    as="textarea" label="Descrição" name="description" id="description"
                    value={editedProtocol.description || ''} onChange={handleChange} rows={2}
                    placeholder="Descrição breve do protocolo"
                />
                <FormField
                    type="number" label="Preço Padrão (Opcional)" name="defaultPrice" id="defaultPrice"
                    value={String(editedProtocol.defaultPrice || '')} onChange={handleChange}
                />
                
                <h3 className="text-sm font-semibold text-slate-300 pt-2 border-t border-slate-700">Modelo de Nota (SOAP)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField as="textarea" label="Subjetivo (S)" name="subjective" id="subjective" value={editedProtocol.subjective || ''} onChange={handleChange} rows={2} />
                    <FormField as="textarea" label="Objetivo (O)" name="objective" id="objective" value={editedProtocol.objective || ''} onChange={handleChange} rows={2} />
                    <FormField as="textarea" label="Avaliação (A)" name="assessment" id="assessment" value={editedProtocol.assessment || ''} onChange={handleChange} rows={2} />
                    <FormField as="textarea" label="Plano (P)" name="plan" id="plan" value={editedProtocol.plan || ''} onChange={handleChange} rows={2} />
                </div>

                 <h3 className="text-sm font-semibold text-slate-300 pt-2 border-t border-slate-700">Fases do Tratamento</h3>
                 <div className="space-y-4">
                     {(editedProtocol.phases || []).map(phase => (
                         <div key={phase.id} className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 space-y-3">
                             <div className="flex justify-between items-center">
                                 <h4 className="font-semibold text-blue-300">Fase: {phase.name}</h4>
                                 <Button variant="ghost" size="sm" onClick={() => handleRemovePhase(phase.id)} icon={<IconTrash />} />
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <FormField label="Nome da Fase" name="name" id={`phase-name-${phase.id}`}
                                     value={phase.name} onChange={(e) => handlePhaseChange(phase.id, 'name', e.target.value)} />
                                 <FormField type="number" label="Duração (dias)" name="durationDays" id={`phase-duration-${phase.id}`}
                                     value={String(phase.durationDays)} onChange={(e) => handlePhaseChange(phase.id, 'durationDays', parseInt(e.target.value, 10) || 0)} />
                             </div>
                             <div>
                                 <label className="text-xs font-semibold text-slate-400">Exercícios da Fase</label>
                                 <input type="text" placeholder="Buscar exercício para adicionar..."
                                     onChange={(e) => handleExerciseFilterChange(phase.id, e.target.value)}
                                     className="w-full mt-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none transition"
                                 />
                                 <div className="max-h-40 overflow-y-auto space-y-1 p-2 mt-2 bg-slate-800/50 rounded-md">
                                     {exercises.filter(ex => ex.name.toLowerCase().includes((exerciseFilters[phase.id] || '').toLowerCase())).map(ex => (
                                         <label key={ex.id} className="flex items-center gap-3 p-1.5 rounded-md hover:bg-slate-700/50 cursor-pointer">
                                             <input type="checkbox"
                                                 checked={phase.exerciseIds.includes(ex.id)}
                                                 onChange={() => handlePhaseExerciseToggle(phase.id, ex.id)}
                                                 className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-blue-500 focus:ring-blue-600"
                                             />
                                             <span className="text-sm">{ex.name}</span>
                                         </label>
                                     ))}
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
                 <Button variant="ghost" onClick={handleAddPhase} icon={<IconPlus />}>Adicionar Fase</Button>
            </div>
        </BaseModal>
    );
};

const ProtocolsPage: React.FC = () => {
    const { protocols = [], saveProtocol, deleteProtocol, isLoading, isError } = useClinicalProtocols();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProtocol, setSelectedProtocol] = useState<Partial<ClinicalProtocol> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProtocols = useMemo(() => {
        if (!protocols) return [];
        return protocols.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [protocols, searchTerm]);

    const handleOpenDetailModal = (protocol: ClinicalProtocol) => {
        setSelectedProtocol(protocol);
        setIsDetailModalOpen(true);
    };
    
    const handleOpenEditModal = (protocol: Partial<ClinicalProtocol> | null) => {
        setSelectedProtocol(protocol);
        setIsDetailModalOpen(false); // Close detail modal if open
        setIsEditModalOpen(true);
    };

    const handleSave = async (protocolToSave: ClinicalProtocol) => {
        await saveProtocol(protocolToSave);
        setIsEditModalOpen(false);
    };

    const handleDelete = async (protocolId: string) => {
        if(window.confirm('Tem certeza que deseja excluir este protocolo?')) {
            await deleteProtocol(protocolId);
        }
    }
    
    const renderContent = () => {
        if (isLoading) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bento-box space-y-3 h-48">
                            <Skeleton className="w-8 h-8 rounded" />
                            <Skeleton className="h-5 w-3/4 rounded" />
                            <Skeleton className="h-4 w-full rounded" />
                            <Skeleton className="h-4 w-1/2 rounded" />
                        </div>
                    ))}
                </div>
            )
        }
        if (isError) {
            return (
                <EmptyState 
                    icon={<IconAlertTriangle size={32} />}
                    title="Erro ao Carregar Protocolos"
                    message="Não foi possível buscar os dados. Tente recarregar a página."
                />
            )
        }

        if (filteredProtocols.length > 0) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProtocols.map(protocol => (
                        <div key={protocol.id} className="bento-box group relative cursor-pointer" onClick={() => handleOpenDetailModal(protocol)}>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(protocol)}} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconPencil size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(protocol.id)}} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconTrash size={14} /></button>
                            </div>
                             <IconFileText className="text-blue-400 mb-3" size={24} />
                            <h3 className="font-semibold text-slate-100 text-base mb-2 truncate">{protocol.name}</h3>
                             <p className="text-xs text-slate-400 line-clamp-2">
                                {protocol.description || 'Sem descrição.'}
                            </p>
                             <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2 text-xs text-slate-300">
                                <IconActivity size={14} className="text-emerald-400"/>
                                <span>{(protocol.phases || []).length} fases</span>
                            </div>
                        </div>
                    ))}
                </div>
            )
        }

        return (
            <EmptyState
                icon={<IconFileText size={32} />}
                title="Nenhum Protocolo Encontrado"
                message={searchTerm ? 'Sua busca não retornou resultados.' : 'Crie protocolos para agilizar a criação de planos de tratamento.'}
                action={!searchTerm && (
                    <Button onClick={() => handleOpenEditModal({})} icon={<IconPlus />}>
                        Criar Primeiro Protocolo
                    </Button>
                )}
            />
        );
    }


    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Protocolos Clínicos</h1>
                <Button onClick={() => handleOpenEditModal({})} icon={<IconPlus />}>
                    Novo Protocolo
                </Button>
            </header>
            
            <div className="relative w-full max-w-sm">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar protocolo..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md pl-10 pr-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
            </div>

            {renderContent()}

            {isEditModalOpen && (
                <ProtocolModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSave}
                    protocol={selectedProtocol}
                />
            )}
            {isDetailModalOpen && (
                <ProtocolDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    onEdit={(protocol) => handleOpenEditModal(protocol)}
                    protocol={selectedProtocol as ClinicalProtocol}
                />
            )}
        </div>
    );
};

export default ProtocolsPage;