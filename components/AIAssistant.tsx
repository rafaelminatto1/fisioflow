import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useData } from '../hooks/useData';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  IconX,
  IconSparkles,
  IconUser,
  IconBot,
  IconSend,
} from './icons/IconComponents';
import { AIAssistantProps } from '../types';

interface SuggestedAction {
  label: string;
  action: string;
  payload?: any;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  suggestedActions?: SuggestedAction[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  isOpen,
  onClose,
  contextType = 'staff',
  patientData,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<any | null>(null);
  const [intentExtractionChat, setIntentExtractionChat] = useState<any | null>(
    null
  );
  const [isFirstMessage, setIsFirstMessage] = useState(true);

  const { patients, tasks, appointments, notebooks, users } = useData();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const parseActionSuggestions = (
    text: string
  ): { cleanText: string; suggestedActions: SuggestedAction[] } => {
    const actionBlockRegex = /```json-actions\s*([\s\S]*?)\s*```/;
    const match = text.match(actionBlockRegex);

    if (!match) {
      return { cleanText: text, suggestedActions: [] };
    }

    const cleanText = text.replace(actionBlockRegex, '').trim();

    try {
      const actionData = JSON.parse(match[1]);
      const suggestedActions = actionData.suggestedActions || [];
      return { cleanText, suggestedActions };
    } catch (error) {
      console.error('Error parsing action suggestions:', error);
      return { cleanText, suggestedActions: [] };
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildStaffContext = useCallback((): string => {
    const contextParts: string[] = [];
    contextParts.push(
      `== Pacientes ==\n${patients.map((p) => `ID: ${p.id}, Nome: ${p.name}, Histórico: ${(p.medicalHistory || '').substring(0, 200)}...`).join('\n')}`
    );
    contextParts.push(
      `== Tarefas ==\n${tasks.map((t) => `ID: ${t.id}, Título: ${t.title}, Status: ${t.status}, Responsável: ${users.find((u) => u.id === t.assigneeId)?.name || 'N/A'}, Paciente: ${patients.find((p) => p.id === t.patientId)?.name || 'N/A'}`).join('\n')}`
    );
    contextParts.push(
      `== Agendamentos ==\n${appointments.map((a) => `ID: ${a.id}, Título: ${a.title}, Paciente: ${patients.find((p) => p.id === a.patientId)?.name || 'N/A'}, Terapeuta: ${users.find((u) => u.id === a.therapistId)?.name || 'N/A'}, Início: ${new Date(a.start).toLocaleString('pt-BR')}`).join('\n')}`
    );
    contextParts.push(
      `== Base de Conhecimento (Notebooks) ==\n${notebooks
        .flatMap((nb) => nb.pages)
        .map(
          (p) =>
            `Título: ${p.title}\nConteúdo: ${(p.content || '').substring(0, 300)}...`
        )
        .join('\n---\n')}`
    );

    return contextParts.join('\n\n');
  }, [patients, tasks, appointments, notebooks, users]);

  const buildPatientContext = useCallback((): string => {
    if (!patientData) return 'Nenhum dado do paciente fornecido.';

    const contextParts: string[] = [];
    contextParts.push(
      `== Próximos Agendamentos ==\n${
        patientData.appointments
          .filter((a) => new Date(a.start) > new Date())
          .map(
            (a) =>
              `- ${a.title} em ${new Date(a.start).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
          )
          .join('\n') || 'Nenhum agendamento futuro.'
      }`
    );

    contextParts.push(
      `== Exercícios Prescritos ==\n${
        patientData.prescriptions
          .map((p) => {
            const exercise = patientData.exercises.find(
              (e) => e.id === p.exerciseId
            );
            return `- ${exercise?.name || 'Exercício desconhecido'}: ${p.sets}x${p.reps}, ${p.frequency}`;
          })
          .join('\n') || 'Nenhum exercício prescrito.'
      }`
    );

    return contextParts.join('\n\n');
  }, [patientData]);

  const extractIntent = async (userMessage: string): Promise<any> => {
    if (!intentExtractionChat) return null;

    const intentPrompt = `Analise a seguinte pergunta do usuário e extraia a intenção e entidades relevantes. Responda APENAS em formato JSON válido, sem markdown ou explicações adicionais.

Pergunta: "${userMessage}"

Formato da resposta:
{
  "intent": "find_patient|find_appointment|find_task|find_exercise|general_question",
  "entities": {
    "patientName": "nome se mencionado",
    "patientId": "id se mencionado", 
    "taskType": "tipo de tarefa se mencionado",
    "appointmentDate": "data se mencionada",
    "keywords": ["palavras-chave", "relevantes"]
  }
}`;

    try {
      const response = await intentExtractionChat.sendMessage(intentPrompt);
      const result = await response.response;
      return JSON.parse(result.text());
    } catch (error) {
      console.error('Error extracting intent:', error);
      return null;
    }
  };

  const buildTargetedContext = useCallback(
    (intentData: any): string => {
      if (!intentData) return buildStaffContext();

      const { intent, entities } = intentData;
      const contextParts: string[] = [];

      switch (intent) {
        case 'find_patient':
          if (entities.patientName || entities.patientId) {
            const targetPatients = patients.filter(
              (p) =>
                (entities.patientName &&
                  p.name
                    .toLowerCase()
                    .includes(entities.patientName.toLowerCase())) ||
                (entities.patientId && p.id === entities.patientId)
            );
            contextParts.push(
              `== Pacientes Relevantes ==\n${targetPatients.map((p) => `ID: ${p.id}, Nome: ${p.name}, Histórico: ${p.medicalHistory}`).join('\n')}`
            );

            // Adicionar tarefas e agendamentos dos pacientes relevantes
            const patientIds = targetPatients.map((p) => p.id);
            const relevantTasks = tasks.filter((t) =>
              patientIds.includes(t.patientId || '')
            );
            const relevantAppointments = appointments.filter((a) =>
              patientIds.includes(a.patientId)
            );

            if (relevantTasks.length > 0) {
              contextParts.push(
                `== Tarefas Relevantes ==\n${relevantTasks.map((t) => `ID: ${t.id}, Título: ${t.title}, Status: ${t.status}, Paciente: ${patients.find((p) => p.id === t.patientId)?.name || 'N/A'}`).join('\n')}`
              );
            }

            if (relevantAppointments.length > 0) {
              contextParts.push(
                `== Agendamentos Relevantes ==\n${relevantAppointments.map((a) => `ID: ${a.id}, Título: ${a.title}, Paciente: ${patients.find((p) => p.id === a.patientId)?.name || 'N/A'}, Início: ${new Date(a.start).toLocaleString('pt-BR')}`).join('\n')}`
              );
            }
          }
          break;

        case 'find_appointment':
          let relevantAppointments = appointments;
          if (entities.appointmentDate) {
            const targetDate = new Date(
              entities.appointmentDate
            ).toDateString();
            relevantAppointments = appointments.filter(
              (a) => new Date(a.start).toDateString() === targetDate
            );
          }
          if (entities.patientName) {
            const targetPatients = patients.filter((p) =>
              p.name.toLowerCase().includes(entities.patientName.toLowerCase())
            );
            const patientIds = targetPatients.map((p) => p.id);
            relevantAppointments = relevantAppointments.filter((a) =>
              patientIds.includes(a.patientId)
            );
          }
          contextParts.push(
            `== Agendamentos Relevantes ==\n${relevantAppointments
              .slice(0, 10)
              .map(
                (a) =>
                  `ID: ${a.id}, Título: ${a.title}, Paciente: ${patients.find((p) => p.id === a.patientId)?.name || 'N/A'}, Início: ${new Date(a.start).toLocaleString('pt-BR')}`
              )
              .join('\n')}`
          );
          break;

        case 'find_task':
          let relevantTasks = tasks;
          if (entities.patientName) {
            const targetPatients = patients.filter((p) =>
              p.name.toLowerCase().includes(entities.patientName.toLowerCase())
            );
            const patientIds = targetPatients.map((p) => p.id);
            relevantTasks = tasks.filter((t) =>
              patientIds.includes(t.patientId || '')
            );
          }
          contextParts.push(
            `== Tarefas Relevantes ==\n${relevantTasks
              .slice(0, 10)
              .map(
                (t) =>
                  `ID: ${t.id}, Título: ${t.title}, Status: ${t.status}, Paciente: ${patients.find((p) => p.id === t.patientId)?.name || 'N/A'}`
              )
              .join('\n')}`
          );
          break;

        default:
          // Para perguntas gerais, usar contexto mínimo
          contextParts.push(
            `== Resumo da Clínica ==\nTotal de Pacientes: ${patients.length}\nTotal de Tarefas: ${tasks.length}\nTotal de Agendamentos: ${appointments.length}`
          );
          break;
      }

      return contextParts.join('\n\n');
    },
    [patients, tasks, appointments]
  );

  useEffect(() => {
    if (isOpen) {
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

      // Create intent extraction chat
      const intentModel = ai.getGenerativeModel({ 
        model: "gemini-pro",
        systemInstruction: 'Você é um extrator de intenções. Analise mensagens de usuários e extraia intenções e entidades em formato JSON. Seja preciso e conciso.'
      });
      setIntentExtractionChat(intentModel.startChat());

      const patientInstruction = `Você é um assistente amigável e prestativo para um paciente da clínica FisioFlow. Seu objetivo é responder a perguntas sobre os agendamentos e exercícios prescritos do paciente, baseando-se **apenas** nos dados fornecidos no contexto. **Nunca** forneça conselhos médicos, diagnósticos ou interprete sintomas. Se for solicitado um conselho médico, recuse educadamente e recomende que o paciente fale com seu fisioterapeuta. Seja sempre solidário e encorajador. Responda em português.\n\nIMPORTANTE: Quando apropriado, inclua sugestões de ações no final da sua resposta em formato JSON dentro de um bloco de código com a tag "\`\`\`json-actions". O formato deve ser:\n\`\`\`json-actions\n{\n  "suggestedActions": [\n    {"label": "Texto do Botão", "action": "ACAO_ESPECIFICA", "payload": {...}}\n  ]\n}\n\`\`\`\n\nAções disponíveis para pacientes: VIEW_EXERCISES, CONTACT_THERAPIST, VIEW_NEXT_APPOINTMENT.`;

      const staffInstruction = `Você é o FisioFlow AI, um assistente inteligente para uma clínica de fisioterapia. Sua função é ajudar fisioterapeutas e funcionários, respondendo a perguntas com base nos dados fornecidos da clínica e em seu conhecimento geral. Seja conciso, profissional e formate suas respostas de forma clara usando Markdown. Use listas, negrito e outras formatações para melhorar a legibilidade. Ao ser questionado sobre dados específicos de pacientes, tarefas ou agendamentos, use **apenas** o contexto fornecido. Se a informação não estiver no contexto, afirme que não a encontrou nos dados da clínica. Para perguntas gerais de fisioterapia não relacionadas aos dados da clínica, você pode usar seu próprio conhecimento. Responda sempre em português.\n\nIMPORTANTE: Quando apropriado, inclua sugestões de ações no final da sua resposta em formato JSON dentro de um bloco de código com a tag "\`\`\`json-actions". O formato deve ser:\n\`\`\`json-actions\n{\n  "suggestedActions": [\n    {"label": "Texto do Botão", "action": "ACAO_ESPECIFICA", "payload": {...}}\n  ]\n}\n\`\`\`\n\nAções disponíveis para staff: NAVIGATE_TO_KANBAN, OPEN_PATIENT_MODAL, OPEN_CALENDAR, CREATE_APPOINTMENT, VIEW_PATIENT_TASKS, OPEN_REPORTS.`;

      const systemInstruction =
        contextType === 'patient' ? patientInstruction : staffInstruction;

      const model = ai.getGenerativeModel({ 
        model: "gemini-pro",
        systemInstruction 
      });
      setChat(model.startChat());
      setIsFirstMessage(true);

      const initialMessage =
        contextType === 'patient'
          ? 'Olá! Sou seu assistente pessoal da FisioFlow. Posso ajudar com informações sobre seus agendamentos e exercícios. O que você gostaria de saber?'
          : 'Olá! Sou o assistente de IA da FisioFlow. Como posso ajudar você hoje? Você pode me perguntar sobre pacientes, tarefas, ou fazer perguntas gerais sobre fisioterapia.';

      setMessages([{ id: 'init', sender: 'ai', text: initialMessage }]);
    } else {
      setChat(null);
      setIntentExtractionChat(null);
      setMessages([]);
    }
  }, [isOpen, contextType, patientData]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chat) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: input,
      sender: 'user',
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const thinkingMessageId = crypto.randomUUID();
    const thinkingMessage: Message = {
      id: thinkingMessageId,
      text: '...',
      sender: 'ai',
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    let messageToSend = input;
    let context = '';

    try {
      // Etapa 1: Extração de Intenção (somente para contexto staff e primeira mensagem)
      if (isFirstMessage && contextType === 'staff') {
        const intentData = await extractIntent(input);
        context = buildTargetedContext(intentData);
        console.log('Intent extracted:', intentData);
        console.log('Targeted context size:', context.length, 'characters');
      } else if (isFirstMessage && contextType === 'patient') {
        context = buildPatientContext();
      }

      // Etapa 2: Construir mensagem com contexto otimizado
      if (isFirstMessage) {
        messageToSend = `Use o seguinte contexto para basear suas respostas. Responda apenas à pergunta do usuário no final.\n\nCONTEXTO:\n---\n${context}\n---\n\nPERGUNTA DO USUÁRIO: "${input}"`;
        setIsFirstMessage(false);
      }

      const response = await chat.sendMessage(messageToSend);
      const result = await response.response;
      const responseText = result.text();

      const { cleanText, suggestedActions } =
        parseActionSuggestions(responseText);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingMessageId
            ? { ...msg, text: cleanText, suggestedActions }
            : msg
        )
      );
    } catch (error) {
      console.error('Error calling Gemini Chat API:', error);
      const errorMessage =
        'Desculpe, ocorreu um erro ao tentar obter uma resposta. Por favor, tente novamente.';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingMessageId ? { ...msg, text: errorMessage } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: SuggestedAction) => {
    // Aqui você pode implementar as ações específicas
    // Por enquanto, vou apenas logar e fechar o modal quando apropriado
    console.log('Action clicked:', action);

    switch (action.action) {
      case 'NAVIGATE_TO_KANBAN':
        // Esta ação seria implementada no App.tsx para mudar a view
        onClose(); // Fechar o assistant por enquanto
        break;
      case 'OPEN_PATIENT_MODAL':
        // Esta ação abriria o modal do paciente
        onClose();
        break;
      case 'OPEN_CALENDAR':
        // Esta ação navegaria para o calendário
        onClose();
        break;
      case 'CREATE_APPOINTMENT':
        // Esta ação abriria o modal de criar agendamento
        onClose();
        break;
      case 'VIEW_PATIENT_TASKS':
        // Esta ação mostraria as tarefas do paciente
        break;
      case 'OPEN_REPORTS':
        // Esta ação navegaria para relatórios
        onClose();
        break;
      // Ações do paciente
      case 'VIEW_EXERCISES':
        // Mostrar exercícios do paciente
        break;
      case 'CONTACT_THERAPIST':
        // Abrir chat com terapeuta
        break;
      case 'VIEW_NEXT_APPOINTMENT':
        // Mostrar próximo agendamento
        break;
      default:
        console.log('Unknown action:', action.action);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] max-h-[700px] w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <IconSparkles />
            <h2 className="text-lg font-semibold text-slate-100">
              Assistente IA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar assistente"
          >
            <IconX size={20} />
          </button>
        </header>

        <main className="flex-1 space-y-6 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}
            >
              {message.sender === 'ai' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-blue-400 bg-blue-500/50">
                  <IconBot size={20} />
                </div>
              )}
              <div className={`max-w-md ${message.sender === 'ai' ? '' : ''}`}>
                <div
                  className={`rounded-lg p-3 ${message.sender === 'ai' ? 'bg-slate-800' : 'bg-blue-600 text-white'}`}
                >
                  {message.text === '...' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]"></span>
                      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]"></span>
                      <span className="h-2 w-2 animate-bounce rounded-full bg-current"></span>
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-p:text-slate-300 prose-headings:text-slate-100 prose-a:text-blue-400 prose-strong:text-slate-100 max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {message.suggestedActions &&
                  message.suggestedActions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.suggestedActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleActionClick(action)}
                          className="rounded-md border border-blue-500 bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
              {message.sender === 'user' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-700">
                  <IconUser size={20} />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </main>

        <footer className="flex-shrink-0 border-t border-slate-700 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 pr-2">
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
              className="flex-1 resize-none bg-transparent p-3 text-slate-100 focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-blue-600 p-2 text-slate-300 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              <IconSend size={18} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AIAssistant;
