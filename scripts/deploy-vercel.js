#!/usr/bin/env node

/**
 * Script de Deploy Automatizado para Vercel
 * Executa todas as verificações necessárias antes do deploy
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Iniciando processo de deploy para Vercel...\n');

// Função para executar comandos
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} - Concluído\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Falhou`);
    console.error(error.message);
    return false;
  }
}

// Função para verificar arquivos
function checkFile(filePath, description) {
  console.log(`📁 Verificando ${description}...`);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description} - Encontrado\n`);
    return true;
  } else {
    console.error(`❌ ${description} - Não encontrado: ${filePath}\n`);
    return false;
  }
}

// Verificações pré-deploy
console.log('🔍 VERIFICAÇÕES PRÉ-DEPLOY\n');

// 1. Verificar arquivos essenciais
const essentialFiles = [
  { path: 'vercel.json', desc: 'Configuração da Vercel' },
  { path: 'vite.config.ts', desc: 'Configuração do Vite' },
  { path: 'package.json', desc: 'Package.json' },
  { path: 'index.tsx', desc: 'Arquivo de entrada' },
  { path: 'src/App.tsx', desc: 'Componente principal' }
];

let allFilesExist = true;
for (const file of essentialFiles) {
  if (!checkFile(file.path, file.desc)) {
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('❌ Arquivos essenciais estão faltando. Abortando deploy.');
  process.exit(1);
}

// 2. Limpar build anterior
console.log('🧹 Limpando build anterior...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
  console.log('✅ Build anterior removido\n');
}

// 3. Executar build de produção
if (!runCommand('npm run build:deploy', 'Build de produção')) {
  console.error('❌ Build falhou. Abortando deploy.');
  process.exit(1);
}

// 4. Verificar se o build foi criado
if (!checkFile('dist/index.html', 'Build gerado')) {
  console.error('❌ Build não foi gerado corretamente. Abortando deploy.');
  process.exit(1);
}

// 5. Verificar tamanho dos arquivos
console.log('📊 Verificando tamanho dos arquivos...');
const distStats = fs.statSync('dist');
const distSize = fs.readdirSync('dist', { withFileTypes: true })
  .filter(dirent => dirent.isFile())
  .reduce((total, file) => {
    const filePath = path.join('dist', file.name);
    return total + fs.statSync(filePath).size;
  }, 0);

console.log(`📦 Tamanho total do build: ${(distSize / 1024 / 1024).toFixed(2)} MB`);

if (distSize > 50 * 1024 * 1024) { // 50MB
  console.warn('⚠️  Build muito grande (>50MB). Considere otimizar.');
}

console.log('✅ Verificação de tamanho - OK\n');

// 6. Deploy para Vercel
console.log('🚀 INICIANDO DEPLOY NA VERCEL\n');

// Verificar se Vercel CLI está instalado
try {
  execSync('npx vercel --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Vercel CLI não encontrado. Instalando...');
  if (!runCommand('npm install -g vercel', 'Instalação do Vercel CLI')) {
    console.error('❌ Falha ao instalar Vercel CLI. Abortando.');
    process.exit(1);
  }
}

// Deploy
const deployCommand = process.argv.includes('--prod') 
  ? 'npx vercel --prod --yes' 
  : 'npx vercel --yes';

if (!runCommand(deployCommand, 'Deploy na Vercel')) {
  console.error('❌ Deploy falhou.');
  process.exit(1);
}

// 7. Verificações pós-deploy
console.log('🔍 VERIFICAÇÕES PÓS-DEPLOY\n');

console.log('✅ Deploy concluído com sucesso!');
console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('1. Acesse a URL fornecida pela Vercel');
console.log('2. Teste as funcionalidades principais');
console.log('3. Verifique se não há erros no console do navegador');
console.log('4. Teste em diferentes dispositivos/navegadores');

console.log('\n🔧 COMANDOS ÚTEIS:');
console.log('- Ver logs: npx vercel logs');
console.log('- Ver deployments: npx vercel list');
console.log('- Configurar domínio: npx vercel domains');

console.log('\n🎉 Deploy finalizado!');