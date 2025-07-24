import { User, Patient, SubscriptionMetrics, MetricCard, ConversionFunnelData, RevenueData, PlanDistribution } from '../types';

// Demo users for authentication
export const DEMO_USERS: User[] = [
  {
    id: '1',
    name: 'Dr. Rafael Admin',
    email: 'admin@fisioflow.com',
    role: 'ADMIN',
    tenantId: 't1',
    avatar: 'https://via.placeholder.com/100',
    phone: '(11) 99999-9999',
    specialization: 'Fisioterapia Ortopédica',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Dra. Maria Fisioterapeuta',
    email: 'maria@fisioflow.com',
    role: 'FISIOTERAPEUTA',
    tenantId: 't1',
    avatar: 'https://via.placeholder.com/100',
    phone: '(11) 88888-8888',
    specialization: 'Fisioterapia Neurológica',
    createdAt: '2025-01-02T00:00:00Z',
  },
  {
    id: '3',
    name: 'João Estagiário',
    email: 'joao@fisioflow.com',
    role: 'ESTAGIARIO',
    tenantId: 't1',
    phone: '(11) 77777-7777',
    createdAt: '2025-01-03T00:00:00Z',
  }
];

// Demo patients
export const DEMO_PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'Ana Silva Santos',
    email: 'ana.silva@email.com',
    phone: '(11) 91234-5678',
    cpf: '123.456.789-00',
    birthDate: '1985-03-15',
    address: {
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 45',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567'
    },
    emergencyContact: {
      name: 'Carlos Silva',
      phone: '(11) 98765-4321',
      relationship: 'Esposo'
    },
    medicalInfo: {
      conditions: ['Lombalgia', 'Artrose de joelho'],
      medications: ['Ibuprofeno 600mg'],
      allergies: ['Dipirona'],
      surgeries: ['Artroscopia de joelho (2020)'],
      familyHistory: 'Diabetes familiar'
    },
    sessions: 12,
    progress: 75,
    status: 'active',
    tenantId: 't1',
    assignedPhysiotherapist: '2',
    createdAt: '2025-01-10T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z'
  },
  {
    id: 'p2',
    name: 'Carlos Oliveira',
    email: 'carlos.oliveira@email.com',
    phone: '(11) 92345-6789',
    cpf: '234.567.890-11',
    birthDate: '1978-07-22',
    address: {
      street: 'Avenida Brasil',
      number: '456',
      district: 'Vila Nova',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '02345-678'
    },
    emergencyContact: {
      name: 'Maria Oliveira',
      phone: '(11) 97654-3210',
      relationship: 'Esposa'
    },
    medicalInfo: {
      conditions: ['Bursite de ombro', 'Tendinite'],
      medications: ['Nimesulida 100mg'],
      allergies: [],
      surgeries: [],
      familyHistory: 'Hipertensão'
    },
    sessions: 8,
    progress: 60,
    status: 'active',
    tenantId: 't1',
    assignedPhysiotherapist: '1',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-22T00:00:00Z'
  },
  {
    id: 'p3',
    name: 'Lucia Fernandes',
    email: 'lucia.fernandes@email.com',
    phone: '(11) 93456-7890',
    cpf: '345.678.901-22',
    birthDate: '1990-11-08',
    address: {
      street: 'Rua da Paz',
      number: '789',
      district: 'Jardim América',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '03456-789'
    },
    emergencyContact: {
      name: 'Pedro Fernandes',
      phone: '(11) 96543-2109',
      relationship: 'Irmão'
    },
    medicalInfo: {
      conditions: ['Fibromialgia', 'Cefaleia tensional'],
      medications: ['Pregabalina 75mg', 'Amitriptilina 25mg'],
      allergies: ['Penicilina'],
      surgeries: [],
      familyHistory: 'Depressão familiar'
    },
    sessions: 16,
    progress: 85,
    status: 'active',
    tenantId: 't1',
    assignedPhysiotherapist: '2',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-23T00:00:00Z'
  }
];

// Demo subscription metrics
export const DEMO_SUBSCRIPTION_METRICS: SubscriptionMetrics = {
  activeSubscribers: 28,
  monthlyRevenue: 1580.50,
  conversionRate: 12.5,
  churnRate: 4.2,
  totalUsers: 156,
  newSignups: 15,
  cancelledSubscriptions: 3,
  averageRevenuePerUser: 56.45
};

// Demo metric cards
export const DEMO_METRIC_CARDS: MetricCard[] = [
  {
    title: 'Assinantes Ativos',
    value: '28',
    change: 8,
    changeType: 'increase',
    description: '18% dos usuários totais'
  },
  {
    title: 'Receita Mensal (MRR)',
    value: 'R$ 1.581',
    change: 15.3,
    changeType: 'increase',
    description: 'Receita recorrente mensal'
  },
  {
    title: 'Taxa de Conversão',
    value: '12.5%',
    change: 2.1,
    changeType: 'increase',
    description: 'Free para Premium'
  },
  {
    title: 'Taxa de Churn',
    value: '4.2%',
    change: -1.8,
    changeType: 'decrease',
    description: 'Cancelamentos no mês'
  }
];

// Demo conversion funnel
export const DEMO_CONVERSION_FUNNEL: ConversionFunnelData[] = [
  {
    stage: 'Visitantes',
    users: 1250,
    conversionRate: 100
  },
  {
    stage: 'Cadastros',
    users: 156,
    conversionRate: 12.5
  },
  {
    stage: 'Trial Ativo',
    users: 45,
    conversionRate: 28.8
  },
  {
    stage: 'Assinantes Pagos',
    users: 28,
    conversionRate: 62.2
  }
];

// Demo revenue trend
export const DEMO_REVENUE_TREND: RevenueData[] = [
  {
    period: 'Jul 2024',
    revenue: 890.50,
    subscriptions: 18,
    churn: 5.8
  },
  {
    period: 'Ago 2024',
    revenue: 1125.30,
    subscriptions: 22,
    churn: 4.5
  },
  {
    period: 'Set 2024',
    revenue: 1340.80,
    subscriptions: 25,
    churn: 3.2
  },
  {
    period: 'Out 2024',
    revenue: 1580.50,
    subscriptions: 28,
    churn: 4.2
  }
];

// Demo plan distribution
export const DEMO_PLAN_DISTRIBUTION: PlanDistribution[] = [
  {
    plan: 'free',
    count: 124,
    percentage: 79.5
  },
  {
    plan: 'silver',
    count: 18,
    percentage: 11.5
  },
  {
    plan: 'gold',
    count: 8,
    percentage: 5.1
  },
  {
    plan: 'platinum',
    count: 6,
    percentage: 3.9
  }
];

// Helper function to simulate API delay
export const simulateApiDelay = (ms: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};