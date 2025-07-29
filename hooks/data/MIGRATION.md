# Migração do useData Monolítico para Arquitetura Modular

## Problema Identificado

O hook `useData.tsx` tinha **3248 linhas** e gerenciava todas as entidades de dados da aplicação em um único arquivo, causando:

- ❌ Dificulta manutenção e debugging
- ❌ Performance degradada (todos os dados carregados sempre)
- ❌ Testes complexos e acoplados
- ❌ Risco de conflitos em equipe
- ❌ Violação do Single Responsibility Principle

## Nova Arquitetura Modular

### Estrutura Criada

```
hooks/data/
├── useOptimizedStorage.ts    # Hooks de armazenamento reutilizáveis
├── useUsers.ts              # Gerenciamento de usuários
├── usePatients.ts           # Gerenciamento de pacientes  
├── useTasks.ts              # Gerenciamento de tarefas
├── useDataStore.ts          # Store centralizado
├── index.ts                 # Exports centralizados
└── MIGRATION.md             # Este arquivo
```

### Benefícios

- ✅ **Modularidade**: Cada domínio em seu próprio arquivo
- ✅ **Performance**: Lazy loading por domínio
- ✅ **Testabilidade**: Testes isolados por domínio
- ✅ **Manutenibilidade**: Responsabilidades claras
- ✅ **TypeScript**: Tipos específicos por domínio
- ✅ **Reusabilidade**: Hooks podem ser reutilizados

## Como Migrar

### 1. Substituir imports

**Antes:**
```typescript
import { useData } from '../hooks/useData';

const { users, patients, tasks, addUser, addPatient } = useData();
```

**Depois:**
```typescript
import { useUsersData, usePatientsData, useTasksData } from '../hooks/data';

const { users, addUser } = useUsersData();
const { patients, addPatient } = usePatientsData();
const { tasks, addTask } = useTasksData();
```

### 2. Atualizar Providers

**Adicionar ao App.tsx:**
```typescript
import { DataStoreProvider } from './hooks/data';

function App() {
  return (
    <DataStoreProvider>
      {/* resto da aplicação */}
    </DataStoreProvider>
  );
}
```

### 3. Hooks Disponíveis

#### useUsersData()
```typescript
const {
  users,              // Lista de usuários
  addUser,           // Adicionar usuário
  updateUser,        // Atualizar usuário  
  deleteUser,        // Deletar usuário
  getUserById,       // Buscar por ID
  getUsersByRole,    // Buscar por role
} = useUsersData();
```

#### usePatientsData()
```typescript
const {
  patients,              // Lista de pacientes
  addPatient,           // Adicionar paciente
  updatePatient,        // Atualizar paciente
  deletePatient,        // Deletar paciente
  getPatientById,       // Buscar por ID
  searchPatients,       // Busca textual
  getActivePatients,    // Pacientes ativos
  getPatientsByTherapist, // Por terapeuta
} = usePatientsData();
```

#### useTasksData()
```typescript
const {
  tasks,                // Lista de tarefas
  addTask,             // Adicionar tarefa
  updateTask,          // Atualizar tarefa
  deleteTask,          // Deletar tarefa
  getTaskById,         // Buscar por ID
  getTasksByStatus,    // Por status
  getTasksByPatient,   // Por paciente
  getPendingTasks,     // Pendentes
  getOverdueTasks,     // Atrasadas
  completeTask,        // Marcar como concluída
} = useTasksData();
```

## Próximos Passos

1. **Expandir domínios**: Criar hooks para appointments, exercises, assessments, etc.
2. **Implementar cache inteligente**: React Query por domínio
3. **Adicionar validação**: Zod schemas por domínio
4. **Criar testes**: Suítes de teste por hook
5. **Otimizar performance**: Virtualização e paginação

## Exemplo de Uso Completo

```typescript
import React from 'react';
import { DataStoreProvider, usePatientsData, useTasksData } from '../hooks/data';

const PatientDashboard = () => {
  const { patients, searchPatients } = usePatientsData();
  const { getTasksByPatient } = useTasksData();

  const handleSearch = (query: string) => {
    return searchPatients(query);
  };

  const getPatientTasks = (patientId: string) => {
    return getTasksByPatient(patientId);
  };

  return (
    <div>
      {/* UI implementation */}
    </div>
  );
};

const App = () => (
  <DataStoreProvider>
    <PatientDashboard />
  </DataStoreProvider>
);
```

## Vantagens da Nova Arquitetura

- **Bundle Size**: Redução significativa no tamanho do bundle
- **Tree Shaking**: Apenas código usado é incluído
- **Hot Reload**: Mudanças em um domínio não afetam outros
- **Team Collaboration**: Menos conflitos de merge
- **Testing**: Testes mais rápidos e focados
- **Performance**: Carregamento sob demanda