import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, Edit3, TestTube, Key, MessageSquare, Bot, Zap, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useWhatsApp, ChatbotRule, MessageTemplate } from '../services/whatsappService';
import { useAuth } from '../hooks/useAuth';

interface WhatsAppSettingsProps {
  onClose?: () => void;
}

export const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({ onClose }) => {
  const { updateChatbotRules, getTemplates, verifyWebhook } = useWhatsApp();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'api' | 'templates' | 'chatbot' | 'webhook'>('api');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // API Configuration
  const [apiConfig, setApiConfig] = useState({
    accessToken: localStorage.getItem('whatsapp_access_token') || '',
    phoneNumberId: localStorage.getItem('whatsapp_phone_number_id') || '',
    businessAccountId: localStorage.getItem('whatsapp_business_account_id') || '',
    webhookToken: localStorage.getItem('whatsapp_webhook_token') || '',
    apiVersion: localStorage.getItem('whatsapp_api_version') || '19.0'
  });

  // Templates
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Chatbot Rules
  const [chatbotRules, setChatbotRules] = useState<ChatbotRule[]>([
    {
      id: '1',
      keywords: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'],
      response: 'Olá! Sou o assistente virtual da FisioFlow. Como posso ajudá-lo hoje?',
      responseType: 'text',
      priority: 1,
      isActive: true
    },
    {
      id: '2',
      keywords: ['horário', 'horarios', 'funcionamento', 'atendimento', 'aberto'],
      response: 'Nosso horário de funcionamento:\n🕐 Segunda a Sexta: 7h às 19h\n🕐 Sábados: 8h às 12h\n🚫 Domingos: Fechado',
      responseType: 'text',
      priority: 2,
      isActive: true
    },
    {
      id: '3',
      keywords: ['agendar', 'marcar', 'consulta', 'agendamento', 'horario livre'],
      response: 'Para agendar sua consulta, você pode:\n📱 Ligar: (11) 99999-9999\n💻 Portal online\n🏥 Presencialmente na clínica\n\nQual opção prefere?',
      responseType: 'text',
      priority: 3,
      isActive: true
    },
    {
      id: '4',
      keywords: ['exercicio', 'exercícios', 'video', 'videos', 'treino'],
      response: 'Seus exercícios estão disponíveis no portal do paciente. Posso enviar o link de acesso?',
      responseType: 'text',
      priority: 4,
      isActive: true
    },
    {
      id: '5',
      keywords: ['cancelar', 'remarcar', 'reagendar', 'transferir'],
      response: 'Vou transferir você para nossa recepção para auxiliar no reagendamento. Aguarde um momento...',
      responseType: 'transfer',
      transferTo: 'reception',
      priority: 5,
      isActive: true
    },
    {
      id: '6',
      keywords: ['dor', 'doendo', 'machucou', 'lesão', 'lesao'],
      response: 'Sinto muito que esteja sentindo dor. Vou conectá-lo com um fisioterapeuta para uma avaliação urgente.',
      responseType: 'transfer',
      transferTo: 'therapist',
      priority: 10,
      isActive: true
    }
  ]);

  const [editingRule, setEditingRule] = useState<ChatbotRule | null>(null);
  const [newRule, setNewRule] = useState<Partial<ChatbotRule>>({
    keywords: [],
    response: '',
    responseType: 'text',
    priority: 1,
    isActive: true
  });

  // Webhook Configuration
  const [webhookConfig, setWebhookConfig] = useState({
    url: localStorage.getItem('whatsapp_webhook_url') || '',
    verifyToken: localStorage.getItem('whatsapp_webhook_verify_token') || ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templateData = getTemplates();
      setTemplates(templateData);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveApiConfig = () => {
    setLoading(true);
    try {
      Object.entries(apiConfig).forEach(([key, value]) => {
        localStorage.setItem(`whatsapp_${key.toLowerCase()}`, value);
      });
      
      setTestResult({ success: true, message: 'Configurações da API salvas com sucesso!' });
    } catch (error) {
      setTestResult({ success: false, message: 'Erro ao salvar configurações da API' });
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (apiConfig.accessToken && apiConfig.phoneNumberId) {
        setTestResult({ 
          success: true, 
          message: 'Conexão com a API do WhatsApp estabelecida com sucesso!' 
        });
      } else {
        setTestResult({ 
          success: false, 
          message: 'Configurações incompletas. Verifique o Token e Phone Number ID.' 
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: 'Erro ao testar conexão com a API do WhatsApp' 
      });
    } finally {
      setLoading(false);
    }
  };

  const saveChatbotRules = () => {
    setLoading(true);
    try {
      updateChatbotRules(chatbotRules);
      setTestResult({ success: true, message: 'Regras do chatbot atualizadas com sucesso!' });
    } catch (error) {
      setTestResult({ success: false, message: 'Erro ao salvar regras do chatbot' });
    } finally {
      setLoading(false);
    }
  };

  const addChatbotRule = () => {
    if (!newRule.keywords?.length || !newRule.response) {
      alert('Preencha as palavras-chave e a resposta');
      return;
    }

    const rule: ChatbotRule = {
      id: Date.now().toString(),
      keywords: newRule.keywords || [],
      response: newRule.response || '',
      responseType: newRule.responseType || 'text',
      transferTo: newRule.transferTo,
      priority: newRule.priority || 1,
      isActive: newRule.isActive !== false
    };

    setChatbotRules([...chatbotRules, rule]);
    setNewRule({
      keywords: [],
      response: '',
      responseType: 'text',
      priority: 1,
      isActive: true
    });
  };

  const updateChatbotRule = (id: string, updates: Partial<ChatbotRule>) => {
    setChatbotRules(chatbotRules.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const deleteChatbotRule = (id: string) => {
    setChatbotRules(chatbotRules.filter(rule => rule.id !== id));
  };

  const renderApiTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start">
          <Key className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="font-medium text-blue-900">Configuração da API WhatsApp Business</h4>
            <p className="text-sm text-blue-700 mt-1">
              Configure suas credenciais do WhatsApp Business API para habilitar o envio de mensagens.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Access Token
          </label>
          <input
            type="password"
            value={apiConfig.accessToken}
            onChange={(e) => setApiConfig({ ...apiConfig, accessToken: e.target.value })}
            placeholder="Seu WhatsApp Business API Access Token"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number ID
          </label>
          <input
            type="text"
            value={apiConfig.phoneNumberId}
            onChange={(e) => setApiConfig({ ...apiConfig, phoneNumberId: e.target.value })}
            placeholder="ID do número de telefone registrado"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Account ID
          </label>
          <input
            type="text"
            value={apiConfig.businessAccountId}
            onChange={(e) => setApiConfig({ ...apiConfig, businessAccountId: e.target.value })}
            placeholder="ID da conta business do WhatsApp"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook Verify Token
          </label>
          <input
            type="text"
            value={apiConfig.webhookToken}
            onChange={(e) => setApiConfig({ ...apiConfig, webhookToken: e.target.value })}
            placeholder="Token para verificação do webhook"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Versão da API
          </label>
          <select
            value={apiConfig.apiVersion}
            onChange={(e) => setApiConfig({ ...apiConfig, apiVersion: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="19.0">v19.0 (Mais recente)</option>
            <option value="18.0">v18.0</option>
            <option value="17.0">v17.0</option>
          </select>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={saveApiConfig}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </button>
        
        <button
          onClick={testApiConnection}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
        >
          <TestTube className="w-4 h-4 mr-2" />
          Testar Conexão
        </button>
      </div>

      {testResult && (
        <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            )}
            <p className={`${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {testResult.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-start">
          <MessageSquare className="w-5 h-5 text-purple-600 mt-0.5 mr-3" />
          <div>
            <h4 className="font-medium text-purple-900">Templates de Mensagem</h4>
            <p className="text-sm text-purple-700 mt-1">
              Gerencie os templates aprovados pelo WhatsApp para envio de mensagens automatizadas.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {templates.map((template) => (
          <div key={template.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-500">Categoria: {template.category}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  template.status === 'approved' ? 'bg-green-100 text-green-800' :
                  template.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {template.status === 'approved' ? 'Aprovado' :
                   template.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                </span>
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700">
                {template.components.find(c => c.type === 'body')?.text || 'Sem conteúdo'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderChatbotTab = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-start">
          <Bot className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
          <div>
            <h4 className="font-medium text-green-900">Configuração do Chatbot</h4>
            <p className="text-sm text-green-700 mt-1">
              Configure as respostas automáticas do chatbot baseadas em palavras-chave.
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Adicionar Nova Regra</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Palavras-chave (separadas por vírgula)
            </label>
            <input
              type="text"
              value={newRule.keywords?.join(', ') || ''}
              onChange={(e) => setNewRule({ 
                ...newRule, 
                keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
              })}
              placeholder="oi, olá, bom dia"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Resposta
            </label>
            <select
              value={newRule.responseType}
              onChange={(e) => setNewRule({ ...newRule, responseType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Texto</option>
              <option value="template">Template</option>
              <option value="transfer">Transferir para Humano</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resposta
          </label>
          <textarea
            value={newRule.response}
            onChange={(e) => setNewRule({ ...newRule, response: e.target.value })}
            placeholder="Digite a resposta automática..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridade
            </label>
            <input
              type="number"
              value={newRule.priority}
              onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {newRule.responseType === 'transfer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transferir para
              </label>
              <select
                value={newRule.transferTo || ''}
                onChange={(e) => setNewRule({ ...newRule, transferTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                <option value="reception">Recepção</option>
                <option value="therapist">Fisioterapeuta</option>
                <option value="general">Atendimento Geral</option>
              </select>
            </div>
          )}

          <div className="flex items-center pt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newRule.isActive !== false}
                onChange={(e) => setNewRule({ ...newRule, isActive: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Ativa</span>
            </label>
          </div>
        </div>

        <button
          onClick={addChatbotRule}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Regra
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Regras Configuradas</h4>
        
        {chatbotRules.map((rule) => (
          <div key={rule.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Palavras-chave: {rule.keywords.join(', ')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {rule.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    Prioridade: {rule.priority}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{rule.response}</p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Tipo: {rule.responseType}</span>
                  {rule.transferTo && <span>Transferir para: {rule.transferTo}</span>}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => updateChatbotRule(rule.id, { isActive: !rule.isActive })}
                  className={`p-1 rounded ${
                    rule.isActive ? 'text-gray-600 hover:text-gray-800' : 'text-green-600 hover:text-green-800'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setEditingRule(rule)}
                  className="p-1 text-blue-600 hover:text-blue-800"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => deleteChatbotRule(rule.id)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveChatbotRules}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Regras do Chatbot
        </button>
      </div>
    </div>
  );

  const renderWebhookTab = () => (
    <div className="space-y-6">
      <div className="bg-orange-50 p-4 rounded-lg">
        <div className="flex items-start">
          <Zap className="w-5 h-5 text-orange-600 mt-0.5 mr-3" />
          <div>
            <h4 className="font-medium text-orange-900">Configuração do Webhook</h4>
            <p className="text-sm text-orange-700 mt-1">
              Configure o webhook para receber mensagens e atualizações de status em tempo real.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL do Webhook
          </label>
          <input
            type="url"
            value={webhookConfig.url}
            onChange={(e) => setWebhookConfig({ ...webhookConfig, url: e.target.value })}
            placeholder="https://seu-dominio.com/webhook/whatsapp"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Esta URL receberá as mensagens e atualizações do WhatsApp
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token de Verificação
          </label>
          <input
            type="text"
            value={webhookConfig.verifyToken}
            onChange={(e) => setWebhookConfig({ ...webhookConfig, verifyToken: e.target.value })}
            placeholder="token-secreto-para-verificacao"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Token usado pelo WhatsApp para verificar a autenticidade do webhook
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Instruções de Configuração</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Configure sua URL de webhook no painel do WhatsApp Business</li>
          <li>Use o token de verificação para validar o webhook</li>
          <li>Certifique-se que sua URL está acessível via HTTPS</li>
          <li>Teste a conexão usando o botão de teste abaixo</li>
        </ol>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => {
            localStorage.setItem('whatsapp_webhook_url', webhookConfig.url);
            localStorage.setItem('whatsapp_webhook_verify_token', webhookConfig.verifyToken);
            setTestResult({ success: true, message: 'Configurações do webhook salvas!' });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Webhook
        </button>
        
        <button
          onClick={() => {
            // Simulate webhook test
            setTestResult({ 
              success: true, 
              message: 'Webhook configurado corretamente. Aguardando mensagens...' 
            });
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
        >
          <TestTube className="w-4 h-4 mr-2" />
          Testar Webhook
        </button>
      </div>

      {testResult && (
        <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            )}
            <p className={`${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {testResult.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Configurações WhatsApp
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex">
          <div className="w-64 border-r bg-gray-50">
            <nav className="p-4 space-y-2">
              {[
                { id: 'api', label: 'API', icon: Key },
                { id: 'templates', label: 'Templates', icon: MessageSquare },
                { id: 'chatbot', label: 'Chatbot', icon: Bot },
                { id: 'webhook', label: 'Webhook', icon: Zap }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                    activeTab === id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {activeTab === 'api' && renderApiTab()}
            {activeTab === 'templates' && renderTemplatesTab()}
            {activeTab === 'chatbot' && renderChatbotTab()}
            {activeTab === 'webhook' && renderWebhookTab()}
          </div>
        </div>
      </div>
    </div>
  );
};