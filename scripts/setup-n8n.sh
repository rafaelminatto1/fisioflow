#!/bin/bash

# 🤖 Script de Setup N8N para FisioFlow
# Autor: Claude Code Assistant
# Data: 2024

echo "🚀 Iniciando setup do N8N para FisioFlow..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instalando..."
    
    # Instalar Docker (Ubuntu/Debian)
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose
    
    # Adicionar usuário ao grupo docker
    sudo usermod -aG docker $USER
    
    echo "✅ Docker instalado com sucesso!"
fi

# Criar diretório para N8N
mkdir -p ~/fisioflow-n8n
cd ~/fisioflow-n8n

# Criar docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=fisioflow
      - N8N_BASIC_AUTH_PASSWORD=fisioflow2024!
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=America/Sao_Paulo
    volumes:
      - n8n_data:/home/node/.n8n
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - n8n-network

  # PostgreSQL para dados do N8N (opcional)
  postgres:
    image: postgres:13
    restart: unless-stopped
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8n_password
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - n8n-network

volumes:
  n8n_data:
  postgres_data:

networks:
  n8n-network:
    driver: bridge
EOF

echo "📄 Criado docker-compose.yml"

# Criar arquivo de configuração de workflows
mkdir -p workflows

# Workflow 1: Lembrete de Consulta
cat > workflows/lembrete-consulta.json << 'EOF'
{
  "name": "FisioFlow - Lembrete de Consulta",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "lembrete-consulta",
        "responseMode": "responseNode"
      },
      "id": "webhook-lembrete",
      "name": "Webhook Consulta",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "conditions": {
          "dateTime": [
            {
              "value1": "={{ new Date($json.appointment.date).getTime() - Date.now() }}",
              "operation": "smallerEqual",
              "value2": 86400000
            }
          ]
        }
      },
      "id": "filter-24h",
      "name": "Filtro 24h",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "url": "http://localhost:8080/message/sendText/fisioflow",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "your-evolution-api-key"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "number",
              "value": "={{ $json.patient.phone }}"
            },
            {
              "name": "text",
              "value": "🏥 *Lembrete FisioFlow*\n\nOlá {{ $json.patient.name }}!\n\nVocê tem consulta AMANHÃ:\n📅 {{ $json.appointment.date }}\n⏰ {{ $json.appointment.time }}\n\nAtt, Equipe FisioFlow 💙"
            }
          ]
        }
      },
      "id": "whatsapp-send",
      "name": "Enviar WhatsApp",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook Consulta": {
      "main": [
        [
          {
            "node": "Filtro 24h",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filtro 24h": {
      "main": [
        [
          {
            "node": "Enviar WhatsApp",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
EOF

echo "📄 Criado workflow de lembrete de consulta"

# Workflow 2: Novo Paciente
cat > workflows/novo-paciente.json << 'EOF'
{
  "name": "FisioFlow - Novo Paciente",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "novo-paciente",
        "responseMode": "responseNode"
      },
      "id": "webhook-paciente",
      "name": "Webhook Paciente",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "url": "http://localhost:8080/message/sendText/fisioflow",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "your-evolution-api-key"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "number",
              "value": "={{ $json.patient.phone }}"
            },
            {
              "name": "text",
              "value": "🎉 *Bem-vindo ao FisioFlow!*\n\nOlá {{ $json.patient.name }}!\n\n✅ Cadastro realizado com sucesso\n📱 Você receberá lembretes por aqui\n🏥 Nossa equipe está pronta para cuidar de você\n\nAtt, Equipe FisioFlow 💙"
            }
          ]
        }
      },
      "id": "whatsapp-welcome",
      "name": "WhatsApp Boas-vindas",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [460, 200]
    },
    {
      "parameters": {
        "fromEmail": "noreply@fisioflow.com",
        "toEmail": "fisioterapeuta@fisioflow.com",
        "subject": "🆕 Novo Paciente Cadastrado",
        "emailFormat": "html",
        "html": "<h2>Novo Paciente Cadastrado</h2><p><strong>Nome:</strong> {{ $json.patient.name }}</p><p><strong>Email:</strong> {{ $json.patient.email }}</p><p><strong>Telefone:</strong> {{ $json.patient.phone }}</p><p><strong>Condição:</strong> {{ $json.patient.condition }}</p>"
      },
      "id": "email-notification",
      "name": "Email Fisioterapeuta",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 1,
      "position": [460, 400]
    }
  ],
  "connections": {
    "Webhook Paciente": {
      "main": [
        [
          {
            "node": "WhatsApp Boas-vindas",
            "type": "main",
            "index": 0
          },
          {
            "node": "Email Fisioterapeuta",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
EOF

echo "📄 Criado workflow de novo paciente"

# Iniciar N8N
echo "🚀 Iniciando N8N..."
docker-compose up -d

# Aguardar inicialização
echo "⏳ Aguardando N8N inicializar..."
sleep 30

# Verificar se está rodando
if docker-compose ps | grep -q "Up"; then
    echo "✅ N8N iniciado com sucesso!"
    echo ""
    echo "🌐 Acesse: http://localhost:5678"
    echo "👤 Usuário: fisioflow"
    echo "🔐 Senha: fisioflow2024!"
    echo ""
    echo "📚 Workflows disponíveis em: ./workflows/"
    echo ""
    echo "🔗 Para integrar com FisioFlow:"
    echo "   - Webhook Lembrete: http://localhost:5678/webhook/lembrete-consulta"
    echo "   - Webhook Paciente: http://localhost:5678/webhook/novo-paciente"
else
    echo "❌ Erro ao iniciar N8N"
    docker-compose logs
fi

# Criar script de backup
cat > backup-n8n.sh << 'EOF'
#!/bin/bash
# Backup dos dados do N8N
DATE=$(date +%Y%m%d_%H%M%S)
docker run --rm -v fisioflow-n8n_n8n_data:/data -v $(pwd):/backup alpine tar czf /backup/n8n-backup-$DATE.tar.gz -C /data .
echo "✅ Backup criado: n8n-backup-$DATE.tar.gz"
EOF

chmod +x backup-n8n.sh
echo "📁 Script de backup criado: ./backup-n8n.sh"

# Criar script de restore
cat > restore-n8n.sh << 'EOF'
#!/bin/bash
# Restore dos dados do N8N
if [ -z "$1" ]; then
    echo "Uso: ./restore-n8n.sh <arquivo-backup.tar.gz>"
    exit 1
fi

docker-compose down
docker run --rm -v fisioflow-n8n_n8n_data:/data -v $(pwd):/backup alpine tar xzf /backup/$1 -C /data
docker-compose up -d
echo "✅ Restore concluído: $1"
EOF

chmod +x restore-n8n.sh
echo "📁 Script de restore criado: ./restore-n8n.sh"

echo ""
echo "🎉 Setup do N8N para FisioFlow concluído!"
echo ""
echo "📖 Próximos passos:"
echo "1. Acesse http://localhost:5678"
echo "2. Importe os workflows da pasta ./workflows/"
echo "3. Configure as credenciais (WhatsApp, Email, etc.)"
echo "4. Teste os webhooks"
echo "5. Integre com o FisioFlow"
echo ""
echo "🆘 Comandos úteis:"
echo "   docker-compose logs -f    # Ver logs"
echo "   docker-compose restart    # Reiniciar"
echo "   docker-compose down       # Parar"
echo "   ./backup-n8n.sh          # Fazer backup"
echo ""