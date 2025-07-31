# Guia de Deploy - FisioFlow na Vercel

## 📋 Visão Geral

Este documento descreve o processo completo de deploy do FisioFlow na Vercel, incluindo configurações, troubleshooting e melhores práticas.

## 🚀 Processo de Deploy

### Pré-requisitos

1. **Node.js** versão 18+ instalado
2. **npm** ou **yarn** como gerenciador de pacotes
3. **Conta na Vercel** configurada
4. **Vercel CLI** instalado globalmente

```bash
npm install -g vercel
```

### Configuração Inicial

#### 1. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` baseado no `.env.example`:

```bash
# Variáveis essenciais para produção
NODE_ENV=production
VITE_BUILD_MODE=deploy
VITE_APP_ENV=production
VITE_API_URL=https://fisioflow.vercel.app
VITE_APP_NAME=FisioFlow
VITE_APP_VERSION=1.0.0

# Limites de planos
VITE_FREE_PLAN_PATIENTS=5
VITE_PRO_PLAN_PATIENTS=50
VITE_PREMIUM_PLAN_PATIENTS=500

# Opcionais (configurar conforme necessário)
VITE_GEMINI_API_KEY=sua_chave_aqui
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase
```

#### 2. Verificar Configuração do Vercel

O arquivo `vercel.json` deve estar configurado corretamente:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "regions": ["gru1"],
  "rewrites": [
    {
      "source": "/((?!api|assets|icons|manifest\\.json|sw\\.js|demo-setup\\.js).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "VITE_BUILD_MODE": "deploy",
    "VITE_APP_ENV": "production",
    "VITE_API_URL": "https://fisioflow.vercel.app",
    "VITE_APP_NAME": "FisioFlow",
    "VITE_APP_VERSION": "1.0.0",
    "VITE_FREE_PLAN_PATIENTS": "5",
    "VITE_PRO_PLAN_PATIENTS": "50",
    "VITE_PREMIUM_PLAN_PATIENTS": "500"
  }
}
```

### Deploy Automatizado

#### Usando o Script de Deploy

```bash
# Deploy de teste (preview)
npm run deploy:vercel

# Deploy de produção
npm run deploy:vercel:prod
```

#### Deploy Manual

```bash
# 1. Build local para verificação
npm run build:deploy

# 2. Verificar se o build foi criado
ls -la dist/

# 3. Deploy na Vercel
vercel --prod
```

## 🔧 Configurações Específicas

### Otimizações do Vite

O `vite.config.ts` está otimizado para produção:

- **Minificação**: Terser com configurações avançadas
- **Code Splitting**: Chunks otimizados para cache
- **Tree Shaking**: Remoção de código não utilizado
- **Sourcemap**: Desabilitado em produção
- **Target**: ES2020 para compatibilidade

### Configurações de Cache

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

### Configurações de Segurança

Headers de segurança configurados:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro "Command not found" durante build

**Problema**: `cross-env: command not found` ou `vite: command not found`

**Solução**:
```bash
# Instalar dependências localmente
npm install

# Usar npx para comandos
npx vite build

# Ou ajustar package.json para usar npx
"build": "npx vite build"
```

#### 2. Erro de importação de módulos

**Problema**: `Cannot find module` ou `ERR_MODULE_NOT_FOUND`

**Solução**:
```bash
# Verificar se todas as dependências estão instaladas
npm install

# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar imports relativos vs absolutos
```

#### 3. Build muito grande

**Problema**: Bundle size > 50MB

**Solução**:
```bash
# Analisar bundle
npm run analyze

# Verificar chunks grandes
npm run analyze:serve

# Otimizar imports
# Usar lazy loading
# Remover dependências não utilizadas
```

#### 4. Erro de TypeScript em produção

**Problema**: Erros de tipo que não aparecem localmente

**Solução**:
```bash
# Executar type-check antes do build
npm run type-check:fast

# Corrigir erros de tipo
# Usar // @ts-ignore apenas se necessário
```

### Logs de Debug

#### Verificar logs da Vercel

```bash
# Ver logs do último deploy
vercel logs

# Ver logs de um deploy específico
vercel logs [deployment-url]

# Ver logs em tempo real
vercel logs --follow
```

#### Logs locais

```bash
# Build com logs detalhados
DEBUG=* npm run build:deploy

# Verificar tamanho dos arquivos
du -sh dist/*

# Verificar estrutura do build
tree dist/
```

## 📊 Monitoramento

### Métricas de Performance

O sistema inclui monitoramento automático de:

- **Page Load Time**: Tempo de carregamento da página
- **First Paint**: Primeira renderização
- **First Contentful Paint**: Primeiro conteúdo visível
- **User Interactions**: Interações do usuário

### Relatórios de Erro

Erros são automaticamente coletados e armazenados:

```javascript
// Acessar relatórios de erro
const errors = errorMonitoring.getStoredErrors();

// Gerar relatório de saúde
const healthReport = errorMonitoring.generateHealthReport();
```

### Alertas de Produção

Configure alertas para:

- **Erros críticos**: > 5 erros por minuto
- **Performance**: Page load > 3 segundos
- **Disponibilidade**: Uptime < 99%

## 🔄 CI/CD

### GitHub Actions (Recomendado)

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run tests
        run: npm run test:unit
        
      - name: Build
        run: npm run build:deploy
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Hooks de Deploy

```bash
# Pre-deploy checks
npm run lint:fix
npm run type-check:fast
npm run test:unit

# Post-deploy validation
curl -f https://fisioflow.vercel.app/health
```

## 📝 Checklist de Deploy

### Antes do Deploy

- [ ] Todas as dependências instaladas
- [ ] Build local funcionando
- [ ] Testes passando
- [ ] Lint sem erros
- [ ] Type-check sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] vercel.json atualizado

### Durante o Deploy

- [ ] Build na Vercel bem-sucedido
- [ ] Sem erros nos logs
- [ ] Assets carregando corretamente
- [ ] Rotas funcionando

### Após o Deploy

- [ ] Aplicação carregando
- [ ] Login funcionando
- [ ] Dashboard acessível
- [ ] Navegação entre páginas
- [ ] Responsividade mobile
- [ ] Performance adequada (< 3s)
- [ ] Sem erros no console

## 🆘 Suporte

### Comandos Úteis

```bash
# Status do projeto na Vercel
vercel list

# Informações do deployment
vercel inspect [url]

# Configurar domínio customizado
vercel domains add [domain]

# Configurar variáveis de ambiente
vercel env add [name]

# Rollback para versão anterior
vercel rollback [deployment-url]
```

### Contatos de Suporte

- **Documentação Vercel**: https://vercel.com/docs
- **Suporte Vercel**: https://vercel.com/support
- **Issues do Projeto**: GitHub Issues

## 📈 Otimizações Futuras

### Performance

- [ ] Implementar Service Worker
- [ ] Adicionar PWA capabilities
- [ ] Otimizar imagens com next/image
- [ ] Implementar lazy loading avançado

### Monitoramento

- [ ] Integrar com Sentry
- [ ] Adicionar Google Analytics
- [ ] Implementar Hotjar
- [ ] Configurar alertas automáticos

### Segurança

- [ ] Implementar CSP headers
- [ ] Adicionar rate limiting
- [ ] Configurar HTTPS redirects
- [ ] Implementar HSTS

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.0.0