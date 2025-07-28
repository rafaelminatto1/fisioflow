import { Send, Phone, Video, Mail, MessageSquare, Clock, Check, CheckCheck } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Patient } from '@/types/patient';

interface PatientMessagesTabProps {
  patient: Patient;
  onUpdate: (updates: Partial<Patient>) => void;
}

interface Message {
  id: string;
  type: 'whatsapp' | 'sms' | 'email' | 'internal';
  direction: 'sent' | 'received';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sender: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
}

interface Template {
  id: string;
  name: string;
  content: string;
  type: 'appointment' | 'reminder' | 'exercise' | 'general';
}

const mockMessages: Message[] = [
  {
    id: '1',
    type: 'whatsapp',
    direction: 'received',
    content: 'Olá, gostaria de remarcar minha consulta de amanhã.',
    timestamp: '2024-01-20T14:30:00',
    status: 'read',
    sender: 'Maria Silva'
  },
  {
    id: '2',
    type: 'whatsapp',
    direction: 'sent',
    content: 'Olá Maria! Claro, que horário seria melhor para você?',
    timestamp: '2024-01-20T14:35:00',
    status: 'read',
    sender: 'Dr. Silva'
  },
  {
    id: '3',
    type: 'whatsapp',
    direction: 'received',
    content: 'Seria possível na terça-feira às 15h?',
    timestamp: '2024-01-20T14:40:00',
    status: 'read',
    sender: 'Maria Silva'
  },
  {
    id: '4',
    type: 'sms',
    direction: 'sent',
    content: 'Lembrete: Sua consulta está agendada para amanhã às 10h. Confirme sua presença.',
    timestamp: '2024-01-19T18:00:00',
    status: 'delivered',
    sender: 'Sistema'
  },
  {
    id: '5',
    type: 'email',
    direction: 'sent',
    content: 'Segue em anexo sua ficha de exercícios atualizada. Qualquer dúvida, entre em contato.',
    timestamp: '2024-01-18T16:20:00',
    status: 'read',
    sender: 'Dr. Silva',
    attachments: [
      {
        id: '1',
        name: 'ficha_exercicios.pdf',
        type: 'application/pdf',
        url: '#'
      }
    ]
  }
];

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Lembrete de Consulta',
    content: 'Olá {nome}! Lembramos que sua consulta está agendada para {data} às {hora}. Confirme sua presença.',
    type: 'appointment'
  },
  {
    id: '2',
    name: 'Exercícios Prescritos',
    content: 'Olá {nome}! Seus exercícios foram atualizados. Lembre-se de realizá-los conforme orientado.',
    type: 'exercise'
  },
  {
    id: '3',
    name: 'Resultado de Exame',
    content: 'Olá {nome}! Seus resultados de exame estão disponíveis. Agende uma consulta para discussão.',
    type: 'general'
  }
];

export function PatientMessagesTab({ patient, onUpdate }: PatientMessagesTabProps) {
  const [messages] = useState<Message[]>(mockMessages);
  const [templates] = useState<Template[]>(mockTemplates);
  const [newMessage, setNewMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [messageType, setMessageType] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'whatsapp':
        return '💬';
      case 'sms':
        return '📱';
      case 'email':
        return '📧';
      case 'internal':
        return '🏥';
      default:
        return '💬';
    }
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <span className="text-red-500">!</span>;
      default:
        return null;
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Implementar lógica para enviar mensagem
    console.log('Enviando mensagem:', {
      type: messageType,
      content: newMessage,
      patient: patient.id
    });
    
    setNewMessage('');
  };

  const handleUseTemplate = (template: Template) => {
    const processedContent = template.content
      .replace('{nome}', patient.name)
      .replace('{data}', new Date().toLocaleDateString('pt-BR'))
      .replace('{hora}', '10:00');
    
    setNewMessage(processedContent);
    setSelectedTemplate(null);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com ações rápidas */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Mensagens</h3>
          <p className="text-sm text-gray-600">
            Última conversa: {formatTimestamp(messages[0]?.timestamp || new Date().toISOString())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Ligar
          </Button>
          <Button variant="outline" size="sm">
            <Video className="h-4 w-4 mr-2" />
            Videochamada
          </Button>
        </div>
      </div>

      <Tabs defaultValue="conversation" className="w-full">
        <TabsList>
          <TabsTrigger value="conversation">Conversa</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="conversation" className="space-y-4">
          {/* Área de conversa */}
          <Card className="h-96">
            <CardContent className="p-0 h-full flex flex-col">
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.direction === 'sent'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">{getMessageIcon(message.type)}</span>
                        <span className="text-xs opacity-75">{message.sender}</span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="text-xs opacity-75">
                              📎 {attachment.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs opacity-75">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.direction === 'sent' && getStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input de nova mensagem */}
              <div className="border-t p-4">
                <div className="flex gap-2 mb-2">
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="sms">📱 SMS</option>
                    <option value="email">📧 Email</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Templates de Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <Badge variant="outline">
                        {template.type === 'appointment' ? 'Consulta' :
                         template.type === 'exercise' ? 'Exercício' :
                         template.type === 'reminder' ? 'Lembrete' : 'Geral'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{template.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Comunicação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Estatísticas */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">24</div>
                    <div className="text-sm text-gray-600">Mensagens enviadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">18</div>
                    <div className="text-sm text-gray-600">Mensagens recebidas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">95%</div>
                    <div className="text-sm text-gray-600">Taxa de resposta</div>
                  </div>
                </div>

                {/* Resumo por canal */}
                <div className="space-y-3">
                  <h4 className="font-medium">Comunicação por Canal</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <div className="flex items-center gap-2">
                        <span>💬</span>
                        <span className="text-sm">WhatsApp</span>
                      </div>
                      <span className="text-sm font-medium">32 mensagens</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <div className="flex items-center gap-2">
                        <span>📱</span>
                        <span className="text-sm">SMS</span>
                      </div>
                      <span className="text-sm font-medium">8 mensagens</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                      <div className="flex items-center gap-2">
                        <span>📧</span>
                        <span className="text-sm">Email</span>
                      </div>
                      <span className="text-sm font-medium">2 mensagens</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}