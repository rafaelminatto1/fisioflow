# 🧪 Cenários de Teste - FisioFlow Mobile

## 📱 Guia de Teste para Equipe Interna

Este documento orienta a equipe sobre como testar as funcionalidades do app FisioFlow durante a fase de testes internos via TestFlight.

---

## 🎯 Objetivo dos Testes

### **Validar:**
- ✅ Usabilidade das funcionalidades principais
- ✅ Performance e estabilidade
- ✅ Interface intuitiva
- ✅ Fluxos de trabalho reais
- ✅ Casos de uso específicos da fisioterapia

### **Identificar:**
- 🐛 Bugs e problemas de funcionamento
- 🔄 Melhorias de UX/UI
- ⚡ Gargalos de performance
- 📱 Problemas específicos do iOS

---

## 📊 Dados de Demonstração Disponíveis

O app vem pré-populado com **10 pacientes realistas** e **~80 agendamentos** distribuídos entre:

### **👥 Pacientes Exemplo:**
1. **Maria Silva Santos** - Lombalgia, 8 sessões, 75% progresso
2. **José Carlos Oliveira** - Tendinite no ombro, 12 sessões, 90% progresso
3. **Ana Paula Fernandes** - Fibromialgia, 15 sessões, 65% progresso
4. **Roberto Alves Costa** - Artrose no joelho, 20 sessões, 85% progresso
5. **Carla Rodrigues Lima** - Escoliose, 6 sessões, 40% progresso
6. **Fernando Santos Pereira** - Lesão no tornozelo, 4 sessões, 25% progresso
7. **Isabella Costa Martins** - Síndrome do túnel do carpo, 10 sessões, 80% progresso
8. **Eduardo Silva Nunes** - Dor ciática, 18 sessões, 95% progresso (ALTA)
9. **Luciana Gomes Ribeiro** - TMJ, 7 sessões, 55% progresso
10. **Marcelo Almeida Santos** - Fascite plantar, 2 sessões, 15% progresso (INATIVO)

### **📅 Agendamentos:**
- **Passados:** Maioria completados
- **Hoje:** Mix de status (agendado/em andamento/concluído)
- **Futuros:** Principalmente agendados
- **Horários:** 9h às 17h (segunda a sexta)

---

## 🧪 Cenários de Teste Principais

### **1. 📱 Primeiro Uso do App**

**Objetivo:** Validar experiência inicial

**Passos:**
1. Abrir o app pela primeira vez
2. Aguardar carregamento dos dados de demonstração
3. Fazer login (qualquer credencial funciona)
4. Explorar o Dashboard

**✅ Critérios de Sucesso:**
- App carrega sem travamentos
- Dados aparecem corretamente
- Interface é intuitiva
- Loading é rápido (<10 segundos)

**📝 Pontos de Atenção:**
- Velocidade de carregamento inicial
- Clareza das informações no Dashboard
- Facilidade de navegação

---

### **2. 👥 Gerenciamento de Pacientes**

#### **2.1 Visualização de Pacientes**

**Objetivo:** Testar listagem e busca

**Passos:**
1. Ir para tela "Pacientes"
2. Verificar lista completa (10 pacientes)
3. Testar busca por nome ("Maria")
4. Testar busca por condição ("lombalgia")
5. Verificar informações dos cards

**✅ Critérios de Sucesso:**
- Lista carrega rapidamente
- Busca funciona instantaneamente
- Cards mostram informações relevantes
- Status e progresso visíveis

#### **2.2 Edição de Pacientes**

**Objetivo:** Testar CRUD completo

**Passos:**
1. Selecionar "Maria Silva Santos"
2. Clicar no menu (3 pontos) → "Editar"
3. Modificar telefone e adicionar nova condição
4. Salvar alterações
5. Verificar se mudanças persistiram

**✅ Critérios de Sucesso:**
- Formulário carrega dados existentes
- Campos são editáveis
- Validação funciona
- Dados salvam corretamente

