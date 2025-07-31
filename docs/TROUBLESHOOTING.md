# Guia de Troubleshooting - FisioFlow

## 🚨 Problemas Comuns e Soluções

### 1. Problemas de Build

#### Erro: "cross-env: command not found"

**Sintomas:**
```bash
sh: line 1: cross-env: command not found
Error: Command "npm run build" exited with 127
```

**Causa:** O pacote `cross-env` não está disponível no ambiente de build da Vercel.

**Soluções:**

1. **Usar comandos nativos:**
```json
{
  "scripts": {
    "build": "vite build",
    "build:deploy": "vite build --mode deploy"
  }
}
```

2. **Usar npx:**
```json
{
  "scripts": {
    "build": "npx cross-env NODE_ENV=production vite build"
  }
}
```

3. **Configurar no vercel.json:**
```json
{
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

#### Erro: "vite: command not found"

**Sintomas:**
```bash
sh: line 1: vite: command not found
```

**Causa:** Vite não está instalado ou não está no PATH.

**Soluções:**

1. **Usar npx:**
```json
{
  "scripts": {
    "build": "npx vite build"
  }
}
```

2. **Verificar dependências:**
```bash
npm install vite --save-dev
```

3. **Limpar e reinstalar:**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Erro: "Cannot find package 'vite'"

**Sintomas:**
```bash
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite'
```

**Causa:** Problema com resolução de módulos ES.

**Soluções:**

1. **Simplificar vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
```

2. **Usar configuração específica para Vercel:**
```bash
# Criar vite.config.vercel.ts
npx vite build --config vite.config.vercel.ts
```

### 2. Problemas de Dependências

#### Erro: "husky: command not found"

**Sintomas:**
```bash
sh: line 1: husky: command not found
```

**Causa:** Husky não está disponível no ambiente de build.

**Soluções:**

1. **Tornar opcional:**
```json
{
  "scripts": {
    "prepare": "husky install || true",
    "postinstall": "npm run prepare || true"
  }
}
```

2. **Condicional por ambiente:**
```json
{
  "scripts": {
    "prepare": "if [ \"$NODE_ENV\" != \"production\" ]; then husky install; fi"
  }
}
```

#### Erro: "peer dependency warnings"

**Sintomas:**
```bash
npm WARN peer dep missing: react@^18.0.0
```

**Causa:** Dependências peer não instaladas.

**Soluções:**

1. **Usar --legacy-peer-deps:**
```json
{
  "installCommand": "npm install --legacy-peer-deps"
}
```

2. **Instalar peers manualmente:**
```bash
npm install react@^19.1.1 react-dom@^19.1.1
```

### 3. Problemas de Configuração

#### Erro: "Couldn't parse JSON file vercel.json"

**Sintomas:**
```bash
Error: Couldn't parse JSON file vercel.json
```

**Causa:** Sintaxe inválida no JSON.

**Soluções:**

1. **Validar JSON:**
```bash
# Usar um validador online ou
node -e "console.log(JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')))"
```

2. **Problemas comuns:**
```json
{
  "key": "value",  // ❌ Vírgula extra
  "last": "value"
}

{
  "key": "value",
  "last": "value"  // ✅ Correto
}
```

#### Erro: "Pattern doesn't match any Serverless Functions"

**Sintomas:**
```bash
The pattern "app/api/**/*.js" doesn't match any Serverless Functions
```

**Causa:** Configuração de functions para arquivos inexistentes.

**Soluções:**

1. **Remover configuração desnecessária:**
```json
{
  // ❌ Remover se não há API routes
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

2. **Configurar apenas se necessário:**
```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

### 4. Problemas de Runtime

#### Erro: "Algo deu errado" na aplicação

**Sintomas:** Página em branco com mensagem genérica.

**Diagnóstico:**

1. **Verificar console do navegador:**
```javascript
// Abrir DevTools (F12) e verificar erros
console.log('Checking for errors...');
```

2. **Verificar Network tab:**
- Recursos falhando ao carregar
- Erros 404 ou 500
- Problemas de CORS

3. **Verificar logs da Vercel:**
```bash
vercel logs [deployment-url]
```

**Soluções:**

1. **Implementar ErrorBoundary melhorado:**
```typescript
// Já implementado em src/components/ErrorBoundary.tsx
```

2. **Adicionar logging detalhado:**
```typescript
// Usar errorMonitoring.reportError()
```

#### Erro: "Module not found"

**Sintomas:**
```bash
Module not found: Can't resolve './components/Component'
```

**Causa:** Imports incorretos ou arquivos faltantes.

**Soluções:**

1. **Verificar paths:**
```typescript
// ❌ Incorreto
import Component from './components/Component';

// ✅ Correto
import Component from '../components/Component';
```

2. **Usar alias configurados:**
```typescript
// ✅ Usar alias do tsconfig.json
import Component from '@/components/Component';
```

