import React, { useState } from 'react';
import { VideoSubmission, Exercise } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';

interface VideoReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    submission: VideoSubmission;
    exercise: Exercise | undefined;
    onSave: (submissionId: string, status: 'approved' | 'needs_correction', notes: string) => void;
}

const VideoReviewModal: React.FC<VideoReviewModalProps> = ({ isOpen, onClose, submission, exercise, onSave }) => {
    const [notes, setNotes] = useState(submission.therapistNotes || '');
    const [status, setStatus] = useState<'approved' | 'needs_correction'>(submission.status === 'needs_correction' ? 'needs_correction' : 'approved');

    const handleSave = () => {
        onSave(submission.id, status, notes);
    };
    
    const footer = (
         <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Enviar Feedback</Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={`Analisar Vídeo: ${exercise?.name || ''}`} footer={footer}>
            <div className="space-y-4">
                <div className="aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                    <video
                        className="w-full h-full"
                        src={submission.videoUrl}
                        controls
                        autoPlay
                        title={exercise?.name}
                    />
                </div>
                <FormField
                    as="textarea"
                    label="Feedback para o paciente"
                    name="notes"
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Ex: Ótima execução! Mantenha o abdômen contraído."
                />
                <FormField
                    as="select"
                    label="Status da Execução"
                    name="status"
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'approved' | 'needs_correction')}
                >
                    <option value="approved">Aprovado</option>
                    <option value="needs_correction">Precisa de Correção</option>
                </FormField>
            </div>
        </BaseModal>
    );
};

export default VideoReviewModal;
