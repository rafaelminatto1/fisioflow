# 🧪 FisioFlow - Documentação de Testes

Este documento descreve a estratégia de testes implementada no projeto FisioFlow, incluindo configurações, estrutura de testes e como executá-los.

## 📊 Visão Geral

O projeto utiliza uma estratégia de testes multicamada com:
- **Vitest** para testes unitários
- **Jest** para testes de integração
- **React Testing Library** para testes de componentes
- **Cobertura de código** com metas de 70%+

## 🏗️ Estrutura de Testes

```
├── services/__tests__/           # Testes dos serviços
│   ├── encryption.test.ts        # Criptografia AES-256-GCM
│   ├── secureStorage.test.ts     # IndexedDB seguro
│   └── auditLogger.test.ts       # Logs de auditoria LGPD
├── hooks/__tests__/              # Testes dos hooks React
│   ├── useSecureData.test.tsx    # Gerenciamento seguro de dados
│   ├── usePatients.test.tsx      # React Query para pacientes
│   └── useOptimizedComponent.test.tsx # Otimizações de performance
├── components/ui/__tests__/      # Testes de componentes UI
│   └── VirtualizedList.test.tsx  # Lista virtualizada
├── utils/__tests__/              # Testes de utilitários
│   └── validations.test.ts       # Validações e formatações
└── tests/integration/            # Testes de integração
    └── patientManagement.integration.test.tsx
```

## ⚙️ Configuração

### Vitest (Testes Unitários)
- **Arquivo**: `vitest.config.ts`
- **Ambiente**: jsdom
- **Setup**: `src/test/setup.ts`
- **Cobertura**: V8 provider
- **Metas**: 70% branches, functions, lines, statements

### Jest (Testes de Integração)
- **Arquivo**: `jest.config.js`
- **Preset**: ts-jest
- **Ambiente**: jsdom
- **Timeout**: 15s para operações complexas
- **Isolamento**: Por tenant para segurança

## 🎯 Categorias de Testes

### 1. Testes de Segurança
**Localização**: `services/__tests__/`

#### Encryption Service (`encryption.test.ts`)
- ✅ Geração de chaves mestras
- ✅ Criptografia AES-256-GCM de dados de pacientes
- ✅ Descriptografia segura
- ✅ Verificação de integridade SHA-256
- ✅ Derivação de chaves PBKDF2
- ✅ Isolamento por tenant
- ✅ Tratamento de erros de criptografia

#### Secure Storage (`secureStorage.test.ts`)
- ✅ Armazenamento IndexedDB
- ✅ Estratégia de storage por sensibilidade
- ✅ Operações CRUD seguras
- ✅ Isolamento de dados por tenant
- ✅ Limpeza automática de dados antigos
- ✅ Migração de localStorage para IndexedDB
- ✅ Estatísticas de uso de storage

#### Audit Logger (`auditLogger.test.ts`)
- ✅ Logs compatíveis com LGPD
- ✅ Rastreamento de ações críticas
- ✅ Retenção de 7 anos
- ✅ Sanitização de dados sensíveis
- ✅ Filtros e consultas de auditoria
- ✅ Limpeza automática de logs expirados

### 2. Testes de Data Management
**Localização**: `hooks/__tests__/`

#### Secure Data Hook (`useSecureData.test.tsx`)
- ✅ Salvamento seguro de pacientes
- ✅ Recuperação e descriptografia
- ✅ Verificação de integridade
- ✅ Validação de tenant
- ✅ Logs de auditoria automáticos
- ✅ Tratamento de erros de segurança

#### Patients Hook (`usePatients.test.tsx`)
- ✅ React Query para caching inteligente
- ✅ Operações CRUD completas
- ✅ Invalidação de cache
- ✅ Estados de loading/error
- ✅ Isolamento por tenant
- ✅ Retry automático

### 3. Testes de Performance
**Localização**: `hooks/__tests__/`

#### Optimized Components (`useOptimizedComponent.test.tsx`)
- ✅ `useStableCallback` - callbacks estáveis
- ✅ `useOptimizedDebounce` - debounce inteligente
- ✅ `useVirtualScrolling` - scroll virtualizado
- ✅ `useFormOptimization` - otimização de forms
- ✅ `useComponentMetrics` - métricas de performance

### 4. Testes de UI Components
**Localização**: `components/ui/__tests__/`

#### Virtualized List (`VirtualizedList.test.tsx`)
- ✅ Renderização de listas grandes (10k+ items)
- ✅ Busca com debounce
- ✅ Seleção múltipla
- ✅ Scroll infinito
- ✅ Ordenação
- ✅ Estados de loading/erro
- ✅ Acessibilidade (ARIA)

