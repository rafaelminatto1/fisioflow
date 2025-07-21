# Sistema de Testes e Qualidade de Código - FisioFlow

## 🚀 Configuração Completa

O projeto FisioFlow agora possui um sistema completo de qualidade de código com:

- ✅ **Vitest** - Testes unitários rápidos
- ✅ **React Testing Library** - Testes de componentes
- ✅ **ESLint** - Análise estática de código
- ✅ **Prettier** - Formatação automática
- ✅ **Husky** - Git hooks
- ✅ **Commitlint** - Padronização de commits

## 📋 Comandos Disponíveis

### Testes

```bash
# Executar todos os testes
npm run test

# Interface visual dos testes
npm run test:ui

# Executar testes uma vez (CI)
npm run test:run

# Relatório de cobertura
npm run test:coverage
```

### Linting e Formatação

```bash
# Verificar problemas no código
npm run lint

# Corrigir problemas automaticamente
npm run lint:fix

# Formatar código
npm run format

# Verificar formatação
npm run format:check

# Verificar tipos TypeScript
npm run type-check
```

### Build e Desenvolvimento

```bash
# Servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 🧪 Exemplo de Teste

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

function Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-blue-500 text-white rounded">
      {children}
    </button>
  )
}

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## 📁 Estrutura de Testes

```
src/
├── components/
│   └── __tests__/
│       └── Component.test.tsx
├── hooks/
│   └── __tests__/
│       └── useHook.test.ts
├── utils/
│   └── __tests__/
│       └── utility.test.ts
└── test/
    └── setup.ts
```

## ⚙️ Configurações

### ESLint (.eslintrc.json)

- Regras para React e TypeScript
- Detecção de hooks incorretos
- Variáveis não utilizadas
- Boas práticas de código

### Prettier (.prettierrc)

- Formatação consistente
- Integração com Tailwind CSS
- Aspas simples, ponto e vírgula

### Vitest (vitest.config.ts)

- Ambiente jsdom para testes React
- Cobertura de código com v8
- Setup automático do jest-dom

### Husky

- Pre-commit: lint + format
- Commit-msg: validação de mensagens

## 🎯 Padrões de Commit

```bash
# Tipos permitidos:
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação
refactor: refatoração
test: testes
chore: tarefas de manutenção
perf: melhorias de performance
ci: integração contínua
build: build do projeto
revert: reverter commit

# Exemplos:
git commit -m "feat: adicionar componente de login"
git commit -m "fix: corrigir validação de email"
git commit -m "test: adicionar testes para useAuth hook"
```

## 🚨 Resolução de Problemas

### Erro de Rollup

Se encontrar erros relacionados ao rollup, execute:

```bash
npm install --force
```

### Husky não funciona

Se o husky não estiver funcionando:

```bash
git init
npm run prepare
```

### ESLint com muitos erros

Para corrigir automaticamente:

```bash
npm run lint:fix
npm run format
```

## 📊 Métricas de Qualidade

- **Cobertura de testes**: Mínimo 80%
- **ESLint**: 0 erros, máximo 0 warnings
- **TypeScript**: Sem erros de tipo
- **Prettier**: Formatação consistente

## 🔄 Workflow de Desenvolvimento

1. **Desenvolvimento**: `npm run dev`
2. **Testes**: `npm run test`
3. **Linting**: `npm run lint`
4. **Formatação**: `npm run format`
5. **Build**: `npm run build`
6. **Commit**: Mensagem padronizada

---

**Status**: ✅ Sistema configurado e funcionando
**Última atualização**: Janeiro 2025
**Versão**: 1.0.0
