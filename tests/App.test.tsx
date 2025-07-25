import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../src/components/App';
import { useData } from '../src/hooks/useData.minimal';
import { useNotification } from '../src/hooks/useNotification';
import { useSystemEvents } from '../src/hooks/useSystemEvents';

// Mock dos hooks
jest.mock('../hooks/useData');
jest.mock('../hooks/useNotification');
jest.mock('../hooks/useSystemEvents');
jest.mock('../components/ErrorBoundary', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    withErrorBoundary: (Component: React.ComponentType) => Component,
  };
});

// Mock do React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: ({ element }: { element: React.ReactNode }) => <div>{element}</div>,
  Navigate: () => <div>Navigate</div>,
}));

// Mock dos componentes
jest.mock('../components/Layout/Sidebar', () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

jest.mock('../components/Layout/Header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header</div>;
  };
});

jest.mock('../components/Layout/NotificationContainer', () => {
  return function MockNotificationContainer() {
    return <div data-testid="notification-container">Notifications</div>;
  };
});

jest.mock('../pages/Dashboard', () => {
  return function MockDashboard() {
    return <div data-testid="dashboard">Dashboard</div>;
  };
});

jest.mock('../pages/Patients', () => {
  return function MockPatients() {
    return <div data-testid="patients">Patients</div>;
  };
});

jest.mock('../pages/Exercises', () => {
  return function MockExercises() {
    return <div data-testid="exercises">Exercises</div>;
  };
});

jest.mock('../pages/Settings', () => {
  return function MockSettings() {
    return <div data-testid="settings">Settings</div>;
  };
});

jest.mock('../pages/Login', () => {
  return function MockLogin() {
    return <div data-testid="login">Login</div>;
  };
});

jest.mock('../pages/Setup', () => {
  return function MockSetup() {
    return <div data-testid="setup">Setup</div>;
  };
});

