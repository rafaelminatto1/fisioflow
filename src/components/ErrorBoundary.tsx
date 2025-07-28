import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { AlertTriangle, RefreshCw, Bug, X } from 'lucide-react';

// Interface para props do ErrorBoundary
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

// Interface para estado do ErrorBoundary
interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  eventId?: string;
  showReportModal: boolean;
}

// Classe principal do ErrorBoundary
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      showReportModal: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capturar erro para monitoramento (Sentry seria ideal)
    const eventId = this.captureError(error, errorInfo);

    this.setState({
      error,
      errorInfo,
      eventId
    });

    // Callback customizado
    this.props.onError?.(error, errorInfo);

    // Log detalhado para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary - Erro Capturado');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  // Simula captura de erro (substituir por Sentry em produção)
  private captureError = (error: Error, errorInfo: ErrorInfo): string => {
    const eventId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Em produção, aqui seria:
    // return Sentry.captureException(error, {
    //   contexts: {
    //     react: {
    //       componentStack: errorInfo.componentStack
    //     }
    //   }
    // });
    
    // Log local para desenvolvimento
    console.warn(`Error captured with ID: ${eventId}`);
    
    return eventId;
  };

  // Reset do estado de erro
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      eventId: undefined,
      showReportModal: false
    });
  };

  // Recarregar página
  private handleReload = () => {
    window.location.reload();
  };

  // Abrir modal de reporte
  private handleOpenReportModal = () => {
    this.setState({ showReportModal: true });
  };

  // Fechar modal de reporte
  private handleCloseReportModal = () => {
    this.setState({ showReportModal: false });
  };

  // Enviar reporte de erro
  private handleSendReport = (description: string) => {
    const { error, errorInfo, eventId } = this.state;
    
    // Simula envio de reporte (substituir por API real)
    console.log('Enviando reporte de erro:', {
      eventId,
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userDescription: description,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // Em produção, aqui seria uma chamada para API
    // await api.sendErrorReport({ ... });
    
    this.handleCloseReportModal();
    alert('Reporte enviado com sucesso! Nossa equipe irá analisar o problema.');
  };

  render() {
    if (this.state.hasError) {
      // Fallback customizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, showReportModal } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';
      const showDetails = this.props.showDetails ?? isDevelopment;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-slate-50">
          <div className="w-full max-w-md rounded-lg bg-slate-800 p-6 shadow-xl">
            {/* Ícone e título */}
            <div className="mb-6 text-center">
              <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-red-500" />
              <h1 className="mb-2 text-2xl font-bold text-red-400">
                Algo deu errado
              </h1>
              <p className="text-slate-300">
                Ocorreu um erro inesperado na aplicação
              </p>
            </div>

            {/* Detalhes do erro (apenas em desenvolvimento) */}
            {showDetails && error && (
              <div className="mb-6 rounded-md bg-slate-700 p-4">
                <h3 className="mb-2 font-semibold text-red-400">Detalhes do Erro:</h3>
                <p className="text-sm text-slate-300 font-mono break-all">
                  {error.message}
                </p>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-slate-400 overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar Página
              </button>
              
              <button
                onClick={this.handleOpenReportModal}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <Bug className="h-4 w-4" />
                Reportar Problema
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full rounded-md border border-slate-600 px-4 py-3 font-semibold text-slate-300 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Tentar Novamente
              </button>
            </div>
          </div>

          {/* Modal de Reporte */}
          {showReportModal && (
            <ErrorReportModal
              onClose={this.handleCloseReportModal}
              onSend={this.handleSendReport}
            />
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente do Modal de Reporte
interface ErrorReportModalProps {
  onClose: () => void;
  onSend: (description: string) => void;
}

const ErrorReportModal: React.FC<ErrorReportModalProps> = ({ onClose, onSend }) => {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSend(description);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-slate-800 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Reportar Problema
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Descreva o que você estava fazendo quando o erro ocorreu:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que você estava fazendo quando o erro ocorreu..."
              className="w-full rounded-md bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-slate-600 px-4 py-2 font-medium text-slate-300 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!description.trim() || isSubmitting}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// HOC para envolver componentes com ErrorBoundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Hook para capturar erros em componentes funcionais
export const useErrorHandler = () => {
  return React.useCallback((error: Error, errorInfo?: any) => {
    // Simula captura de erro (substituir por Sentry em produção)
    const eventId = `hook-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.error('Error caught by useErrorHandler:', {
      eventId,
      error,
      errorInfo,
      timestamp: new Date().toISOString()
    });
    
    // Em produção, aqui seria:
    // Sentry.captureException(error, {
    //   extra: errorInfo
    // });
    
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 useErrorHandler - Erro Capturado');
      console.error('Error:', error);
      console.error('Extra Info:', errorInfo);
      console.groupEnd();
    }
    
    return eventId;
  }, []);
};

// Hook para tratamento de erros assíncronos
export const useAsyncErrorHandler = () => {
  const handleError = useErrorHandler();
  
  return React.useCallback(
    async function<T>(
      asyncFn: () => Promise<T>,
      fallbackValue?: T
    ): Promise<T | undefined> {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error as Error, { context: 'async operation' });
        return fallbackValue;
      }
    },
    [handleError]
  );
};

export default ErrorBoundary;