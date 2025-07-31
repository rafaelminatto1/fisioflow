import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ProductionErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  eventId?: string;
}

export const ProductionErrorFallback: React.FC<ProductionErrorFallbackProps> = ({
  error,
  resetError,
  eventId
}) => {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportIssue = () => {
    const subject = encodeURIComponent('Erro na aplicação FisioFlow');
    const body = encodeURIComponent(`
Olá,

Encontrei um erro na aplicação FisioFlow:

ID do Erro: ${eventId || 'N/A'}
URL: ${window.location.href}
Navegador: ${navigator.userAgent}
Data/Hora: ${new Date().toLocaleString('pt-BR')}

Descrição do problema:
[Descreva o que você estava fazendo quando o erro ocorreu]

Obrigado!
    `);
    
    window.open(`mailto:suporte@fisioflow.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-xl p-6 text-center">
        {/* Ícone de erro */}
        <div className="mb-6">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-2">
            Oops! Algo deu errado
          </h1>
          <p className="text-slate-300 text-sm">
            Encontramos um problema inesperado. Nossa equipe foi notificada automaticamente.
          </p>
        </div>

        {/* ID do erro para referência */}
        {eventId && (
          <div className="mb-6 p-3 bg-slate-700 rounded-md">
            <p className="text-xs text-slate-400 mb-1">ID do Erro:</p>
            <code className="text-sm text-slate-200 font-mono">{eventId}</code>
          </div>
        )}

        {/* Ações disponíveis */}
        <div className="space-y-3">
          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar Página
          </button>

          <button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <Home className="w-4 h-4" />
            Ir para Início
          </button>

          {resetError && (
            <button
              onClick={resetError}
              className="w-full border border-slate-600 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              Tentar Novamente
            </button>
          )}

          <button
            onClick={handleReportIssue}
            className="w-full text-slate-400 hover:text-slate-300 text-sm py-2 transition-colors focus:outline-none"
          >
            Reportar este problema
          </button>
        </div>

        {/* Informações adicionais */}
        <div className="mt-6 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            Se o problema persistir, entre em contato com o suporte técnico.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductionErrorFallback;