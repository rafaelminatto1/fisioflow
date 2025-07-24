

import React from 'react';
import { ViewSubmissionModalProps } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

export const ViewSubmissionModal: React.FC<ViewSubmissionModalProps> = ({ isOpen, onClose, submission, template }) => {
    
    const getAnswerForQuestion = (questionId: string) => {
        const answer = submission.answers.find(a => a.questionId === questionId);
        if (!answer || answer.value === null || answer.value === undefined) {
            return <i className="text-slate-500">Não respondido</i>;
        }
        if (Array.isArray(answer.value)) {
            return answer.value.join(', ');
        }
        return String(answer.value);
    };

    const footer = (
        <div className="flex justify-end w-full">
            <Button onClick={onClose}>Fechar</Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={template?.name || 'Respostas do Formulário'} footer={footer}>
            <div className="space-y-6">
                <div className="text-sm text-slate-400">
                    Respondido em: {new Date(submission.submissionDate).toLocaleString('pt-BR')}
                </div>
                {template?.questions.map(question => (
                    <div key={question.id} className="p-3 bg-slate-900/50 border-l-2 border-blue-500">
                        <p className="font-semibold text-slate-300 mb-1">{question.label}</p>
                        <p className="text-slate-100">{getAnswerForQuestion(question.id)}</p>
                    </div>
                ))}
            </div>
        </BaseModal>
    );
};
