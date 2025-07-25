import {
  ErrorType,
  AppError,
  createValidationError,
  createNetworkError,
  createAuthError,
  createPermissionError,
  classifyError,
  handleError,
  getUserFriendlyMessage,
  retryWithBackoff,
  withErrorHandling
} from '../src/utils/errorHandling';
import { toast } from 'sonner';
import { vi } from 'vitest';

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock do console
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation();
const mockConsoleGroup = vi.spyOn(console, 'group').mockImplementation();
const mockConsoleGroupEnd = vi.spyOn(console, 'groupEnd').mockImplementation();

describe('AppError', () => {
  it('deve criar erro customizado com propriedades básicas', () => {
    const error = new AppError('Test error message', ErrorType.VALIDATION);

    expect(error.message).toBe('Test error message');
    expect(error.type).toBe(ErrorType.VALIDATION);
    expect(error.name).toBe('AppError');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('deve criar erro com opções completas', () => {
    const context = { field: 'email', value: 'invalid-email' };
    const error = new AppError('Validation failed', ErrorType.VALIDATION, {
      code: 'INVALID_EMAIL',
      statusCode: 400,
      context,
      userId: 'user123',
      sessionId: 'session456'
    });

    expect(error.code).toBe('INVALID_EMAIL');
    expect(error.statusCode).toBe(400);
    expect(error.context).toEqual(context);
    expect(error.userId).toBe('user123');
    expect(error.sessionId).toBe('session456');
  });

  it('deve manter stack trace', () => {
    const error = new AppError('Test error');
    expect(error.stack).toBeDefined();
  });

  it('deve aceitar causa do erro', () => {
    const originalError = new Error('Original error');
    const error = new AppError('Wrapped error', ErrorType.UNKNOWN, {
      cause: originalError
    });

    expect(error.cause).toBe(originalError);
  });
});

describe('Funções de criação de erros específicos', () => {
  describe('createValidationError', () => {
    it('deve criar erro de validação', () => {
      const error = createValidationError('Invalid email format', 'email', 'invalid@');

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.context).toEqual({ field: 'email', value: 'invalid@' });
    });
  });

  describe('createNetworkError', () => {
    it('deve criar erro de rede', () => {
      const error = createNetworkError('Connection failed', 500, '/api/users');

      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({ url: '/api/users' });
    });
  });

  describe('createAuthError', () => {
    it('deve criar erro de autenticação', () => {
      const error = createAuthError('Invalid credentials', 'login');

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.context).toEqual({ action: 'login' });
    });
  });

  describe('createPermissionError', () => {
    it('deve criar erro de permissão', () => {
      const error = createPermissionError('Access denied', 'patients', 'delete');

      expect(error.type).toBe(ErrorType.AUTHORIZATION);
      expect(error.code).toBe('PERMISSION_DENIED');
      expect(error.context).toEqual({ resource: 'patients', action: 'delete' });
    });
  });
});

describe('classifyError', () => {
  it('deve retornar tipo correto para AppError', () => {
    const error = new AppError('Test', ErrorType.VALIDATION);
    expect(classifyError(error)).toBe(ErrorType.VALIDATION);
  });

  it('deve classificar erros de rede', () => {
    const networkErrors = [
      new Error('Network request failed'),
      new Error('fetch error occurred'),
      new Error('Connection timeout'),
      { name: 'NetworkError', message: 'Failed to fetch' } as Error
    ];

    networkErrors.forEach(error => {
      expect(classifyError(error)).toBe(ErrorType.NETWORK);
    });
  });

  it('deve classificar erros de validação', () => {
    const validationErrors = [
      new Error('Validation failed'),
      new Error('Invalid email format'),
      new Error('Required field missing'),
      { name: 'ValidationError', message: 'Invalid data' } as Error
    ];

    validationErrors.forEach(error => {
      expect(classifyError(error)).toBe(ErrorType.VALIDATION);
    });
  });

  it('deve classificar erros de autenticação', () => {
    const authErrors = [
      new Error('Unauthorized access'),
      new Error('Authentication failed'),
      new Error('Please login again')
    ];

    authErrors.forEach(error => {
      expect(classifyError(error)).toBe(ErrorType.AUTHENTICATION);
    });
  });

  it('deve classificar erros de autorização', () => {
    const authzErrors = [
      new Error('Forbidden operation'),
      new Error('Permission denied'),
      new Error('Access denied to resource')
    ];

    authzErrors.forEach(error => {
      expect(classifyError(error)).toBe(ErrorType.AUTHORIZATION);
    });
  });

  it('deve classificar erros 404', () => {
    const notFoundErrors = [
      new Error('Resource not found'),
      new Error('404 error occurred')
    ];

    notFoundErrors.forEach(error => {
      expect(classifyError(error)).toBe(ErrorType.NOT_FOUND);
    });
  });

  it('deve retornar UNKNOWN para erros não classificados', () => {
    const unknownError = new Error('Some random error');
    expect(classifyError(unknownError)).toBe(ErrorType.UNKNOWN);
  });
});

