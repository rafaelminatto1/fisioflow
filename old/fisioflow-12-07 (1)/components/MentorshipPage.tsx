

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Task, User, Patient, EducationalCaseStudy, Assessment, CaseStudyModalProps, ImportPatientModalProps } from '../../types';
import { IconSparkles, IconCheckCircle, IconArrowLeft, IconUser, IconAddressBook, IconAlertTriangle, IconPlus, IconFileText, IconBook, IconPencil, IconTrash, IconClipboardCheck } from './icons/IconComponents';
import { anonymizeAndCreateCaseStudy, getTaskSummary } from '../services/geminiService.ts';
import { useNotification } from '../hooks/useNotification';
import EmptyState from './ui/EmptyState';
import { useTasks } from '../hooks/useTasks';
import { useUsers } from '../hooks/useUsers';
import { usePatients } from '../hooks/usePatients';
import Skeleton from './ui/Skeleton';
import { useCaseStudies } from '../hooks/useCaseStudies';
import { useAuth } from '../hooks/useAuth';
import Button from './ui/Button';
import BaseModal from './ui/BaseModal';
import FormField from './ui/FormField';
import { useAssessments } from '../hooks/useAssessments';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TabButton: React.FC<{ label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void }> = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 transition-all ${isActive ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'}`}>
        {icon} {label}
    </button>
);

