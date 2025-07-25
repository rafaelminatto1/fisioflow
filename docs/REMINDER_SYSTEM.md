# Sistema de Lembretes e Notificações Inteligentes

## Visão Geral

O sistema de lembretes e notificações foi projetado para aumentar a adesão ao tratamento através de lembretes personalizados e inteligentes enviados através de múltiplos canais.

## Funcionalidades Implementadas

### 🔔 Tipos de Lembretes

- **Exercícios Diários**: Lembretes personalizáveis para exercícios de fisioterapia
- **Consultas Agendadas**: Lembretes 24h e 2h antes das consultas
- **Medicamentos**: Lembretes para medicações (se aplicável)
- **Reavaliações Periódicas**: Lembretes para agendar acompanhamentos
- **Pagamentos**: Lembretes de valores pendentes
- **Progresso do Tratamento**: Atualizações sobre evolução
- **Personalizados**: Lembretes customizados pelo terapeuta

### 📡 Canais de Notificação

- **Push Notifications**: Notificações no app/web
- **Email**: Notificações por email automático
- **SMS**: Integração com gateway SMS (simulado)
- **WhatsApp**: API Business do WhatsApp (simulado)
- **In-App**: Notificações dentro do aplicativo

### ⚙️ Personalização Avançada

- **Horários Preferidos**: Configuração individual por paciente
- **Frequência Personalizada**: Controle de frequência por tipo de lembrete
- **Mensagens Personalizadas**: Templates com variáveis dinâmicas
- **Horário Silencioso**: Período sem notificações
- **Snooze Inteligente**: Opções de adiamento configuráveis

### 🤖 Configurações Inteligentes

- **Agendamento Adaptativo**: Ajusta horários baseado no comportamento
- **Lembretes Baseados em Localização**: Detecta contexto geográfico
- **Consolidação de Lembretes**: Agrupa múltiplas notificações
- **Insights de Engajamento**: Análise de efetividade

## Arquitetura do Sistema

### Modelos de Dados

```typescript
// Configurações de lembrete por paciente
interface ReminderSettings {
  id: string;
  patientId: string;
  globalSettings: {
    enabled: boolean;
    preferredChannels: NotificationChannel[];
    quietHours: { enabled: boolean; start: string; end: string };
    timezone: string;
    language: 'pt' | 'en' | 'es';
  };
  channelSettings: Record<NotificationChannel, ChannelConfig>;
  typeSettings: Record<ReminderType, TypeConfig>;
  smartSettings: SmartConfig;
}

// Lembrete agendado
interface ScheduledReminder {
  id: string;
  ruleId: string;
  patientId: string;
  scheduledFor: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  metadata: DeliveryMetadata;
}
```

### Serviços Principais

#### NotificationService

- Gerencia o envio de notificações
- Processa lembretes agendados
- Integra com APIs externas
- Controla permissões e configurações

#### ReminderSystemProvider

- Context Provider para hooks do sistema
- Integração com dados de pacientes
- Agendamento automático de lembretes
- Analytics e insights

## Como Usar

### 1. Configuração Inicial

```typescript
// Em App.tsx ou main provider
import { ReminderSystemProvider } from './hooks/useReminderSystem';

function App() {
  return (
    <ReminderSystemProvider>
      {/* Sua aplicação */}
    </ReminderSystemProvider>
  );
}
```

### 2. Inicializar Configurações do Paciente

```typescript
import { useReminderSystem } from './hooks/useReminderSystem';

function PatientOnboarding({ patient }: { patient: Patient }) {
  const { initializePatientSettings } = useReminderSystem();

  useEffect(() => {
    // Inicializa configurações padrão para novo paciente
    initializePatientSettings(patient);
  }, [patient]);
}
```

### 3. Agendar Lembretes Automaticamente

```typescript
function AppointmentCreation({ appointment, patient, therapist }) {
  const { scheduleAppointmentReminders } = useReminderSystem();

  const handleCreateAppointment = async () => {
    // Criar appointment no sistema
    await createAppointment(appointment);

    // Agendar lembretes automaticamente
    scheduleAppointmentReminders(appointment, patient, therapist);
  };
}
```

### 4. Interface de Configuração para Pacientes

```typescript
import PatientNotificationSettings from './components/PatientNotificationSettings';

function PatientDashboard({ patient }) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div>
      <button onClick={() => setShowSettings(true)}>
        Configurar Notificações
      </button>

      <PatientNotificationSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        patient={patient}
      />
    </div>
  );
}
```

### 5. Analytics e Monitoramento

