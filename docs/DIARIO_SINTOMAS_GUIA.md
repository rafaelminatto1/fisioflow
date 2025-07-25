# 📊 Guia Completo: Sistema de Diário de Sintomas e Evolução

## 🎯 **VISÃO GERAL**

O FisioFlow possui um **sistema avançado de Diário de Sintomas** que permite o acompanhamento detalhado da evolução dos pacientes com análises automáticas baseadas em IA.

## ✅ **FUNCIONALIDADES IMPLEMENTADAS**

### 🔴 **REGISTRO DIÁRIO COMPLETO**

- ✅ **Escala de dor (0-10)** com localização anatômica precisa
- ✅ **Nível de energia/fadiga** (1-5) com emojis visuais
- ✅ **Qualidade do sono** (1-5) + horas dormidas
- ✅ **Humor/bem-estar** (1-5) com indicadores visuais
- ✅ **Medicamentos tomados** com dosagem, horário e efetividade
- ✅ **Exercícios realizados** com duração, intensidade e dificuldade

### 🎯 **INTERFACE DE REGISTRO AVANÇADA**

- ✅ **Formulário rápido** (⚡ menos de 2 minutos)
- ✅ **Modo completo** com abas detalhadas
- ✅ **Escalas visuais** com emojis e barras interativas
- ✅ **Mapa corporal SVG** interativo para localizar dor
- ✅ **Seleção de qualidades da dor** (pontada, queimação, etc.)
- ✅ **Interface mobile-first** responsiva

### 📊 **VISUALIZAÇÃO DE DADOS**

- ✅ **Gráficos de linha** para tendências por métrica
- ✅ **Mapa de calor** para padrões por horário
- ✅ **Matriz de correlação** entre variáveis
- ✅ **Estatísticas resumo** dinâmicas
- ✅ **Comparação com períodos anteriores**
- ✅ **Filtros por período** (7d, 30d, 90d, customizado)

### 🤖 **INSIGHTS AUTOMÁTICOS**

- ✅ **Análise de tendências** com regressão linear
- ✅ **Identificação de padrões** automática
- ✅ **Correlações inteligentes** entre métricas
- ✅ **Alertas de deterioração** proativos
- ✅ **Recomendações personalizadas**

## 🚀 **COMO USAR**

### **1. Acesso para Pacientes**

```jsx
// No PatientPortal.tsx - já integrado
<SymptomDiaryIntegration patient={patientProfile} />
```

### **2. Acesso para Fisioterapeutas**

```jsx
// No PatientModal.tsx - aba "Diário de Sintomas" - já integrado
{
  activeTab === 'sintomas' && patientProfile && (
    <SymptomDiaryIntegration patient={patientProfile} />
  );
}
```

### **3. Integração em Qualquer Componente**

```jsx
import { SymptomDiaryIntegration } from './components/SymptomDiaryIntegration';

const MinhaTelaPersonalizada = ({ patient }) => {
  return (
    <div>
      <h1>Acompanhamento do Paciente</h1>
      <SymptomDiaryIntegration patient={patient} />
    </div>
  );
};
```

## 🏗️ **COMPONENTES PRINCIPAIS**

### **📋 Interface Principal**

- **`SymptomDiary.tsx`** - Modal principal com 5 abas
- **`SymptomDiaryEntry.tsx`** - Formulário de entrada (rápido/completo)
- **`SymptomDiaryIntegration.tsx`** - Componente de integração

### **🎨 Visualizações**

- **`SymptomDataVisualization.tsx`** - Gráficos interativos
- **`AnatomicalBodyMap.tsx`** - Mapa corporal SVG
- **`SymptomInsightsPanel.tsx`** - Painel de insights

### **📄 Relatórios**

- **`SymptomReports.tsx`** - Geração de relatórios
- **`symptomAnalysisService.ts`** - IA para análise

## 📊 **ABAS DO SISTEMA**

### **1. 📋 Visão Geral**

- Estatísticas rápidas (total de registros, médias)
- Registros recentes
- Dicas de uso
- Indicador de registro pendente do dia

### **2. 📝 Registros**

- Lista completa de entradas
- Ações de editar/excluir
- Botões para registro rápido e completo

### **3. 📊 Gráficos**

- Gráficos de linha por métrica
- Mapa de calor por horário
- Matriz de correlação
- Filtros de período

### **4. 🤖 Insights**

- Tendências identificadas
- Padrões detectados
- Alertas automáticos
- Recomendações personalizadas

### **5. 📄 Relatórios**

- Relatórios semanais/mensais
- Comparação de períodos
- Exportação PDF/Excel/CSV
- Análise detalhada

## 💾 **ESTRUTURA DE DADOS**

### **Entrada Principal**

```typescript
interface SymptomDiaryEntry {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string

  // Métricas principais
  overallPainLevel: number; // 0-10
  painLocations: PainLocation[];
  energyLevel: EnergyLevel; // 1-5
  sleepQuality: SleepQuality; // 1-5
  sleepHours?: number;
  moodLevel: MoodLevel; // 1-5
  stressLevel?: number; // 0-10

  // Atividades
  medicationsTaken: MedicationTaken[];
  exercisesCompleted: ExerciseCompleted[];

  // Observações
  symptoms: string[];
  notes?: string;
  progressPhotos?: string[];

  // Metadata
  isComplete: boolean;
  entryDuration?: number; // tempo gasto preenchendo
  tenantId: string;
}
```

