import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
} from './ErrorBoundary';

// Mock do Sentry
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
  withScope: jest.fn((callback) =>
    callback({
      setTag: jest.fn(),
      setContext: jest.fn(),
      setLevel: jest.fn(),
    })
  ),
}));

// Mock do console para capturar logs
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

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
    const { captureException } = require('@sentry/react');

    render(<TestComponent shouldError={true} />);

    const triggerButton = screen.getByText('Trigger Error');
    fireEvent.click(triggerButton);

    // Deve capturar o erro mesmo sem ErrorBoundary
    expect(captureException).toHaveBeenCalled();
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