const TasksForReview = () => {
    const { tasks = [], saveTask, isLoading: isLoadingTasks, isError: isErrorTasks } = useTasks();
    const { users = [], isLoading: isLoadingUsers } = useUsers();
    const { patients = [], isLoading: isLoadingPatients } = usePatients();
    const { addNotification } = useNotification();
    
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [mentorFeedback, setMentorFeedback] = useState('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiSummary, setAiSummary] = useState('');

    const isLoading = isLoadingTasks || isLoadingUsers || isLoadingPatients;

    const tasksForReview = useMemo(() => tasks.filter(t => t.status === 'review'), [tasks]);
    const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);
    const taskSubmitter = useMemo(() => selectedTask?.assigneeId ? users.find(u => u.id === selectedTask.assigneeId) : null, [users, selectedTask]);
    const taskPatient = useMemo(() => selectedTask?.patientId ? patients.find(p => p.id === selectedTask.patientId) : null, [patients, selectedTask]);

    useEffect(() => {
        const handleGetSummary = async () => {
            if (!selectedTask?.description) {
                setAiSummary('');
                return;
            };
            setIsLoadingAi(true);
            setAiSummary('');
            try {
                const summary = await getTaskSummary(selectedTask.description);
                setAiSummary(summary);
            } catch (error) {
                if (error instanceof Error) addNotification({ type: 'error', title: 'Erro da IA', message: error.message });
                setAiSummary('Não foi possível obter a análise da IA.');
            } finally {
                setIsLoadingAi(false);
            }
        };

        if(selectedTask) {
           handleGetSummary();
           setMentorFeedback('');
        }
    }, [selectedTask, addNotification]);

    const handleApprove = async () => {
        if (!selectedTask) return;
        await saveTask({ ...selectedTask, status: 'done' });
        addNotification({type: 'success', title: 'Tarefa Aprovada', message: `A tarefa "${selectedTask.title}" foi aprovada.`});
        setSelectedTaskId(null);
    };
    
    const handleRequestChanges = async () => {
        if (!selectedTask || !mentorFeedback.trim()) return;
        const newDescription = `${selectedTask.description || ''}\n\n[Feedback do Mentor - ${new Date().toLocaleDateString('pt-BR')}]:\n${mentorFeedback}`;
        await saveTask({ ...selectedTask, status: 'in_progress', description: newDescription });
        addNotification({type: 'info', title: 'Ajustes Solicitados', message: `Feedback enviado para a tarefa "${selectedTask.title}".`});
        setSelectedTaskId(null);
    };

    if (isLoading) return <div className="flex h-full gap-6"><Skeleton className="w-1/3 h-full" /><Skeleton className="w-2/3 h-full" /></div>;
    if (isErrorTasks) return <EmptyState icon={<IconAlertTriangle/>} title="Erro ao Carregar Tarefas" message="Não foi possível buscar as tarefas para revisão." />;

    return (
        <div className="flex h-full gap-6">
            <aside className={`w-full md:w-1/3 flex-col bg-slate-800/50 border border-slate-700 rounded-lg ${selectedTaskId ? 'hidden md:flex' : 'flex'}`}>
                <header className="p-4 border-b border-slate-700"><h2 className="text-lg font-semibold text-slate-100">Tarefas para Revisão</h2><p className="text-sm text-slate-400">{tasksForReview.length} tarefas aguardando.</p></header>
                <div className="overflow-y-auto flex-1">
                    {tasksForReview.length > 0 ? (
                        <ul className="divide-y divide-slate-700">
                            {tasksForReview.map(task => (
                                <li key={task.id}><button onClick={() => setSelectedTaskId(task.id)} className="w-full text-left p-4 hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"><h3 className="font-semibold text-slate-200">{task.title}</h3><p className="text-xs text-slate-400">Enviado por: {users.find(u => u.id === task.assigneeId)?.name || 'Desconhecido'}</p></button></li>
                            ))}
                        </ul>
                    ) : <EmptyState icon={<IconCheckCircle size={32} />} title="Tudo em dia!" message="Nenhuma tarefa para revisar no momento." />}
                </div>
            </aside>
            <main className={`w-full md:w-2/3 flex-col bg-slate-800 border border-slate-700 rounded-lg ${selectedTaskId ? 'flex' : 'hidden md:flex'}`}>
                {selectedTask ? (
                    <>
                        <header className="p-4 border-b border-slate-700">
                            <button onClick={() => setSelectedTaskId(null)} className="md:hidden flex items-center text-sm text-blue-400 mb-2"><IconArrowLeft className="mr-1" /> Voltar</button>
                            <h2 className="text-xl font-bold text-slate-100">{selectedTask.title}</h2>
                            <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                {taskSubmitter && <span className="flex items-center gap-1.5"><IconUser size={14}/> {taskSubmitter.name}</span>}
                                {taskPatient && <span className="flex items-center gap-1.5"><IconAddressBook size={14}/> {taskPatient.name}</span>}
                            </div>
                        </header>
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                           <div><h3 className="font-semibold text-slate-300 mb-1">Descrição/Nota</h3><div className="p-3 bg-slate-900/70 rounded-md text-slate-300 whitespace-pre-wrap text-sm border border-slate-700">{selectedTask.description || <span className="italic text-slate-500">Nenhuma descrição.</span>}</div></div>
                           <div><h3 className="font-semibold text-slate-300 mb-1 flex items-center"><IconSparkles className="mr-2 text-blue-400" /> Análise da IA</h3><div className="p-3 bg-blue-900/20 rounded-md text-blue-200 whitespace-pre-wrap text-sm border border-blue-500/30 min-h-[80px]">{isLoadingAi ? 'Analisando...' : aiSummary}</div></div>
                            <div><h3 className="font-semibold text-slate-300 mb-1">Seu Feedback</h3><textarea value={mentorFeedback} onChange={(e) => setMentorFeedback(e.target.value)} rows={5} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Escreva seu feedback para solicitar ajustes..."/></div>
                        </div>
                        <footer className="p-4 border-t border-slate-700 flex flex-col sm:flex-row justify-end gap-3">
                            <button onClick={handleRequestChanges} disabled={!mentorFeedback.trim()} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"><IconArrowLeft className="mr-2" size={16}/>Solicitar Ajustes</button>
                             <button onClick={handleApprove} className="w-full sm:w-auto flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"><IconCheckCircle className="mr-2" size={16}/>Aprovar Tarefa</button>
                        </footer>
                    </>
                ) : <div className="m-auto text-center text-slate-500 p-8"><p className="font-semibold">Selecione uma tarefa para revisar</p><p className="text-sm">Detalhes e opções de feedback aparecerão aqui.</p></div>}
            </main>
        </div>
    );
};

