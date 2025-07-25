# Migração para Hooks Especializados - FisioFlow

## 📋 Resumo da Migração

Esta migração substitui o hook monolítico `useData` por hooks especializados, proporcionando melhor organização, performance e manutenibilidade do código.

## 🎯 Hooks Criados

### 1. `useAssessments` - Gerenciamento de Avaliações

**Localização:** `src/hooks/useAssessments.ts`

**Funcionalidades:**

- ✅ Listagem de avaliações
- ✅ Criação de novas avaliações
- ✅ Atualização de avaliações existentes
- ✅ Exclusão de avaliações
- ✅ Filtros por paciente, terapeuta e data
- ✅ Cálculo de progresso e estatísticas
- ✅ Cache otimizado com React Query

**Exemplo de uso:**

```typescript
import { useAssessments } from '../hooks/useAssessments';

const MyComponent = () => {
  const {
    assessments,
    loading,
    createAssessment,
    deleteAssessment,
    getAssessmentsByPatient
  } = useAssessments();

  const handleSave = async (assessment, user) => {
    await createAssessment(assessment, user);
  };

  return (
    // JSX aqui
  );
};
```

### 2. `useDocuments` - Gerenciamento de Documentos

**Localização:** `src/hooks/useDocuments.ts`

**Funcionalidades:**

- ✅ Listagem de documentos
- ✅ Upload de novos documentos
- ✅ Exclusão de documentos
- ✅ Filtros por paciente e tipo de arquivo
- ✅ Validação de tipos de arquivo
- ✅ Formatação de tamanho de arquivo
- ✅ Cache otimizado com React Query

**Exemplo de uso:**

```typescript
import { useDocuments } from '../hooks/useDocuments';

const DocumentsTab = () => {
  const {
    documents,
    loading,
    uploadDocument,
    removeDocument,
    formatFileSize,
    isValidFileType
  } = useDocuments();

  const handleUpload = async (file, user) => {
    if (isValidFileType(file)) {
      const docData = {
        patientId: 'patient-id',
        title: file.name,
        description: 'Documento médico',
        category: 'general'
      };
      await uploadDocument(docData, file, user);
    }
  };

  return (
    // JSX aqui
  );
};
```

### 3. `usePrescriptions` - Gerenciamento de Prescrições

**Localização:** `src/hooks/usePrescriptions.ts`

**Funcionalidades:**

- ✅ Listagem de prescrições
- ✅ Criação de novas prescrições
- ✅ Atualização de prescrições existentes
- ✅ Exclusão de prescrições
- ✅ Filtros por paciente, status e data
- ✅ Verificação de expiração
- ✅ Cálculo de duração
- ✅ Cache otimizado com React Query

**Exemplo de uso:**

```typescript
import { usePrescriptions } from '../hooks/usePrescriptions';

const PrescriptionsTab = () => {
  const {
    prescriptions,
    loading,
    createPrescription,
    deletePrescription,
    isPrescriptionExpired,
    formatPrescriptionDuration
  } = usePrescriptions();

  const handleCreate = async (prescription, user) => {
    await createPrescription(prescription, user);
  };

  return (
    // JSX aqui
  );
};
```

### 4. `useUsers` - Gerenciamento de Usuários

**Localização:** `src/hooks/useUsers.ts`

**Funcionalidades:**

- ✅ Listagem de usuários
- ✅ Criação de novos usuários
- ✅ Atualização de usuários existentes
- ✅ Exclusão de usuários
- ✅ Filtros por role, status
- ✅ Busca por nome, email ou telefone
- ✅ Utilitários para formatação e validação
- ✅ Cache otimizado com React Query

**Exemplo de uso:**

```typescript
import { useUsers } from '../hooks/useUsers';

const UsersComponent = () => {
  const {
    users,
    loading,
    getUserById,
    getProfessionals,
    searchUsers,
    formatUserRole
  } = useUsers();

  const professionals = getProfessionals();
  const searchResults = searchUsers('João');

  return (
    // JSX aqui
  );
};
```

## 🔄 Componentes Migrados

### ✅ PatientModal.tsx

**Status:** Migrado completamente

**Mudanças realizadas:**

- Substituído `useData` pelos hooks especializados
- Atualizado imports
- Modificado funções de save/delete para usar novos hooks
- Adicionado tratamento de erros async/await
- Corrigido upload de documentos para usar novo formato

**Antes:**

