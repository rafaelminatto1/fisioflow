# 🤝 Contribuindo para o FisioFlow

Obrigado por considerar contribuir para o FisioFlow! Este documento fornece diretrizes para contribuições.

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Git
- Conhecimento em React, TypeScript e TailwindCSS

## 🚀 Configuração do Ambiente de Desenvolvimento

1. **Fork e clone o repositório**:
```bash
git clone https://github.com/seu-usuario/fisioflow.git
cd fisioflow
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env.local
# Edite .env.local com suas configurações
```

4. **Execute os testes**:
```bash
npm run test
```

5. **Inicie o servidor de desenvolvimento**:
```bash
npm run dev
```

## 📝 Padrões de Código

### Commits
Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` formatação
- `refactor:` refatoração
- `test:` testes
- `chore:` tarefas de manutenção

### Código
- Use TypeScript para tipagem forte
- Siga os padrões do ESLint e Prettier
- Escreva testes para novas funcionalidades
- Mantenha componentes pequenos e reutilizáveis

### Estrutura de Arquivos
```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes UI base
│   └── [Feature]/      # Componentes específicos
├── hooks/              # Hooks customizados
├── services/           # Serviços e APIs
├── types.ts           # Tipos TypeScript
└── constants.tsx      # Constantes
```

## 🔄 Processo de Contribuição

1. **Crie uma issue** descrevendo o problema ou funcionalidade
2. **Fork o repositório**
3. **Crie uma branch** a partir da `main`:
   ```bash
   git checkout -b feat/nova-funcionalidade
   ```
4. **Faça suas alterações** seguindo os padrões
5. **Execute os testes**:
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```
6. **Commit suas alterações**:
   ```bash
   git commit -m "feat: adiciona nova funcionalidade"
   ```
7. **Push para sua branch**:
   ```bash
   git push origin feat/nova-funcionalidade
   ```
8. **Abra um Pull Request**

## 🧪 Testes

- Escreva testes unitários para novas funcionalidades
- Use Jest e Testing Library
- Mantenha cobertura de testes acima de 80%
- Execute testes antes de fazer commit:
  ```bash
  npm run test:coverage
  ```

## 📚 Documentação

- Documente novas funcionalidades no README.md
- Adicione comentários JSDoc para funções complexas
- Atualize a DOCUMENTACAO.md se necessário

## 🐛 Reportando Bugs

Ao reportar bugs, inclua:

- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots se aplicável
- Informações do ambiente (OS, browser, versão)

## 💡 Sugerindo Funcionalidades

Para sugerir novas funcionalidades:

- Verifique se já não existe uma issue similar
- Descreva claramente o problema que resolve
- Explique como a funcionalidade funcionaria
- Considere alternativas

## 📞 Suporte

Se precisar de ajuda:

- Abra uma issue com a tag `question`
- Consulte a documentação completa
- Verifique issues existentes

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença do projeto.

---

**Obrigado por contribuir para o FisioFlow! 🙏**