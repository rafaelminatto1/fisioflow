# Sistema de Abas de Detalhes do Paciente

Este diretório contém os componentes das abas de detalhes do paciente para o sistema FisioFlow. Cada aba representa uma seção específica das informações e funcionalidades relacionadas ao paciente.

## 📋 Abas Disponíveis

### 1. PatientOverviewTab
**Visão Geral do Paciente**
- Cartões de resumo (próxima sessão, tarefas atrasadas, última avaliação)
- Campos editáveis básicos (nome, email, telefone)
- Histórico clínico resumido
- Ações rápidas (editar, excluir)

### 2. PatientDiaryTab
**Diário do Paciente**
- Gráfico de evolução de sintomas (dor, energia, sono)
- Lista de registros diários com humor e níveis
- Visualização de tendências ao longo do tempo
- Notas e observações do paciente

### 3. PatientFlowsheetTab
**Evolução Clínica**
- Gráficos de evolução da dor e energia
- Cartão de aderência ao tratamento
- Resumo das últimas avaliações
- Metas de tratamento e progresso

### 4. PatientExercisesTab
**Exercícios Prescritos**
- Lista de exercícios ativos, concluídos e pausados
- Histórico de execução com notas
- Controle de aderência e frequência
- Funcionalidades para prescrever novos exercícios
- Geração de fichas de exercícios

### 5. PatientMedicationsTab
**Medicações**
- Medicações ativas, concluídas e suspensas
- Histórico de administração
- Verificação de interações medicamentosas
- Alertas de efeitos colaterais
- Gestão de prescrições

### 6. PatientMessagesTab
**Comunicação**
- Conversa unificada (WhatsApp, SMS, Email)
- Templates de mensagens pré-definidos
- Histórico de comunicação
- Estatísticas de engajamento
- Ações rápidas (ligar, videochamada)

### 7. PatientSettingsTab
**Configurações**
- Preferências de notificação
- Configurações de privacidade
- Métodos de pagamento
- Contato de emergência
- Gestão da conta (exportar/importar dados)

## 🏗️ Arquitetura

### Estrutura de Arquivos
```
patient-detail-tabs/
├── index.ts                    # Exportações centralizadas
├── types.ts                    # Interfaces e tipos TypeScript
├── PatientOverviewTab.tsx      # Aba de visão geral
├── PatientDiaryTab.tsx         # Aba de diário
├── PatientFlowsheetTab.tsx     # Aba de evolução clínica
├── PatientExercisesTab.tsx     # Aba de exercícios
├── PatientMedicationsTab.tsx   # Aba de medicações
├── PatientMessagesTab.tsx      # Aba de mensagens
├── PatientSettingsTab.tsx      # Aba de configurações
└── README.md                   # Esta documentação
```

### Padrões de Design

#### Props Interface
Todas as abas seguem a interface base:
```typescript
interface BasePatientTabProps {
  patient: Patient;
  onUpdate: (updates: Partial<Patient>) => void;
}
```

#### Componentes Reutilizáveis
- **Cards**: Para exibir informações resumidas
- **Tabs**: Para organizar conteúdo em seções
- **Badges**: Para status e categorias
- **Buttons**: Para ações do usuário
- **Forms**: Para entrada de dados

#### Estado e Dados
- Uso de `useState` para estado local
- Dados mockados para desenvolvimento
- Preparado para integração com APIs reais

## 🎨 Sistema de Design

### Cores e Status
- **Verde**: Ativo, concluído, positivo
- **Azul**: Informativo, padrão
- **Amarelo**: Atenção, moderado
- **Vermelho**: Erro, crítico, negativo
- **Cinza**: Neutro, desabilitado

### Iconografia
- Lucide React para ícones consistentes
- Emojis para categorização visual
- Ícones contextuais para ações

### Responsividade
- Design mobile-first
- Layouts adaptativos
- Componentes flexíveis

## 🔧 Uso

### Importação
```typescript
import {
  PatientOverviewTab,
  PatientDiaryTab,
  PatientFlowsheetTab,
  PatientExercisesTab,
  PatientMedicationsTab,
  PatientMessagesTab,
  PatientSettingsTab,
  PATIENT_TAB_KEYS,
  PATIENT_TAB_LABELS
} from '@/components/patient-detail-tabs';
```

### Exemplo de Uso
```typescript
const PatientDetailModal = ({ patient, onUpdate }) => {
  const [activeTab, setActiveTab] = useState(PATIENT_TAB_KEYS.OVERVIEW);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        {Object.entries(PATIENT_TAB_LABELS).map(([key, label]) => (
          <TabsTrigger key={key} value={key}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={PATIENT_TAB_KEYS.OVERVIEW}>
        <PatientOverviewTab patient={patient} onUpdate={onUpdate} />
      </TabsContent>
      
      {/* Outras abas... */}
    </Tabs>
  );
};
```

## 🚀 Funcionalidades Premium

### Sistema Freemium
- **Gratuito**: Abas básicas (Overview, Diary)
- **Premium**: Todas as abas com funcionalidades avançadas
- **Enterprise**: Integrações e customizações

### Escalabilidade
- Componentes modulares
- Lazy loading preparado
- Cache de dados otimizado
- Integração com APIs escaláveis

### Integridade de Dados
- Validação de entrada
- Sincronização em tempo real
- Backup automático
- Auditoria de alterações

## 🔒 Segurança e Privacidade

- Dados sensíveis criptografados
- Controle de acesso baseado em roles
- Logs de auditoria
- Conformidade com LGPD

## 📱 Compatibilidade

- **Navegadores**: Chrome, Firefox, Safari, Edge
- **Dispositivos**: Desktop, Tablet, Mobile
- **Sistemas**: Windows, macOS, Linux, iOS, Android

## 🛠️ Desenvolvimento

### Dependências
- React 18+
- TypeScript
- Tailwind CSS
- Lucide React
- Radix UI

### Scripts Úteis
```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Testes
npm run test

# Lint
npm run lint
```

## 📈 Roadmap

### Próximas Funcionalidades
- [ ] Integração com IA para insights
- [ ] Notificações push
- [ ] Relatórios avançados
- [ ] Integração com wearables
- [ ] Telemedicina integrada

### Melhorias Técnicas
- [ ] Otimização de performance
- [ ] Testes automatizados
- [ ] Documentação interativa
- [ ] Storybook components

## 🤝 Contribuição

Para contribuir com o desenvolvimento:

1. Siga os padrões de código estabelecidos
2. Mantenha a consistência visual
3. Documente novas funcionalidades
4. Teste em diferentes dispositivos
5. Considere acessibilidade

## 📞 Suporte

Para dúvidas ou suporte:
- Documentação técnica interna
- Canal de desenvolvimento
- Issues no repositório

---

**FisioFlow** - Sistema de Gestão para Clínicas de Fisioterapia
*Desenvolvido com foco em escalabilidade, usabilidade e integridade de dados*