const CaseStudies = () => {
    const { caseStudies = [], saveCaseStudy, deleteCaseStudy, isLoading, isError } = useCaseStudies();
    const { users = [] } = useUsers();
    const { patients = [] } = usePatients();
    const { assessments = [] } = useAssessments();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<Partial<EducationalCaseStudy> | null>(null);

    const handleOpenModal = (caseStudy: Partial<EducationalCaseStudy> | null) => {
        setSelectedCase(caseStudy);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if(window.confirm('Tem certeza que deseja excluir este caso de estudo?')) {
            deleteCaseStudy(id);
        }
    }

    if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
    if (isError) return <EmptyState icon={<IconAlertTriangle/>} title="Erro ao Carregar Casos" message="Não foi possível carregar os casos de estudo." />;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => handleOpenModal({})} icon={<IconPlus />}>Novo Caso de Estudo</Button>
            </div>
             {caseStudies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {caseStudies.map(cs => {
                        const author = users.find(u => u.id === cs.authorId);
                        return (
                             <div key={cs.id} className="bento-box group relative">
                                <h3 className="font-bold text-slate-100 text-lg mb-2 truncate group-hover:text-blue-400 transition-colors">{cs.title}</h3>
                                <p className="text-sm text-slate-400 line-clamp-3 mb-3 h-[60px]">{cs.description}</p>
                                <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">Criado por {author?.name || 'Desconhecido'} em {new Date(cs.createdAt).toLocaleDateString()}</div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(cs)} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconPencil size={14} /></button>
                                    <button onClick={() => handleDelete(cs.id)} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconTrash size={14} /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : <EmptyState icon={<IconBook/>} title="Biblioteca Vazia" message="Crie casos de estudo para enriquecer o aprendizado da sua equipe."/>}
            
            {isModalOpen && <CaseStudyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={saveCaseStudy} caseStudy={selectedCase} patients={patients} assessments={assessments} />}
        </div>
    )
}

const ImportPatientModal: React.FC<ImportPatientModalProps> = ({ isOpen, onClose, onSelectPatient, patients, assessments }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredPatients = useMemo(() => patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())), [patients, searchTerm]);

    const handleSelect = (patient: Patient) => {
        const patientAssessments = assessments.filter(a => a.patientId === patient.id);
        onSelectPatient(patient, patientAssessments);
    }
    
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Importar Dados de Paciente" footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
            <FormField label="Buscar Paciente" name="patientSearch" id="patientSearch" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="max-h-64 overflow-y-auto space-y-2 mt-4">
                {filteredPatients.map(p => (
                    <button key={p.id} onClick={() => handleSelect(p)} className="w-full text-left p-2 rounded-md hover:bg-blue-600/20 flex items-center gap-3">
                        <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-full" />
                        <span>{p.name}</span>
                    </button>
                ))}
            </div>
        </BaseModal>
    )
}

