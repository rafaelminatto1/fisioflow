# Integração WhatsApp Business - FisioFlow

## Visão Geral

A integração com WhatsApp Business do FisioFlow oferece comunicação automatizada e interativa com pacientes, incluindo lembretes de consulta, envio de exercícios, suporte via chatbot e análises detalhadas de engajamento.

## Funcionalidades Principais

### 🤖 Mensagens Automatizadas
- **Lembretes de Consulta**: Envio automático 24h e 2h antes das consultas
- **Confirmação de Agendamento**: Notificação imediata após agendamento
- **Exercícios Prescritos**: Envio de exercícios com vídeos e links
- **Mensagens de Boas-vindas**: Recepção automática de novos pacientes
- **Resultados de Exames**: Notificação sobre disponibilidade de resultados

### 💬 Comunicação Bidirecional
- **Recebimento de Mensagens**: Captura de dúvidas e solicitações dos pacientes
- **Confirmação de Presença**: Pacientes podem confirmar consultas via WhatsApp
- **Reagendamento**: Solicitações de reagendamento processadas automaticamente
- **Feedback sobre Exercícios**: Coleta de feedback sobre progresso
- **Suporte Técnico**: Canal direto para suporte e esclarecimentos

### 🤖 Chatbot Inteligente
- **Respostas Automáticas**: Sistema de FAQ automatizado
- **Triagem de Mensagens**: Classificação automática por prioridade
- **Encaminhamento Inteligente**: Transferência para profissionais apropriados
- **Horário de Funcionamento**: Respostas automáticas fora do horário
- **Escalação para Humanos**: Transferência para atendimento humano quando necessário

### 📊 Analytics e Relatórios
- **Taxa de Entrega**: Monitoramento de mensagens entregues
- **Taxa de Leitura**: Acompanhamento de mensagens lidas
- **Taxa de Resposta**: Medição do engajamento dos pacientes
- **Resolução do Bot**: Eficiência das respostas automatizadas
- **Perguntas Frequentes**: Identificação de dúvidas comuns

## Configuração Inicial

### 1. Credenciais WhatsApp Business API

Para configurar a integração, você precisará das seguintes credenciais:

- **Access Token**: Token de acesso da API do WhatsApp Business
- **Phone Number ID**: ID do número de telefone registrado
- **Business Account ID**: ID da conta business do WhatsApp
- **Webhook Token**: Token para verificação do webhook

### 2. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

```env
VITE_WHATSAPP_ACCESS_TOKEN=seu_access_token_aqui
VITE_WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=seu_business_account_id
VITE_WHATSAPP_WEBHOOK_TOKEN=seu_webhook_token
VITE_WHATSAPP_API_VERSION=19.0
```

### 3. Configuração do Webhook

1. Configure sua URL de webhook no painel do Facebook Developers
2. Use o token de verificação configurado
3. Certifique-se que a URL está acessível via HTTPS
4. Teste a conexão através do painel de configurações

## Uso da API

### Importação dos Serviços

```typescript
import { useWhatsApp } from '../services/whatsappService';

const {
  sendTemplate,
  sendInteractiveMessage,
  sendMedia,
  scheduleAutomatedReminders,
  sendExerciseContent,
  getAnalytics,
  processWebhook
} = useWhatsApp();
```

### Envio de Templates

```typescript
// Enviar template de boas-vindas
await sendTemplate(
  patientPhone,
  'welcome_patient',
  [patientName],
  tenantId
);

// Enviar lembrete de consulta
await sendTemplate(
  patientPhone,
  'appointment_reminder_24h',
  [patientName, appointmentTime, therapistName],
  tenantId
);
```

### Mensagens Interativas

```typescript
// Criar mensagem com botões
const interactive = {
  type: 'button',
  body: 'Confirme sua presença na consulta:',
  action: {
    buttons: [
      { id: 'confirm', title: 'Confirmar' },
      { id: 'reschedule', title: 'Reagendar' },
      { id: 'cancel', title: 'Cancelar' }
    ]
  }
};

await sendInteractiveMessage(patientPhone, interactive, tenantId);
```

### Envio de Mídia

```typescript
// Enviar vídeo de exercício
await sendMedia(
  patientPhone,
  'https://example.com/exercise-video.mp4',
  'video',
  'Exercício de fortalecimento do joelho',
  tenantId
);

// Enviar documento PDF
await sendMedia(
  patientPhone,
  'https://example.com/exercise-plan.pdf',
  'document',
  'Plano de exercícios personalizado',
  tenantId
);
```

### Agendamento Automático

```typescript
// Agendar lembretes automáticos para consulta
const reminders = await scheduleAutomatedReminders(
  patient,
  appointment,
  tenantId
);

// Enviar exercícios com conteúdo multimídia
await sendExerciseContent(patient, exercises, tenantId);
```

## Templates Disponíveis

### 1. welcome_patient
- **Uso**: Mensagem de boas-vindas para novos pacientes
- **Parâmetros**: [nome_paciente]
- **Categoria**: welcome

### 2. appointment_reminder_24h
- **Uso**: Lembrete de consulta 24 horas antes
- **Parâmetros**: [nome_paciente, horario_consulta, nome_fisioterapeuta]
- **Categoria**: appointment_reminder

### 3. appointment_reminder_2h
- **Uso**: Lembrete de consulta 2 horas antes
- **Parâmetros**: [nome_paciente, horario_consulta, nome_fisioterapeuta]
- **Categoria**: appointment_reminder

