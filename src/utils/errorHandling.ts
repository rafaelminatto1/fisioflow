import { toast } from 'sonner';

// Tipos de erro personalizados
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// Interface para erro customizado
export interface CustomError extends Error {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

// Classe para criar erros customizados
export class AppError extends Error implements CustomError {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly statusCode?: number;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly userId?: string;
  public readonly sessionId?: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    options?: {
      code?: string;
      statusCode?: number;
      context?: Record<string, any>;
      userId?: string;
      sessionId?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = options?.code;
    this.statusCode = options?.statusCode;
    this.context = options?.context;
    this.timestamp = new Date();
    this.userId = options?.userId;
    this.sessionId = options?.sessionId;

    if (options?.cause) {
      this.cause = options.cause;
    }

    // Manter stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Utilitários para criar erros específicos
export const createValidationError = (
  message: string,
  field?: string,
  value?: any
): AppError => {
  return new AppError(message, ErrorType.VALIDATION, {
    code: 'VALIDATION_FAILED',
    context: { field, value }
  });
};

export const createNetworkError = (
  message: string,
  statusCode?: number,
  url?: string
): AppError => {
  return new AppError(message, ErrorType.NETWORK, {
    code: 'NETWORK_ERROR',
    statusCode,
    context: { url }
  });
};

export const createAuthError = (
  message: string,
  action?: string
): AppError => {
  return new AppError(message, ErrorType.AUTHENTICATION, {
    code: 'AUTH_FAILED',
    context: { action }
  });
};

export const createPermissionError = (
  message: string,
  resource?: string,
  action?: string
): AppError => {
  return new AppError(message, ErrorType.AUTHORIZATION, {
    code: 'PERMISSION_DENIED',
    context: { resource, action }
  });
};

// Função para classificar erros automaticamente
export const classifyError = (error: Error): ErrorType => {
  if (error instanceof AppError) {
    return error.type;
  }

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Erros de rede
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    name.includes('networkerror')
  ) {
    return ErrorType.NETWORK;
  }

  // Erros de validação
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    name.includes('validationerror')
  ) {
    return ErrorType.VALIDATION;
  }

  // Erros de autenticação
  if (
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('login')
  ) {
    return ErrorType.AUTHENTICATION;
  }

  // Erros de autorização
  if (
    message.includes('forbidden') ||
    message.includes('permission') ||
    message.includes('access denied')
  ) {
    return ErrorType.AUTHORIZATION;
  }

  // Erros 404
  if (
    message.includes('not found') ||
    message.includes('404')
  ) {
    return ErrorType.NOT_FOUND;
  }

  return ErrorType.UNKNOWN;
};

// Interface para configuração de notificação
interface NotificationConfig {
  showToast?: boolean;
  toastType?: 'error' | 'warning' | 'info';
  logToConsole?: boolean;
  reportToService?: boolean;
}

// Função principal para tratamento de erros
export const handleError = (
  error: Error,
  context?: Record<string, any>,
  config: NotificationConfig = {}
) => {
  const {
    showToast = true,
    toastType = 'error',
    logToConsole = true,
    reportToService = process.env.NODE_ENV === 'production'
  } = config;

  // Classificar o erro
  const errorType = classifyError(error);
  
  // Criar erro customizado se necessário
  const customError = error instanceof AppError ? error : new AppError(
    error.message,
    errorType,
    {
      context: { ...context, originalError: error.name },
      cause: error
    }
  );

  // Log no console (desenvolvimento)
  if (logToConsole && process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error Handler - ${errorType}`);
    console.error('Error:', customError);
    console.error('Original Error:', error);
    console.error('Context:', context);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }

  // Mostrar notificação toast
  if (showToast) {
    const message = getUserFriendlyMessage(customError);
    
    switch (toastType) {
      case 'error':
        toast.error(message);
        break;
      case 'warning':
        toast.warning(message);
        break;
      case 'info':
        toast.info(message);
        break;
    }
  }

  // Reportar para serviço de monitoramento
  if (reportToService) {
    reportError(customError);
  }

  return customError;
};

// Função para obter mensagem amigável ao usuário
export const getUserFriendlyMessage = (error: CustomError): string => {
  switch (error.type) {
    case ErrorType.VALIDATION:
      return 'Por favor, verifique os dados informados e tente novamente.';
    
    case ErrorType.NETWORK:
      return 'Problema de conexão. Verifique sua internet e tente novamente.';
    
    case ErrorType.AUTHENTICATION:
      return 'Sessão expirada. Por favor, faça login novamente.';
    
    case ErrorType.AUTHORIZATION:
      return 'Você não tem permissão para realizar esta ação.';
    
    case ErrorType.NOT_FOUND:
      return 'O recurso solicitado não foi encontrado.';
    
    case ErrorType.SERVER_ERROR:
      return 'Erro interno do servidor. Nossa equipe foi notificada.';
    
    case ErrorType.CLIENT_ERROR:
      return 'Erro na aplicação. Tente recarregar a página.';
    
    default:
      return 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.';
  }
};

// Função para reportar erro para serviço de monitoramento
const reportError = (error: CustomError) => {
  // Em produção, aqui seria integração com Sentry, LogRocket, etc.
  console.warn('Reporting error to monitoring service:', {
    message: error.message,
    type: error.type,
    code: error.code,
    statusCode: error.statusCode,
    context: error.context,
    timestamp: error.timestamp,
    userId: error.userId,
    sessionId: error.sessionId,
    stack: error.stack
  });
  
  // Exemplo de integração com Sentry:
  // Sentry.captureException(error, {
  //   tags: {
  //     errorType: error.type,
  //     errorCode: error.code
  //   },
  //   extra: {
  //     context: error.context,
  //     userId: error.userId,
  //     sessionId: error.sessionId
  //   }
  // });
};

// Hook para tratamento de erros em componentes React
export const useErrorHandling = () => {
  const handleAsyncError = React.useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    context?: Record<string, any>,
    config?: NotificationConfig
  ): Promise<T | null> => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error as Error, context, config);
      return null;
    }
  }, []);

  const handleSyncError = React.useCallback((
    error: Error,
    context?: Record<string, any>,
    config?: NotificationConfig
  ) => {
    return handleError(error, context, config);
  }, []);

  return {
    handleAsyncError,
    handleSyncError,
    createValidationError,
    createNetworkError,
    createAuthError,
    createPermissionError
  };
};

// Decorator para tratamento automático de erros em métodos
export const withErrorHandling = (
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) => {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    try {
      const result = method.apply(this, args);
      
      // Se o método retorna uma Promise
      if (result && typeof result.then === 'function') {
        return result.catch((error: Error) => {
          handleError(error, {
            method: propertyName,
            args: args.length > 0 ? args : undefined
          });
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      handleError(error as Error, {
        method: propertyName,
        args: args.length > 0 ? args : undefined
      });
      throw error;
    }
  };

  return descriptor;
};

// Utilitário para retry com backoff exponencial
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw new AppError(
          `Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
          ErrorType.UNKNOWN,
          {
            code: 'MAX_RETRIES_EXCEEDED',
            context: { attempts: attempt + 1, maxRetries },
            cause: lastError
          }
        );
      }
      
      // Calcular delay com backoff exponencial
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Importar React para o hook
import React from 'react';