#### **2.3 Criação de Novo Paciente**

**Objetivo:** Testar cadastro completo

**Passos:**
1. Clicar no FAB (+) na tela de pacientes
2. Preencher dados obrigatórios:
   - Nome: "Teste Mobile App"
   - Email: "teste@fisioflow.com"
   - Telefone: "(11) 99999-0000"
   - CPF: "000.000.000-00"
   - Data nascimento: "01/01/1990"
3. Adicionar condições médicas
4. Salvar paciente

**✅ Critérios de Sucesso:**
- Formulário é intuitivo
- Validação impede dados inválidos
- Paciente aparece na lista
- Dados ficam salvos permanentemente

#### **2.4 Exclusão de Pacientes**

**Objetivo:** Testar remoção segura

**Passos:**
1. Selecionar paciente "Marcelo Almeida Santos" (inativo)
2. Menu → "Excluir"
3. Confirmar exclusão
4. Verificar se foi removido da lista

**✅ Critérios de Sucesso:**
- Confirmação aparece antes da exclusão
- Paciente é removido completamente
- Agendamentos relacionados são removidos

---

### **3. 📅 Sistema de Agendamentos**

#### **3.1 Visualização da Agenda**

**Objetivo:** Testar navegação e exibição

**Passos:**
1. Ir para tela "Agenda"
2. Verificar data atual selecionada
3. Navegar para dias anteriores/posteriores
4. Clicar em "Hoje" para voltar
5. Verificar estatísticas do dia

**✅ Critérios de Sucesso:**
- Data atual destacada
- Navegação é fluida
- Estatísticas corretas
- Agendamentos listados por hora

#### **3.2 Controle de Status**

**Objetivo:** Testar workflow de atendimento

**Passos:**
1. Encontrar agendamento "Agendado" para hoje
2. Clicar "Iniciar" → verificar mudança para "Em Andamento"
3. Clicar "Finalizar" → verificar mudança para "Concluído"
4. Verificar se estatísticas atualizaram

**✅ Critérios de Sucesso:**
- Status muda instantaneamente
- Botões de ação apropriados aparecem
- Estatísticas atualizam em tempo real
- Cores indicam status corretamente

#### **3.3 Navegação Entre Datas**

**Objetivo:** Testar календário

**Passos:**
1. Navegar para ontem → verificar agendamentos passados
2. Navegar para amanhã → verificar agendamentos futuros
3. Testar dias sem agendamentos
4. Voltar para hoje

**✅ Critérios de Sucesso:**
- Dados corretos para cada data
- Estados vazios bem apresentados
- Performance mantida
- Botão "Hoje" sempre funciona

---

### **4. ⚡ Testes de Performance**

#### **4.1 Velocidade de Carregamento**

**Teste:**
- Tempo de inicialização < 10s
- Navegação entre telas < 2s
- Busca de pacientes instantânea
- Atualização de status < 1s

#### **4.2 Uso de Memória**

**Teste:**
- App não trava durante uso prolongado
- Não consome bateria excessiva
- Funciona bem com outros apps abertos

#### **4.3 Dados Offline**

**Teste:**
- Dados permanecem após fechar app
- Funciona sem internet
- Mudanças são persistidas

---

### **5. 🎨 Interface e Usabilidade**

#### **5.1 Design e Layout**

**Avaliar:**
- ✅ Consistência visual
- ✅ Facilidade de leitura
- ✅ Tamanho adequado de botões
- ✅ Cores e contrastes
- ✅ Ícones intuitivos

#### **5.2 Navegação**

**Testar:**
- ✅ Menu lateral (se houver)
- ✅ Botões de voltar
- ✅ FABs para ações principais
- ✅ Tabs/navegação inferior

#### **5.3 Responsividade**

**Verificar:**
- ✅ Diferentes orientações de tela
- ✅ Diferentes tamanhos de iPhone
- ✅ Área segura respeitada
- ✅ Teclado não bloqueia campos

---

