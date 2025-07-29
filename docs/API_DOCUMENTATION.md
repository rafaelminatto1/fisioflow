# API Documentation - FisioFlow

## Visão Geral

O FisioFlow é uma SPA (Single Page Application) que utiliza localStorage para persistência de dados e integração com APIs externas para funcionalidades avançadas.

## Arquitetura da API

### 1. Data Layer (LocalStorage API)

#### Estrutura de Dados

```typescript
interface BaseEntity {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface User extends BaseEntity {
  name: string;
  email: string;
  role: 'ADMIN' | 'FISIOTERAPEUTA' | 'ESTAGIARIO' | 'PACIENTE';
  isActive: boolean;
  specialties?: string[];
  crm?: string;
}

interface Patient extends BaseEntity {
  name: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email?: string;
  address: Address;
  medicalHistory: MedicalRecord[];
  assignedPhysiotherapist: string;
}

interface Task extends BaseEntity {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo: string;
  patientId?: string;
  dueDate: string;
}
```

#### Storage Operations

```typescript
// Storage Keys
const STORAGE_KEYS = {
  USERS: 'fisioflow_users',
  PATIENTS: 'fisioflow_patients', 
  TASKS: 'fisioflow_tasks',
  SESSIONS: 'fisioflow_sessions',
  EXERCISES: 'fisioflow_exercises',
  ASSESSMENTS: 'fisioflow_assessments'
} as const;

// CRUD Operations
class DataService<T extends BaseEntity> {
  // Create
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T
  
  // Read
  findAll(tenantId: string): T[]
  findById(id: string): T | null
  findBy(criteria: Partial<T>): T[]
  
  // Update
  update(id: string, data: Partial<T>): T
  
  // Delete
  delete(id: string): boolean
  
  // Bulk Operations
  bulkCreate(entities: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): T[]
  bulkDelete(ids: string[]): boolean
}
```

### 2. External APIs Integration

#### Google Gemini AI API

```typescript
interface GeminiService {
  // Análise de progresso de pacientes
  analyzePatientProgress(
    patientId: string,
    sessions: Session[]
  ): Promise<ProgressAnalysis>;
  
  // Geração de planos de tratamento
  generateTreatmentPlan(
    assessment: Assessment,
    patientProfile: Patient
  ): Promise<TreatmentPlan>;
  
  // Busca na base de conhecimento
  searchKnowledgeBase(
    query: string,
    context?: string
  ): Promise<KnowledgeResult[]>;
  
  // Análise de riscos
  predictAbandonmentRisk(
    patientData: PatientAnalysisData
  ): Promise<RiskAssessment>;
  
  // Geração de relatórios
  generateReport(
    type: ReportType,
    data: ReportData,
    template?: string
  ): Promise<GeneratedReport>;
}

// Configuração
const geminiConfig = {
  apiKey: process.env.VITE_GEMINI_API_KEY,
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.8,
    maxOutputTokens: 2048,
  },
  safetySettings: [
    {
      category: 'HARM_CATEGORY_MEDICAL',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ]
};
```

#### API Endpoints (Futuras Integrações)

```typescript
// REST API Structure (preparado para backend futuro)
interface APIEndpoints {
  // Authentication
  'POST /api/auth/login': {
    body: LoginCredentials;
    response: AuthResponse;
  };
  
  'POST /api/auth/logout': {
    response: { success: boolean };
  };
  
  // Users
  'GET /api/users': {
    query: PaginationParams & FilterParams;
    response: PaginatedResponse<User>;
  };
  
  'POST /api/users': {
    body: CreateUserRequest;
    response: User;
  };
  
  'PUT /api/users/:id': {
    params: { id: string };
    body: UpdateUserRequest;
    response: User;
  };
  
  // Patients
  'GET /api/patients': {
    query: PaginationParams & PatientFilterParams;
    response: PaginatedResponse<Patient>;
  };
  
  'POST /api/patients': {
    body: CreatePatientRequest;
    response: Patient;
  };
  
  // Tasks
  'GET /api/tasks': {
    query: PaginationParams & TaskFilterParams;
    response: PaginatedResponse<Task>;
  };
  
  // AI Services
  'POST /api/ai/analyze-progress': {
    body: ProgressAnalysisRequest;
    response: ProgressAnalysis;
  };
  
  'POST /api/ai/generate-plan': {
    body: TreatmentPlanRequest;
    response: TreatmentPlan;
  };
}
```

