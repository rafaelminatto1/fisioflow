#!/usr/bin/env node

/**
 * Fix Vercel Dependencies - FisioFlow
 * Remove dependências de teste problemáticas temporariamente para deploy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '../package.json');

function createDeployPackageJson() {
  console.log('🔧 Criando package.json otimizado para deploy...');
  
  const originalPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Backup do original
  fs.writeFileSync(
    path.join(__dirname, '../package.json.backup'),
    JSON.stringify(originalPackage, null, 2),
    'utf8'
  );
  
  // Remover dependências problemáticas temporariamente
  const problematicDeps = [
    '@testing-library/react',
    '@testing-library/jest-dom', 
    '@testing-library/user-event',
    'jest',
    'jest-environment-jsdom',
    'babel-jest',
    'ts-jest',
    '@vitest/ui'
  ];
  
  const deployPackage = { ...originalPackage };
  
  // Remover deps problemáticas
  problematicDeps.forEach(dep => {
    if (deployPackage.devDependencies[dep]) {
      console.log(`📦 Removendo temporariamente: ${dep}`);
      delete deployPackage.devDependencies[dep];
    }
  });
  
  // Simplificar scripts para deploy
  deployPackage.scripts = {
    ...deployPackage.scripts,
    'build': 'vite build',
    'preview': 'vite preview',
    'dev': 'vite'
  };
  
  // Remover scripts de teste
  const testScripts = Object.keys(deployPackage.scripts).filter(key => 
    key.includes('test') || key.includes('coverage')
  );
  
  testScripts.forEach(script => {
    console.log(`🗑️ Removendo script de teste: ${script}`);
    delete deployPackage.scripts[script];
  });
  
  // Atualizar versão para deploy
  deployPackage.version = `${deployPackage.version}-deploy.${Date.now()}`;
  
  // Escrever package.json otimizado
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(deployPackage, null, 2),
    'utf8'
  );
  
  console.log('✅ Package.json otimizado para deploy criado');
  console.log('📄 Backup salvo em package.json.backup');
}

function restoreOriginalPackageJson() {
  console.log('🔄 Restaurando package.json original...');
  
  const backupPath = path.join(__dirname, '../package.json.backup');
  
  if (fs.existsSync(backupPath)) {
    const backup = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(packageJsonPath, backup, 'utf8');
    fs.unlinkSync(backupPath);
    console.log('✅ Package.json original restaurado');
  } else {
    console.log('⚠️ Backup não encontrado');
  }
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'prepare':
      createDeployPackageJson();
      break;
    case 'restore':
      restoreOriginalPackageJson();
      break;
    default:
      console.log('Usage:');
      console.log('  node fix-vercel-deps.js prepare  - Preparar para deploy');
      console.log('  node fix-vercel-deps.js restore  - Restaurar original');
  }
}

main();