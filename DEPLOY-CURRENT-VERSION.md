# 🚀 Deploy Versão Atual - Guia Step-by-Step

## 🎯 Objetivo
Hospedar a versão atual otimizada do FisioFlow para testes com sua equipe de fisioterapeutas antes da migração para mobile.

## 📋 Pré-requisitos
- Conta GitHub (gratuita)
- Conta Vercel (gratuita - até 100GB/mês)
- Conta Google Cloud (para Gemini API)
- Domínio próprio (opcional - pode usar subdomínio Vercel)

## 🔧 Passo 1: Preparar o Projeto para Deploy

### 1.1 Verificar Build Local
```bash
# No terminal, dentro da pasta do projeto
cd C:\Users\rafal\OneDrive\Documentos\CLAUDe\fisioflow-19-07

# Instalar dependências
npm install

# Testar build local
npm run build

# Se build passou, testar preview
npm run preview
```

### 1.2 Criar arquivo de configuração Vercel
```json
// vercel.json (criar na raiz do projeto)
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!assets/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### 1.3 Configurar Environment Variables
```env
# .env.production (criar na raiz)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_APP_ENV=production
VITE_APP_NAME=FisioFlow
```

## 🚀 Passo 2: Deploy no Vercel

### 2.1 Criar Conta Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Sign Up"
3. Conecte com sua conta GitHub
4. Confirme email se necessário

### 2.2 Conectar Repositório
```bash
# No terminal, inicializar Git se não existir
git init
git add .
git commit -m "Versão otimizada para deploy"

# Criar repositório no GitHub
# 1. Vá para github.com
# 2. Clique em "New repository" 
# 3. Nome: "fisioflow-webapp"
# 4. Marque como Private
# 5. Não inicialize com README (já temos)

# Conectar repositório local com GitHub
git remote add origin https://github.com/SEU_USERNAME/fisioflow-webapp.git
git branch -M main
git push -u origin main
```

### 2.3 Deploy Automático
1. **No Vercel Dashboard:**
   - Clique em "New Project"
   - Selecione seu repositório "fisioflow-webapp"
   - Framework será detectado automaticamente (Vite)

2. **Configurar Environment Variables:**
   ```
   VITE_GEMINI_API_KEY = sua_chave_gemini_aqui
   VITE_APP_ENV = production
   ```

3. **Deploy:**
   - Clique em "Deploy"
   - Aguarde build (2-3 minutos)
   - Receberá URL: `https://fisioflow-webapp-xxxxx.vercel.app`

## 🔐 Passo 3: Configurar Gemini API

### 3.1 Obter API Key
1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Clique em "Create API Key"
3. Copie a chave (começa com `AIzaSy...`)

### 3.2 Testar API Key
```javascript
// Teste rápido no console do navegador
fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=SUA_CHAVE', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Teste da API' }] }]
  })
})
.then(r => r.json())
.then(console.log);
```

## 🌐 Passo 4: Configurar Domínio (Opcional)

### 4.1 Domínio Próprio
Se você tem um domínio (ex: `minhaclinica.com.br`):

1. **No Vercel:**
   - Vá para o projeto → Settings → Domains  
   - Adicione seu domínio: `app.minhaclinica.com.br`

2. **No seu provedor de domínio:**
   - Adicione CNAME: `app.minhaclinica.com.br` → `cname.vercel-dns.com`

### 4.2 Subdomínio Gratuito
Ou use o subdomínio gratuito da Vercel:
- Configure em Settings → Domains
- Exemplo: `fisioflow-clinica.vercel.app`

## 👥 Passo 5: Preparar para Equipe

### 5.1 Criar Dados de Teste
```javascript
// Executar no console do navegador após acessar a aplicação
localStorage.setItem('fisioflow-demo-setup', 'true');

// Adicionar pacientes de exemplo
const pacientesDemo = [
  {
    id: 'demo-1',
    name: 'João Silva (DEMO)',
    email: 'joao@demo.com',
    phone: '(11) 99999-1234',
    cpf: '123.456.789-00',
    birth_date: '1985-05-15',
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-2', 
    name: 'Maria Santos (DEMO)',
    email: 'maria@demo.com',
    phone: '(11) 99999-5678',
    cpf: '987.654.321-00',
    birth_date: '1990-08-22',
    created_at: new Date().toISOString()
  }
];

localStorage.setItem('patients', JSON.stringify(pacientesDemo));
window.location.reload();
```

### 5.2 Criar Script de Setup Automático
```html
<!-- Adicionar no index.html, antes do </body> -->
<script>
// Setup automático para demonstração
if (window.location.search.includes('demo=true')) {
  const demoData = {
    patients: [
      {
        id: 'demo-1',
        name: 'João Silva (DEMO)',
        email: 'joao@demo.com',
        phone: '(11) 99999-1234',
        cpf: '123.456.789-00',
        diagnosis: 'Dor lombar crônica',
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-2',
        name: 'Maria Santos (DEMO)', 
        email: 'maria@demo.com',
        phone: '(11) 99999-5678',
        cpf: '987.654.321-00',
        diagnosis: 'Tendinite no ombro',
        created_at: new Date().toISOString()
      }
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Avaliar João Silva',
        description: 'Primeira consulta - avaliação postural',
        status: 'todo',
        priority: 'high',
        created_at: new Date().toISOString()
      },
      {
        id: 'task-2',
        title: 'Relatório Maria Santos',
        description: 'Elaborar relatório de evolução',
        status: 'doing', 
        priority: 'medium',
        created_at: new Date().toISOString()
      }
    ]
  };
  
  localStorage.setItem('patients', JSON.stringify(demoData.patients));
  localStorage.setItem('tasks', JSON.stringify(demoData.tasks));
  
  // Redirecionar sem parâmetro demo
  const url = new URL(window.location);
  url.searchParams.delete('demo');
  window.history.replaceState({}, '', url);
}
</script>
```