### 3. Hooks API

#### Data Hooks

```typescript
// useUsers Hook
interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  
  // Actions
  createUser: (data: CreateUserData) => Promise<User>;
  updateUser: (id: string, data: UpdateUserData) => Promise<User>;
  deleteUser: (id: string) => Promise<boolean>;
  getUserById: (id: string) => User | null;
  getUsersByRole: (role: UserRole) => User[];
  
  // Queries
  searchUsers: (query: string) => User[];
  getActiveUsers: () => User[];
  
  // Mutations
  toggleUserStatus: (id: string) => Promise<User>;
  resetUserPassword: (id: string) => Promise<boolean>;
}

// usePatients Hook
interface UsePatientsReturn {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  
  // Actions
  createPatient: (data: CreatePatientData) => Promise<Patient>;
  updatePatient: (id: string, data: UpdatePatientData) => Promise<Patient>;
  deletePatient: (id: string) => Promise<boolean>;
  
  // Queries
  getPatientById: (id: string) => Patient | null;
  getPatientsByPhysiotherapist: (physioId: string) => Patient[];
  searchPatients: (query: string) => Patient[];
  
  // Medical Records
  addMedicalRecord: (patientId: string, record: MedicalRecord) => Promise<Patient>;
  updateMedicalRecord: (patientId: string, recordId: string, data: Partial<MedicalRecord>) => Promise<Patient>;
  
  // Assessments
  addAssessment: (patientId: string, assessment: Assessment) => Promise<Patient>;
  getPatientAssessments: (patientId: string) => Assessment[];
}

// useTasks Hook
interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  
  // Actions
  createTask: (data: CreateTaskData) => Promise<Task>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;
  
  // Status Management
  completeTask: (id: string) => Promise<Task>;
  cancelTask: (id: string) => Promise<Task>;
  assignTask: (id: string, userId: string) => Promise<Task>;
  
  // Queries
  getTasksByUser: (userId: string) => Task[];
  getTasksByPatient: (patientId: string) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  getOverdueTasks: () => Task[];
  getTasksDueSoon: (days?: number) => Task[];
  
  // Bulk Operations
  bulkUpdateStatus: (ids: string[], status: TaskStatus) => Promise<Task[]>;
  bulkAssign: (ids: string[], userId: string) => Promise<Task[]>;
}
```

#### Auth Hook

```typescript
interface UseAuthReturn {
  // State
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<User>;
  
  // Profile Management
  updateProfile: (data: UpdateProfileData) => Promise<User>;
  changePassword: (data: ChangePasswordData) => Promise<boolean>;
  
  // Permissions
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  canAccess: (resource: string, action: Action) => boolean;
  
  // Tenant Management
  switchTenant: (tenantId: string) => Promise<void>;
  getCurrentTenant: () => Tenant | null;
}
```

### 4. Security & Validation

#### Data Validation

```typescript
// Zod Schemas
export const UserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'FISIOTERAPEUTA', 'ESTAGIARIO', 'PACIENTE']),
  crm: z.string().optional(),
  specialties: z.array(z.string()).optional(),
});

export const PatientSchema = z.object({
  name: z.string().min(2).max(100),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
  birthDate: z.string().datetime(),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/),
  email: z.string().email().optional(),
});

export const TaskSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(1000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string().datetime(),
  assignedTo: z.string().uuid(),
  patientId: z.string().uuid().optional(),
});
```

#### Permission System

