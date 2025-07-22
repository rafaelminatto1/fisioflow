# 🚀 Deploy FisioFlow - Passo a Passo VERCEL

## 🎯 O que vamos fazer:

Hospedar sua aplicação otimizada do FisioFlow no **Vercel** (gratuito) para sua equipe testar.

---

## 📋 PASSO 1: Preparar o Código no GitHub

### 1.1 Abrir Terminal

- Abra o **Prompt de Comando** ou **PowerShell**
- Navegue para a pasta do projeto:

```bash
cd "C:\Users\rafal\OneDrive\Documentos\CLAUDe\fisioflow-19-07"
```

### 1.2 Inicializar Git (se não existe)

```bash
git init
git add .
git commit -m "Versão otimizada para deploy"
```

### 1.3 Criar Repositório no GitHub

1. Abra [github.com](https://github.com)
2. Clique em **"New repository"** (botão verde)
3. Nome do repositório: **`fisioflow-webapp`**
4. Marque como **Private** (recomendado)
5. **NÃO** marque "Add README"
6. Clique **"Create repository"**

### 1.4 Conectar com GitHub

```bash
# Substitua SEU_USERNAME pelo seu usuário GitHub
git remote add origin https://github.com/SEU_USERNAME/fisioflow-webapp.git
git branch -M main
git push -u origin main
```

✅ **Pronto!** Código está no GitHub

---

## 📋 PASSO 2: Deploy no Vercel

### 2.1 Criar Conta Vercel

1. Vá para [vercel.com](https://vercel.com)
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"**
4. Autorize o Vercel a acessar seu GitHub

### 2.2 Importar Projeto

1. No dashboard Vercel, clique em **"New Project"**
2. Encontre **"fisioflow-webapp"** na lista
3. Clique em **"Import"**

### 2.3 Configurar Deploy

1. **Framework Preset**: Vite (detectado automaticamente)
2. **Build Command**: `npm run dev` (deixe assim)
3. **Output Directory**: `dist` (deixe assim)
4. **Install Command**: `npm install` (deixe assim)

### 2.4 Adicionar Variáveis de Ambiente (Opcional)

Se você tem chave do Gemini:

1. Clique em **"Environment Variables"**
2. Adicione:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: `sua_chave_gemini_aqui`

### 2.5 Deploy!

1. Clique em **"Deploy"**
2. Aguarde 2-3 minutos
3. ✅ **Sucesso!** Você receberá uma URL como:
   `https://fisioflow-webapp-xxxxx.vercel.app`

---

## 📋 PASSO 3: Testar a Aplicação

### 3.1 Acessar URL

1. Clique na URL que o Vercel gerou
2. A aplicação deve carregar
3. **Se carregar = SUCESSO!**

### 3.2 Carregar Dados de Demo

1. Adicione `?demo=true` na URL:
   `https://sua-url.vercel.app?demo=true`
2. A página deve carregar com pacientes de exemplo
3. Teste adicionar/editar pacientes

### 3.3 Testar no Mobile

1. Abra a URL no celular
2. Deve funcionar perfeitamente responsivo

---

## 📋 PASSO 4: Compartilhar com Equipe

### 4.1 Mensagem para WhatsApp/Email:

```
🚀 FisioFlow está no ar para testes!

Pessoal, nossa nova plataforma está pronta para vocês testarem:

🔗 Link: https://sua-url.vercel.app?demo=true
📱 Funciona no celular e computador
⚡ Super rápido e funciona offline

POR FAVOR TESTEM:
✅ Adicionar novos pacientes
✅ Editar informações
✅ Sistema de tarefas (arrastar entre colunas)
✅ Usar no celular
✅ Testar sem internet (funciona offline!)

Prazo para feedback: até [data]
Qualquer problema, me chamem! 👍

#FisioFlow #NovaPlataforma
```

---

## 🚨 SOLUÇÕES PARA PROBLEMAS COMUNS

### Problema 1: Build falhou no Vercel

**Solução:**

1. Vá para o projeto no Vercel
2. Settings → Functions & Files
3. Mude **Build Command** para: `npm run build || npm run dev`

### Problema 2: Página não carrega

**Solução:**

1. Vercel → Seu projeto → Settings
2. Build & Development Settings
3. **Output Directory**: deixe em branco
4. Redeploy

### Problema 3: Dados não aparecem

**Solução:**

1. Acesse com `?demo=true` na URL
2. Se não funcionar, abra console do navegador (F12)
3. Digite:

```javascript
localStorage.setItem('demo-setup', 'true');
window.location.reload();
```

---

## 🎯 CHECKLIST FINAL

### Antes de enviar para equipe:

- [ ] URL abrindo corretamente
- [ ] `?demo=true` carrega dados de exemplo
- [ ] Funciona no celular
- [ ] Consegue adicionar paciente
- [ ] Tasks/Kanban funcionando

### Para compartilhar:

- [ ] Mensagem enviada no grupo
- [ ] Prazo definido para feedback
- [ ] Você disponível para suporte

---

## 🔄 UPDATES FUTUROS

### Para fazer mudanças:

1. **Edite o código** localmente
2. **Commit e push**:

```bash
git add .
git commit -m "Ajustes baseados no feedback"
git push
```

3. **Vercel faz deploy automático** em ~1 minuto!

---

## 📞 SUPORTE

### Se algo der errado:

1. **WhatsApp**: Envie print do erro
2. **URL de exemplo**: https://fisioflow-demo.vercel.app
3. **Tempo para resolver**: 15-30 minutos máximo

**🎯 META: Sua equipe testando em 30 minutos!**