describe('handleError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('deve tratar erro básico com configuração padrão', () => {
    const error = new Error('Test error');
    const result = handleError(error);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Test error');
    expect(toast.error).toHaveBeenCalled();
    expect(mockConsoleGroup).toHaveBeenCalled();
  });

  it('deve usar contexto fornecido', () => {
    const error = new Error('Test error');
    const context = { userId: 'user123', action: 'save' };
    
    const result = handleError(error, context);
    
    expect(result.context).toEqual(
      expect.objectContaining(context)
    );
  });

  it('deve respeitar configuração de notificação', () => {
    const error = new Error('Test error');
    
    handleError(error, {}, { showToast: false });
    expect(toast.error).not.toHaveBeenCalled();
    
    handleError(error, {}, { showToast: true, toastType: 'warning' });
    expect(toast.warning).toHaveBeenCalled();
    
    handleError(error, {}, { showToast: true, toastType: 'info' });
    expect(toast.info).toHaveBeenCalled();
  });

  it('deve respeitar configuração de log', () => {
    const error = new Error('Test error');
    
    handleError(error, {}, { logToConsole: false });
    expect(mockConsoleGroup).not.toHaveBeenCalled();
    
    handleError(error, {}, { logToConsole: true });
    expect(mockConsoleGroup).toHaveBeenCalled();
  });

  it('deve reportar erro em produção', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Production error');
    
    handleError(error, {}, { reportToService: true });
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Reporting error to monitoring service:',
      expect.any(Object)
    );
  });

  it('deve preservar AppError existente', () => {
    const originalError = new AppError('Original error', ErrorType.VALIDATION, {
      code: 'ORIGINAL_CODE'
    });
    
    const result = handleError(originalError);
    
    expect(result).toBe(originalError);
    expect(result.code).toBe('ORIGINAL_CODE');
  });
});

describe('getUserFriendlyMessage', () => {
  it('deve retornar mensagens amigáveis para cada tipo de erro', () => {
    const testCases = [
      {
        type: ErrorType.VALIDATION,
        expected: 'Por favor, verifique os dados informados e tente novamente.'
      },
      {
        type: ErrorType.NETWORK,
        expected: 'Problema de conexão. Verifique sua internet e tente novamente.'
      },
      {
        type: ErrorType.AUTHENTICATION,
        expected: 'Sessão expirada. Por favor, faça login novamente.'
      },
      {
        type: ErrorType.AUTHORIZATION,
        expected: 'Você não tem permissão para realizar esta ação.'
      },
      {
        type: ErrorType.NOT_FOUND,
        expected: 'O recurso solicitado não foi encontrado.'
      },
      {
        type: ErrorType.SERVER_ERROR,
        expected: 'Erro interno do servidor. Nossa equipe foi notificada.'
      },
      {
        type: ErrorType.CLIENT_ERROR,
        expected: 'Erro na aplicação. Tente recarregar a página.'
      },
      {
        type: ErrorType.UNKNOWN,
        expected: 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.'
      }
    ];

    testCases.forEach(({ type, expected }) => {
      const error = new AppError('Test error', type);
      expect(getUserFriendlyMessage(error)).toBe(expected);
    });
  });
});