```typescript
interface PermissionMatrix {
  ADMIN: {
    users: ['create', 'read', 'update', 'delete'];
    patients: ['create', 'read', 'update', 'delete'];
    tasks: ['create', 'read', 'update', 'delete'];
    reports: ['create', 'read', 'update', 'delete'];
    settings: ['read', 'update'];
  };
  
  FISIOTERAPEUTA: {
    patients: ['create', 'read', 'update']; // apenas seus pacientes
    tasks: ['create', 'read', 'update', 'delete']; // apenas suas tarefas
    reports: ['create', 'read'];
    assessments: ['create', 'read', 'update'];
  };
  
  ESTAGIARIO: {
    patients: ['read']; // apenas pacientes supervisionados
    tasks: ['read', 'update']; // apenas tarefas atribuídas
    assessments: ['read'];
  };
  
  PACIENTE: {
    profile: ['read', 'update']; // apenas próprio perfil
    appointments: ['read'];
    exercises: ['read'];
    progress: ['read'];
  };
}
```

### 5. Error Handling

#### Error Types

```typescript
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public field: string, public value: any) {
    super('VALIDATION_ERROR', message, 400, { field, value });
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super('AUTH_ERROR', message, 401);
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Insufficient permissions') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
  }
}
```

#### Error Handling Hook

```typescript
interface UseErrorHandlingReturn {
  error: APIError | null;
  clearError: () => void;
  handleError: (error: unknown) => void;
  isLoading: boolean;
  
  // Specific error checks
  isValidationError: (error: unknown) => error is ValidationError;
  isAuthError: (error: unknown) => error is AuthenticationError;
  isNotFoundError: (error: unknown) => error is NotFoundError;
  
  // Recovery actions
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

### 6. Performance & Caching

#### Cache Strategy

```typescript
interface CacheConfig {
  // In-memory cache for frequently accessed data
  users: { ttl: 300000, maxSize: 1000 }; // 5 min
  patients: { ttl: 600000, maxSize: 5000 }; // 10 min
  tasks: { ttl: 60000, maxSize: 10000 }; // 1 min
  
  // Persistent cache for static data
  exercises: { ttl: 3600000, persistent: true }; // 1 hour
  templates: { ttl: 7200000, persistent: true }; // 2 hours
}

interface CacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  
  // Bulk operations
  mget<T>(keys: string[]): (T | null)[];
  mset<T>(entries: [string, T, number?][]): void;
  
  // Advanced features
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
  invalidatePattern(pattern: string): void;
}
```

### 7. Real-time Features (Preparação)

#### WebSocket Events

```typescript
interface WebSocketEvents {
  // Task updates
  'task:created': { task: Task };
  'task:updated': { task: Task };
  'task:deleted': { taskId: string };
  
  // Patient updates
  'patient:created': { patient: Patient };
  'patient:updated': { patient: Patient };
  
  // User presence
  'user:online': { userId: string };
  'user:offline': { userId: string };
  
  // Notifications
  'notification:new': { notification: Notification };
  'notification:read': { notificationId: string };
  
  // System events
  'system:maintenance': { message: string };
  'system:update': { version: string };
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: any;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  send: (event: string, data: any) => void;
  
  // Event listeners
  on<T>(event: keyof WebSocketEvents, handler: (data: T) => void): void;
  off(event: keyof WebSocketEvents, handler?: Function): void;
  
  // Connection management
  reconnect: () => void;
  getConnectionStatus: () => 'connecting' | 'connected' | 'disconnected' | 'error';
}
```

## API Usage Examples

### Basic CRUD Operations

```typescript
// Users
const { users, createUser, updateUser, deleteUser } = useUsers();

// Create user
const newUser = await createUser({
  name: 'Dr. João Silva',
  email: 'joao@fisioflow.com',
  role: 'FISIOTERAPEUTA',
  crm: '12345-SP'
});

// Update user
const updatedUser = await updateUser(newUser.id, {
  specialties: ['Ortopedia', 'Neurologia']
});

// Patients
const { patients, createPatient, addAssessment } = usePatients();

// Create patient
const newPatient = await createPatient({
  name: 'Maria Santos',
  cpf: '123.456.789-00',
  birthDate: '1985-03-15T00:00:00Z',
  phone: '(11) 98765-4321',
  assignedPhysiotherapist: newUser.id
});

