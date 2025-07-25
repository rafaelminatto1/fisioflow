import React, { useState, useEffect } from 'react';
import { Key, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';

interface APIKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function APIKeySettings({ isOpen, onClose }: APIKeySettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      // Carrega a chave existente
      const savedKey = localStorage.getItem('GEMINI_API_KEY') || '';
      setApiKey(savedKey);
      setIsValid(savedKey ? true : null);
    }
  }, [isOpen]);

  const validateApiKey = async (key: string): Promise<boolean> => {
    if (!key || key.length < 20) {
      return false;
    }

    try {
      // Testa a chave fazendo uma chamada simples
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const ai = new GoogleGenerativeAI(key);
      const model = ai.getGenerativeModel({ model: "gemini-pro" });
      
      // Teste simples
      await model.generateContent("Test");
      return true;
    } catch (error) {
      console.error('Erro na validação da API key:', error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      showNotification({
        type: 'error',
        title: 'Chave Requerida',
        message: 'Por favor, insira uma chave de API válida.'
      });
      return;
    }

    setIsValidating(true);
    
    try {
      const valid = await validateApiKey(apiKey.trim());
      
      if (valid) {
        localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
        setIsValid(true);
        
        showNotification({
          type: 'success',
          title: 'Configuração Salva',
          message: 'Chave da API Gemini configurada com sucesso!'
        });
        
        onClose();
      } else {
        setIsValid(false);
        showNotification({
          type: 'error',
          title: 'Chave Inválida',
          message: 'A chave da API fornecida não é válida. Verifique e tente novamente.'
        });
      }
    } catch (error) {
      setIsValid(false);
      showNotification({
        type: 'error',
        title: 'Erro de Validação',
        message: 'Não foi possível validar a chave da API. Verifique sua conexão.'
      });
    }
    
    setIsValidating(false);
  };

  const handleClear = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setApiKey('');
    setIsValid(null);
    
    showNotification({
      type: 'info',
      title: 'Configuração Removida',
      message: 'Chave da API removida com sucesso.'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Key className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Configuração da API</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chave da API Google Gemini
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsValid(null);
                }}
                className="w-full pr-20 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="AIza..."
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-3 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {isValid !== null && (
                  <div className="pr-3">
                    {isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {isValid === false && (
              <p className="text-sm text-red-600 mt-1">
                Chave da API inválida ou sem permissões adequadas.
              </p>
            )}
            
            {isValid === true && (
              <p className="text-sm text-green-600 mt-1">
                Chave da API validada com sucesso!
              </p>
            )}
          </div>

          {/* Instruções */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">
              Como obter sua chave da API:
            </h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Acesse <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a></li>
              <li>Faça login com sua conta Google</li>
              <li>Clique em "Create API Key"</li>
              <li>Cole a chave gerada no campo acima</li>
            </ol>
          </div>

          {/* Status da configuração atual */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Status da configuração:</span>
              <span className={`font-medium ${
                localStorage.getItem('GEMINI_API_KEY') 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {localStorage.getItem('GEMINI_API_KEY') ? 'Configurada' : 'Não configurada'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleClear}
            disabled={!localStorage.getItem('GEMINI_API_KEY')}
            className="px-4 py-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remover Chave
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey.trim() || isValidating}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Salvar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}