### **Localização da Dor**

```typescript
interface PainLocation {
  id: string;
  region: BodyRegion; // 'head', 'neck', 'shoulder_left', etc.
  intensity: number; // 0-10
  quality: PainQuality[]; // ['stabbing', 'burning', etc.]
  coordinates?: { x: number; y: number }; // posição no mapa
  notes?: string;
}
```

## 🔧 **ANÁLISES AUTOMÁTICAS**

### **Tendências Detectadas**

- Regressão linear para identificar melhora/piora
- Significância estatística (R²)
- Projeções para próximos 7 dias

### **Padrões Identificados**

- Correlações entre dor, sono, energia e humor
- Padrões de fins de semana vs dias úteis
- Efetividade de medicamentos
- Impacto dos exercícios

### **Alertas Automáticos**

- Dor persistente alta (>7 por 3+ dias)
- Tendências preocupantes significativas
- Padrões de deterioração

## 🎨 **INTERFACE MOBILE-FIRST**

### **Modo Rápido** ⚡

- 4 métricas principais em cards visuais
- Registro em menos de 2 minutos
- Escalas com emojis para facilitar uso

### **Modo Completo** 📝

- 4 abas detalhadas:
  - 🔴 **Dor e Sintomas**: localização, intensidade, qualidade
  - 😊 **Bem-estar**: energia, sono, humor, estresse
  - 💊 **Atividades**: medicamentos e exercícios
  - 📝 **Observações**: notas livres e aderência

## 📈 **VISUALIZAÇÕES AVANÇADAS**

### **Gráficos Interativos** (sem dependências externas)

- Linhas de tendência com pontos clicáveis
- Tooltips informativos
- Escala automática e grade

### **Mapa de Calor**

- Padrões de dor por horário
- Código de cores intuitivo
- Legenda explicativa

### **Matriz de Correlação**

- Correlação de Pearson entre métricas
- Cores indicando força da correlação
- Interpretação automática

## 📋 **RELATÓRIOS PROFISSIONAIS**

### **Tipos de Relatório**

1. **Semanal** - Resumo dos últimos 7 dias
2. **Mensal** - Análise completa do mês
3. **Comparação** - Períodos diferentes
4. **Detalhado** - Relatório completo com insights

### **Formatos de Exportação**

- **PDF** - Relatório formatado para impressão
- **Excel** - Planilha com dados e gráficos
- **CSV** - Dados brutos para análise externa

## 🔗 **INTEGRAÇÃO COMPLETA**

### **Hooks Integrados**

```typescript
// Já disponível no useData.tsx
const {
  symptomDiaryEntries,
  addSymptomDiaryEntry,
  updateSymptomDiaryEntry,
  deleteSymptomDiaryEntry,
  getSymptomDiaryEntriesForPatient,
} = useData();
```

### **Persistência Automática**

- Dados salvos automaticamente no localStorage
- Multi-tenant com isolamento por tenantId
- Backup automático das entradas

### **Notificações**

- Confirmação de salvamento
- Alertas de erro
- Lembretes de registro pendente

## 🎯 **CASOS DE USO**

### **Para Pacientes**

1. **Registro Diário**: Anotar sintomas rapidamente
2. **Acompanhamento**: Ver evolução em gráficos
3. **Insights Pessoais**: Descobrir padrões próprios
4. **Compartilhamento**: Relatórios para fisioterapeuta

### **Para Fisioterapeutas**

1. **Monitoramento**: Acompanhar evolução dos pacientes
2. **Ajuste de Tratamento**: Baseado em dados objetivos
3. **Identificação Precoce**: Alertas de deterioração
4. **Relatórios Profissionais**: Documentação de evolução

### **Para Clínicas**

1. **Qualidade do Cuidado**: Melhores outcomes
2. **Eficiência**: Consultas mais direcionadas
3. **Evidências**: Dados para protocolos
4. **Satisfação**: Pacientes mais engajados

## 🚀 **PRÓXIMOS PASSOS**

1. **Teste o Sistema**: Acesse via PatientPortal ou PatientModal
2. **Crie Registros**: Use tanto modo rápido quanto completo
3. **Explore Visualizações**: Veja gráficos e correlações
4. **Analise Insights**: Descubra padrões automáticos
5. **Gere Relatórios**: Exporte em diferentes formatos

## 📞 **SUPORTE**

O sistema está **100% funcional** e integrado. Para dúvidas sobre implementação específica, consulte:

- **Código fonte**: `components/SymptomDiary*.tsx`
- **Tipos**: `types.ts` (linhas 1604-2001)
- **Serviços**: `services/symptomAnalysisService.ts`
- **Hooks**: `hooks/useData.tsx` (funções de sintomas)

---

**🎉 O FisioFlow agora possui o sistema de Diário de Sintomas mais avançado do mercado!**
