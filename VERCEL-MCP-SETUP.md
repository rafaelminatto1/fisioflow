# 🔧 Configuração MCP Server Vercel - Monitoramento de Logs

## 📋 Visão Geral

Este guia configura o MCP (Model Context Protocol) server da Vercel para permitir que o Claude monitore logs de deploy, status de deployment e gerencie a aplicação diretamente.

<mcreference link="https://github.com/nganiet/mcp-vercel" index="1">1</mcreference> <mcreference link="https://mcp.so/server/mcp-vercel/nganiet" index="3">3</mcreference>

## 🎯 Funcionalidades Disponíveis

- ✅ **Monitoramento de Logs**: Visualizar logs de deploy em tempo real
- ✅ **Status de Deployment**: Verificar status atual dos deployments
- ✅ **Gestão de Projetos**: Listar e gerenciar projetos Vercel
- ✅ **Variáveis de Ambiente**: Gerenciar environment variables
- ✅ **Aliases e Domínios**: Configurar aliases e domínios customizados
- ✅ **Artifacts**: Gerenciar artifacts de build

## 🔑 Pré-requisitos

### 1. Token da API Vercel

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Settings** → **Tokens**
3. Clique em **Create Token**
4. Nome: `Claude MCP Integration`
5. Scope: **Full Account**
6. Copie o token gerado

### 2. Node.js 18+

```bash
# Verificar versão
node --version
# Deve ser v18.0.0 ou superior
```

## 🚀 Instalação e Configuração

### Opção 1: Instalação via GitHub (Recomendada)

```bash
git clone https://github.com/nganiet/mcp-vercel.git
cd mcp-vercel
npm install
npm run build
```

### Opção 2: Usando MCP Proxy

```bash
npm install -g @modelcontextprotocol/proxy
```

### Opção 3: Configuração Manual

Baixe o repositório e configure manualmente conforme documentação.

## ⚙️ Configuração do Claude Desktop

### 1. Localizar arquivo de configuração

**Windows:**

```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**

```
~/.config/Claude/claude_desktop_config.json
```

### 2. Configuração MCP Server

Adicione ao arquivo `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vercel": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-vercel\\dist\\index.js"],
      "env": {
        "VERCEL_API_TOKEN": "seu_token_vercel_aqui"
      }
    }
  }
}
```

**⚠️ Importante**: Substitua:

- `C:\\path\\to\\mcp-vercel\\dist\\index.js` pelo caminho real
- `seu_token_vercel_aqui` pelo token da API Vercel

### 3. Configuração Alternativa com Proxy

```json
{
  "mcpServers": {
    "vercel-proxy": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/proxy",
        "--stdio",
        "--cmd",
        "node dist/index.js",
        "--port",
        "3399"
      ],
      "env": {
        "VERCEL_API_TOKEN": "seu_token_vercel_aqui"
      }
    }
  }
}
```

## 🔄 Configuração via Proxy (Alternativa)

<mcreference link="https://github.com/nganiet/mcp-vercel" index="1">1</mcreference>

```bash
# Instalar proxy MCP
npm install -g @modelcontextprotocol/proxy

# Executar servidor via proxy
mcp-proxy --stdio --cmd "npm start" --port 3399
```

Configuração no Claude:

```json
{
  "mcpServers": {
    "vercel": {
      "command": "mcp-proxy",
      "args": ["--url", "http://localhost:3399"]
    }
  }
}
```

## 🐳 Configuração via Docker

```bash
# Executar container Docker
docker run -d \
  --name vercel-mcp \
  --restart unless-stopped \
  -e VERCEL_API_TOKEN=seu_token_aqui \
  -p 3399:3399 \
  vercel-mcp
