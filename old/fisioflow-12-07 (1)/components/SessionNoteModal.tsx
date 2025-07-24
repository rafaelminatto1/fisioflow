import React, { useState, useEffect } from 'react';
import { SessionNoteModalProps, SessionNote, ClinicalProtocol, AppointmentType } from '../types';
import { generateSessionNoteSuggestion, suggestNextAppointment } from '../services/geminiService';
import { useNotification } from '../hooks/useNotification';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';
import { IconSparkles, IconTrash, IconCalendar, IconClipboardList } from './icons/IconComponents';
import { useClinicalProtocols } from '../hooks/useClinicalProtocols';
import { useAppointments } from '../hooks/useAppointments';
import { useSessionNoteTemplates } from '../hooks/useSessionNoteTemplates';

type NoteErrors = {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
};

const SessionNoteModal: React.FC<SessionNoteModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    appointment,
    patient,
    allPatientAssessments,
    allPatientSessionNotes,
    onCloseAndScheduleNext,
    onCloseAndCreateTask,
}) => {
    const { addNotification } = useNotification();
    const { protocols = [] } = useClinicalProtocols();
    const { templates: noteTemplates = [] } = useSessionNoteTemplates();
    const { saveAppointment } = useAppointments();

    const [editedNote, setEditedNote] = useState<SessionNote | Partial<SessionNote> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [showPostSaveActions, setShowPostSaveActions] = useState(false);
    const [nextAppointmentSuggestion, setNextAppointmentSuggestion] = useState<{ date: string; type: AppointmentType; reason: string } | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    
    const sessionNote = allPatientSessionNotes.find(note => note.id === appointment.sessionNoteId) || null;
    const isNew = !sessionNote || !sessionNote.id;

    useEffect(() => {
        let initialNote: Partial<SessionNote>;
        if (sessionNote) {
            initialNote = sessionNote;
        } else {
            initialNote = {
                appointmentId: appointment.id,
                patientId: appointment.patientId,
                therapistId: appointment.therapistId,
                date: appointment.start,
                subjective: '',
                objective: '',
                assessment: '',
                plan: ''
            };
        }

        // Apply protocol if it exists and it's a new note
        if (isNew && appointment.protocolId) {
            const protocol = protocols.find(p => p.id === appointment.protocolId);
            if (protocol) {
                initialNote = {
                    ...initialNote,
                    subjective: protocol.subjective,
                    objective: protocol.objective,
                    assessment: protocol.assessment,
                    plan: protocol.plan
                };
                 addNotification({type: 'info', title: 'Protocolo Aplicado', message: `O protocolo "${protocol.name}" foi aplicado a esta nota.`});
            }
        }
        
        setEditedNote(initialNote);
        setShowPostSaveActions(!isNew); // Show actions if note already exists
        setNextAppointmentSuggestion(null);
    }, [sessionNote, appointment, protocols, isNew, addNotification]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedNote(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSuggest = async () => {
        setIsLoadingAi(true);
        try {
            const latestAssessment = [...allPatientAssessments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const previousNote = [...allPatientSessionNotes]
                .filter(n => n.id !== editedNote?.id && new Date(n.date).getTime() < new Date(appointment.start).getTime())
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            let context = `Paciente: ${patient.name}\nData da Sessão Atual: ${new Date(appointment.start).toLocaleDateString()}\n`;
            if (latestAssessment) {
                context += `Hipótese Diagnóstica: ${latestAssessment.diagnosticHypothesis}\n`;
            }
            if (previousNote) {
                context += `--- NOTA ANTERIOR ---\nSubjetivo: ${previousNote.subjective}\nObjetivo: ${previousNote.objective}\nAvaliação: ${previousNote.assessment}\nPlano: ${previousNote.plan}\n---------------------\n`;
            }
            
            const suggestion = await generateSessionNoteSuggestion(context);
            setEditedNote(prev => ({ ...prev, ...suggestion }));
            addNotification({ type: 'info', title: 'Sugestões Aplicadas', message: 'A IA preencheu os campos com sugestões.' });
        } catch (error) {
            if (error instanceof Error) {
                addNotification({ type: 'error', title: 'Erro da IA', message: error.message });
            }
        } finally {
            setIsLoadingAi(false);
        }
    };
    
    const copyFromLastNote = () => {
        const lastNote = [...allPatientSessionNotes]
             .filter(n => n.id !== editedNote?.id && new Date(n.date).getTime() < new Date(appointment.start).getTime())
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (lastNote) {
            setEditedNote(prev => ({
                ...prev,
                subjective: lastNote.subjective,
                objective: lastNote.objective,
                assessment: lastNote.assessment,
                plan: lastNote.plan,
            }));
             addNotification({type: 'info', title: 'Nota Copiada', message: 'Conteúdo da última sessão copiado.'});
        } else {
            addNotification({type: 'error', title: 'Nenhuma Nota Anterior', message: 'Não há nota de sessão anterior para este paciente.'});
        }
    };
    
    const applyTemplate = (templateId: string) => {
        if(!templateId) return;
        const template = noteTemplates.find(t => t.id === templateId);
        if(template) {
            setEditedNote(prev => ({
                ...prev,
                subjective: template.subjective,
                objective: template.objective,
                assessment: template.assessment,
                plan: template.plan,
            }));
             addNotification({type: 'info', title: 'Template Aplicado', message: `O template "${template.name}" foi aplicado.`});
        }
    }

    const handleSave = async () => {
        if (!editedNote) return;
        setIsSaving(true);
        await onSave(editedNote as SessionNote);
        
        if (appointment.status !== 'realizado') {
            await saveAppointment({...appointment, status: 'realizado'});
        }

        setShowPostSaveActions(true);
        setIsSaving(false);
    };
    
    const handleDelete = () => {
      if (!isNew && editedNote && 'id' in editedNote) {
        onDelete(editedNote.id);
      }
    }

    const handleSuggestNextAppointment = async () => {
        if (!editedNote) return;
        setIsSuggesting(true);
        setNextAppointmentSuggestion(null);
        try {
            const context = `Contexto da Sessão Atual:\nSubjetivo: ${editedNote.subjective}\nPlano: ${editedNote.plan}`;
            const suggestion = await suggestNextAppointment(context);
            setNextAppointmentSuggestion(suggestion);
        } catch (e) {
            addNotification({ type: 'error', title: 'Erro da IA', message: (e as Error).message });
        } finally {
            setIsSuggesting(false);
        }
    };

    const footer = (
        <>
            <div>
                {!isNew && <Button variant="ghost" onClick={handleDelete} icon={<IconTrash />}>Excluir Nota</Button>}
            </div>
            <div className="flex items-center space-x-3">
                 {showPostSaveActions ? (
                    <>
                       <Button variant="secondary" onClick={() => onCloseAndCreateTask(patient.id)} icon={<IconClipboardList />}>Criar Tarefa</Button>
                       <Button variant="primary" onClick={() => onCloseAndScheduleNext(patient.id)} icon={<IconCalendar />}>Agendar Próxima</Button>
                    </>
                ) : (
                    <>
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave} isLoading={isSaving}>
                            {isSaving ? 'Salvando...' : 'Salvar Nota'}
                        </Button>
                    </>
                )}
            </div>
        </>
    );
    
    if (!editedNote) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={`Nota da Sessão - ${new Date(appointment.start).toLocaleDateString('pt-BR')}`} footer={footer}>
            <div className="space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <Button variant="ghost" onClick={copyFromLastNote}>
                        Copiar da Última Sessão
                    </Button>
                    <Button variant="ghost" onClick={handleSuggest} isLoading={isLoadingAi} icon={<IconSparkles/>}>
                        {isLoadingAi ? 'Sugerindo...' : 'Preencher com IA'}
                    </Button>
                </div>
                 {isNew && noteTemplates.length > 0 && (
                     <FormField
                        as="select"
                        label="Aplicar Template de Nota"
                        name="template"
                        id="template"
                        onChange={(e) => applyTemplate(e.target.value)}
                        value=""
                     >
                        <option value="" disabled>Selecione um template...</option>
                        {noteTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                     </FormField>
                )}
                <FormField
                    as="textarea"
                    label="S (Subjetivo)"
                    name="subjective"
                    id="subjective"
                    value={editedNote.subjective || ''}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Relato do paciente, queixas, evolução desde a última sessão..."
                />
                 <FormField
                    as="textarea"
                    label="O (Objetivo)"
                    name="objective"
                    id="objective"
                    value={editedNote.objective || ''}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Dados mensuráveis, testes realizados, ADM, força, observações do fisioterapeuta..."
                />
                 <FormField
                    as="textarea"
                    label="A (Avaliação / Assessment)"
                    name="assessment"
                    id="assessment"
                    value={editedNote.assessment || ''}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Análise do fisioterapeuta sobre a sessão, progresso em relação às metas..."
                />
                 <FormField
                    as="textarea"
                    label="P (Plano)"
                    name="plan"
                    id="plan"
                    value={editedNote.plan || ''}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Próximos passos, condutas para a próxima sessão, exercícios de casa..."
                />
                 <div className="pt-4 border-t border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Ações Pós-Sessão</h3>
                    <Button onClick={handleSuggestNextAppointment} isLoading={isSuggesting} icon={<IconSparkles />}>
                        Sugerir Próxima Sessão (IA)
                    </Button>
                    {nextAppointmentSuggestion && (
                        <div className="mt-2 p-3 bg-blue-900/20 rounded-md border border-blue-500/30 text-sm">
                            <p className="font-semibold text-blue-300">Sugestão da IA:</p>
                            <p><strong>{nextAppointmentSuggestion.reason}</strong></p>
                            <p>Data sugerida: {new Date(nextAppointmentSuggestion.date).toLocaleDateString('pt-BR')}, Tipo: {nextAppointmentSuggestion.type}</p>
                        </div>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};

export default SessionNoteModal;