## 🐛 Como Reportar Problemas

### **Via TestFlight:**
1. Fazer screenshot do problema
2. Usar função "Send Beta Feedback"
3. Descrever passos para reproduzir
4. Incluir modelo do iPhone

### **Via WhatsApp/Slack:**
- **Template de Bug Report:**
```
🐛 BUG ENCONTRADO
Tela: [nome da tela]
Ação: [o que estava fazendo]
Problema: [o que aconteceu]
Esperado: [o que deveria acontecer]
iPhone: [modelo e iOS]
Screenshot: [anexar se possível]
```

### **Sugestões de Melhoria:**
```
💡 SUGESTÃO
Funcionalidade: [qual área]
Ideia: [descrição da melhoria]
Justificativa: [por que seria útil]
Prioridade: [alta/média/baixa]
```

---

## 📈 Métricas de Sucesso

### **Funcionalidade:**
- ✅ 100% das funcionalidades testadas
- ✅ 0 bugs críticos (travamentos)
- ✅ < 5 bugs menores
- ✅ Performance satisfatória

### **Usabilidade:**
- ✅ Equipe consegue usar sem treinamento
- ✅ Tarefas comuns < 3 toques
- ✅ Interface intuitiva
- ✅ Feedback positivo da equipe

### **Estabilidade:**
- ✅ Não trava durante uso normal
- ✅ Dados não se perdem
- ✅ Performance consistente
- ✅ Memoria/bateria otimizadas

---

## 📋 Checklist Final de Teste

### **Antes de Reportar "OK":**

**📱 Funcionalidades Core:**
- [ ] CRUD de pacientes completo
- [ ] Sistema de agendamentos
- [ ] Navegação entre telas
- [ ] Busca e filtros
- [ ] Persistência de dados

**⚡ Performance:**
- [ ] Inicialização rápida
- [ ] Navegação fluida
- [ ] Busca instantânea
- [ ] Sem travamentos

**🎨 Interface:**
- [ ] Design consistente
- [ ] Fácil de usar
- [ ] Responsivo
- [ ] Acessível

**🔄 Fluxos de Trabalho:**
- [ ] Cadastro de paciente
- [ ] Controle de agendamentos
- [ ] Busca de informações
- [ ] Atualizações de status

---

## 🎯 Foco Especial

### **Cenários Críticos para Fisioterapia:**

1. **📋 Consulta Rápida de Paciente**
   - Durante atendimento, encontrar histórico rapidamente
   - Verificar condições e medicações

2. **⏰ Gerenciamento da Agenda**
   - Ver próximos pacientes
   - Marcar sessões como concluídas
   - Identificar faltas

3. **📊 Acompanhamento de Progresso**
   - Visualizar evolução do paciente
   - Atualizar status de tratamento

4. **🔍 Busca de Informações**
   - Encontrar pacientes por condição
   - Filtrar por status
   - Busca por nome parcial

### **Casos de Uso Reais:**

- **Manhã:** Visualizar agenda do dia
- **Entre consultas:** Marcar anterior como concluída
- **Emergência:** Buscar rapidamente dados de contato
- **Final do dia:** Revisar estatísticas
- **Novo paciente:** Cadastro completo

---

## 📞 Suporte Durante Teste

**Para dúvidas técnicas:**
- 📧 dev@fisioflow.com
- 💬 Grupo WhatsApp da equipe

**Para feedback de UX:**
- 📱 Função nativa do TestFlight
- 📝 Documento compartilhado

**Prazo de teste:** 1 semana após distribuição TestFlight

---

## 🎉 Próximos Passos

Após a fase de testes:

1. **📊 Análise do Feedback** (2 dias)
2. **🔧 Correções Prioritárias** (3-5 dias)
3. **🚀 Build Final** (1 dia)
4. **📱 Redistribuição** (TestFlight)
5. **✅ Aprovação Final** da equipe

**Meta:** App estável e aprovado pela equipe para uso real em **2 semanas**! 🎯