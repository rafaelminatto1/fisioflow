#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  testFrameworks: ['jest', 'vitest'],
  testTypes: ['unit', 'integration', 'e2e'],
  coverageThreshold: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
  outputDir: 'test-reports',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Utilitários
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}`, msg),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}`, msg),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset}`, msg),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}`, msg),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}\n${msg}${colors.reset}`),
};

const execCommand = (command, options = {}) => {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const readPackageJson = () => {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  } catch (error) {
    log.error('Erro ao ler package.json');
    process.exit(1);
  }
};

const checkDependencies = () => {
  log.title('Verificando Dependências');
  
  const pkg = readPackageJson();
  const requiredDeps = {
    jest: '@testing-library/jest-dom',
    vitest: '@testing-library/react',
    coverage: 'c8',
  };
  
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const missing = [];
  
  Object.entries(requiredDeps).forEach(([tool, dep]) => {
    if (!allDeps[dep]) {
      missing.push(`${dep} (para ${tool})`);
    }
  });
  
  if (missing.length > 0) {
    log.warning('Dependências faltando:');
    missing.forEach(dep => log.warning(`  - ${dep}`));
    log.info('Execute: npm install --save-dev ' + missing.map(d => d.split(' ')[0]).join(' '));
  } else {
    log.success('Todas as dependências estão instaladas');
  }
  
  return missing.length === 0;
};

const runJestTests = (testType = 'all', options = {}) => {
  log.title(`Executando Testes Jest - ${testType}`);
  
  let command = 'npx jest';
  
  // Configurar padrões de teste baseado no tipo
  switch (testType) {
    case 'unit':
      command += ' --testPathPattern="\\.(test|spec)\\.(js|jsx|ts|tsx)$" --testPathIgnorePatterns="integration|e2e"';
      break;
    case 'integration':
      command += ' --testPathPattern="integration.*\\.(test|spec)\\.(js|jsx|ts|tsx)$"';
      break;
    case 'e2e':
      command += ' --testPathPattern="e2e.*\\.(test|spec)\\.(js|jsx|ts|tsx)$"';
      break;
    default:
      // Executar todos os testes
      break;
  }
  
  // Adicionar opções
  if (options.coverage) {
    command += ' --coverage';
    command += ` --coverageDirectory=${CONFIG.outputDir}/jest-coverage`;
    command += ' --coverageReporters=text,lcov,html,json';
  }
  
  if (options.watch) {
    command += ' --watch';
  }
  
  if (options.verbose) {
    command += ' --verbose';
  }
  
  if (options.bail) {
    command += ' --bail';
  }
  
  // Executar comando
  const result = execCommand(command);
  
  if (result.success) {
    log.success('Testes Jest executados com sucesso');
  } else {
    log.error('Falha nos testes Jest');
    if (options.exitOnFail) {
      process.exit(1);
    }
  }
  
  return result;
};

const runVitestTests = (testType = 'all', options = {}) => {
  log.title(`Executando Testes Vitest - ${testType}`);
  
  let command = 'npx vitest';
  
  // Configurar padrões de teste baseado no tipo
  switch (testType) {
    case 'unit':
      command += ' run --reporter=verbose';
      break;
    case 'integration':
      command += ' run --reporter=verbose integration';
      break;
    case 'e2e':
      command += ' run --reporter=verbose e2e';
      break;
    default:
      command += ' run';
      break;
  }
  
  // Adicionar opções
  if (options.coverage) {
    command += ' --coverage';
    command += ` --coverage.reportsDirectory=${CONFIG.outputDir}/vitest-coverage`;
  }
  
  if (options.watch) {
    command = command.replace(' run', '');
  }
  
  if (options.ui) {
    command += ' --ui';
  }
  
  // Executar comando
  const result = execCommand(command);
  
  if (result.success) {
    log.success('Testes Vitest executados com sucesso');
  } else {
    log.error('Falha nos testes Vitest');
    if (options.exitOnFail) {
      process.exit(1);
    }
  }
  
  return result;
};

const runLinting = () => {
  log.title('Executando Linting');
  
  const commands = [
    'npx eslint src --ext .js,.jsx,.ts,.tsx',
    'npx prettier --check src',
  ];
  
  let allPassed = true;
  
  commands.forEach(command => {
    log.info(`Executando: ${command}`);
    const result = execCommand(command);
    
    if (!result.success) {
      allPassed = false;
      log.error(`Falha em: ${command}`);
    }
  });
  
  if (allPassed) {
    log.success('Linting passou em todas as verificações');
  } else {
    log.error('Falhas encontradas no linting');
  }
  
  return allPassed;
};

const runTypeChecking = () => {
  log.title('Verificando Tipos TypeScript');
  
  const result = execCommand('npx tsc --noEmit');
  
  if (result.success) {
    log.success('Verificação de tipos passou');
  } else {
    log.error('Erros de tipo encontrados');
  }
  
  return result.success;
};

const generateCoverageReport = () => {
  log.title('Gerando Relatório de Cobertura Consolidado');
  
  const coverageDirs = [
    `${CONFIG.outputDir}/jest-coverage`,
    `${CONFIG.outputDir}/vitest-coverage`,
  ];
  
  const reports = [];
  
  coverageDirs.forEach(dir => {
    const summaryPath = path.join(dir, 'coverage-summary.json');
    if (fs.existsSync(summaryPath)) {
      try {
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        reports.push({ dir, summary });
      } catch (error) {
        log.warning(`Erro ao ler relatório de cobertura: ${summaryPath}`);
      }
    }
  });
  
  if (reports.length === 0) {
    log.warning('Nenhum relatório de cobertura encontrado');
    return false;
  }
  
  // Consolidar métricas
  const consolidated = {
    statements: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    lines: { total: 0, covered: 0 },
  };
  
  reports.forEach(({ summary }) => {
    if (summary.total) {
      Object.keys(consolidated).forEach(metric => {
        consolidated[metric].total += summary.total[metric]?.total || 0;
        consolidated[metric].covered += summary.total[metric]?.covered || 0;
      });
    }
  });
  
  // Calcular percentuais
  const percentages = {};
  Object.keys(consolidated).forEach(metric => {
    const { total, covered } = consolidated[metric];
    percentages[metric] = total > 0 ? (covered / total) * 100 : 0;
  });
  
  // Exibir relatório
  log.title('Relatório de Cobertura Consolidado');
  Object.entries(percentages).forEach(([metric, percentage]) => {
    const threshold = CONFIG.coverageThreshold[metric];
    const status = percentage >= threshold ? '✓' : '✗';
    const color = percentage >= threshold ? colors.green : colors.red;
    
    console.log(
      `${status} ${metric.padEnd(12)}: ${color}${percentage.toFixed(2)}%${colors.reset} (threshold: ${threshold}%)`
    );
  });
  
  // Salvar relatório consolidado
  const reportPath = path.join(CONFIG.outputDir, 'coverage-consolidated.json');
  fs.writeFileSync(reportPath, JSON.stringify({ consolidated, percentages }, null, 2));
  log.info(`Relatório salvo em: ${reportPath}`);
  
  // Verificar se passou nos thresholds
  const passed = Object.entries(percentages).every(
    ([metric, percentage]) => percentage >= CONFIG.coverageThreshold[metric]
  );
  
  if (passed) {
    log.success('Cobertura atende aos thresholds definidos');
  } else {
    log.error('Cobertura abaixo dos thresholds definidos');
  }
  
  return passed;
};

const runAllTests = (options = {}) => {
  log.title('Executando Suíte Completa de Testes');
  
  ensureDir(CONFIG.outputDir);
  
  const results = {
    dependencies: false,
    linting: false,
    typeChecking: false,
    jestUnit: false,
    jestIntegration: false,
    vitestUnit: false,
    coverage: false,
  };
  
  // 1. Verificar dependências
  results.dependencies = checkDependencies();
  if (!results.dependencies && options.strict) {
    log.error('Dependências faltando - abortando');
    return results;
  }
  
  // 2. Linting
  if (options.skipLinting) {
    log.info('Pulando linting');
    results.linting = true;
  } else {
    results.linting = runLinting();
  }
  
  // 3. Type checking
  if (options.skipTypeCheck) {
    log.info('Pulando verificação de tipos');
    results.typeChecking = true;
  } else {
    results.typeChecking = runTypeChecking();
  }
  
  // 4. Testes unitários Jest
  if (options.framework === 'vitest') {
    log.info('Pulando testes Jest');
    results.jestUnit = true;
    results.jestIntegration = true;
  } else {
    results.jestUnit = runJestTests('unit', { coverage: options.coverage, bail: true }).success;
    results.jestIntegration = runJestTests('integration', { coverage: options.coverage, bail: true }).success;
  }
  
  // 5. Testes Vitest
  if (options.framework === 'jest') {
    log.info('Pulando testes Vitest');
    results.vitestUnit = true;
  } else {
    results.vitestUnit = runVitestTests('unit', { coverage: options.coverage }).success;
  }
  
  // 6. Relatório de cobertura
  if (options.coverage) {
    results.coverage = generateCoverageReport();
  } else {
    results.coverage = true;
  }
  
  // Resumo final
  log.title('Resumo dos Resultados');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? `${colors.green}✓ PASSOU${colors.reset}` : `${colors.red}✗ FALHOU${colors.reset}`;
    console.log(`${test.padEnd(20)}: ${status}`);
  });
  
  const allPassed = Object.values(results).every(Boolean);
  
  if (allPassed) {
    log.success('\nTodos os testes passaram! 🎉');
  } else {
    log.error('\nAlguns testes falharam 😞');
    if (options.exitOnFail) {
      process.exit(1);
    }
  }
  
  return results;
};

// CLI
const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    framework: null, // 'jest' | 'vitest' | null (ambos)
    testType: 'all', // 'unit' | 'integration' | 'e2e' | 'all'
    coverage: false,
    watch: false,
    skipLinting: false,
    skipTypeCheck: false,
    strict: false,
    exitOnFail: false,
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--framework':
        options.framework = args[++i];
        break;
      case '--type':
        options.testType = args[++i];
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--skip-linting':
        options.skipLinting = true;
        break;
      case '--skip-type-check':
        options.skipTypeCheck = true;
        break;
      case '--strict':
        options.strict = true;
        break;
      case '--exit-on-fail':
        options.exitOnFail = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          log.warning(`Opção desconhecida: ${arg}`);
        }
        break;
    }
  }
  
  return options;
};

const showHelp = () => {
  console.log(`