### 4. exercise_notification
- **Uso**: Notificação de exercícios disponíveis
- **Parâmetros**: [nome_paciente, link_exercicios]
- **Categoria**: exercise

## Configuração do Chatbot

### Regras Padrão

O chatbot vem pré-configurado com as seguintes regras:

1. **Saudações** (Prioridade 1)
   - Palavras-chave: oi, olá, bom dia, boa tarde, boa noite
   - Resposta: Saudação e oferta de ajuda

2. **Horário de Funcionamento** (Prioridade 2)
   - Palavras-chave: horário, funcionamento, atendimento
   - Resposta: Informações sobre horários de funcionamento

3. **Agendamento** (Prioridade 3)
   - Palavras-chave: agendar, marcar, consulta
   - Resposta: Opções de agendamento disponíveis

4. **Exercícios** (Prioridade 4)
   - Palavras-chave: exercício, vídeo, treino
   - Resposta: Informações sobre portal de exercícios

5. **Reagendamento** (Prioridade 5)
   - Palavras-chave: cancelar, remarcar, reagendar
   - Resposta: Transferência para recepção

6. **Dor/Urgência** (Prioridade 10)
   - Palavras-chave: dor, doendo, lesão
   - Resposta: Transferência para fisioterapeuta

### Personalização de Regras

```typescript
// Adicionar nova regra de chatbot
const newRule: ChatbotRule = {
  id: 'custom_rule',
  keywords: ['plano', 'convênio', 'pagamento'],
  response: 'Para informações sobre planos e pagamentos, entre em contato com nossa recepção.',
  responseType: 'text',
  priority: 6,
  isActive: true
};

updateChatbotRules([...existingRules, newRule]);
```

## Processamento de Webhooks

### Configuração do Endpoint

```typescript
// Endpoint para receber webhooks (backend)
app.post('/webhook/whatsapp', (req, res) => {
  const webhookData = req.body;
  
  // Processar mensagens recebidas
  processWebhook(webhookData);
  
  res.status(200).send('OK');
});

// Verificação do webhook
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const result = verifyWebhook(mode, token, challenge);
  
  if (result) {
    res.status(200).send(result);
  } else {
    res.status(403).send('Forbidden');
  }
});
```

## Analytics e Monitoramento

### Métricas Disponíveis

```typescript
// Obter analytics do dia atual
const analytics = getAnalytics(tenantId, 'day');

console.log('Mensagens enviadas:', analytics.messagesSent);
console.log('Taxa de entrega:', analytics.messagesDelivered / analytics.messagesSent * 100);
console.log('Taxa de leitura:', analytics.messagesRead / analytics.messagesDelivered * 100);
console.log('Taxa de resolução do bot:', analytics.botResolutionRate);
```

### Fila de Mensagens

```typescript
// Verificar status da fila de mensagens
const messageQueue = getMessageQueue(tenantId);

messageQueue.forEach(message => {
  console.log(`Mensagem ${message.id}: ${message.status}`);
  console.log(`Agendada para: ${message.scheduledFor}`);
});
```

## Componentes React

### WhatsAppIntegration

Componente principal para gerenciar mensagens WhatsApp:

```tsx
import { WhatsAppIntegration } from '../components/WhatsAppIntegration';

<WhatsAppIntegration
  patient={selectedPatient}
  appointment={selectedAppointment}
  exercises={patientExercises}
  onClose={() => setShowWhatsApp(false)}
/>
```

### WhatsAppSettings

Painel de configurações completo:

```tsx
import { WhatsAppSettings } from '../components/WhatsAppSettings';

<WhatsAppSettings
  onClose={() => setShowSettings(false)}
/>
```

## Troubleshooting

### Problemas Comuns

1. **Mensagens não sendo entregues**
   - Verificar se o access token está válido
   - Confirmar se o número está registrado na API
   - Validar formato do número de telefone

2. **Webhook não recebe mensagens**
   - Verificar se a URL está acessível via HTTPS
   - Confirmar se o token de verificação está correto
   - Testar conectividade do endpoint

3. **Chatbot não responde**
   - Verificar se as regras estão ativas
   - Confirmar se as palavras-chave estão corretas
   - Validar prioridades das regras

### Logs e Debug

```typescript
// Habilitar logs detalhados
localStorage.setItem('whatsapp_debug', 'true');

// Verificar mensagens na fila
console.log('Fila de mensagens:', getMessageQueue(tenantId));

// Verificar mensagens recebidas
console.log('Mensagens recebidas:', getIncomingMessages(tenantId));
```

## Limitações e Considerações

### Limites da API
- Templates precisam ser aprovados pelo WhatsApp
- Mensagens de template têm janela de 24h para interação
- Limite de mensagens por minuto varia por tier

### Boas Práticas
- Sempre validar números de telefone antes do envio
- Implementar retry logic para mensagens falhadas
- Monitorar taxa de spam e feedback negativo
- Respeitar horários de descanso dos pacientes

### Segurança
- Nunca expor tokens de acesso no frontend
- Validar todas as mensagens recebidas
- Implementar rate limiting nos endpoints
- Criptografar dados sensíveis em trânsito

## Suporte e Contribuição

Para dúvidas, problemas ou sugestões de melhoria da integração WhatsApp:

1. Verifique a documentação oficial do WhatsApp Business API
2. Consulte os logs de erro no console do navegador
3. Teste a conectividade usando as ferramentas de debug
4. Entre em contato com a equipe de desenvolvimento

---

*Documentação gerada automaticamente - FisioFlow WhatsApp Integration v1.0*