3. **Verificar case sensitivity:**
```typescript
// ❌ Case incorreto
import component from './Component';

// ✅ Case correto
import Component from './Component';
```

### 5. Problemas de Performance

#### Build muito lento

**Sintomas:** Build demora mais de 5 minutos.

**Soluções:**

1. **Otimizar dependências:**
```json
{
  "optimizeDeps": {
    "exclude": ["large-package"]
  }
}
```

2. **Usar cache:**
```json
{
  "build": {
    "rollupOptions": {
      "cache": true
    }
  }
}
```

3. **Reduzir bundle size:**
```bash
npm run analyze
```

#### Bundle muito grande

**Sintomas:** Bundle > 50MB.

**Soluções:**

1. **Code splitting:**
```typescript
const LazyComponent = lazy(() => import('./Component'));
```

2. **Tree shaking:**
```typescript
// ❌ Import completo
import * as lodash from 'lodash';

// ✅ Import específico
import { debounce } from 'lodash';
```

3. **Remover dependências não utilizadas:**
```bash
npm uninstall unused-package
```

### 6. Problemas de Ambiente

#### Variáveis de ambiente não funcionam

**Sintomas:** `import.meta.env.VITE_VAR` retorna undefined.

**Soluções:**

1. **Verificar prefixo VITE_:**
```bash
# ❌ Não funciona
REACT_APP_API_URL=...

# ✅ Funciona
VITE_API_URL=...
```

2. **Configurar no vercel.json:**
```json
{
  "env": {
    "VITE_API_URL": "https://api.example.com"
  }
}
```

3. **Verificar no dashboard da Vercel:**
- Project Settings > Environment Variables

#### Diferenças entre desenvolvimento e produção

**Sintomas:** Funciona localmente mas não na Vercel.

**Soluções:**

1. **Testar build local:**
```bash
npm run build
npm run preview
```

2. **Verificar modo de produção:**
```typescript
if (import.meta.env.PROD) {
  // Código específico para produção
}
```

3. **Usar mesmas variáveis:**
```bash
# .env.local
VITE_API_URL=http://localhost:3000

# vercel.json
"env": {
  "VITE_API_URL": "https://api.production.com"
}
```

## 🔍 Ferramentas de Debug

### 1. Logs da Vercel

```bash
# Ver logs em tempo real
vercel logs --follow

# Ver logs de um deployment específico
vercel logs [deployment-url]

# Ver logs com filtro
vercel logs --since=1h
```

### 2. Build Local

```bash
# Build de produção local
npm run build:deploy

# Servir build local
npm run preview

# Analisar bundle
npm run analyze
```

### 3. DevTools do Navegador

1. **Console:** Verificar erros JavaScript
2. **Network:** Verificar requests falhando
3. **Application:** Verificar localStorage/sessionStorage
4. **Performance:** Verificar métricas de carregamento

### 4. Monitoramento Customizado

```typescript
// Usar sistema de monitoramento implementado
import { errorMonitoring } from './utils/errorMonitoring';

// Reportar erro customizado
errorMonitoring.reportError({
  message: 'Custom error',
  severity: 'high',
  context: { customData: 'value' }
});

// Ver relatório de saúde
const health = errorMonitoring.generateHealthReport();
```

## 📞 Quando Pedir Ajuda

### Informações para Incluir

1. **URL do deployment:** https://fisioflow-xxx.vercel.app
2. **Logs completos:** `vercel logs [url]`
3. **Passos para reproduzir**
4. **Comportamento esperado vs atual**
5. **Ambiente:** Browser, OS, versão
6. **Configurações:** vercel.json, package.json relevantes

### Canais de Suporte

1. **Vercel Support:** https://vercel.com/support
2. **GitHub Issues:** Para bugs do projeto
3. **Discord/Slack:** Para discussões da equipe

## 🛠️ Scripts de Diagnóstico

### Script de Health Check

```bash
#!/bin/bash
echo "🔍 FisioFlow Health Check"
echo "========================"

# Verificar se a aplicação está respondendo
curl -f https://fisioflow.vercel.app/ || echo "❌ App não está respondendo"

# Verificar assets principais
curl -f https://fisioflow.vercel.app/assets/ || echo "❌ Assets não encontrados"

# Verificar manifest
curl -f https://fisioflow.vercel.app/manifest.json || echo "❌ Manifest não encontrado"

echo "✅ Health check concluído"
```

### Script de Debug Local

```bash
#!/bin/bash
echo "🐛 Debug Local"
echo "=============="

# Limpar cache
rm -rf node_modules/.cache
rm -rf dist

# Reinstalar dependências
npm install

# Build e teste
npm run build:deploy
npm run preview &

# Aguardar e testar
sleep 5
curl -f http://localhost:4173 || echo "❌ Preview não está funcionando"

echo "✅ Debug local concluído"
```

---

**Dica:** Sempre mantenha este guia atualizado com novos problemas e soluções encontrados!