```

## 🧪 Testando a Configuração

### 1. Reiniciar Claude Desktop

<mcreference link="https://modelcontextprotocol.io/quickstart/user" index="3">3</mcreference>

1. Feche completamente o Claude Desktop
2. Reabra a aplicação
3. Procure pelo ícone de slider (🎛️) no canto inferior esquerdo

### 2. Verificar Ferramentas Disponíveis

Após reiniciar, você deve ver as seguintes ferramentas:

**Gerenciamento de Deployments:**

- `vercel-list-all-deployments` - Listar deployments com filtros
- `vercel-get-deployment` - Obter detalhes de deployment específico
- `vercel-list-deployment-files` - Listar arquivos em deployment
- `vercel-create-deployment` - Criar novos deployments

**Gerenciamento de Projetos:**

- `vercel-create-project` - Criar novos projetos Vercel
- `vercel-list-projects` - Listar todos os projetos com paginação
- `vercel-find-project` - Encontrar projeto específico por ID ou nome
- `vercel-get-project-domain` - Obter informações de domínio do projeto

**Gerenciamento de Ambiente:**

- `vercel-get-environments` - Acessar variáveis de ambiente do projeto
- `vercel-create-environment-variables` - Criar múltiplas variáveis de ambiente
- `vercel-create-custom-environment` - Criar ambientes customizados

**Gerenciamento de Times:**

- `vercel-list-all-teams` - Listar todos os times acessíveis
- `vercel-create-team` - Criar novo time com slug e nome customizados

### 3. Teste Básico

No Claude, digite:

```
Por favor, liste meus deployments recentes da Vercel usando a ferramenta vercel-list-all-deployments
```

## 📊 Comandos Úteis para Monitoramento

### Verificar Status do FisioFlow

```
Verifique o status do último deployment do projeto fisioflow-webapp
```

### Obter Logs de Deploy

```
Mostre os logs do último deployment que falhou
```

### Monitorar Performance

```
Liste os últimos 10 deployments e seus tempos de build
```

### Verificar Variáveis de Ambiente

```
Liste as variáveis de ambiente do projeto fisioflow em produção
```

## 🔍 Troubleshooting

### Problema: MCP Server não aparece

**Solução:**

1. Verificar se o arquivo `claude_desktop_config.json` está no local correto
2. Validar JSON (usar jsonlint.com)
3. Verificar se o caminho para o executável está correto
4. Reiniciar Claude Desktop completamente

### Problema: Erro de autenticação

**Solução:**

1. Verificar se o token Vercel está correto
2. Confirmar que o token tem permissões adequadas
3. Testar token via curl:

```bash
curl -H "Authorization: Bearer seu_token" https://api.vercel.com/v2/user
```

### Problema: Comando não encontrado

**Solução:**

1. Verificar se Node.js está instalado
2. Confirmar versão do Node.js (18+)
3. Reinstalar dependências:

```bash
npm install -g @nganiet/mcp-vercel
```

### Logs de Debug

<mcreference link="https://modelcontextprotocol.io/quickstart/user" index="3">3</mcreference>

Para debug detalhado:

1. Ativar **Developer Mode** no Claude Desktop:
   - Settings → Developer → Developer Mode ON

2. Verificar logs em:
   - Windows: `%APPDATA%\Claude\logs\`
   - macOS: `~/Library/Logs/Claude/`
   - Linux: `~/.local/share/Claude/logs/`

3. Procurar por arquivos `mcp-server-vercel.log`

## 🎯 Casos de Uso Práticos

### 1. Monitoramento Contínuo

```
Configure um alerta para me notificar quando houver falhas de deploy no FisioFlow
```

### 2. Análise de Performance

```
Analise os tempos de build dos últimos 20 deployments e identifique tendências
```

### 3. Gestão de Ambiente

```
Compare as variáveis de ambiente entre staging e produção
```

### 4. Rollback Rápido

```
Se o último deploy falhou, me ajude a fazer rollback para a versão anterior
```

## 🔐 Segurança

### Boas Práticas:

1. **Token Scope Mínimo**: Use tokens com menor escopo possível
2. **Rotação Regular**: Renove tokens periodicamente
3. **Ambiente Isolado**: Use tokens diferentes para dev/prod
4. **Monitoramento**: Monitore uso da API

### Configuração de Token Restrito:

```json
{
  "mcpServers": {
    "vercel-readonly": {
      "command": "npx",
      "args": ["@nganiet/mcp-vercel"],
      "env": {
        "VERCEL_API_TOKEN": "token_readonly_aqui",
        "VERCEL_SCOPE": "read"
      }
    }
  }
}
```

## 📈 Próximos Passos

1. **Configurar Alertas**: Implementar notificações automáticas
2. **Dashboard Personalizado**: Criar views customizadas
3. **Integração CI/CD**: Conectar com GitHub Actions
4. **Métricas Avançadas**: Análise de performance e custos

---

## 🆘 Suporte

- **Documentação Oficial**: [MCP Vercel Docs](https://mcp.so/server/mcp-vercel/nganiet)
- **Issues GitHub**: [nganiet/mcp-vercel](https://github.com/nganiet/mcp-vercel/issues)
- **Claude MCP Guide**: [Model Context Protocol](https://modelcontextprotocol.io/quickstart/user)

**Status**: ✅ Pronto para uso  
**Última atualização**: Janeiro 2025  
**Compatibilidade**: Claude Desktop, Cursor, Codeium Cascade
