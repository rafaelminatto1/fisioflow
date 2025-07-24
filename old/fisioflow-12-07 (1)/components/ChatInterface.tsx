import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Exercise, Patient, User, Prescription } from '../types';
import { useUsers } from '../hooks/useUsers';
import { IconSend, IconUser, IconStethoscope, IconPlus, IconX, IconPaperclip, IconActivity, IconFileText, IconMicrophone, IconPlayerPlay } from './icons/IconComponents';
import { useExercises } from '../hooks/useExercises';
import { usePrescriptions } from '../hooks/usePrescriptions';
import Button from './ui/Button';
import { CANNED_CHAT_RESPONSES } from '../constants';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    currentUserId: string;
    interlocutor: User | Patient | null;
    onSendMessage: (message: Partial<ChatMessage>) => void;
    // For therapist sending exercises
    prescribedExercisesForPatient?: Prescription[];
    allExercises?: Exercise[];
    // For patient viewing exercises
    onViewExercise?: (exercise: Exercise) => void;
}


const ChatInterface: React.FC<ChatInterfaceProps> = ({
    messages,
    currentUserId,
    interlocutor,
    onSendMessage,
    prescribedExercisesForPatient = [],
    allExercises = [],
    onViewExercise
}) => {
    const [input, setInput] = useState('');
    const { users = [] } = useUsers();
    
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setIsActionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleSend = () => {
        if (input.trim()) {
            onSendMessage({ text: input.trim(), type: 'text' });
            setInput('');
        }
    };
    
    const handleAction = (message: Partial<ChatMessage>) => {
        onSendMessage(message);
        setIsActionsOpen(false);
    }
    
    const getSenderInfo = (senderId: string) => users.find(u => u.id === senderId);

    const renderMessageContent = (message: ChatMessage) => {
        switch (message.type) {
            case 'exercise':
                const exercise = allExercises.find(ex => ex.id === message.metadata?.exerciseId);
                return (
                    <div className="space-y-2">
                        <p className="text-sm">{message.text}</p>
                        {exercise && onViewExercise && (
                            <div className="bg-slate-800/50 p-2 rounded-md">
                                <p className="font-semibold">{exercise.name}</p>
                                <Button size="sm" variant="ghost" className="mt-1" onClick={() => onViewExercise(exercise)}>Ver Exercício</Button>
                            </div>
                        )}
                    </div>
                );
            case 'file':
                return (
                    <div className="flex items-center gap-2 p-1">
                         <IconFileText size={24} className="text-current opacity-80" />
                        <div>
                            <p className="font-semibold">{message.metadata?.fileName}</p>
                            <p className="text-xs opacity-70">{message.metadata?.fileSize}</p>
                        </div>
                    </div>
                );
            case 'voice':
                 return (
                    <div className="flex items-center gap-2">
                        <button className="p-1 rounded-full bg-white/20 hover:bg-white/30"><IconPlayerPlay size={16} /></button>
                        <div className="flex items-center gap-0.5 h-6">
                            {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 0.3, 0.5, 0.7, 0.4, 0.8, 0.5].map((h, i) => (
                                <div key={i} className="w-0.5 bg-current rounded-full" style={{height: `${h*100}%`}}></div>
                            ))}
                        </div>
                        <span className="text-xs font-mono pl-1">{message.metadata?.duration}</span>
                    </div>
                );
            default:
                return <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>;
        }
    };
    
    if (!interlocutor) {
        return <div className="p-4 text-center text-slate-400">Selecione uma conversa.</div>
    }

    return (
        <div className="flex flex-col h-full bg-slate-800">
             <header className="p-3 border-b border-slate-700 flex items-center gap-3 flex-shrink-0">
                <div className="relative">
                    <img src={interlocutor.avatarUrl} alt={interlocutor.name} className="w-10 h-10 rounded-full" />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-800 rounded-full"></span>
                </div>
                <div>
                    <h4 className="font-semibold text-base text-white">{interlocutor.name}</h4>
                    <p className="text-xs text-slate-400">Online</p>
                </div>
            </header>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((message) => {
                    const isCurrentUser = message.senderId === currentUserId;
                    const sender = isCurrentUser ? users.find(u => u.id === currentUserId) : interlocutor;
                    
                    return (
                         <div key={message.id} className={`flex items-start gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            {!isCurrentUser && sender && (
                                <img src={sender.avatarUrl} alt={sender.name} className="w-8 h-8 rounded-full" />
                            )}
                            <div className="max-w-md">
                                <div className={`p-3 rounded-lg ${isCurrentUser ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>
                                    {renderMessageContent(message)}
                                </div>
                                 <p className={`text-xs text-slate-500 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                                    {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-2 border-t border-slate-700 flex-shrink-0">
                 <div className="flex items-end gap-2 bg-slate-900 border border-slate-600 rounded-lg">
                    <div className="relative" ref={actionsMenuRef}>
                        <button 
                            onClick={() => setIsActionsOpen(prev => !prev)}
                            className="p-3 text-slate-400 hover:text-blue-400 transition-colors"
                        >
                           {isActionsOpen ? <IconX size={18} /> : <IconPlus size={18}/>}
                        </button>
                        {isActionsOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-700 border border-slate-600 rounded-lg shadow-lg p-2 z-10 max-h-64 overflow-y-auto">
                                {prescribedExercisesForPatient.length > 0 && (
                                    <>
                                        <h4 className="text-xs font-bold text-slate-400 px-2 pb-1 uppercase">Enviar Exercício</h4>
                                        {prescribedExercisesForPatient.map(p => {
                                            const ex = allExercises.find(e => e.id === p.exerciseId);
                                            if (!ex) return null;
                                            return (
                                                <button key={p.id} onClick={() => handleAction({ type: 'exercise', text: `Por favor, realize este exercício: ${ex.name}`, metadata: { exerciseId: ex.id } })} className="w-full text-left text-sm p-2 rounded-md hover:bg-slate-600 flex items-center gap-2">
                                                    <IconActivity size={16} /> <span>{ex.name}</span>
                                                </button>
                                            )
                                        })}
                                        <div className="my-1 border-t border-slate-600"></div>
                                    </>
                                )}
                                <h4 className="text-xs font-bold text-slate-400 px-2 pb-1 uppercase">Ações Rápidas</h4>
                                 <button onClick={() => handleAction({type: 'file', text: "Anexo", metadata: { fileName: 'simulacao_anexo.pdf', fileSize: '1.2MB' } })} className="w-full text-left text-sm p-2 rounded-md hover:bg-slate-600 flex items-center gap-2"><IconPaperclip size={16} /> Anexar Arquivo (Simulado)</button>
                                <div className="my-1 border-t border-slate-600"></div>
                                <h4 className="text-xs font-bold text-slate-400 px-2 pb-1 uppercase">Respostas Prontas</h4>
                                {CANNED_CHAT_RESPONSES.map(resp => (
                                    <button key={resp.title} onClick={() => handleAction({ text: resp.text, type: 'text' })} className="w-full text-left text-sm p-2 rounded-md hover:bg-slate-600">{resp.title}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Digite sua mensagem..."
                        rows={1}
                        className="flex-1 bg-transparent py-3 text-slate-100 focus:outline-none resize-none max-h-24"
                    />
                    <button onClick={() => handleAction({ type: 'voice', text: 'Mensagem de voz', metadata: { duration: '0:15' } })} className="p-3 text-slate-400 hover:text-blue-400 transition-colors"><IconMicrophone size={18}/></button>
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-3 text-slate-300 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors rounded-r-lg"
                    >
                        <IconSend size={18}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