const CaseStudyModal: React.FC<CaseStudyModalProps> = ({ isOpen, onClose, onSave, caseStudy, patients, assessments }) => {
    const [editedCase, setEditedCase] = useState<Partial<EducationalCaseStudy>>(caseStudy || {});
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { addNotification } = useNotification();
    const { user } = useAuth();
    
    useEffect(() => setEditedCase(caseStudy || {}), [caseStudy]);

    const handleSave = () => {
        if (!editedCase.title?.trim() || !user) return;
        const finalCase: Partial<EducationalCaseStudy> = { ...editedCase, authorId: user.id };
        if (!finalCase.id) {
            finalCase.createdAt = new Date().toISOString();
        }
        onSave(finalCase as EducationalCaseStudy);
        onClose();
    };

    const handleSelectPatientForImport = async (patient: Patient, patientAssessments: Assessment[]) => {
        setIsImportModalOpen(false);
        setIsGenerating(true);
        try {
            const result = await anonymizeAndCreateCaseStudy(patient, patientAssessments);
            setEditedCase(prev => ({
                ...prev,
                title: result.title,
                anonymousPatientSummary: result.summary,
                learningObjectives: result.objectives,
                discussionQuestions: result.questions
            }));
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', title: 'Erro da IA', message: error.message });
        } finally {
            setIsGenerating(false);
        }
    }
    
    const handleListChange = (field: 'learningObjectives' | 'discussionQuestions', index: number, value: string) => {
        setEditedCase(prev => {
            if (!prev) return null;
            const list = [...(prev[field] || [])];
            list[index] = value;
            return { ...prev, [field]: list };
        })
    }
    const addListItem = (field: 'learningObjectives' | 'discussionQuestions') => {
        setEditedCase(prev => {
            if (!prev) return null;
            return { ...prev, [field]: [...(prev[field] || []), ''] };
        })
    }
     const removeListItem = (field: 'learningObjectives' | 'discussionQuestions', index: number) => {
        setEditedCase(prev => {
            if (!prev) return null;
            return { ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) };
        })
    }
    
    if (!isOpen) return null;

    return (
        <>
        <BaseModal isOpen={isOpen} onClose={onClose} title={caseStudy?.id ? "Editar Caso de Estudo" : "Novo Caso de Estudo"} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></>}>
            <div className="space-y-4">
                <div className="flex justify-end"><Button variant="secondary" onClick={() => setIsImportModalOpen(true)} icon={<IconSparkles/>} isLoading={isGenerating}>{isGenerating ? "Gerando..." : "Gerar com IA a partir de paciente"}</Button></div>
                <FormField label="Título" name="title" id="title" value={editedCase.title || ''} onChange={e => setEditedCase(p => ({...p, title: e.target.value}))} />
                <FormField as="textarea" label="Descrição Breve" name="description" id="description" value={editedCase.description || ''} onChange={e => setEditedCase(p => ({...p, description: e.target.value}))} rows={2} />
                <FormField as="textarea" label="Resumo Clínico Anonimizado" name="anonymousPatientSummary" id="anonymousPatientSummary" value={editedCase.anonymousPatientSummary || ''} onChange={e => setEditedCase(p => ({...p, anonymousPatientSummary: e.target.value}))} rows={5} />
                <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Objetivos de Aprendizagem</h4>
                    <div className="space-y-2">{editedCase.learningObjectives?.map((obj, i) => (<div key={i} className="flex items-center gap-2"><input type="text" value={obj} onChange={e => handleListChange('learningObjectives', i, e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-100 text-sm focus:ring-1"/> <button onClick={() => removeListItem('learningObjectives', i)} className="p-1 text-red-400"><IconTrash size={16}/></button></div>))}</div>
                    <Button variant="ghost" size="sm" onClick={() => addListItem('learningObjectives')} icon={<IconPlus/>} className="mt-2">Adicionar Objetivo</Button>
                </div>
                 <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Questões para Discussão</h4>
                    <div className="space-y-2">{editedCase.discussionQuestions?.map((q, i) => (<div key={i} className="flex items-center gap-2"><input type="text" value={q} onChange={e => handleListChange('discussionQuestions', i, e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-100 text-sm focus:ring-1"/> <button onClick={() => removeListItem('discussionQuestions', i)} className="p-1 text-red-400"><IconTrash size={16}/></button></div>))}</div>
                    <Button variant="ghost" size="sm" onClick={() => addListItem('discussionQuestions')} icon={<IconPlus/>} className="mt-2">Adicionar Questão</Button>
                </div>
            </div>
        </BaseModal>
        <ImportPatientModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSelectPatient={handleSelectPatientForImport} patients={patients} assessments={assessments} />
        </>
    )
}

const EducationCenterPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('review');
    return (
        <div className="h-full flex flex-col">
            <h1 className="text-3xl font-bold text-slate-100 mb-4">Centro de Educação</h1>
            <div className="border-b border-slate-700 mb-6">
                <nav className="flex -mb-px space-x-4">
                    <TabButton label="Painel de Revisão" icon={<IconClipboardCheck size={16} />} isActive={activeTab === 'review'} onClick={() => setActiveTab('review')} />
                    <TabButton label="Casos de Estudo" icon={<IconBook size={16} />} isActive={activeTab === 'cases'} onClick={() => setActiveTab('cases')} />
                </nav>
            </div>
            <div className="flex-1 overflow-hidden">
                {activeTab === 'review' && <TasksForReview />}
                {activeTab === 'cases' && <CaseStudies />}
            </div>
        </div>
    );
};

export default EducationCenterPage;