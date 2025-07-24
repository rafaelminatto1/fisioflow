
import React from 'react';
import { ChatMessage, Patient, Exercise } from '../../types';
import ChatInterface from '../ChatInterface';

interface PatientMessagesTabProps {
    patient: Patient;
    chatMessages: ChatMessage[];
    onSendMessage: (message: Partial<ChatMessage>) => void;
    onViewExercise: (exercise: Exercise) => void;
    currentUserId: string;
}

export const PatientMessagesTab: React.FC<PatientMessagesTabProps> = ({
    patient,
    chatMessages,
    onSendMessage,
    onViewExercise,
    currentUserId,
}) => (
    <div className="h-[calc(100vh-250px)] border border-slate-700 rounded-lg overflow-hidden">
        <ChatInterface
            messages={chatMessages}
            onSendMessage={onSendMessage}
            currentUserId={currentUserId}
            interlocutor={patient}
            onViewExercise={onViewExercise}
        />
    </div>
);
