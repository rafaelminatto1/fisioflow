
import React, { useState } from 'react';
import { PatientFeedbackModalProps } from '/types.js';
import BaseModal from '/components/ui/BaseModal.js';
import Button from '/components/ui/Button.js';
import FormField from '/components/ui/FormField.js';

const PatientFeedbackModal: React.FC<PatientFeedbackModalProps> = ({ isOpen, onClose, task, onSaveFeedback }) => {
    const [feedback, setFeedback] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen || !task) return null;

    const handleSave = () => {
        if (feedback.trim()) {
            setIsSaving(true);
            setTimeout(() => {
                onSaveFeedback(task.id, feedback);
                setIsSaving(false);
                setFeedback('');
            }, 300);
        }
    };
    
    const footer = (
         <div className="flex items-center justify-end w-full space-x-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button 
                onClick={handleSave} 
                disabled={isSaving || !feedback.trim()}
                isLoading={isSaving}
            >
                {isSaving ? 'Salvando...' : 'Salvar Feedback'}
            </Button>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Registrar Feedback"
            footer={footer}
        >
            <div className="space-y-4">
                <div>
                    <p className="text-sm text-slate-400">Tarefa:</p>
                    <p className="font-semibold text-slate-200">{task.title}</p>
                </div>
                <FormField
                    as="textarea"
                    label="Como você se sentiu ao realizar esta tarefa? (ex: dor, dificuldade, facilidade)"
                    name="feedback"
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={5}
                    placeholder="Descreva seu progresso ou qualquer observação importante..."
                />
            </div>
        </BaseModal>
    );
};

export default PatientFeedbackModal;