import { MessageCircle, Send, Clock, CheckCircle, AlertCircle, Settings, BarChart3, Users, Zap, Bot } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useWhatsApp, MessageAnalytics, ScheduledMessage, IncomingMessage, ChatbotRule } from '../services/whatsappService';
import { Patient, Appointment, Exercise } from '../types';

interface WhatsAppIntegrationProps {
  patient?: Patient;
  appointment?: Appointment;
  exercises?: Exercise[];
  onClose?: () => void;
}

export const WhatsAppIntegration: React.FC<WhatsAppIntegrationProps> = ({
  patient,
  appointment,
  exercises,
  onClose
}) => {
  const {
    sendTemplate,
    sendInteractiveMessage,
    sendMedia,
    scheduleAutomatedReminders,
    sendExerciseContent,
    getAnalytics,
    getMessageQueue,
    getIncomingMessages,
    updateChatbotRules,
    validatePhone,
    sendAppointmentReminder,
    sendWelcomeMessage
  } = useWhatsApp();
  
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'send' | 'scheduled' | 'analytics' | 'chatbot' | 'incoming'>('send');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'template' | 'interactive' | 'media'>('text');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document' | 'audio'>('image');
  const [phoneNumber, setPhoneNumber] = useState(patient?.phone || '');
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
  
  // Analytics data
  const [analytics, setAnalytics] = useState<MessageAnalytics[]>([]);
  const [messageQueue, setMessageQueue] = useState<ScheduledMessage[]>([]);
  const [incomingMessages, setIncomingMessages] = useState<IncomingMessage[]>([]);
  
  const tenantId = currentUser?.tenantId || 'default';

  useEffect(() => {
    loadData();
  }, [tenantId]);

  useEffect(() => {
    if (phoneNumber) {
      validatePhoneNumber();
    }
  }, [phoneNumber]);

  const loadData = async () => {
    try {
      const analyticsData = getAnalytics(tenantId);
      const queueData = getMessageQueue(tenantId);
      const messagesData = getIncomingMessages(tenantId);
      
      setAnalytics(analyticsData);
      setMessageQueue(queueData);
      setIncomingMessages(messagesData);
    } catch (error) {
      console.error('Error loading WhatsApp data:', error);
    }
  };

  const validatePhoneNumber = async () => {
    if (!phoneNumber) {
      setPhoneValid(null);
      return;
    }

    try {
      const result = await validatePhone(phoneNumber);
      setPhoneValid(result.isValid);
    } catch (error) {
      setPhoneValid(false);
    }
  };

  const handleSendMessage = async () => {
    if (!phoneNumber || phoneValid === false) {
      alert('Número de telefone inválido');
      return;
    }

    setLoading(true);
    try {
      let result;

      switch (messageType) {
        case 'text':
          // Use original sendTextMessage for simple text
          break;
        case 'template':
          if (!selectedTemplate) {
            alert('Selecione um template');
            return;
          }
          const templateParams = patient ? [patient.name] : ['Paciente'];
          result = await sendTemplate(phoneNumber, selectedTemplate, templateParams, tenantId);
          break;
        case 'interactive':
          const interactive = {
            type: 'button' as const,
            body: message,
            action: {
              buttons: [
                { id: 'confirm', title: 'Confirmar' },
                { id: 'reschedule', title: 'Reagendar' },
                { id: 'cancel', title: 'Cancelar' }
              ]
            }
          };
          result = await sendInteractiveMessage(phoneNumber, interactive, tenantId);
          break;
        case 'media':
          if (!mediaUrl) {
            alert('Forneça a URL da mídia');
            return;
          }
          result = await sendMedia(phoneNumber, mediaUrl, mediaType, message, tenantId);
          break;
      }

      if (result?.success) {
        alert('Mensagem enviada com sucesso!');
        setMessage('');
        setMediaUrl('');
      } else {
        alert(`Erro ao enviar mensagem: ${result?.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      alert('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleReminders = async () => {
    if (!patient || !appointment) return;

    setLoading(true);
    try {
      const result = await scheduleAutomatedReminders(patient, appointment, tenantId);
      
      if (result.reminder24h || result.reminder2h) {
        alert(`Lembretes agendados: ${result.reminder24h ? '24h' : ''} ${result.reminder2h ? '2h' : ''}`);
        loadData();
      } else {
        alert('Não foi possível agendar lembretes (consulta muito próxima)');
      }
    } catch (error) {
      alert('Erro ao agendar lembretes');
    } finally {
      setLoading(false);
    }
  };

  const handleSendExercises = async () => {
    if (!patient || !exercises?.length) return;

    setLoading(true);
    try {
      const result = await sendExerciseContent(patient, exercises, tenantId);
      
      if (result.success) {
        alert('Exercícios enviados com sucesso!');
      } else {
        alert(`Erro ao enviar exercícios: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao enviar exercícios');
    } finally {
      setLoading(false);
    }
  };

  const renderSendTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Número do WhatsApp
        </label>
        <div className="relative">
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="(11) 99999-9999"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              phoneValid === true ? 'border-green-500' : 
              phoneValid === false ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {phoneValid === true && (
            <CheckCircle className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
          )}
          {phoneValid === false && (
            <AlertCircle className="absolute right-3 top-2.5 w-5 h-5 text-red-500" />
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Mensagem
        </label>
        <select
          value={messageType}
          onChange={(e) => setMessageType(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="text">Texto Simples</option>
          <option value="template">Template</option>
          <option value="interactive">Interativa (Botões)</option>
          <option value="media">Mídia</option>
        </select>
      </div>

      {messageType === 'template' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um template</option>
            <option value="welcome_patient">Boas-vindas</option>
            <option value="appointment_reminder_24h">Lembrete 24h</option>
            <option value="appointment_reminder_2h">Lembrete 2h</option>
            <option value="exercise_notification">Exercícios</option>
          </select>
        </div>
      )}

      {messageType === 'media' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Mídia
            </label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
              <option value="document">Documento</option>
              <option value="audio">Áudio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL da Mídia
            </label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://example.com/media.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mensagem
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleSendMessage}
          disabled={loading || !phoneNumber || phoneValid === false}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Send className="w-4 h-4 mr-2" />
          Enviar Agora
        </button>
      </div>

      {patient && appointment && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Ações Rápidas</h4>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={handleScheduleReminders}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <Clock className="w-4 h-4 mr-2" />
              Agendar Lembretes da Consulta
            </button>
            
            {exercises?.length && (
              <button
                onClick={handleSendExercises}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                Enviar Exercícios ({exercises.length})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderScheduledTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Mensagens Agendadas</h4>
        <span className="text-sm text-gray-500">{messageQueue.length} mensagens</span>
      </div>
      
      <div className="space-y-3">
        {messageQueue.map((scheduled) => (
          <div key={scheduled.id} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Para: {scheduled.message.to}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                scheduled.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                scheduled.status === 'sent' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {scheduled.status === 'pending' ? 'Pendente' :
                 scheduled.status === 'sent' ? 'Enviada' : 'Falhou'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {scheduled.message.content || `Template: ${scheduled.message.templateName}`}
            </p>
            <p className="text-xs text-gray-500">
              Agendado para: {new Date(scheduled.scheduledFor).toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
        
        {messageQueue.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma mensagem agendada</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalyticsTab = () => {
    const todayAnalytics = analytics.find(a => 
      a.date === new Date().toISOString().split('T')[0]
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Send className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Enviadas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayAnalytics?.messagesSent || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Entregues</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayAnalytics?.messagesDelivered || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Lidas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayAnalytics?.messagesRead || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Falhas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayAnalytics?.messagesFailed || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Performance do Bot</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Taxa de Resposta</p>
              <p className="text-xl font-bold text-gray-900">
                {todayAnalytics?.responseRate || 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Resolução do Bot</p>
              <p className="text-xl font-bold text-gray-900">
                {todayAnalytics?.botResolutionRate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderIncomingTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Mensagens Recebidas</h4>
        <span className="text-sm text-gray-500">{incomingMessages.length} mensagens</span>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {incomingMessages.slice(-10).reverse().map((msg) => (
          <div key={msg.id} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">De: {msg.from}</span>
              <div className="flex items-center space-x-2">
                {msg.processed && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    <Bot className="w-3 h-3 inline mr-1" />
                    Bot respondeu
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              {msg.type === 'text' ? (
                <p>{msg.content.text?.body}</p>
              ) : (
                <p className="italic">Mídia: {msg.type}</p>
              )}
            </div>
          </div>
        ))}
        
        {incomingMessages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma mensagem recebida</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <MessageCircle className="w-6 h-6 text-green-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            Integração WhatsApp
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'send', label: 'Enviar', icon: Send },
            { id: 'scheduled', label: 'Agendadas', icon: Clock },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'incoming', label: 'Recebidas', icon: MessageCircle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'send' && renderSendTab()}
        {activeTab === 'scheduled' && renderScheduledTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'incoming' && renderIncomingTab()}
      </div>
    </div>
  );
};