${colors.bright}Test Runner - FisioFlow${colors.reset}

Uso: node scripts/test-runner.js [opções]

Opções:
  --framework <jest|vitest>    Executar apenas um framework específico
  --type <unit|integration|e2e|all>  Tipo de testes a executar (padrão: all)
  --coverage                   Gerar relatório de cobertura
  --watch                      Executar em modo watch
  --skip-linting              Pular verificação de linting
  --skip-type-check           Pular verificação de tipos
  --strict                     Modo estrito - falha se dependências faltarem
  --exit-on-fail              Sair com código de erro se testes falharem
  --verbose                    Saída detalhada
  --help                       Mostrar esta ajuda

Exemplos:
  node scripts/test-runner.js --coverage
  node scripts/test-runner.js --framework jest --type unit
  node scripts/test-runner.js --watch --framework vitest
  node scripts/test-runner.js --strict --exit-on-fail
`);
};

// Executar
if (require.main === module) {
  const options = parseArgs();
  
  if (options.watch) {
    if (options.framework === 'jest') {
      runJestTests(options.testType, { watch: true, coverage: options.coverage });
    } else if (options.framework === 'vitest') {
      runVitestTests(options.testType, { watch: true, coverage: options.coverage });
    } else {
      log.error('Modo watch requer especificar um framework (--framework jest|vitest)');
      process.exit(1);
    }
  } else {
    runAllTests(options);
  }
}

module.exports = {
  runJestTests,
  runVitestTests,
  runLinting,
  runTypeChecking,
  generateCoverageReport,
  runAllTests,
};