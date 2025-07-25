# 🔄 Plano de Migração useData → Hooks Especializados

## 📊 Situação Atual

### ✅ **Hooks Especializados Implementados**

- `src/hooks/usePatients.ts` - Gerenciamento de pacientes ✅
- `src/hooks/useSessions.ts` - Gerenciamento de sessões ✅
- `src/hooks/useTasks.ts` - Gerenciamento de tarefas ✅
- `src/hooks/useSubscription.ts` - Sistema freemium ✅

### 🚨 **Componentes Usando useData Antigo (47 arquivos)**

#### **Críticos - Migração Prioritária (Semana 1)**

1. `PatientModal.tsx` - Modal principal de pacientes
2. `PatientPage.tsx` - Página de listagem de pacientes
3. `Dashboard.tsx` - Dashboard principal
4. `Header.tsx` - Cabeçalho com dados de usuário
5. `UnifiedDashboard.tsx` - Dashboard unificado
6. `AnalyticsDashboard.tsx` - Analytics principais

#### **Importantes - Migração Secundária (Semana 2)**

7. `CalendarPage.tsx` - Calendário de agendamentos
8. `KanbanBoard.tsx` - Board de tarefas
9. `ReportsPage.tsx` - Relatórios
10. `BillingPage.tsx` - Faturamento
11. `FinancialPage.tsx` - Financeiro
12. `StaffPage.tsx` - Gestão de equipe

#### **Moderados - Migração Terciária (Semana 3)**

13. `ExercisePage.tsx` - Página de exercícios
14. `ChatPage.tsx` - Chat/mensagens
15. `NotebookPage.tsx` - Anotações
16. `SubscriptionManager.tsx` - Gestão de assinaturas
17. `AIAssistant.tsx` - Assistente IA
18. `PatientPortal.tsx` - Portal do paciente

#### **Baixa Prioridade - Migração Final (Semana 4)**

19-47. Modais específicos, componentes de exercícios, etc.

---

## 🎯 Estratégia de Migração

### **Fase 1: Preparação (Dias 1-2)**

#### 1.1 Criar Hook de Transição

```typescript
// src/hooks/useDataMigration.ts
import { usePatients } from './usePatients';
import { useSessions } from './useSessions';
import { useTasks } from './useTasks';
import { useSubscription } from './useSubscription';
import { useAuth } from './useAuth';

/**
 * Hook de transição que mantém a API do useData antigo
 * mas usa os hooks especializados internamente
 */
export const useDataMigration = () => {
  const patientsHook = usePatients();
  const sessionsHook = useSessions();
  const tasksHook = useTasks();
  const subscriptionHook = useSubscription();
  const authHook = useAuth();

  // Manter compatibilidade com API antiga
  return {
    // Pacientes
    patients: patientsHook.patients,
    savePatient: patientsHook.addPatient,
    deletePatient: patientsHook.removePatient,

    // Sessões
    appointments: sessionsHook.sessions,
    saveAppointment: sessionsHook.addSession,
    deleteAppointment: sessionsHook.removeSession,

    // Tarefas
    tasks: tasksHook.tasks,
    saveTask: tasksHook.addTask,
    deleteTask: tasksHook.removeTask,

    // Auth
    currentUser: authHook.user,
    login: authHook.login,
    logout: authHook.logout,

    // Subscription
    subscription: subscriptionHook.subscription,
    canUseFeature: subscriptionHook.canUseFeature,

    // Funções de busca
    getTasksForPatient: tasksHook.getTasksByPatient,
    getAppointmentsForPatient: sessionsHook.getSessionsByPatient,

    // Loading states
    loading: patientsHook.loading || sessionsHook.loading || tasksHook.loading,
    error: patientsHook.error || sessionsHook.error || tasksHook.error,
  };
};
```

#### 1.2 Criar Script de Migração

```bash
# scripts/migrate-component.sh
#!/bin/bash
COMPONENT_PATH=$1

echo "Migrando $COMPONENT_PATH..."

# Backup do arquivo original
cp "$COMPONENT_PATH" "$COMPONENT_PATH.backup"

# Substituir import
sed -i "s/from '..\\/hooks\\/useData.minimal'/from '..\\/hooks\\/useDataMigration'/g" "$COMPONENT_PATH"
sed -i "s/from '..\\/..\\/hooks\\/useData.minimal'/from '..\\/..\\/hooks\\/useDataMigration'/g" "$COMPONENT_PATH"

# Substituir hook call
sed -i "s/useData()/useDataMigration()/g" "$COMPONENT_PATH"

echo "Migração de $COMPONENT_PATH concluída!"
```

