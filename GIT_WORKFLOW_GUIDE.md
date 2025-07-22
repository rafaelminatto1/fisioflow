# 🚀 Guia de Workflow Git Aprimorado - FisioFlow

## 📋 Visão Geral

Este guia documenta todas as melhorias implementadas no Git para otimizar o desenvolvimento do FisioFlow, incluindo hooks personalizados, aliases úteis, scripts de automação e configurações avançadas.

## 🛠️ Configurações Implementadas

### 📁 Arquivos Criados

- `.gitconfig-advanced` - Configurações Git avançadas
- `.gitignore_global` - Exclusões globais para todos os projetos
- `.husky/pre-commit` - Hook de pré-commit com verificações
- `.husky/commit-msg` - Hook de validação de mensagens
- `.husky/post-commit` - Hook pós-commit com automações
- `scripts/git-automation.ps1` - Scripts PowerShell para automação

## 🎯 Aliases Git Configurados

### Comandos Básicos Melhorados
```bash
git st          # Status resumido com branch
git co <branch> # Checkout
git br          # Listar branches
git ci -m "msg" # Commit
git df          # Diff
git dc          # Diff cached
```

### Logs Avançados
```bash
git lg          # Log gráfico resumido
git lga         # Log gráfico detalhado com cores
git last        # Último commit
```

### Gestão de Commits
```bash
git amend       # Amend sem editar mensagem
git fixup <hash># Commit fixup
git squash <hash># Commit squash
git unstage     # Remover do stage
git undo        # Desfazer último commit (soft)
```

### Push/Pull Otimizado
```bash
git pushf       # Push force com lease (seguro)
git pushu       # Push e configurar upstream
```

### Workflow Específico
```bash
git wip         # Commit rápido "work in progress"
git unwip       # Desfazer último WIP
```

## 🔧 Hooks Implementados

### Pre-commit Hook
**Executa automaticamente antes de cada commit:**

✅ **Verificações Realizadas:**
- Lint-staged (ESLint + Prettier)
- Detecção de arquivos grandes (>10MB)
- Verificação de secrets/keys expostos
- Verificação de imports não utilizados
- Execução de testes

### Commit-msg Hook
**Valida mensagens de commit:**

✅ **Validações:**
- Formato convencional (feat, fix, docs, etc.)
- Tamanho da mensagem
- Detecção de TODO/FIXME

📝 **Formato Esperado:**
```
<tipo>[escopo opcional]: <descrição>

Exemplos:
feat: adicionar autenticação de usuário
fix(auth): corrigir validação de token
docs: atualizar README com instruções
```

### Post-commit Hook
**Executa após commits bem-sucedidos:**

📊 **Funcionalidades:**
- Estatísticas do commit
- Sugestões baseadas no tipo de commit
- Próximos passos baseados na branch
- Detecção de arquivos não rastreados
- Referência do hash do commit

## 🤖 Scripts de Automação PowerShell

### Comandos Disponíveis

#### Gestão de Features
```powershell
# Criar nova feature
New-FeatureBranch "nome-da-feature"
# ou
feature "nome-da-feature"

# Finalizar feature
Complete-FeatureBranch "feat: implementar nova funcionalidade"
```

#### Hotfixes Urgentes
```powershell
# Criar hotfix
New-HotfixBranch "nome-do-hotfix"
# ou
hotfix "nome-do-hotfix"

# Finalizar hotfix
Complete-HotfixBranch "correção crítica de segurança"
```

#### Manutenção do Repositório
```powershell
# Limpar branches merged
Remove-MergedBranches
# ou
cleanup

# Sincronizar com upstream
Sync-WithUpstream
# ou
sync

# Backup do trabalho atual
Backup-CurrentWork
# ou
backup

# Estatísticas do repositório
Show-RepoStats
# ou
stats
```

## 📊 Configurações Avançadas

### Performance
- `core.preloadindex = true` - Carregamento otimizado
- `core.fscache = true` - Cache do sistema de arquivos
- `fetch.prune = true` - Limpeza automática

### Merge e Rebase
- `pull.rebase = true` - Rebase por padrão
- `rebase.autoSquash = true` - Squash automático
- `rebase.autoStash = true` - Stash automático

### Segurança
- `push.followTags = true` - Push de tags
- Detecção de secrets nos hooks
- Verificação de arquivos grandes

## 🎨 Cores Personalizadas

- **Branch atual:** Amarelo reverso
- **Branches locais:** Amarelo
- **Branches remotos:** Verde
- **Diff meta:** Amarelo bold
- **Adições:** Verde bold
- **Remoções:** Vermelho bold

## 🚦 Workflow Recomendado

### 1. Iniciar Nova Feature
```powershell
# PowerShell
feature "nova-funcionalidade"

# Ou Git tradicional
git co main
git pull origin main
git co -b feature/nova-funcionalidade
```

### 2. Desenvolvimento
```bash
# Commits frequentes
git wip  # Para salvar progresso

# Commit final
git ci -m "feat: implementar nova funcionalidade"
```

### 3. Finalizar Feature
```powershell
# PowerShell (automático)
Complete-FeatureBranch "feat: implementar nova funcionalidade"

# Ou manual
git pushu
# Criar PR no GitHub
```

### 4. Manutenção Regular
```powershell
# Limpeza semanal
cleanup

# Backup antes de mudanças grandes
backup

# Verificar estatísticas
stats
```

## 🔍 Comandos de Análise

### Histórico e Estatísticas
```bash
git lg                    # Visualizar histórico gráfico
git contributors          # Lista de contribuidores
git filehistory <arquivo> # Histórico de um arquivo específico
```

### Debugging
```bash
git last                  # Último commit
git df                    # Diferenças não staged
git dc                    # Diferenças staged
```

## 🛡️ Segurança e Boas Práticas

### Verificações Automáticas
- ✅ Detecção de secrets antes do commit
- ✅ Validação de mensagens de commit
- ✅ Execução de testes antes do commit
- ✅ Verificação de arquivos grandes

### Recomendações
- Use `git pushf` em vez de `git push --force`
- Sempre execute `backup` antes de operações arriscadas
- Mantenha mensagens de commit descritivas
- Execute `cleanup` regularmente

## 📚 Recursos Adicionais

### Documentação
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Husky Documentation](https://typicode.github.io/husky/)

### Troubleshooting

**Problema:** Hook não executa
```bash
# Verificar permissões
ls -la .husky/

# Reinstalar husky
npm run prepare
```

**Problema:** Alias não funciona
```bash
# Verificar configuração
git config --list | grep alias

# Reaplicar configuração
git config --global include.path .gitconfig-advanced
```

## 🎯 Próximos Passos

1. **Treinar equipe** nos novos comandos e workflows
2. **Documentar** processos específicos do projeto
3. **Customizar** hooks para necessidades específicas
4. **Integrar** com ferramentas de CI/CD
5. **Monitorar** eficácia das melhorias

---

**🚀 Com essas melhorias, o workflow Git do FisioFlow está otimizado para máxima produtividade e qualidade de código!**