// Add assessment
await addAssessment(newPatient.id, {
  type: 'INITIAL',
  findings: 'Dor lombar crônica',
  plan: 'Fortalecimento e alongamento',
  date: new Date().toISOString()
});

// Tasks
const { tasks, createTask, completeTask } = useTasks();

// Create task
const newTask = await createTask({
  title: 'Reavaliação paciente Maria',
  description: 'Verificar progresso do tratamento',
  priority: 'MEDIUM',
  assignedTo: newUser.id,
  patientId: newPatient.id,
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
});

// Complete task
await completeTask(newTask.id);
```

### AI Integration

```typescript
// Progress analysis
const analysis = await geminiService.analyzePatientProgress(
  patient.id,
  patientSessions
);

// Treatment plan generation
const treatmentPlan = await geminiService.generateTreatmentPlan(
  assessment,
  patient
);

// Knowledge base search
const results = await geminiService.searchKnowledgeBase(
  'exercícios para dor lombar',
  'ortopedia'
);
```

### Advanced Filtering

```typescript
// Complex patient queries
const { searchPatients, getPatientsByPhysiotherapist } = usePatients();

// Search by multiple criteria
const searchResults = searchPatients('Maria');
const physioPatients = getPatientsByPhysiotherapist(currentUser.id);

// Task filtering
const { getTasksByStatus, getOverdueTasks, getTasksDueSoon } = useTasks();

const pendingTasks = getTasksByStatus('PENDING');
const overdueTasks = getOverdueTasks();
const upcomingTasks = getTasksDueSoon(7); // próximos 7 dias
```

## Testing API

### Unit Tests

```typescript
// Example test for useUsers hook
describe('useUsers Hook', () => {
  it('should create user successfully', async () => {
    const { result } = renderHook(() => useUsers(), {
      wrapper: TestProvider
    });
    
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'FISIOTERAPEUTA' as const
    };
    
    await act(async () => {
      const user = await result.current.createUser(userData);
      expect(user).toMatchObject(userData);
      expect(user.id).toBeDefined();
    });
  });
});

// API service tests
describe('GeminiService', () => {
  it('should generate treatment plan', async () => {
    const mockAssessment = createMockAssessment();
    const mockPatient = createMockPatient();
    
    const plan = await geminiService.generateTreatmentPlan(
      mockAssessment,
      mockPatient
    );
    
    expect(plan).toHaveProperty('exercises');
    expect(plan).toHaveProperty('goals');
    expect(plan).toHaveProperty('timeline');
  });
});
```

### Integration Tests

```typescript
describe('Data Flow Integration', () => {
  it('should create patient and assign task', async () => {
    const { result: userResult } = renderHook(() => useUsers());
    const { result: patientResult } = renderHook(() => usePatients());
    const { result: taskResult } = renderHook(() => useTasks());
    
    // Create physiotherapist
    const physio = await userResult.current.createUser({
      name: 'Dr. Test',
      email: 'test@fisio.com',
      role: 'FISIOTERAPEUTA'
    });
    
    // Create patient
    const patient = await patientResult.current.createPatient({
      name: 'Test Patient',
      cpf: '123.456.789-00',
      assignedPhysiotherapist: physio.id
    });
    
    // Create task for patient
    const task = await taskResult.current.createTask({
      title: 'Initial Assessment',
      assignedTo: physio.id,
      patientId: patient.id
    });
    
    expect(task.patientId).toBe(patient.id);
    expect(task.assignedTo).toBe(physio.id);
  });
});
```

## Migration Guide

### From localStorage to REST API

```typescript
// 1. Update service layer
class APIService<T> {
  async findAll(): Promise<T[]> {
    // Change from localStorage to HTTP request
    const response = await fetch('/api/resource');
    return response.json();
  }
}

// 2. Update hooks
function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  
  useEffect(() => {
    // Change from localStorage to API call
    APIService.findAll().then(setUsers);
  }, []);
}

// 3. Add error handling
// 4. Implement optimistic updates
// 5. Add loading states
```

Esta documentação serve como referência completa para a API do FisioFlow e facilita futuras migrações para arquiteturas mais complexas.