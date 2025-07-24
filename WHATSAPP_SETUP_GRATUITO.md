# 📱 WhatsApp Business API - Setup GRATUITO

## 🎯 Opções Gratuitas Disponíveis

### **Opção 1: Meta Business (Facebook) - GRATUITO**
- ✅ **1.000 conversas/mês GRÁTIS**
- ✅ **Webhooks inclusos**  
- ✅ **Templates de mensagem**
- ✅ **API oficial do WhatsApp**

### **Opção 2: Alternativas Gratuitas**
- **Evolution API** (Open Source)
- **Baileys** (Node.js Library)
- **WhatsApp Web.js** (Puppeteer)

---

## 🚀 **PASSO A PASSO: Meta Business API (GRATUITO)**

### **Passo 1: Criar Conta Facebook Business**
1. **Acesse:** https://business.facebook.com
2. **Clique:** "Criar conta"
3. **Preencha:** Nome da empresa, email, etc.
4. **Verifique:** Email e telefone

### **Passo 2: Configurar WhatsApp Business**
1. **Acesse:** https://developers.facebook.com
2. **Clique:** "Meus Apps" → "Criar App"
3. **Selecione:** "Empresa" 
4. **Nome do App:** "FisioFlow WhatsApp"
5. **Adicione produto:** "WhatsApp Business"

### **Passo 3: Configurar Número de Telefone**
1. **Na seção WhatsApp:**
   - Clique "Começar"
   - Adicione número de telefone comercial
   - Verifique via SMS
2. **Obtenha credenciais:**
   - **App ID**
   - **App Secret** 
   - **Access Token**
   - **Phone Number ID**

### **Passo 4: Configurar Webhooks**
```bash
# URL do seu webhook (pode usar ngrok para testes)
# Exemplo: https://your-domain.com/webhook/whatsapp

# Verify Token: qualquer string secreta
# Exemplo: "fisioflow_webhook_2024"
```

### **Passo 5: Testar API**
```bash
# Teste básico via cURL
curl -X POST \
  "https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "text",
    "text": {
      "body": "Teste FisioFlow!"
    }
  }'
```

---

## 🔧 **ALTERNATIVA GRATUITA: Evolution API**

### **Vantagens:**
- ✅ **100% gratuito e open source**
- ✅ **Sem limites de mensagens**
- ✅ **Fácil de hospedar**
- ✅ **API REST completa**

### **Setup Evolution API:**

```bash
# 1. Clonar repositório
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# 2. Instalar dependências
npm install

# 3. Configurar .env
cp .env.example .env

# 4. Iniciar servidor
npm run start:prod
```

### **Configuração .env Evolution API:**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/evolution"

# API Configuration  
API_PORT=8080
API_KEY=your-secret-api-key

# WhatsApp
WHATSAPP_WEBHOOK_URL=https://your-domain.com/webhook
```

### **Usando Evolution API:**

```typescript
// Conectar instância WhatsApp
const connectWhatsApp = async () => {
  const response = await fetch('http://localhost:8080/instance/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'your-secret-api-key'
    },
    body: JSON.stringify({
      instanceName: 'fisioflow',
      webhook: 'https://your-domain.com/webhook'
    })
  });
  
  const data = await response.json();
  console.log('QR Code:', data.qrcode); // Escanear com WhatsApp
};

// Enviar mensagem
const sendMessage = async (to: string, message: string) => {
  const response = await fetch('http://localhost:8080/message/sendText/fisioflow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'your-secret-api-key'
    },
    body: JSON.stringify({
      number: to,
      text: message
    })
  });
  
  return response.json();
};
```

---

## 🏠 **Hospedagem Gratuita/Barata**

### **Para Evolution API:**
1. **Railway:** Gratuito (500h/mês)
2. **Render:** Gratuito (750h/mês)  
3. **Heroku:** $7/mês
4. **DigitalOcean:** $6/mês

### **Para N8N:**
1. **Self-hosted VPS:** $5-10/mês
2. **Railway:** Gratuito 
3. **Docker local:** $0/mês

---

## ⚙️ **Custos Comparativos (Mensal)**

| Ferramenta | Gratuito | Pago |
|------------|----------|------|
| **WhatsApp Meta** | 1.000 conversas | $0.005/conversa extra |
| **Evolution API** | Ilimitado | Apenas hospedagem ($5) |
| **N8N** | Ilimitado | Apenas hospedagem ($5) |
| **Make.com** | 1.000 ops | $9/mês (10k ops) |
| **Pabbly** | - | $19/mês (ilimitado) |

---

## 📊 **Recomendação para FisioFlow**

### **Setup Ideal (Custo: ~$10/mês):**
```
1. Evolution API (WhatsApp) - $5/mês hospedagem
2. N8N Self-hosted - $5/mês hospedagem  
3. Supabase - Gratuito (500MB)
4. Vercel/Netlify - Gratuito (frontend)

TOTAL: ~$10/mês para automação completa!
```

### **Alternativa Ultra-Barata ($0/mês):**
```
1. WhatsApp Meta API - Gratuito (1k msgs)
2. N8N local - Gratuito
3. Supabase - Gratuito
4. Vercel - Gratuito

TOTAL: $0/mês (limitações aplicáveis)
```

---

## 🎯 **Próximos Passos Recomendados**

1. **Escolha uma opção:** Meta API ou Evolution API
2. **Configure WhatsApp** seguindo o passo a passo
3. **Setup N8N** para automações
4. **Integre com FisioFlow** usando os services criados
5. **Teste com pacientes** piloto

**Qual opção você prefere? Posso detalhar qualquer uma!**