### **Fase 2: Migração Gradual (Semanas 1-4)**

#### **Semana 1: Componentes Críticos**

**Dia 1: PatientModal.tsx**

```typescript
// ANTES
import { useData } from '../hooks/useData.minimal';
const { patients, savePatient, deletePatient } = useData();

// DEPOIS
import { usePatients } from '../hooks/usePatients';
import { useSubscription } from '../hooks/useSubscription';

const { patients, addPatient, updatePatient, removePatient, loading, error } =
  usePatients();

const { canUseFeature } = useSubscription();

// Verificar limites antes de adicionar
const handleSavePatient = async (patientData) => {
  if (!canUseFeature('patients')) {
    showUpgradeModal();
    return;
  }

  await addPatient(patientData);
};
```

**Dia 2: Dashboard.tsx**

```typescript
// ANTES
const { patients, tasks, appointments } = useData();

// DEPOIS
const { patients } = usePatients();
const { tasks } = useTasks();
const { sessions: appointments } = useSessions();
const { subscription, getUsageStats } = useSubscription();

// Adicionar métricas freemium
const usageStats = getUsageStats();
```

**Dia 3: Header.tsx**

```typescript
// ANTES
const { currentUser, logout } = useData();

// DEPOIS
const { user: currentUser, logout } = useAuth();
const { subscription } = useSubscription();

// Mostrar status da assinatura no header
```

**Dias 4-5: PatientPage.tsx, UnifiedDashboard.tsx, AnalyticsDashboard.tsx**

#### **Semana 2: Componentes Importantes**

- CalendarPage.tsx → useSessions
- KanbanBoard.tsx → useTasks
- ReportsPage.tsx → usePatients + useSessions
- BillingPage.tsx → useSubscription
- FinancialPage.tsx → useSubscription + useSessions
- StaffPage.tsx → useAuth

#### **Semana 3: Componentes Moderados**

- ExercisePage.tsx → usePatients + useSessions
- ChatPage.tsx → useAuth
- NotebookPage.tsx → useAuth
- SubscriptionManager.tsx → useSubscription
- AIAssistant.tsx → useSubscription (limites AI)
- PatientPortal.tsx → usePatients + useSessions

#### **Semana 4: Componentes Finais**

- Todos os modais de exercícios
- Componentes de chat específicos
- Componentes administrativos
- Componentes QR

### **Fase 3: Otimização (Semana 5)**

#### 3.1 Remover useData Antigo

```bash
# Verificar se ainda há referências
grep -r "useData.minimal" components/
grep -r "useData()" components/

# Se não houver, remover arquivos
rm hooks/useData.tsx
rm hooks/useData.minimal.tsx
```

#### 3.2 Otimizar Imports

```typescript
// Criar barrel export
// src/hooks/index.ts
export { usePatients } from './usePatients';
export { useSessions } from './useSessions';
export { useTasks } from './useTasks';
export { useSubscription } from './useSubscription';
export { useAuth } from './useAuth';

// Nos componentes
import { usePatients, useSessions } from '../hooks';
```

#### 3.3 Adicionar React Query (Opcional)

```typescript
// Para cache avançado
import { useQuery } from '@tanstack/react-query';

const { data: patients } = useQuery({
  queryKey: ['patients', user?.tenantId],
  queryFn: () => loadPatients(),
  staleTime: 5 * 60 * 1000, // 5 minutos
});
```

---

## 🧪 Estratégia de Testes

### **Testes Durante Migração**

```bash
# Após cada componente migrado
npm run test:jest -- --testPathPattern=ComponentName
npm run build:check
npm run lint
```

### **Testes de Regressão**

```typescript
// tests/migration.test.tsx
describe('Migração useData', () => {
  test('PatientModal mantém funcionalidade', () => {
    // Testar CRUD de pacientes
  });

  test('Dashboard carrega dados corretamente', () => {
    // Testar carregamento de métricas
  });

  test('Sistema freemium funciona', () => {
    // Testar limites e enforcement
  });
});
```

### **Checklist de Validação**

- [ ] Componente carrega sem erros
- [ ] Dados são exibidos corretamente
- [ ] CRUD funciona (quando aplicável)
- [ ] Limites freemium são respeitados
- [ ] Multi-tenancy funciona
- [ ] Performance não degradou
- [ ] Testes passam

