import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary, { withErrorBoundary, useErrorHandler, useAsyncErrorHandler } from '../src/components/ErrorBoundary';

// Mock do console para capturar logs
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleGroup = jest.spyOn(console, 'group').mockImplementation();
const mockConsoleGroupEnd = jest.spyOn(console, 'groupEnd').mockImplementation();

// Mock do window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
  writable: true,
});

describe('ErrorBoundary com props customizadas', () => {
  it('deve aceitar fallback customizado', () => {
    const CustomFallback = () => <div>Custom error fallback</div>;
    
    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
  });

  it('deve chamar callback onError', () => {
    const onErrorMock = jest.fn();
    
    render(
      <ErrorBoundary onError={onErrorMock}>
        <ErrorComponent errorMessage="Callback test error" />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Callback test error'
      }),
      expect.any(Object)
    );
  });

  it('deve ocultar detalhes quando showDetails é false', () => {
    render(
      <ErrorBoundary showDetails={false}>
        <ErrorComponent errorMessage="Hidden details error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.queryByText('Hidden details error')).not.toBeInTheDocument();
  });

  it('deve mostrar detalhes quando showDetails é true', () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ErrorComponent errorMessage="Visible details error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Visible details error')).toBeInTheDocument();
  });
});

describe('ErrorBoundary - Funcionalidades do Modal', () => {
  it('deve abrir e fechar modal de reporte', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // Abrir modal
    const reportButton = screen.getByText('Reportar Problema');
    fireEvent.click(reportButton);

    expect(screen.getByText('Reportar Problema')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Descreva o que você estava fazendo quando o erro ocorreu...')).toBeInTheDocument();

    // Fechar modal
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(screen.queryByPlaceholderText('Descreva o que você estava fazendo quando o erro ocorreu...')).not.toBeInTheDocument();
  });

  it('deve enviar reporte com descrição', async () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // Abrir modal
    const reportButton = screen.getByText('Reportar Problema');
    fireEvent.click(reportButton);

    // Preencher descrição
    const textarea = screen.getByPlaceholderText('Descreva o que você estava fazendo quando o erro ocorreu...');
    fireEvent.change(textarea, {
      target: { value: 'Estava tentando adicionar um paciente quando o erro ocorreu' }
    });

    // Enviar reporte
    const sendButton = screen.getByText('Enviar Reporte');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Reporte enviado com sucesso! Nossa equipe irá analisar o problema.');
    });

    expect(mockConsoleLog).toHaveBeenCalledWith(
      'Enviando reporte de erro:',
      expect.objectContaining({
        userDescription: 'Estava tentando adicionar um paciente quando o erro ocorreu'
      })
    );
  });

  it('deve desabilitar botão de envio quando descrição está vazia', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // Abrir modal
    const reportButton = screen.getByText('Reportar Problema');
    fireEvent.click(reportButton);

    const sendButton = screen.getByText('Enviar Reporte');
    expect(sendButton).toBeDisabled();
  });
});

