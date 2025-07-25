import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { handleError } from '../../utils/errorHandling';

// Mock do sistema de tratamento de erros
jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
  createValidationError: jest.fn(),
  createNetworkError: jest.fn(),
  ErrorType: {
    VALIDATION: 'validation',
    NETWORK: 'network',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    NOT_FOUND: 'not_found',
    SERVER_ERROR: 'server_error',
    CLIENT_ERROR: 'client_error',
    UNKNOWN: 'unknown',
  },
}));

// Mock do fetch para simular API
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Dados de teste
const mockTenantData = {
  id: '1',
  name: 'Clínica FisioFlow',
  email: 'contato@fisioflow.com',
  phone: '(11) 99999-9999',
  address: 'Rua das Flores, 123 - São Paulo, SP',
  subscription: {
    plan: 'premium',
    status: 'active',
    expiresAt: new Date('2024-12-31'),
    features: ['patients', 'exercises', 'reports', 'analytics'],
  },
  settings: {
    theme: 'light',
    language: 'pt-BR',
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

const mockUserData = {
  id: '1',
  tenantId: '1',
  name: 'Dr. João Silva',
  email: 'joao@fisioflow.com',
  role: 'admin',
  permissions: ['read', 'write', 'delete', 'admin'],
  profile: {
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Fisioterapeuta especialista em reabilitação',
    specialties: ['ortopedia', 'neurologia', 'geriatria'],
    crefito: '12345-F',
  },
  preferences: {
    theme: 'light',
    language: 'pt-BR',
    notifications: true,
  },
  isActive: true,
  lastLoginAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPatientData = {
  id: '1',
  tenantId: '1',
  name: 'Maria Silva Santos',
  email: 'maria.santos@email.com',
  phone: '(11) 88888-8888',
  cpf: '123.456.789-00',
  birthDate: new Date('1985-05-15'),
  gender: 'female',
  address: {
    street: 'Rua das Palmeiras, 456',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    country: 'Brasil',
  },
  emergencyContact: {
    name: 'João Santos',
    relationship: 'spouse',
    phone: '(11) 77777-7777',
  },
  medicalInfo: {
    allergies: ['penicilina', 'dipirona'],
    medications: ['losartana', 'metformina'],
    conditions: ['diabetes tipo 2', 'hipertensão'],
    notes: 'Paciente colaborativa, boa aderência ao tratamento',
  },
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockExerciseData = {
  id: '1',
  tenantId: '1',
  name: 'Flexão de Braço Modificada',
  description: 'Exercício de fortalecimento para membros superiores adaptado para iniciantes',
  category: 'strength',
  difficulty: 'beginner',
  duration: 30,
  instructions: [
    'Posicione-se em prancha com joelhos apoiados',
    'Mantenha as mãos na largura dos ombros',
    'Flexione os braços lentamente',
    'Retorne à posição inicial controladamente',
  ],
  precautions: [
    'Não force além do limite de dor',
    'Mantenha a coluna alinhada',
    'Respire adequadamente durante o movimento',
  ],
  equipment: ['colchonete'],
  muscleGroups: ['peitoral', 'tríceps', 'deltoides'],
  videoUrl: 'https://example.com/exercises/flexao-modificada.mp4',
  imageUrl: 'https://example.com/exercises/flexao-modificada.jpg',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Utility para renderizar app com providers
const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

// Utility para simular setup completo
const simulateSetup = async (user: any) => {
  // Simular preenchimento do formulário de setup
  const nameInput = screen.getByLabelText(/nome da clínica/i);
  const emailInput = screen.getByLabelText(/email/i);
  const phoneInput = screen.getByLabelText(/telefone/i);
  const addressInput = screen.getByLabelText(/endereço/i);
  
  await user.type(nameInput, mockTenantData.name);
  await user.type(emailInput, mockTenantData.email);
  await user.type(phoneInput, mockTenantData.phone);
  await user.type(addressInput, mockTenantData.address);
  
  // Simular envio do formulário
  const submitButton = screen.getByRole('button', { name: /criar clínica/i });
  await user.click(submitButton);
};

// Utility para simular login
const simulateLogin = async (user: any) => {
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/senha/i);
  
  await user.type(emailInput, mockUserData.email);
  await user.type(passwordInput, 'password123');
  
  const loginButton = screen.getByRole('button', { name: /entrar/i });
  await user.click(loginButton);
};

describe('Testes de Integração - FisioFlow App', () => {
  let user: any;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Reset localStorage
    window.localStorage.clear();
    
    // Mock fetch responses padrão
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });
  
  describe('Fluxo Completo de Onboarding', () => {
    it('deve completar o fluxo de setup -> login -> dashboard', async () => {
      // Mock das respostas da API
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTenantData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // patients
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // exercises
        });
      
      renderApp();
      
      // 1. Verificar que está na página de setup
      expect(screen.getByText(/configuração inicial/i)).toBeInTheDocument();
      
      // 2. Completar setup
      await simulateSetup(user);
      
      // 3. Aguardar redirecionamento para login
      await waitFor(() => {
        expect(screen.getByText(/fazer login/i)).toBeInTheDocument();
      });
      
      // 4. Completar login
      await simulateLogin(user);
      
      // 5. Verificar redirecionamento para dashboard
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
      
      // 6. Verificar que os dados foram salvos no localStorage
      expect(window.localStorage.getItem('fisioflow_tenant')).toBeTruthy();
      expect(window.localStorage.getItem('fisioflow_user')).toBeTruthy();
    });
    
    it('deve tratar erros durante o setup', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Erro de rede'));
      
      renderApp();
      
      await simulateSetup(user);
      
      await waitFor(() => {
        expect(handleError).toHaveBeenCalled();
      });
    });
    
    it('deve tratar erros durante o login', async () => {
      // Setup bem-sucedido
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTenantData),
      });
      
      // Login com erro
      mockFetch.mockRejectedValueOnce(new Error('Credenciais inválidas'));
      
      renderApp();
      
      await simulateSetup(user);
      
      await waitFor(() => {
        expect(screen.getByText(/fazer login/i)).toBeInTheDocument();
      });
      
      await simulateLogin(user);
      
      await waitFor(() => {
        expect(handleError).toHaveBeenCalled();
      });
    });
  });
  
  describe('Fluxo de Gerenciamento de Pacientes', () => {
    beforeEach(async () => {
      // Setup inicial com usuário logado
      window.localStorage.setItem('fisioflow_tenant', JSON.stringify(mockTenantData));
      window.localStorage.setItem('fisioflow_user', JSON.stringify(mockUserData));
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
    
    it('deve carregar e exibir lista de pacientes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockPatientData]),
      });
      
      renderApp();
      
      // Navegar para página de pacientes
      const patientsLink = screen.getByRole('link', { name: /pacientes/i });
      await user.click(patientsLink);
      
      // Verificar que a lista de pacientes foi carregada
      await waitFor(() => {
        expect(screen.getByText(mockPatientData.name)).toBeInTheDocument();
      });
    });
    
    it('deve permitir adicionar novo paciente', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // lista inicial vazia
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPatientData), // paciente criado
        });
      
      renderApp();
      
      // Navegar para pacientes
      const patientsLink = screen.getByRole('link', { name: /pacientes/i });
      await user.click(patientsLink);
      
      // Clicar em adicionar paciente
      const addButton = screen.getByRole('button', { name: /adicionar paciente/i });
      await user.click(addButton);
      
      // Preencher formulário
      const nameInput = screen.getByLabelText(/nome completo/i);
      const emailInput = screen.getByLabelText(/email/i);
      const phoneInput = screen.getByLabelText(/telefone/i);
      
      await user.type(nameInput, mockPatientData.name);
      await user.type(emailInput, mockPatientData.email);
      await user.type(phoneInput, mockPatientData.phone);
      
      // Salvar paciente
      const saveButton = screen.getByRole('button', { name: /salvar/i });
      await user.click(saveButton);
      
      // Verificar que o paciente foi adicionado
      await waitFor(() => {
        expect(screen.getByText(mockPatientData.name)).toBeInTheDocument();
      });
    });
    
    it('deve permitir buscar pacientes', async () => {
      const patients = [
        mockPatientData,
        { ...mockPatientData, id: '2', name: 'João Silva', email: 'joao@email.com' },
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(patients),
      });
      
      renderApp();
      
      // Navegar para pacientes
      const patientsLink = screen.getByRole('link', { name: /pacientes/i });
      await user.click(patientsLink);
      
      // Aguardar carregamento
      await waitFor(() => {
        expect(screen.getByText(mockPatientData.name)).toBeInTheDocument();
      });
      
      // Buscar por nome
      const searchInput = screen.getByPlaceholderText(/buscar pacientes/i);
      await user.type(searchInput, 'Maria');
      
      // Verificar que apenas Maria aparece
      expect(screen.getByText('Maria Silva Santos')).toBeInTheDocument();
      expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    });
  });
  
  describe('Fluxo de Gerenciamento de Exercícios', () => {
    beforeEach(async () => {
      // Setup inicial com usuário logado
      window.localStorage.setItem('fisioflow_tenant', JSON.stringify(mockTenantData));
      window.localStorage.setItem('fisioflow_user', JSON.stringify(mockUserData));
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
    
    it('deve carregar e exibir biblioteca de exercícios', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockExerciseData]),
      });
      
      renderApp();
      
      // Navegar para exercícios
      const exercisesLink = screen.getByRole('link', { name: /exercícios/i });
      await user.click(exercisesLink);
      
      // Verificar que a biblioteca foi carregada
      await waitFor(() => {
        expect(screen.getByText(mockExerciseData.name)).toBeInTheDocument();
      });
    });
    
    it('deve permitir filtrar exercícios por categoria', async () => {
      const exercises = [
        mockExerciseData,
        { ...mockExerciseData, id: '2', name: 'Corrida Leve', category: 'cardio' },
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(exercises),
      });
      
      renderApp();
      
      // Navegar para exercícios
      const exercisesLink = screen.getByRole('link', { name: /exercícios/i });
      await user.click(exercisesLink);
      
      // Aguardar carregamento
      await waitFor(() => {
        expect(screen.getByText(mockExerciseData.name)).toBeInTheDocument();
      });
      
      // Filtrar por categoria
      const categoryFilter = screen.getByLabelText(/categoria/i);
      await user.selectOptions(categoryFilter, 'strength');
      
      // Verificar filtro
      expect(screen.getByText('Flexão de Braço Modificada')).toBeInTheDocument();
      expect(screen.queryByText('Corrida Leve')).not.toBeInTheDocument();
    });
  });
  
  describe('Fluxo de Configurações', () => {
    beforeEach(async () => {
      // Setup inicial com usuário logado
      window.localStorage.setItem('fisioflow_tenant', JSON.stringify(mockTenantData));
      window.localStorage.setItem('fisioflow_user', JSON.stringify(mockUserData));
    });
    
    it('deve permitir alterar configurações do perfil', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockUserData, name: 'Dr. João Silva Santos' }),
      });
      
      renderApp();
      
      // Navegar para configurações
      const settingsLink = screen.getByRole('link', { name: /configurações/i });
      await user.click(settingsLink);
      
      // Alterar nome
      const nameInput = screen.getByDisplayValue(mockUserData.name);
      await user.clear(nameInput);
      await user.type(nameInput, 'Dr. João Silva Santos');
      
      // Salvar alterações
      const saveButton = screen.getByRole('button', { name: /salvar/i });
      await user.click(saveButton);
      
      // Verificar que foi salvo
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/users'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('João Silva Santos'),
          })
        );
      });
    });
    
    it('deve permitir fazer logout', async () => {
      renderApp();
      
      // Abrir menu do usuário
      const userMenu = screen.getByRole('button', { name: /dr\. joão silva/i });
      await user.click(userMenu);
      
      // Clicar em logout
      const logoutButton = screen.getByRole('menuitem', { name: /sair/i });
      await user.click(logoutButton);
      
      // Verificar redirecionamento para login
      await waitFor(() => {
        expect(screen.getByText(/fazer login/i)).toBeInTheDocument();
      });
      
      // Verificar que localStorage foi limpo
      expect(window.localStorage.getItem('fisioflow_user')).toBeNull();
    });
  });
  
  describe('Tratamento de Erros de Rede', () => {
    beforeEach(async () => {
      window.localStorage.setItem('fisioflow_tenant', JSON.stringify(mockTenantData));
      window.localStorage.setItem('fisioflow_user', JSON.stringify(mockUserData));
    });
    
    it('deve tratar erro de conexão ao carregar dados', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      renderApp();
      
      await waitFor(() => {
        expect(handleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            operation: expect.any(String),
          })
        );
      });
    });
    
    it('deve tratar erro 500 do servidor', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Erro interno do servidor' }),
      });
      
      renderApp();
      
      await waitFor(() => {
        expect(handleError).toHaveBeenCalled();
      });
    });
    
    it('deve tratar erro 401 de autenticação', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Token expirado' }),
      });
      
      renderApp();
      
      await waitFor(() => {
        expect(handleError).toHaveBeenCalled();
      });
    });
  });
  
  describe('Responsividade e Acessibilidade', () => {
    beforeEach(async () => {
      window.localStorage.setItem('fisioflow_tenant', JSON.stringify(mockTenantData));
      window.localStorage.setItem('fisioflow_user', JSON.stringify(mockUserData));
    });
    
    it('deve ser navegável por teclado', async () => {
      renderApp();
      
      // Verificar que elementos focáveis estão presentes
      const focusableElements = screen.getAllByRole('button');
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Testar navegação por Tab
      await user.tab();
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
    });
    
    it('deve ter labels adequados para screen readers', () => {
      renderApp();
      
      // Verificar que inputs têm labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });
    
    it('deve adaptar layout para diferentes tamanhos de tela', () => {
      // Simular tela mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderApp();
      
      // Verificar que o layout se adapta
      const sidebar = screen.queryByTestId('sidebar');
      expect(sidebar).toHaveClass('mobile-hidden');
    });
  });
  
  describe('Performance e Otimização', () => {
    it('deve carregar rapidamente', async () => {
      const startTime = performance.now();
      
      renderApp();
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // App deve carregar em menos de 200ms
      expect(loadTime).toBeLessThan(200);
    });
    
    it('deve fazer lazy loading de componentes pesados', async () => {
      window.localStorage.setItem('fisioflow_tenant', JSON.stringify(mockTenantData));
      window.localStorage.setItem('fisioflow_user', JSON.stringify(mockUserData));
      
      renderApp();
      
      // Verificar que componentes não utilizados não foram carregados
      expect(screen.queryByTestId('heavy-component')).not.toBeInTheDocument();
    });
  });
});