## 📱 Passo 6: Guia para Fisioterapeutas

### 6.1 Criar Guia de Acesso
```markdown
# FisioFlow - Guia para Fisioterapeutas 👩‍⚕️

## Como Acessar
1. **URL:** https://seu-app.vercel.app?demo=true
2. **Primeiro acesso:** Dados de demo serão carregados automaticamente
3. **Navegador:** Chrome, Safari ou Firefox (atualizados)

## Principais Funcionalidades para Testar

### ✅ Gestão de Pacientes
- **Adicionar novo paciente:** Botão + no canto superior
- **Editar paciente:** Clique no nome do paciente
- **Buscar pacientes:** Campo de busca no topo da lista

### ✅ Sistema de Tarefas (Kanban)
- **Criar tarefa:** Arrastar e soltar entre colunas
- **Organizar:** To Do → Doing → Done
- **Prioridades:** Alto, Médio, Baixo

### ✅ AI Assistant (se configurado)
- **Análise SOAP:** Escrever nota e pedir análise
- **Plano de tratamento:** Solicitar sugestões
- **Busca de conhecimento:** Fazer perguntas técnicas

## Funcionalidades Offline
- **Funciona sem internet:** Dados salvos localmente
- **Sincronização:** Automática quando voltar online
- **Cache inteligente:** Carregamento 4x mais rápido

## Como Dar Feedback
- **WhatsApp:** [seu número]
- **Email:** [seu email]
- **Telegram:** [seu contato]

### O que Testar Especificamente:
1. **Velocidade:** App carrega rápido?
2. **Usabilidade:** Interface intuitiva?
3. **Funcionalidades:** Tudo que precisa está disponível?
4. **Mobile:** Funciona bem no celular?
5. **Offline:** Funciona sem internet?

### Problemas Conhecidos:
- Dados são locais (não compartilhados entre usuários ainda)
- AI requer configuração da chave Gemini
- Versão beta - alguns bugs podem ocorrer
```

## 📊 Passo 7: Analytics e Feedback

### 7.1 Google Analytics (Opcional)
```html
<!-- Adicionar no index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 7.2 Sistema de Feedback Simples
```javascript
// Adicionar no App.tsx
const FeedbackButton = () => (
  <button 
    onClick={() => {
      const feedback = prompt('Como está sendo sua experiência? Sugestões?');
      if (feedback) {
        // Enviar por email ou WhatsApp
        window.open(`mailto:seu@email.com?subject=Feedback FisioFlow&body=${encodeURIComponent(feedback)}`);
      }
    }}
    className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 z-50"
  >
    💬 Feedback
  </button>
);
```

## 🔄 Passo 8: Deploy Updates

### 8.1 Process de Updates
```bash
# Para fazer mudanças:
git add .
git commit -m "Ajustes baseados no feedback da equipe"
git push

# Vercel fará deploy automático
# Nova versão ficará disponível em ~2 minutos
```

### 8.2 Rollback se Necessário
```bash
# No dashboard Vercel:
# 1. Ir em Deployments
# 2. Encontrar versão anterior funcionando  
# 3. Clicar em "..." → "Promote to Production"
```

## 📋 Checklist Final

### Antes de Enviar para Equipe:
- [ ] Build local funcionando
- [ ] Deploy Vercel realizado com sucesso
- [ ] URL acessível e carregando
- [ ] Gemini API configurada (se aplicável)
- [ ] Dados de demo carregando com ?demo=true
- [ ] Testado em mobile (Chrome/Safari)
- [ ] Botão de feedback funcionando

### Comunicação com Equipe:
- [ ] Mensagem no grupo WhatsApp
- [ ] Email com instruções
- [ ] Prazo para feedback (ex: 1 semana)
- [ ] Disponibilidade para suporte técnico

## 📞 Comunicação Sugerida para Equipe

### Mensagem WhatsApp/Email:
```
🚀 FisioFlow está no ar para testes!

Pessoal, nossa nova plataforma de gestão está pronta para vocês testarem!

🔗 Link: https://seu-app.vercel.app?demo=true  
📱 Funciona no celular e computador
⚡ Super rápido e funciona offline

Por favor, testem até [data] e me passem feedback sobre:
✅ Facilidade de uso
✅ Funcionalidades que faltam
✅ Problemas encontrados  
✅ Sugestões de melhorias

Qualquer dúvida, me chamem! 👍

#FisioFlow #InovaçãoNaClínica
```

## 🎯 Próximos Passos

Após feedback da equipe:
1. **Coletar sugestões** e pontos de melhoria
2. **Implementar ajustes** críticos
3. **Planejar migração** para versão mobile freemium
4. **Definir roadmap** baseado no uso real

---

**URL de Exemplo**: `https://fisioflow-webapp-xxxxx.vercel.app?demo=true`
**Custo**: R$ 0 (Vercel gratuito até 100GB/mês)
**Tempo Setup**: 30-60 minutos