describe('ErrorBoundary - Ações de Recuperação', () => {
  it('deve recarregar página ao clicar em Recarregar', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Recarregar Página');
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('deve resetar estado ao clicar em Tentar Novamente', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    const retryButton = screen.getByText('Tentar Novamente');
    fireEvent.click(retryButton);

    // Renderizar novamente com componente que funciona
    rerender(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
  });
});

// Mock do alert
const mockAlert = jest.fn();
Object.defineProperty(window, 'alert', {
  value: mockAlert,
  writable: true,
});

// Componente que sempre gera erro para testes
const ErrorComponent: React.FC<{
  shouldError?: boolean;
  errorMessage?: string;
}> = ({ shouldError = true, errorMessage = 'Test error' }) => {
  if (shouldError) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Componente que funciona normalmente
const WorkingComponent: React.FC = () => {
  return <div>Working component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock do NODE_ENV para desenvolvimento
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  it('deve renderizar children quando não há erro', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('deve capturar e exibir erro em desenvolvimento', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent errorMessage="Test development error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Test development error')).toBeInTheDocument();
    expect(screen.getByText('Recarregar Página')).toBeInTheDocument();
    expect(screen.getByText('Reportar Problema')).toBeInTheDocument();
  });

  it('deve ocultar detalhes do erro em produção', () => {
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ErrorComponent errorMessage="Production error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.queryByText('Production error')).not.toBeInTheDocument();
    expect(screen.getByText('Recarregar Página')).toBeInTheDocument();
  });

  it('deve recarregar a página quando botão é clicado', () => {
    // Mock do window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: {
        reload: mockReload,
      },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Recarregar Página');
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('deve abrir modal de reporte quando botão é clicado', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const reportButton = screen.getByText('Reportar Problema');
    fireEvent.click(reportButton);

    expect(screen.getByText('Reportar Problema')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'Descreva o que você estava fazendo quando o erro ocorreu...'
      )
    ).toBeInTheDocument();
  });

  it('deve enviar reporte de erro', () => {
    const { captureException } = require('@sentry/react');

    render(
      <ErrorBoundary>
        <ErrorComponent errorMessage="Error to report" />
      </ErrorBoundary>
    );

    // Abrir modal de reporte
    const reportButton = screen.getByText('Reportar Problema');
    fireEvent.click(reportButton);

    // Preencher descrição
    const textarea = screen.getByPlaceholderText(
      'Descreva o que você estava fazendo quando o erro ocorreu...'
    );
    fireEvent.change(textarea, {
      target: { value: 'Estava tentando adicionar um paciente' },
    });

    // Enviar reporte
    const sendButton = screen.getByText('Enviar Reporte');
    fireEvent.click(sendButton);

    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: expect.objectContaining({
          userDescription: 'Estava tentando adicionar um paciente',
        }),
      })
    );
  });

  it('deve fechar modal de reporte', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // Abrir modal
    const reportButton = screen.getByText('Reportar Problema');
    fireEvent.click(reportButton);

    // Fechar modal
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(
      screen.queryByPlaceholderText(
        'Descreva o que você estava fazendo quando o erro ocorreu...'
      )
    ).not.toBeInTheDocument();
  });

  it('deve capturar informações do erro corretamente', () => {
    const { captureException } = require('@sentry/react');

    render(
      <ErrorBoundary>
        <ErrorComponent errorMessage="Detailed error for capture" />
      </ErrorBoundary>
    );

    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Detailed error for capture',
      }),
      expect.any(Object)
    );
  });

  it('deve resetar estado quando children mudam', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

    // Mudar para componente que funciona
    rerender(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  it('deve envolver componente com ErrorBoundary', () => {
    const WrappedComponent = withErrorBoundary(WorkingComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('deve capturar erros em componente envolvido', () => {
    const WrappedErrorComponent = withErrorBoundary(ErrorComponent);

    render(<WrappedErrorComponent />);

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('deve aceitar props customizadas do ErrorBoundary', () => {
    const WrappedComponent = withErrorBoundary(WorkingComponent, {
      fallback: <div>Custom fallback</div>,
    });

    render(<WrappedComponent />);

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });
});

describe('useErrorHandler hook', () => {
  const TestComponent: React.FC<{ shouldError?: boolean }> = ({
    shouldError = false,
  }) => {
    const handleError = useErrorHandler();

    const triggerError = () => {
      if (shouldError) {
        handleError(new Error('Hook error test'));
      }
    };

    return (
      <div>
        <span>Hook test component</span>
        <button onClick={triggerError}>Trigger Error</button>
      </div>
    );
  };

  it('deve fornecer função de tratamento de erro', () => {
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Hook test component')).toBeInTheDocument();
    expect(screen.getByText('Trigger Error')).toBeInTheDocument();
  });

  it('deve capturar erro quando handleError é chamado', () => {
    const { captureException } = require('@sentry/react');

    render(
      <ErrorBoundary>
        <TestComponent shouldError={true} />
      </ErrorBoundary>
    );

    const triggerButton = screen.getByText('Trigger Error');
    fireEvent.click(triggerButton);

    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hook error test',
      }),
      expect.any(Object)
    );
  });

  it('deve funcionar sem ErrorBoundary pai', () => {
    render(<TestComponent shouldError={true} />);

    const triggerButton = screen.getByText('Trigger Error');
    fireEvent.click(triggerButton);

    // Deve capturar o erro e logar no console
    expect(mockConsoleError).toHaveBeenCalled();
  });
});

describe('useAsyncErrorHandler hook', () => {
  const AsyncTestComponent: React.FC<{ shouldError?: boolean; shouldReject?: boolean }> = ({
    shouldError = false,
    shouldReject = false
  }) => {
    const handleAsyncError = useAsyncErrorHandler();
    const [result, setResult] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const triggerAsyncOperation = async () => {
      setLoading(true);
      const asyncFn = async () => {
        if (shouldError) {
          throw new Error('Async error test');
        }
        if (shouldReject) {
          return Promise.reject(new Error('Promise rejection test'));
        }
        return 'Success';
      };

      const result = await handleAsyncError(asyncFn, 'Fallback value');
      setResult(result || 'No result');
      setLoading(false);
    };

    return (
      <div>
        <span>Async test component</span>
        <button onClick={triggerAsyncOperation} disabled={loading}>
          {loading ? 'Loading...' : 'Trigger Async'}
        </button>
        {result && <span data-testid="result">{result}</span>}
      </div>
    );
  };

  it('deve tratar operação assíncrona com sucesso', async () => {
    render(<AsyncTestComponent />);

    const triggerButton = screen.getByText('Trigger Async');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Success');
    });
  });

  it('deve tratar erro assíncrono e retornar fallback', async () => {
    render(<AsyncTestComponent shouldError={true} />);

    const triggerButton = screen.getByText('Trigger Async');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Fallback value');
    });

    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('deve tratar promise rejection', async () => {
    render(<AsyncTestComponent shouldReject={true} />);

    const triggerButton = screen.getByText('Trigger Async');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Fallback value');
    });

    expect(mockConsoleError).toHaveBeenCalled();
  });
});

describe('ErrorBoundary com diferentes tipos de erro', () => {
  it('deve tratar erros de rede', () => {
    const NetworkErrorComponent = () => {
      throw new Error('Network request failed');
    };

    render(
      <ErrorBoundary>
        <NetworkErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Network request failed')).toBeInTheDocument();
  });

  it('deve tratar erros de validação', () => {
    const ValidationErrorComponent = () => {
      throw new Error('Validation failed: invalid email');
    };

    render(
      <ErrorBoundary>
        <ValidationErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(
      screen.getByText('Validation failed: invalid email')
    ).toBeInTheDocument();
  });

  it('deve tratar erros de permissão', () => {
    const PermissionErrorComponent = () => {
      throw new Error('Access denied: insufficient permissions');
    };

    render(
      <ErrorBoundary>
        <PermissionErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(
      screen.getByText('Access denied: insufficient permissions')
    ).toBeInTheDocument();
  });
});
