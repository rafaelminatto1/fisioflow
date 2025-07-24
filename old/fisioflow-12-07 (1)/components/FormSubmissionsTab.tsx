
import React, { useState, useMemo } from 'react';
import { useFormTemplates } from '../hooks/useFormTemplates';
import { useFormSubmissions } from '../hooks/useFormSubmissions';
import Button from './ui/Button';
import { IconListChecks, IconPlus, IconCheckCircle, IconClock, IconEye } from './icons/IconComponents';
import EmptyState from './ui/EmptyState';
import { SendFormModal } from './SendFormModal';
import { ViewSubmissionModal } from './ViewSubmissionModal';
import { FormSubmission, FormTemplate } from '../types';

interface FormSubmissionsTabProps {
    patientId: string;
}

const FormSubmissionsTab: React.FC<FormSubmissionsTabProps> = ({ patientId }) => {
    const { templates = [] } = useFormTemplates();
    const { submissions = [], saveSubmission, isLoading } = useFormSubmissions();

    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

    const patientSubmissions = useMemo(() => {
        return submissions
            .filter(s => s.patientId === patientId)
            .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
    }, [submissions, patientId]);

    const handleSendForm = async (templateId: string) => {
        const newSubmission: Omit<FormSubmission, 'id'> = {
            patientId,
            formTemplateId: templateId,
            submissionDate: new Date().toISOString(),
            status: 'pending',
            answers: []
        };
        await saveSubmission(newSubmission as FormSubmission);
        setIsSendModalOpen(false);
    };

    const handleViewSubmission = (submission: FormSubmission) => {
        if (submission.status === 'completed') {
            setSelectedSubmission(submission);
            setIsViewModalOpen(true);
        }
    };

    const getTemplateName = (templateId: string) => {
        return templates.find(t => t.id === templateId)?.name || 'Formulário Desconhecido';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-200">Formulários Enviados</h3>
                <Button onClick={() => setIsSendModalOpen(true)} icon={<IconPlus />}>
                    Enviar Formulário
                </Button>
            </div>

            {patientSubmissions.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                            <tr>
                                <th scope="col" className="px-4 py-3">Nome do Formulário</th>
                                <th scope="col" className="px-4 py-3">Data de Envio</th>
                                <th scope="col" className="px-4 py-3">Status</th>
                                <th scope="col" className="px-4 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {patientSubmissions.map(submission => (
                                <tr key={submission.id} className="hover:bg-slate-700/50">
                                    <td className="px-4 py-3 font-medium text-slate-100">{getTemplateName(submission.formTemplateId)}</td>
                                    <td className="px-4 py-3">{new Date(submission.submissionDate).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-3">
                                        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                                            submission.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                                        }`}>
                                            {submission.status === 'completed' ? <IconCheckCircle size={12}/> : <IconClock size={12}/>}
                                            {submission.status === 'completed' ? 'Respondido' : 'Pendente'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewSubmission(submission)}
                                            disabled={submission.status !== 'completed'}
                                            icon={<IconEye size={16}/>}
                                        >
                                            Ver Respostas
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState
                    icon={<IconListChecks size={32} />}
                    title="Nenhum formulário enviado"
                    message="Envie formulários para coletar feedback e dados dos seus pacientes."
                />
            )}

            {isSendModalOpen && (
                <SendFormModal
                    isOpen={isSendModalOpen}
                    onClose={() => setIsSendModalOpen(false)}
                    onSend={handleSendForm}
                    templates={templates}
                    patientName=""
                />
            )}

            {isViewModalOpen && selectedSubmission && (
                <ViewSubmissionModal
                    isOpen={isViewModalOpen}
                    onClose={() => setIsViewModalOpen(false)}
                    submission={selectedSubmission}
                    template={templates.find(t => t.id === selectedSubmission.formTemplateId)}
                />
            )}
        </div>
    );
};

export default FormSubmissionsTab;
