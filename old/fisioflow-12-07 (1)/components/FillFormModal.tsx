
import React, { useState } from 'react';
import { FillFormModalProps, FormAnswer, FormQuestion, FormSubmission } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';

const RenderQuestion: React.FC<{
    question: FormQuestion;
    answer: any;
    onChange: (value: any) => void;
}> = ({ question, answer, onChange }) => {
    switch (question.type) {
        case 'text':
            return <FormField label={question.label} name={question.id} value={answer || ''} onChange={(e) => onChange(e.target.value)} required={question.required} />;
        case 'textarea':
             return <FormField as="textarea" label={question.label} name={question.id} value={answer || ''} onChange={(e) => onChange(e.target.value)} required={question.required} rows={4} />;
        case 'number':
             return <FormField type="number" label={question.label} name={question.id} value={answer || ''} onChange={(e) => onChange(e.target.value)} required={question.required} />;
        case 'scale':
            const options = Array.from({ length: (question.scaleMax || 10) - (question.scaleMin || 0) + 1 }, (_, i) => i + (question.scaleMin || 0));
            return (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">{question.label}{question.required && ' *'}</label>
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>{question.scaleMinLabel || `Mín: ${question.scaleMin}`}</span>
                        <span>{question.scaleMaxLabel || `Máx: ${question.scaleMax}`}</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {options.map(opt => (
                            <label key={opt} className={`flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors ${answer == opt ? 'bg-blue-600 text-white font-bold' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                <input type="radio" name={question.id} value={opt} checked={answer == opt} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="sr-only"/>
                                {opt}
                            </label>
                        ))}
                    </div>
                </div>
            );
        case 'multiple-choice':
            return (
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">{question.label}{question.required && ' *'}</label>
                     {question.options?.map(opt => (
                        <label key={opt} className="flex items-center gap-3 p-2 rounded-md bg-slate-700/50 cursor-pointer">
                            <input type="radio" name={question.id} value={opt} checked={answer === opt} onChange={(e) => onChange(e.target.value)} className="w-4 h-4 text-blue-600 bg-slate-600 border-slate-500 focus:ring-blue-500"/>
                            {opt}
                        </label>
                    ))}
                 </div>
            );
        case 'checkbox':
             return (
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">{question.label}{question.required && ' *'}</label>
                     {question.options?.map(opt => (
                        <label key={opt} className="flex items-center gap-3 p-2 rounded-md bg-slate-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                name={question.id}
                                value={opt}
                                checked={(answer as string[] || []).includes(opt)}
                                onChange={(e) => {
                                    const currentAnswers = [...(answer as string[] || [])];
                                    if (e.target.checked) {
                                        currentAnswers.push(opt);
                                    } else {
                                        const index = currentAnswers.indexOf(opt);
                                        if (index > -1) currentAnswers.splice(index, 1);
                                    }
                                    onChange(currentAnswers);
                                }}
                                className="w-4 h-4 rounded text-blue-600 bg-slate-600 border-slate-500 focus:ring-blue-500"/>
                            {opt}
                        </label>
                    ))}
                 </div>
            );
        default: return null;
    }
};

export const FillFormModal: React.FC<FillFormModalProps> = ({ isOpen, onClose, onSave, submission, template }) => {
    const [answers, setAnswers] = useState<Record<string, any>>({});

    if (!isOpen || !template) return null;

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = () => {
        const finalAnswers: FormAnswer[] = Object.entries(answers).map(([questionId, value]) => ({
            questionId,
            value,
        }));

        const updatedSubmission: FormSubmission = {
            ...submission,
            answers: finalAnswers,
            status: 'completed',
            submissionDate: new Date().toISOString(), // Update date on completion
        };
        onSave(updatedSubmission);
    };

    const isFormValid = () => {
        return template.questions.every(q => {
            if (!q.required) return true;
            const answer = answers[q.id];
            if (answer === undefined || answer === null) return false;
            if (typeof answer === 'string' && !answer.trim()) return false;
            if (Array.isArray(answer) && answer.length === 0) return false;
            return true;
        });
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!isFormValid()}>Enviar Respostas</Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={template.name} footer={footer}>
            <div className="space-y-6">
                 <p className="text-sm text-slate-400">{template.description}</p>
                {template.questions.map(question => (
                    <RenderQuestion
                        key={question.id}
                        question={question}
                        answer={answers[question.id]}
                        onChange={(value) => handleAnswerChange(question.id, value)}
                    />
                ))}
            </div>
        </BaseModal>
    );
};
