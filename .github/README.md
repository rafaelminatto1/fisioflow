# 🚀 GitHub Actions CI/CD Setup

Este diretório contém os workflows de CI/CD para o projeto FisioFlow.

## 📋 Workflows Configurados

### 1. 🧪 CI/CD Pipeline (`ci.yml`)
**Triggers**: Push para `main`/`develop`, Pull Requests para `main`

**Jobs**:
- ✅ **Tests & Code Quality**: ESLint, Prettier, TypeScript, Jest
- 🏗️ **Build**: Compilação da aplicação
- 🔒 **Security Scan**: npm audit + Snyk
- 🚀 **Deploy Staging**: Deploy automático para staging (branch main)
- 🌟 **Deploy Production**: Deploy para produção (tags v*)

### 2. 🤖 Dependabot Auto-merge (`dependabot-auto-merge.yml`)
**Triggers**: Pull Requests do Dependabot

**Funcionalidade**: Aprova e faz merge automático de PRs do Dependabot após testes passarem

### 3. 🔍 CodeQL Security Analysis (`codeql.yml`)
**Triggers**: Push, Pull Requests, Schedule (segundas 6h UTC)

**Funcionalidade**: Análise de segurança do código com GitHub CodeQL

### 4. 📦 Dependabot Configuration (`dependabot.yml`)
**Funcionalidade**: Configuração para atualizações automáticas de dependências

## 🔐 Secrets Necessários

Para configurar os workflows, adicione estes secrets no GitHub:

### Repository Secrets
Vá em: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

#### Para Deploy (Vercel)
```
VERCEL_TOKEN=seu_token_vercel
VERCEL_ORG_ID=seu_org_id_vercel
VERCEL_PROJECT_ID=seu_project_id_vercel
```

#### Para Security Scan (Opcional)
```
SNYK_TOKEN=seu_token_snyk
```

### Como Obter os Tokens

#### 🔹 Vercel Token
1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em `Settings` → `Tokens`
3. Crie um novo token com escopo apropriado
4. Copie o token gerado

#### 🔹 Vercel Org ID e Project ID
1. No terminal do projeto:
```bash
npx vercel link
# Siga as instruções para conectar o projeto

# Os IDs estarão em .vercel/project.json
cat .vercel/project.json
```

#### 🔹 Snyk Token (Opcional)
1. Crie conta em [Snyk.io](https://snyk.io)
2. Vá em `Settings` → `API Token`
3. Copie o token

## 🌍 Environments

Configure os environments no GitHub:

### Staging Environment
1. Vá em `Settings` → `Environments`
2. Crie environment `staging`
3. Configure regras de proteção se necessário

### Production Environment
1. Crie environment `production`
2. **Recomendado**: Adicione required reviewers
3. **Recomendado**: Adicione deployment branch rule para tags `v*`

## 🏷️ Deployment com Tags

Para fazer deploy em produção:

```bash
# Criar e push de tag
git tag v1.0.0
git push origin v1.0.0

# Ou usar GitHub CLI
gh release create v1.0.0 --title "FisioFlow v1.0.0" --notes "Nova versão com funcionalidades X, Y, Z"
```

## 📊 Status Badges

Adicione estes badges no README principal:

```markdown
[![CI/CD](https://github.com/rafaelminatto1/fisioflow/actions/workflows/ci.yml/badge.svg)](https://github.com/rafaelminatto1/fisioflow/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rafaelminatto1/fisioflow/actions/workflows/codeql.yml/badge.svg)](https://github.com/rafaelminatto1/fisioflow/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/rafaelminatto1/fisioflow/branch/main/graph/badge.svg)](https://codecov.io/gh/rafaelminatto1/fisioflow)
```

## 🔧 Customização

### Modificar Node.js Versions
Edite a matrix em `ci.yml`:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 21.x]  # Adicione versões conforme necessário
```

### Adicionar Mais Ambientes
1. Duplique o job `deploy-staging`
2. Modifique as condições de trigger
3. Configure novo environment no GitHub

### Modificar Schedule do CodeQL
```yaml
schedule:
  - cron: '0 6 * * 1'  # Segunda às 6h UTC
  # Formato: minuto hora dia-do-mês mês dia-da-semana
```

## 🚨 Troubleshooting

### Build Falha
- Verifique se todos os scripts existem no `package.json`
- Confirme que as dependências estão corretas
- Verifique logs detalhados na aba Actions

### Deploy Falha
- Confirme que todos os secrets estão configurados
- Verifique se o projeto está conectado no Vercel
- Confirme permissões do token

### Dependabot Não Funciona
- Verifique se o arquivo `dependabot.yml` está na pasta correta
- Confirme que as permissões do repositório permitem PRs automáticos

## 📚 Recursos Adicionais

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel GitHub Integration](https://vercel.com/docs/concepts/git/vercel-for-github)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [CodeQL Documentation](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning-with-codeql)