```typescript
import { useReminderAnalytics, usePatientReminders } from './hooks/useReminderSystem';

function ReminderDashboard({ patientId }) {
  const { analytics, insights, pendingReminders } = usePatientReminders(patientId);

  return (
    <div>
      <h3>Taxa de Entrega: {analytics.metrics.deliveryRate.toFixed(1)}%</h3>
      <h3>Taxa de Leitura: {analytics.metrics.readRate.toFixed(1)}%</h3>

      <div>
        <h4>Lembretes Pendentes: {pendingReminders.length}</h4>
        {pendingReminders.map(reminder => (
          <div key={reminder.id}>
            {reminder.title} - {new Date(reminder.scheduledFor).toLocaleString()}
          </div>
        ))}
      </div>

      <div>
        <h4>Insights de Engajamento:</h4>
        {insights.map(insight => (
          <div key={insight.id}>
            <strong>{insight.insight}</strong>
            <p>{insight.recommendation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6. Integração com Prescrições de Exercícios

```typescript
function ExercisePrescription({ patient, prescriptions }) {
  const { scheduleDailyExerciseReminders } = useReminderSystem();

  const handleSavePrescriptions = async () => {
    // Salvar prescrições
    await savePrescriptions(prescriptions);

    // Agendar lembretes diários de exercícios
    scheduleDailyExerciseReminders(patient, prescriptions);
  };
}
```

## Personalização de Mensagens

O sistema suporta templates com variáveis dinâmicas:

```typescript
const messageTemplates = {
  exercise_daily:
    'Olá {patientName}! Não se esqueça de fazer seus {exerciseCount} exercícios de fisioterapia hoje.',
  appointment_24h:
    'Olá {patientName}! Você tem uma consulta marcada para amanhã às {appointmentTime} com {therapistName}.',
  payment_reminder:
    'Olá {patientName}! Você tem um pagamento pendente de R$ {amount}.',
};
```

## Integração com APIs Externas

### Email (SendGrid/AWS SES)

```typescript
private async sendEmailReminder(reminder: ScheduledReminder, settings: ReminderSettings) {
  // Implementar integração com serviço de email
  const response = await emailService.send({
    to: settings.channelSettings.email.emailAddress,
    subject: reminder.title,
    html: reminder.message
  });

  return { success: response.success, messageId: response.id };
}
```

### SMS (Twilio/AWS SNS)

```typescript
private async sendSMSReminder(reminder: ScheduledReminder, settings: ReminderSettings) {
  // Implementar integração com gateway SMS
  const response = await smsService.send({
    to: settings.channelSettings.sms.phoneNumber,
    message: reminder.message
  });

  return { success: response.success, messageId: response.sid };
}
```

### WhatsApp Business API

```typescript
private async sendWhatsAppReminder(reminder: ScheduledReminder, settings: ReminderSettings) {
  // Implementar integração com WhatsApp Business
  const response = await whatsappService.sendMessage({
    to: settings.channelSettings.whatsapp.phoneNumber,
    message: {
      type: 'text',
      text: { body: reminder.message }
    }
  });

  return { success: response.success, messageId: response.messages[0].id };
}
```

## Monitoramento e Analytics

### Métricas Disponíveis

- **Taxa de Entrega**: Porcentagem de lembretes enviados com sucesso
- **Taxa de Leitura**: Porcentagem de lembretes lidos pelos pacientes
- **Taxa de Resposta**: Porcentagem de pacientes que respondem aos lembretes
- **Performance por Canal**: Efetividade de cada canal de notificação
- **Horários Ótimos**: Análise dos melhores horários para cada paciente
- **Engajamento do Paciente**: Classificação de engajamento por paciente

### Insights Automáticos

O sistema gera insights automáticos baseados nos dados:

- **Otimização de Horário**: Sugere melhores horários baseado no histórico
- **Preferência de Canal**: Identifica canais mais efetivos por paciente
- **Ajuste de Frequência**: Recomenda alterações na frequência de lembretes
- **Personalização de Conteúdo**: Sugere melhorias nas mensagens

## Configurações de Desenvolvimento

### Simulação para Desenvolvimento

```typescript
// Em desenvolvimento, o sistema simula APIs externas
if (process.env.NODE_ENV === 'development') {
  notificationService.simulateIncomingNotifications();
}
```

### Logs e Debugging

```typescript
// Todos os envios são logados para análise
const deliveryLog = {
  reminderId: reminder.id,
  patientId: reminder.patientId,
  channel,
  status: 'sent',
  timestamp: new Date().toISOString(),
  messageId: result.messageId,
};
```

## Próximos Passos

1. **Integração com APIs Reais**: Conectar com SendGrid, Twilio, WhatsApp Business
2. **Machine Learning**: Implementar algoritmos para otimização automática
3. **Geolocalização**: Lembretes baseados em localização do paciente
4. **A/B Testing**: Testar diferentes templates e horários
5. **Webhooks**: Receber confirmações de entrega das APIs externas
6. **Dashboard Analytics**: Interface visual para análise de métricas
7. **Exportação de Dados**: Relatórios em PDF/Excel para clínicas

## Estrutura de Arquivos

```
src/
├── types.ts                              # Definições de tipos
├── services/
│   └── notificationService.ts            # Serviço principal de notificações
├── hooks/
│   └── useReminderSystem.tsx             # Context e hooks do sistema
├── components/
│   └── PatientNotificationSettings.tsx   # UI de configurações
└── docs/
    └── REMINDER_SYSTEM.md                # Esta documentação
```

Este sistema fornece uma base sólida para notificações inteligentes e pode ser estendido conforme as necessidades específicas da clínica.
