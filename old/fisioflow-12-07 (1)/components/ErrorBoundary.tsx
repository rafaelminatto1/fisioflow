import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onGoHome: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }
  
  private copyErrorDetails = () => {
    const { error, errorInfo } = this.state;
    if (error && errorInfo) {
      const errorDetails = `
        ----- FisioFlow Error Report -----
        Message: ${error.toString()}
        Stack: ${error.stack}
        Component Stack: ${errorInfo.componentStack}
        ---------------------------------
      `;
      navigator.clipboard.writeText(errorDetails.trim())
        .then(() => alert("Detalhes do erro copiados para a área de transferência!"))
        .catch(() => alert("Não foi possível copiar os detalhes do erro."));
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-50 p-4 text-center">
            <h1 className="text-4xl font-bold text-red-500 mb-4">Oops! Algo deu errado.</h1>
            <p className="text-slate-300 mb-2">
                Parece que encontramos um bug inesperado. Nossos desenvolvedores já foram (magicamente) notificados.
            </p>
            <p className="text-slate-400 mb-8">
                Enquanto isso, você pode tentar recarregar ou voltar para o início.
            </p>
            <details className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-lg p-3 text-left mb-8">
                <summary className="cursor-pointer font-semibold text-slate-300">Detalhes Técnicos (para os curiosos)</summary>
                <pre className="mt-2 text-xs text-slate-400 overflow-auto whitespace-pre-wrap">
                    <code>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </code>
                </pre>
            </details>
            <div className="flex gap-4">
                 <button
                    onClick={this.props.onGoHome}
                    className="px-4 py-2 rounded-md text-white bg-slate-600 hover:bg-slate-700 transition-colors font-semibold"
                >
                    Voltar para o Início
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors font-semibold"
                >
                    Recarregar a Página
                </button>
                <button
                    onClick={this.copyErrorDetails}
                    className="px-4 py-2 rounded-md text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors font-semibold"
                >
                    Copiar Detalhes do Erro
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;