---

## 📊 Métricas de Sucesso

### **Técnicas**

- **Bundle Size**: Redução de 20-30%
- **Performance**: Melhoria de 15-25%
- **Memory Usage**: Redução de 10-20%
- **Test Coverage**: Manter > 90%

### **Funcionais**

- **Zero Breaking Changes**: Funcionalidade mantida
- **Freemium Enforcement**: 100% dos limites respeitados
- **Multi-tenancy**: Isolamento perfeito
- **Error Rate**: < 0.1%

---

## 🚨 Riscos e Mitigações

### **Alto Risco**

1. **Quebrar funcionalidade existente**
   - _Mitigação_: Migração gradual + testes
   - _Rollback_: Manter backups de cada arquivo

2. **Perda de dados durante migração**
   - _Mitigação_: Não alterar localStorage durante migração
   - _Backup_: Export completo antes de começar

3. **Performance degradation**
   - _Mitigação_: Monitorar bundle size e render times
   - _Otimização_: React.memo e useMemo quando necessário

### **Médio Risco**

1. **Inconsistência entre hooks**
   - _Mitigação_: Testes de integração

2. **Complexidade de debugging**
   - _Mitigação_: Logs detalhados durante migração

---

## 🛠️ Ferramentas e Scripts

### **Script de Análise**

```bash
# analyze-migration.sh
#!/bin/bash

echo "=== Análise de Migração useData ==="
echo

echo "Componentes ainda usando useData:"
grep -r "useData.minimal" components/ | wc -l

echo "Componentes usando hooks especializados:"
grep -r "usePatients\|useSessions\|useTasks" components/ | wc -l

echo "Bundle size atual:"
npm run build:check && du -sh dist/

echo "Cobertura de testes:"
npm run test:jest:coverage | grep "All files"
```

### **Script de Validação**

```bash
# validate-migration.sh
#!/bin/bash

echo "Validando migração..."

# Build sem erros
if npm run build:check; then
  echo "✅ Build OK"
else
  echo "❌ Build FAILED"
  exit 1
fi

# Testes passando
if npm run test:jest; then
  echo "✅ Testes OK"
else
  echo "❌ Testes FAILED"
  exit 1
fi

# Lint OK
if npm run lint; then
  echo "✅ Lint OK"
else
  echo "❌ Lint FAILED"
  exit 1
fi

echo "🎉 Migração validada com sucesso!"
```

---

## 📅 Cronograma Detalhado

### **Semana 1: Críticos (6 componentes)**

- **Segunda**: PatientModal.tsx + testes
- **Terça**: Dashboard.tsx + testes
- **Quarta**: Header.tsx + PatientPage.tsx
- **Quinta**: UnifiedDashboard.tsx + AnalyticsDashboard.tsx
- **Sexta**: Testes de regressão + validação

### **Semana 2: Importantes (6 componentes)**

- **Segunda**: CalendarPage.tsx + KanbanBoard.tsx
- **Terça**: ReportsPage.tsx + BillingPage.tsx
- **Quarta**: FinancialPage.tsx + StaffPage.tsx
- **Quinta**: Testes + otimizações
- **Sexta**: Validação + documentação

### **Semana 3: Moderados (6 componentes)**

- **Segunda**: ExercisePage.tsx + ChatPage.tsx
- **Terça**: NotebookPage.tsx + SubscriptionManager.tsx
- **Quarta**: AIAssistant.tsx + PatientPortal.tsx
- **Quinta**: Testes + otimizações
- **Sexta**: Validação

### **Semana 4: Finais (29 componentes)**

- **Segunda-Quarta**: Modais e componentes específicos
- **Quinta**: Limpeza + otimização
- **Sexta**: Validação final + documentação

### **Semana 5: Finalização**

- **Segunda**: Remover useData antigo
- **Terça**: Otimizar imports + barrel exports
- **Quarta**: Testes finais + performance
- **Quinta**: Documentação + deploy
- **Sexta**: Monitoramento + ajustes

---

## 🎯 Próxima Ação Recomendada

**COMEÇAR HOJE**:

1. Criar `useDataMigration.ts`
2. Migrar `PatientModal.tsx` (mais crítico)
3. Executar testes: `npm run test:jest:coverage`
4. Validar funcionamento

**Esta migração é fundamental para a estabilidade e escalabilidade do sistema!**