```typescript
const {
  saveAssessment,
  deleteAssessment,
  savePrescription,
  deletePrescription,
  saveDocument,
  deleteDocument,
  users,
} = useData();
```

**Depois:**

```typescript
const { users } = useUsers();
const { createAssessment, deleteAssessment: removeAssessment } =
  useAssessments();
const { createPrescription, deletePrescription: removePrescription } =
  usePrescriptions();
const { uploadDocument, removeDocument } = useDocuments();
```

## 🚀 Benefícios da Migração

### 1. **Performance Melhorada**

- Cache específico para cada entidade
- Invalidação seletiva de cache
- Menos re-renders desnecessários
- Queries otimizadas

### 2. **Melhor Organização**

- Separação de responsabilidades
- Código mais modular
- Facilita testes unitários
- Reduz complexidade

### 3. **Tipagem Mais Específica**

- Tipos específicos para cada hook
- Melhor IntelliSense
- Detecção de erros em tempo de desenvolvimento
- Documentação automática

### 4. **Facilidade de Manutenção**

- Mudanças isoladas por domínio
- Debugging mais fácil
- Logs específicos por entidade
- Tratamento de erro granular

### 5. **Sistema Freemium Escalável**

- Hooks preparados para limites de plano
- Validações de quota integradas
- Métricas de uso por entidade
- Controle de acesso granular

## 📊 Configuração do React Query

**Localização:** `index.tsx`

**Configurações aplicadas:**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

## 🔧 Variáveis de Ambiente

**Arquivo:** `.env.local`

**Configurações adicionadas:**

```env
# Configuração do plano freemium
VITE_FREE_PLAN_PATIENTS_LIMIT=5
VITE_FREE_PLAN_SESSIONS_LIMIT=20
VITE_FREE_PLAN_STORAGE_LIMIT=100

VITE_PRO_PLAN_PATIENTS_LIMIT=50
VITE_PRO_PLAN_SESSIONS_LIMIT=500
VITE_PRO_PLAN_STORAGE_LIMIT=5000

VITE_PREMIUM_PLAN_PATIENTS_LIMIT=500
VITE_PREMIUM_PLAN_SESSIONS_LIMIT=5000
VITE_PREMIUM_PLAN_STORAGE_LIMIT=50000

# Feature flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_OFFLINE_MODE=false
VITE_ENABLE_DEVTOOLS=true
```

## 📝 Próximos Passos

### 1. **Componentes Pendentes de Migração**

- [ ] Dashboard.tsx
- [ ] ExercisePage.tsx
- [ ] KanbanBoard.tsx
- [ ] AIAssistant.tsx
- [ ] MobileExercisePage.tsx

### 2. **Hooks Adicionais a Criar**

- [ ] usePatients
- [ ] useExercises
- [ ] useAppointments
- [ ] useTasks
- [ ] useTransactions

### 3. **Melhorias Futuras**

- [ ] Implementar cache persistente
- [ ] Adicionar sincronização offline
- [ ] Implementar otimistic updates
- [ ] Adicionar métricas de performance

## 🧪 Testes

### Como Testar a Migração

1. **Verificar funcionalidades básicas:**
   - Abrir modal de paciente
   - Criar nova avaliação
   - Upload de documento
   - Prescrever exercício

2. **Verificar cache:**
   - Abrir React Query DevTools
   - Verificar queries ativas
   - Testar invalidação de cache

3. **Verificar performance:**
   - Monitorar re-renders
   - Verificar tempo de carregamento
   - Testar com dados grandes

## 🔍 Debugging

### React Query DevTools

As DevTools estão habilitadas em desenvolvimento:

```typescript
{import.meta.env.VITE_ENABLE_DEVTOOLS === 'true' && (
  <ReactQueryDevtools initialIsOpen={false} />
)}
```

### Logs de Debug

Cada hook inclui logs específicos para debugging:

```typescript
console.error('Erro ao criar avaliação:', error);
console.error('Erro ao fazer upload do documento:', error);
```

## 📚 Documentação Adicional

- [React Query Documentation](https://tanstack.com/query/latest)
- [TypeScript Best Practices](https://typescript-eslint.io/)
- [React Hooks Patterns](https://reactjs.org/docs/hooks-patterns.html)

---

**Data da Migração:** Dezembro 2024  
**Versão:** 1.0.0  
**Status:** ✅ Concluída para PatientModal.tsx