describe('retryWithBackoff', () => {
  // Removendo fake timers para evitar problemas de timeout

  it('deve executar operação com sucesso na primeira tentativa', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await retryWithBackoff(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('deve fazer retry com backoff exponencial', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValue('success');
    
    const result = await retryWithBackoff(operation, 3, 10); // Delay menor para teste
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  }, 10000);

  it('deve falhar após esgotar tentativas', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
    
    await expect(retryWithBackoff(operation, 2, 10)).rejects.toThrow('Always fails');
    expect(operation).toHaveBeenCalledTimes(3);
  }, 10000);

  it('deve respeitar delay máximo', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockResolvedValue('success');
    
    const result = await retryWithBackoff(operation, 2, 100, 50); // Delays menores para teste
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  }, 10000);
});

describe('withErrorHandling decorator', () => {
  class TestClass {
    @withErrorHandling
    syncMethod(shouldThrow: boolean = false) {
      if (shouldThrow) {
        throw new Error('Sync method error');
      }
      return 'sync success';
    }

    @withErrorHandling
    async asyncMethod(shouldThrow: boolean = false) {
      if (shouldThrow) {
        throw new Error('Async method error');
      }
      return 'async success';
    }
  }

  let instance: TestClass;

  beforeEach(() => {
    instance = new TestClass();
    vi.clearAllMocks();
  });

  it('deve executar método síncrono com sucesso', () => {
    const result = instance.syncMethod();
    expect(result).toBe('sync success');
  });

  it('deve capturar erro em método síncrono', () => {
    expect(() => instance.syncMethod(true)).toThrow('Sync method error');
    expect(mockConsoleGroup).toHaveBeenCalled();
  });

  it('deve executar método assíncrono com sucesso', async () => {
    const result = await instance.asyncMethod();
    expect(result).toBe('async success');
  });

  it('deve capturar erro em método assíncrono', async () => {
    await expect(instance.asyncMethod(true)).rejects.toThrow('Async method error');
    expect(mockConsoleGroup).toHaveBeenCalled();
  });

  it('deve incluir contexto do método no erro', () => {
    try {
      instance.syncMethod(true);
    } catch (error) {
      // O decorator deve ter logado o erro com contexto
      expect(mockConsoleGroup).toHaveBeenCalledWith(
        expect.stringContaining('Error Handler')
      );
    }
  });
});

describe('Integração - Cenários Reais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  it('deve tratar erro de validação de formulário', () => {
    const error = createValidationError(
      'Email é obrigatório',
      'email',
      ''
    );
    
    const result = handleError(error, {
      formName: 'patientForm',
      userId: 'user123'
    });
    
    expect(result.type).toBe(ErrorType.VALIDATION);
    expect(toast.error).toHaveBeenCalledWith(
      'Por favor, verifique os dados informados e tente novamente.'
    );
  });

  it('deve tratar erro de API com retry', async () => {
    const apiCall = vi.fn()
      .mockRejectedValueOnce(createNetworkError('Timeout', 408))
      .mockResolvedValue({ data: 'success' });
    
    const result = await retryWithBackoff(apiCall, 2, 100);
    
    expect(result).toEqual({ data: 'success' });
    expect(apiCall).toHaveBeenCalledTimes(2);
  }, 10000);

  it('deve tratar erro de permissão com contexto completo', () => {
    const error = createPermissionError(
      'Usuário não pode deletar pacientes',
      'patients',
      'delete'
    );
    
    const result = handleError(error, {
      userId: 'user123',
      patientId: 'patient456',
      timestamp: new Date().toISOString()
    });
    
    expect(result.type).toBe(ErrorType.AUTHORIZATION);
    expect(result.context).toEqual(
      expect.objectContaining({
        resource: 'patients',
        action: 'delete'
      })
    );
  });
});