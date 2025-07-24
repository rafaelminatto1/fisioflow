


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { default as ReactMarkdown } from 'react-markdown';
import { default as remarkGfm } from 'remark-gfm';
import { getAIAssistantResponseStream, searchKnowledgeBase } from '../services/geminiService';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { IconX, IconSparkles, IconUser, IconBot, IconSend } from './icons/IconComponents';
import { usePatients } from '../hooks/usePatients';
import { useTasks } from '../hooks/useTasks';
import { useAppointments } from '../hooks/useAppointments';
import { useNotebooks } from '../hooks/useNotebooks';
import { useUsers } from '../hooks/useUsers';
import { useSettings } from '../hooks/useSettings';
import { GenerateContentResponse } from '@google/genai';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isError?: boolean;
  sources?: { uri: string; title: string }[];
}

interface AIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
    usePreventBodyScroll(isOpen);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            sender: 'ai',
            text: 'Olá! Sou o assistente de IA da FisioFlow. Como posso ajudar você hoje? Você pode me perguntar sobre pacientes, tarefas, ou fazer perguntas gerais sobre fisioterapia.'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    const { patients = [] } = usePatients();
    const { tasks = [] } = useTasks();
    const { appointments = [] } = useAppointments();
    const { data: notebooks = [] } = useNotebooks();
    const { users = [] } = useUsers();
    const { settings } = useSettings();
    
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);
    
    const buildContext = useCallback((): string => {
        const contextParts: string[] = [];

        const userMap = new Map(users.map(u => [u.id, u.name]));
        const patientMap = new Map(patients.map(p => [p.id, p.name]));

        contextParts.push(`== Pacientes ==\n${patients.map(p => `ID: ${p.id}, Nome: ${p.name}, Histórico: ${(p.medicalHistory || '').substring(0, 200)}...`).join('\n')}`);
        contextParts.push(`== Tarefas ==\n${tasks.map(t => `ID: ${t.id}, Título: ${t.title}, Status: ${t.status}, Responsável: ${userMap.get(t.assigneeId || '') || 'N/A'}, Paciente: ${patientMap.get(t.patientId || '') || 'N/A'}`).join('\n')}`);
        contextParts.push(`== Agendamentos ==\n${appointments.map(a => `ID: ${a.id}, Título: ${a.title}, Paciente: ${patientMap.get(a.patientId) || 'N/A'}, Terapeuta: ${userMap.get(a.therapistId) || 'N/A'}, Início: ${new Date(a.start).toLocaleString('pt-BR')}`).join('\n')}`);
        contextParts.push(`== Base de Conhecimento (Notebooks) ==\n${notebooks.flatMap(nb => nb.pages).map(p => `Título: ${p.title}\nConteúdo: ${(p.content || '').substring(0, 300)}...`).join('\n---\n')}`);
        
        return contextParts.join('\n\n');
    }, [patients, tasks, appointments, notebooks, users]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { id: crypto.randomUUID(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        const query = input;
        setInput('');
        setIsLoading(true);

        const aiMessageId = crypto.randomUUID();
        setMessages(prev => [...prev, { id: aiMessageId, text: '...', sender: 'ai' }]);
        setLoadingMessage('Pesquisando na base de conhecimento...');

        try {
            const context = buildContext();
            
            const localSearchResponse = await searchKnowledgeBase(query, context);
            const localAnswer = localSearchResponse.text.trim();
            
            if (localAnswer !== "Não encontrei a resposta na base de conhecimento local.") {
                 setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: localAnswer, sources: (localSearchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((c: any) => c.web).filter(Boolean) } : msg));
            } else if (settings?.enableHybridSearch) {
                setLoadingMessage('Não encontrei localmente. Pesquisando na web...');
                const stream = await getAIAssistantResponseStream(query, context, true);

                let fullResponse = '';
                let allSources: { uri: string; title: string }[] = [];
                for await (const chunk of stream) {
                    fullResponse += chunk.text;
                    if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                        const newSources = chunk.candidates[0].groundingMetadata.groundingChunks
                            .map((c: any) => c.web)
                            .filter(Boolean);
                        allSources.push(...newSources);
                    }
                    const uniqueSources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === aiMessageId ? { ...msg, text: fullResponse, isError: false, sources: uniqueSources } : msg
                        )
                    );
                }
            } else {
                setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: localAnswer } : msg));
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === aiMessageId ? { ...msg, text: errorMessage, isError: true } : msg
                )
            );
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [input, isLoading, buildContext, settings]);


    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <IconSparkles />
                        <h2 className="text-lg font-semibold text-slate-100">Assistente IA</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" aria-label="Fechar assistente">
                        <IconX size={20} />
                    </button>
                </header>
                
                <main className="flex-1 p-4 overflow-y-auto space-y-6">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                            {message.sender === 'ai' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center border border-blue-400"><IconBot size={20} /></div>}
                            <div className={`max-w-md p-3 rounded-lg ${message.isError ? 'bg-red-800/80' : message.sender === 'ai' ? 'bg-slate-800' : 'bg-blue-600 text-white'}`}>
                                {message.text === '...' ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="h-2 w-2 bg-current rounded-full animate-bounce"></span>
                                    </div>
                                ) : (
                                    <div className={`prose prose-sm max-w-none ${message.isError ? 'text-red-200' : ''}`}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                                        {message.sources && message.sources.length > 0 && (
                                            <div className="mt-3 pt-2 border-t border-slate-700">
                                                <h4 className="text-xs font-semibold text-slate-400 mb-1">Fontes:</h4>
                                                <ul className="space-y-1">
                                                    {message.sources.map((source, index) => (
                                                        <li key={index}>
                                                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate block" title={source.uri}>
                                                                {index + 1}. {source.title || source.uri}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {message.sender === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600"><IconUser size={20} /></div>}
                        </div>
                    ))}
                    {isLoading && loadingMessage && (
                        <div className="flex justify-center">
                            <div className="text-center text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                                {loadingMessage}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                <footer className="p-4 border-t border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg pr-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Faça uma pergunta..."
                            rows={1}
                            className="flex-1 bg-transparent p-3 text-slate-100 focus:outline-none resize-none"
                            disabled={isLoading}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="p-2 rounded-full text-slate-300 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
                        >
                            <IconSend size={18}/>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AIAssistant;