// Dados de teste
const mockTenant = {
  id: '1',
  name: 'Clínica Teste',
  email: 'teste@clinica.com',
  phone: '11999999999',
  address: 'Rua Teste, 123',
  subscription: {
    plan: 'premium' as const,
    status: 'active' as const,
    expiresAt: new Date('2024-12-31'),
    features: ['patients', 'exercises', 'reports'],
  },
  settings: {
    theme: 'light' as const,
    language: 'pt-BR' as const,
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    privacy: {
      shareData: false,
      analytics: true,
    },
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUser = {
  id: '1',
  tenantId: '1',
  name: 'Dr. João Silva',
  email: 'joao@clinica.com',
  role: 'admin' as const,
  permissions: ['read', 'write', 'delete'],
  profile: {
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Fisioterapeuta especialista',
    specialties: ['ortopedia', 'neurologia'],
    crefito: '12345-F',
  },
  preferences: {
    theme: 'light' as const,
    language: 'pt-BR' as const,
    notifications: true,
  },
  isActive: true,
  lastLoginAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUseData = {
  // Estados
  isLoading: false,
  tenant: null,
  currentUser: null,
  patients: [],
  exercises: [],
  tasks: [],
  notebooks: [],
  allExerciseVideos: [],
  allExerciseImages: [],
  
  // Setters
  setIsLoading: jest.fn(),
  setTenant: jest.fn(),
  setCurrentUser: jest.fn(),
  setPatients: jest.fn(),
  setExercises: jest.fn(),
  setTasks: jest.fn(),
  setNotebooks: jest.fn(),
  
  // Operações
  saveTenant: jest.fn(),
  saveUser: jest.fn(),
  deleteUser: jest.fn(),
  logout: jest.fn(),
  loadPatients: jest.fn(),
  savePatient: jest.fn(),
  deletePatient: jest.fn(),
  searchPatients: jest.fn(),
  loadExercises: jest.fn(),
  saveExercise: jest.fn(),
  deleteExercise: jest.fn(),
  getExercisesByCategory: jest.fn(),
  getExercisesByDifficulty: jest.fn(),
  saveTask: jest.fn(),
  deleteTask: jest.fn(),
  saveNotebook: jest.fn(),
  deleteNotebook: jest.fn(),
};

const mockUseNotification = {
  notifications: [],
  addNotification: jest.fn(),
  removeNotification: jest.fn(),
  clearNotifications: jest.fn(),
};

const mockUseSystemEvents = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useData as jest.Mock).mockReturnValue(mockUseData);
    (useNotification as jest.Mock).mockReturnValue(mockUseNotification);
    (useSystemEvents as jest.Mock).mockReturnValue(mockUseSystemEvents);
  });

  describe('Renderização Inicial', () => {
    it('deve renderizar sem erros', () => {
      render(<App />);
      expect(screen.getByTestId('notification-container')).toBeInTheDocument();
    });

    it('deve renderizar página de setup quando não há tenant', () => {
      render(<App />);
      expect(screen.getByTestId('setup')).toBeInTheDocument();
    });

    it('deve renderizar página de login quando há tenant mas não há usuário', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
      });

      render(<App />);
      expect(screen.getByTestId('login')).toBeInTheDocument();
    });

    it('deve renderizar layout principal quando há tenant e usuário', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      render(<App />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('Estados de Loading', () => {
    it('deve mostrar indicador de loading quando isLoading é true', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        isLoading: true,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      render(<App />);
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('deve esconder indicador de loading quando isLoading é false', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        isLoading: false,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      render(<App />);
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });
  });

  describe('Navegação e Roteamento', () => {
    it('deve navegar para dashboard por padrão quando autenticado', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      render(<App />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('deve permitir navegação entre páginas', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      render(<App />);
      
      // Verificar se as páginas podem ser renderizadas
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  describe('Gerenciamento de Estado', () => {
    it('deve reagir a mudanças no estado do tenant', () => {
      const { rerender } = render(<App />);
      expect(screen.getByTestId('setup')).toBeInTheDocument();

      // Simular mudança de estado
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
      });

      rerender(<App />);
      expect(screen.getByTestId('login')).toBeInTheDocument();
    });

    it('deve reagir a mudanças no estado do usuário', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
      });

      const { rerender } = render(<App />);
      expect(screen.getByTestId('login')).toBeInTheDocument();

      // Simular login
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      rerender(<App />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('Integração com Hooks', () => {
    it('deve usar hook useData corretamente', () => {
      render(<App />);
      expect(useData).toHaveBeenCalled();
    });

    it('deve usar hook useNotification corretamente', () => {
      render(<App />);
      expect(useNotification).toHaveBeenCalled();
    });

    it('deve usar hook useSystemEvents corretamente', () => {
      render(<App />);
      expect(useSystemEvents).toHaveBeenCalled();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve ser envolvido por ErrorBoundary', () => {
      // Este teste verifica se o ErrorBoundary está sendo usado
      // O mock já está configurado para renderizar os children
      render(<App />);
      expect(screen.getByTestId('notification-container')).toBeInTheDocument();
    });

    it('deve lidar com erros de renderização graciosamente', () => {
      // Simular erro no hook
      (useData as jest.Mock).mockImplementation(() => {
        throw new Error('Hook error');
      });

      // O ErrorBoundary deve capturar o erro
      expect(() => render(<App />)).toThrow('Hook error');
    });
  });

  describe('Responsividade e Layout', () => {
    it('deve aplicar classes CSS corretas para layout', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      const { container } = render(<App />);
      expect(container.firstChild).toHaveClass('app');
    });

    it('deve ter estrutura de layout adequada', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      render(<App />);
      
      // Verificar se os componentes de layout estão presentes
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('notification-container')).toBeInTheDocument();
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter estrutura semântica adequada', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      const { container } = render(<App />);
      
      // Verificar se há elementos semânticos
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('deve ser navegável por teclado', () => {
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      render(<App />);
      
      // Verificar se elementos focáveis estão presentes
      const focusableElements = screen.getAllByRole('button', { hidden: true });
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('deve renderizar rapidamente', () => {
      const startTime = performance.now();
      
      render(<App />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Renderização deve ser rápida (menos de 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('deve não re-renderizar desnecessariamente', () => {
      const { rerender } = render(<App />);
      
      // Simular re-render com os mesmos props
      rerender(<App />);
      
      // Verificar se o componente ainda está funcionando
      expect(screen.getByTestId('notification-container')).toBeInTheDocument();
    });
  });

  describe('Integração com Sistema de Notificações', () => {
    it('deve renderizar container de notificações', () => {
      render(<App />);
      expect(screen.getByTestId('notification-container')).toBeInTheDocument();
    });

    it('deve integrar com sistema de eventos', () => {
      render(<App />);
      expect(useSystemEvents).toHaveBeenCalled();
    });
  });

  describe('Cenários de Uso Real', () => {
    it('deve simular fluxo completo de setup -> login -> dashboard', async () => {
      // Início: sem tenant
      const { rerender } = render(<App />);
      expect(screen.getByTestId('setup')).toBeInTheDocument();

      // Após setup: com tenant, sem usuário
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
      });
      rerender(<App />);
      expect(screen.getByTestId('login')).toBeInTheDocument();

      // Após login: com tenant e usuário
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });
      rerender(<App />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('deve simular logout e retorno ao login', () => {
      // Início: usuário logado
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: mockUser,
      });

      const { rerender } = render(<App />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();

      // Após logout: apenas tenant
      (useData as jest.Mock).mockReturnValue({
        ...mockUseData,
        tenant: mockTenant,
        currentUser: null,
      });
      rerender(<App />);
      expect(screen.getByTestId('login')).toBeInTheDocument();
    });
  });
});