#!/usr/bin/env node

/**
 * Script para build e teste das correções implementadas
 * Verifica se os problemas identificados foram resolvidos
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔧 Iniciando build e teste das correções...');

// Função para executar comandos
function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log(`💻 Executando: ${command}`);
  
  try {
    const output = execSync(command, { 
      cwd: rootDir, 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log('✅ Sucesso!');
    return output;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
    throw error;
  }
}

// Função para verificar arquivos
function checkFile(filePath, description) {
  const fullPath = path.resolve(rootDir, filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

// Função para verificar conteúdo de arquivo
function checkFileContent(filePath, searchText, description) {
  const fullPath = path.resolve(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${description}: Arquivo não encontrado - ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const found = content.includes(searchText);
  console.log(`${found ? '✅' : '❌'} ${description}: ${searchText}`);
  return found;
}

// Função para analisar build output
function analyzeBuildOutput(distPath) {
  console.log('\n📊 Analisando arquivos de build...');
  
  const assetsPath = path.join(distPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    console.log('❌ Pasta assets não encontrada');
    return;
  }
  
  const files = fs.readdirSync(assetsPath);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));
  
  console.log(`📦 Arquivos JS: ${jsFiles.length}`);
  console.log(`🎨 Arquivos CSS: ${cssFiles.length}`);
  
  // Verificar se há chunks com hash
  const hasHashedChunks = jsFiles.some(f => /[a-f0-9]{8}/.test(f));
  console.log(`${hasHashedChunks ? '✅' : '❌'} Chunks com hash para cache busting`);
  
  // Verificar tamanhos
  jsFiles.forEach(file => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`📄 ${file}: ${sizeKB}KB`);
  });
}

async function main() {
  try {
    console.log('\n🔍 Verificando configurações...');
    
    // Verificar arquivos de configuração
    checkFile('tailwind.config.js', 'Configuração Tailwind');
    checkFile('postcss.config.js', 'Configuração PostCSS');
    checkFile('src/index.css', 'CSS principal');
    
    // Verificar se CDN foi removido do HTML
    const noCDN = !checkFileContent('index.html', 'cdn.tailwindcss.com', 'CDN Tailwind removido (deve ser false)');
    console.log(`${noCDN ? '✅' : '❌'} CDN Tailwind removido do HTML`);
    
    // Verificar import do CSS
    checkFileContent('index.tsx', './src/index.css', 'Import do CSS no index.tsx');
    
    // Verificar service worker atualizado
    checkFileContent('public/sw.js', 'CACHE_VERSION', 'Service Worker com versionamento');
    checkFileContent('public/sw.js', 'chunk-[a-zA-Z0-9]+\\.js$', 'Service Worker com padrão de chunks');
    
    console.log('\n🏗️ Executando build...');
    
    // Limpar build anterior
    runCommand('npm run clean', 'Limpando arquivos anteriores');
    
    // Verificar tipos
    runCommand('npm run type-check:fast', 'Verificação de tipos');
    
    // Build de produção
    const buildOutput = runCommand('npm run build', 'Build de produção');
    
    // Analisar output do build
    const distPath = path.resolve(rootDir, 'dist');
    if (fs.existsSync(distPath)) {
      analyzeBuildOutput(distPath);
    }
    
    console.log('\n🧪 Verificando build...');
    
    // Verificar se index.html foi gerado
    checkFile('dist/index.html', 'HTML principal gerado');
    
    // Verificar se CSS foi compilado
    const hasCompiledCSS = fs.existsSync(path.resolve(rootDir, 'dist/assets')) &&
      fs.readdirSync(path.resolve(rootDir, 'dist/assets')).some(f => f.endsWith('.css'));
    console.log(`${hasCompiledCSS ? '✅' : '❌'} CSS compilado gerado`);
    
    // Verificar se não há referência ao CDN no HTML final
    const finalHTML = fs.readFileSync(path.resolve(rootDir, 'dist/index.html'), 'utf8');
    const noCDNInFinal = !finalHTML.includes('cdn.tailwindcss.com');
    console.log(`${noCDNInFinal ? '✅' : '❌'} CDN removido do HTML final`);
    
    console.log('\n🎉 Build concluído com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Testar localmente: npm run preview');
    console.log('2. Deploy na Vercel: vercel --prod');
    console.log('3. Verificar console do navegador');
    console.log('4. Testar funcionalidades críticas');
    
  } catch (error) {
    console.error('\n💥 Erro durante o processo:', error.message);
    process.exit(1);
  }
}

main();