### 5. Testes de Validações
**Localização**: `utils/__tests__/`

#### Validations (`validations.test.ts`)
- ✅ CPF brasileiro com algoritmo correto
- ✅ Email RFC-compliant
- ✅ Telefone brasileiro
- ✅ CEP formato nacional
- ✅ CRM médico com estado
- ✅ Formatação de dados
- ✅ Sanitização de entrada
- ✅ Schemas de validação customizados

### 6. Testes de Integração
**Localização**: `tests/integration/`

#### Patient Management (`patientManagement.integration.test.tsx`)
- ✅ Fluxo completo CRUD de pacientes
- ✅ Criptografia end-to-end
- ✅ Logs de auditoria em cada operação
- ✅ Isolamento de tenant
- ✅ Verificação de integridade
- ✅ Tratamento de erros
- ✅ Performance em operações bulk

## 🚀 Executando os Testes

### Comandos Básicos

```bash
# Todos os testes
npm run test

# Apenas testes unitários (Vitest)
npm run test:unit

# Apenas testes de integração (Jest)
npm run test:integration

# Com cobertura
npm run test:coverage:full

# Modo watch
npm run test:unit:watch
npm run test:integration:watch

# Testes específicos
npm run test:hooks
npm run test:components
npm run test:utils
```

### Script Personalizado

```bash
# Usando o test runner customizado
node scripts/test-runner.js --help

# Exemplos
node scripts/test-runner.js --coverage
node scripts/test-runner.js --framework jest --type integration
node scripts/test-runner.js --watch --framework vitest
```

## 📈 Métricas de Cobertura

### Metas de Cobertura
- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### Áreas Críticas (90%+ cobertura)
- Services de segurança
- Validações de dados
- Hooks de dados
- Componentes de UI principais

### Exclusões de Cobertura
- Arquivos de configuração
- Mocks e setup de testes
- Tipos TypeScript
- Main entry points

## 🛡️ Testes de Segurança

### Cenários Críticos Testados

1. **Criptografia AES-256-GCM**
   - Geração segura de IVs únicos
   - Chaves derivadas por tenant
   - Verificação de integridade SHA-256

2. **Isolamento de Tenant**
   - Dados isolados por tenant
   - Validação de acesso cruzado
   - Logs de auditoria por tenant

3. **Conformidade LGPD**
   - Logs de acesso a dados pessoais
   - Retenção de 7 anos
   - Sanitização de dados sensíveis

4. **Tratamento de Erros**
   - Falhas de criptografia
   - Corrupção de dados
   - Ataques de injeção

## 🧩 Mocks e Setup

### Mocks Globais
- **IndexedDB**: `fake-indexeddb`
- **Crypto API**: Polyfill nativo
- **React Query**: Client de teste
- **Storage APIs**: Implementação em memória

### Setup de Teste
- **Limpeza automática**: Após cada teste
- **Timeouts**: 10s para unit, 15s para integration
- **Isolamento**: Cada teste em sandbox

## 📊 Relatórios

### Localizações dos Relatórios
- **Vitest**: `coverage/html/index.html`
- **Jest**: `coverage/jest/lcov-report/index.html`
- **Consolidado**: `test-reports/coverage-consolidated.json`

### Métricas Rastreadas
- Tempo de execução dos testes
- Cobertura por arquivo/pasta
- Testes flaky
- Performance de componentes

## 🔧 Troubleshooting

### Problemas Comuns

1. **Erro de IndexedDB**
   ```bash
   # Instalar fake-indexeddb
   npm install --save-dev fake-indexeddb
   ```

2. **Timeouts em Testes**
   ```typescript
   // Aumentar timeout específico
   it('test name', async () => {
     // test code
   }, 15000); // 15s timeout
   ```

3. **Mocks não Funcionando**
   ```typescript
   // Limpar mocks entre testes
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

### Debug de Testes

```bash
# Modo verbose
npm run test:debug

# Teste específico
npm test -- --testNamePattern="encryption"

# Com breakpoints
npm run test -- --inspect-brk
```

## 🎯 Próximos Passos

### Melhorias Planejadas
- [ ] Testes E2E com Playwright
- [ ] Testes de performance automatizados
- [ ] CI/CD com quality gates
- [ ] Testes de acessibilidade
- [ ] Testes de compatibilidade cross-browser

### Expansão de Cobertura
- [ ] Testes de service workers
- [ ] Testes de PWA offline
- [ ] Testes de notificações push
- [ ] Testes de sincronização multi-device

## 📚 Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Nota**: Esta documentação é atualizada automaticamente conforme novos testes são adicionados ao projeto.