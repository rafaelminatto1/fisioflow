import { 
  Key, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Shield,
  Zap,
  DollarSign,
  BarChart3
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useNotification } from '../hooks/useNotification';
import { multiAI } from '../services/multiProviderAIService';

interface YourSubscriptionsConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProviderStatus {
  id: string;
  name: string;
  configured: boolean;
  working: boolean;
  lastTest?: string;
  usage?: number;
}

export function YourSubscriptionsConfig({ isOpen, onClose }: YourSubscriptionsConfigProps) {
  const [providers, setProviders] = useState<ProviderStatus[]>([
    { id: 'google', name: 'Google Gemini Pro', configured: false, working: false },
    { id: 'openai', name: 'ChatGPT Pro', configured: false, working: false },
    { id: 'anthropic', name: 'Claude Pro', configured: false, working: false },
    { id: 'manus', name: 'Manus Plus', configured: false, working: false }
  ]);

  const [apiKeys, setApiKeys] = useState({
    google: '',
    openai: '',
    anthropic: '',
    manus: ''
  });

  const [manusEndpoint, setManusEndpoint] = useState('');
  const [showKeys, setShowKeys] = useState({
    google: false,
    openai: false,
    anthropic: false,
    manus: false
  });

  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [usageDashboard, setUsageDashboard] = useState<any>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfiguration();
      loadUsageDashboard();
    }
  }, [isOpen]);

  const loadCurrentConfiguration = () => {
    const config = {
      google: localStorage.getItem('GOOGLE_PRO_API_KEY') || '',
      openai: localStorage.getItem('OPENAI_PRO_API_KEY') || '',
      anthropic: localStorage.getItem('CLAUDE_PRO_API_KEY') || '',
      manus: localStorage.getItem('MANUS_PLUS_API_KEY') || ''
    };

    setApiKeys(config);
    setManusEndpoint(localStorage.getItem('MANUS_PLUS_ENDPOINT') || '');

    // Atualiza status dos provedores
    setProviders(prev => prev.map(provider => ({
      ...provider,
      configured: !!config[provider.id as keyof typeof config]
    })));
  };

  const loadUsageDashboard = () => {
    const dashboard = multiAI.getUsageDashboard();
    setUsageDashboard(dashboard);
  };

  const validateProvider = async (providerId: string): Promise<boolean> => {
    setIsValidating(providerId);
    
    try {
      // Teste simples para validar a API
      const testPrompt = "Responda apenas: OK";
      const result = await multiAI.generateText(testPrompt, { 
        type: 'assessment',
        maxTokens: 10 
      });
      
      if (result.content.includes('OK') || result.content.length > 0) {
        setProviders(prev => prev.map(p => 
          p.id === providerId 
            ? { ...p, working: true, lastTest: new Date().toLocaleString() }
            : p
        ));
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Erro validando ${providerId}:`, error);
      return false;
    } finally {
      setIsValidating(null);
    }
  };

  const saveProviderConfig = async (providerId: string) => {
    const apiKey = apiKeys[providerId as keyof typeof apiKeys];
    
    if (!apiKey.trim()) {
      showNotification({
        type: 'error',
        title: 'API Key Requerida',
        message: 'Por favor, insira uma API key válida.'
      });
      return;
    }

    try {
      // Salva a configuração
      const config = { apiKey: apiKey.trim() };
      if (providerId === 'manus') {
        (config as any).endpoint = manusEndpoint.trim();
      }

      multiAI.setProviderConfig(providerId as any, config);

      // Valida se está funcionando
      const isWorking = await validateProvider(providerId);
      
      if (isWorking) {
        setProviders(prev => prev.map(p => 
          p.id === providerId 
            ? { ...p, configured: true, working: true }
            : p
        ));

        showNotification({
          type: 'success',
          title: `${providers.find(p => p.id === providerId)?.name} Configurado`,
          message: 'API key validada e funcionando perfeitamente!'
        });

        loadUsageDashboard(); // Atualiza dashboard
      } else {
        showNotification({
          type: 'error',
          title: 'Configuração Inválida',
          message: 'API key não é válida ou não tem permissões adequadas.'
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro de Configuração',
        message: 'Erro ao configurar provedor. Verifique os dados.'
      });
    }
  };

  const removeProvider = (providerId: string) => {
    localStorage.removeItem(`${providerId.toUpperCase()}_PRO_API_KEY`);
    if (providerId === 'manus') {
      localStorage.removeItem('MANUS_PLUS_ENDPOINT');
    }

    setApiKeys(prev => ({ ...prev, [providerId]: '' }));
    setProviders(prev => prev.map(p => 
      p.id === providerId 
        ? { ...p, configured: false, working: false }
        : p
    ));

    showNotification({
      type: 'info',
      title: 'Provedor Removido',
      message: `${providers.find(p => p.id === providerId)?.name} foi removido.`
    });

    loadUsageDashboard();
  };

  const getProviderInstructions = (providerId: string) => {
    const instructions = {
      google: {
        title: 'Google Gemini Pro',
        steps: [
          'Acesse o Google AI Studio',
          'Faça login com sua conta Google',
          'Vá em "Get API Key"',
          'Cole a chave abaixo'
        ],
        url: 'https://aistudio.google.com/app/apikey'
      },
      openai: {
        title: 'ChatGPT Pro (OpenAI)',
        steps: [
          'Acesse sua conta OpenAI',
          'Vá em "API Keys"',
          'Crie uma nova chave',
          'Cole a chave abaixo'
        ],
        url: 'https://platform.openai.com/api-keys'
      },
      anthropic: {
        title: 'Claude Pro (Anthropic)',
        steps: [
          'Acesse o Anthropic Console',
          'Faça login com sua conta',
          'Vá em "API Keys"',
          'Gere uma nova chave'
        ],
        url: 'https://console.anthropic.com/settings/keys'
      },
      manus: {
        title: 'Manus Plus',
        steps: [
          'Acesse sua conta Manus',
          'Vá em configurações de API',
          'Copie sua chave e endpoint',
          'Cole ambos abaixo'
        ],
        url: '#' // Substitua pela URL real do Manus
      }
    };

    return instructions[providerId as keyof typeof instructions];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold">Suas Assinaturas de IA</h2>
              <p className="text-sm text-gray-600">Use suas assinaturas existentes sem custos extras</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Benefits Banner */}
        <div className="p-6 bg-green-50 border-b">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Custo Total: R$ 0,00 por mês!</h3>
              <p className="text-sm text-green-700">
                Aproveite suas assinaturas existentes. Sem taxas adicionais, sem surpresas.
              </p>
            </div>
          </div>
        </div>

        {/* Usage Dashboard */}
        {usageDashboard && (
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Dashboard de Uso Hoje
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {usageDashboard.providers.map((provider: any) => (
                <div key={provider.name} className="bg-white border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{provider.name}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      provider.available ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{provider.todayUsage}</div>
                  <div className="text-xs text-gray-600">usos hoje</div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900">Melhor Provedor Hoje:</span>
                <span className="text-blue-600">{usageDashboard.bestProvider}</span>
              </div>
            </div>
          </div>
        )}

        {/* Provider Configuration */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Configure Suas APIs</h3>
          
          <div className="space-y-6">
            {providers.map((provider) => {
              const instructions = getProviderInstructions(provider.id);
              
              return (
                <div key={provider.id} className="border rounded-lg p-6">
                  {/* Provider Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-semibold text-lg">{provider.name}</h4>
                      <div className="flex space-x-2">
                        {provider.configured && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Configurado
                          </span>
                        )}
                        {provider.working && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Funcionando
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {provider.lastTest && (
                        <span className="text-xs text-gray-500">
                          Testado: {provider.lastTest}
                        </span>
                      )}
                      {provider.working ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">Como obter sua API key:</h5>
                      <a
                        href={instructions.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        Abrir {instructions.title}
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                    <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                      {instructions.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* API Key Input */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key {provider.name}
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys[provider.id as keyof typeof showKeys] ? 'text' : 'password'}
                          value={apiKeys[provider.id as keyof typeof apiKeys]}
                          onChange={(e) => setApiKeys(prev => ({ 
                            ...prev, 
                            [provider.id]: e.target.value 
                          }))}
                          className="w-full pr-20 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={`Cole sua API key do ${provider.name}...`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys(prev => ({ 
                            ...prev, 
                            [provider.id]: !prev[provider.id as keyof typeof prev] 
                          }))}
                          className="absolute inset-y-0 right-12 flex items-center px-3 text-gray-400 hover:text-gray-600"
                        >
                          {showKeys[provider.id as keyof typeof showKeys] ? 
                            <EyeOff className="h-4 w-4" /> : 
                            <Eye className="h-4 w-4" />
                          }
                        </button>
                        {provider.working && (
                          <div className="absolute inset-y-0 right-3 flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Manus Endpoint */}
                    {provider.id === 'manus' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Endpoint Manus Plus
                        </label>
                        <input
                          type="text"
                          value={manusEndpoint}
                          onChange={(e) => setManusEndpoint(e.target.value)}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="https://api.manus.com/v1/..."
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => saveProviderConfig(provider.id)}
                        disabled={!apiKeys[provider.id as keyof typeof apiKeys].trim() || isValidating === provider.id}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isValidating === provider.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Validando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Salvar e Testar</span>
                          </>
                        )}
                      </button>

                      {provider.configured && (
                        <button
                          onClick={() => removeProvider(provider.id)}
                          className="px-4 py-2 text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50"
                        >
                          Remover
                        </button>
                      )}

                      {provider.configured && (
                        <button
                          onClick={() => validateProvider(provider.id)}
                          disabled={isValidating === provider.id}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <Zap className="h-4 w-4 inline mr-1" />
                          Testar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          {usageDashboard && usageDashboard.recommendations.length > 0 && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Recomendações</h4>
              <ul className="space-y-1">
                {usageDashboard.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-blue-800">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            ✅ Suas assinaturas, zero custos extras
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}