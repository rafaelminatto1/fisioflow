#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analisa o bundle de produção e sugere otimizações
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_PATH = path.join(__dirname, '../dist');

function analyzeBundleSize() {
  console.log('📊 Analisando Bundle Size...\n');
  
  if (!fs.existsSync(DIST_PATH)) {
    console.error('❌ Pasta dist não encontrada. Execute npm run build primeiro.');
    process.exit(1);
  }
  
  const files = fs.readdirSync(path.join(DIST_PATH, 'assets'))
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(DIST_PATH, 'assets', file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024),
        type: getFileType(file)
      };
    })
    .sort((a, b) => b.size - a.size);
  
  // Análise por tipo
  const byType = files.reduce((acc, file) => {
    if (!acc[file.type]) acc[file.type] = { count: 0, totalSize: 0 };
    acc[file.type].count++;
    acc[file.type].totalSize += file.size;
    return acc;
  }, {});
  
  // Relatório
  console.log('📦 Arquivos JavaScript por tamanho:');
  files.forEach((file, index) => {
    const indicator = file.sizeKB > 200 ? '🔴' : file.sizeKB > 100 ? '🟡' : '🟢';
    console.log(`${indicator} ${file.name}: ${file.sizeKB}KB (${file.type})`);
  });
  
  console.log('\n📊 Resumo por categoria:');
  Object.entries(byType).forEach(([type, data]) => {
    const avgSize = Math.round(data.totalSize / data.count / 1024);
    const totalKB = Math.round(data.totalSize / 1024);
    console.log(`${type}: ${data.count} arquivos, ${totalKB}KB total, média ${avgSize}KB`);
  });
  
  // Recomendações
  console.log('\n💡 Recomendações de Otimização:');
  files.forEach(file => {
    if (file.sizeKB > 200) {
      console.log(`🔴 ${file.name} (${file.sizeKB}KB) - CRÍTICO: Considere code splitting adicional`);
    } else if (file.sizeKB > 100) {
      console.log(`🟡 ${file.name} (${file.sizeKB}KB) - Considere lazy loading`);
    }
  });
  
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  console.log(`\n📏 Tamanho total: ${Math.round(totalSize / 1024)}KB`);
  
  return { files, byType, totalSize };
}

function getFileType(filename) {
  if (filename.includes('PatientPage')) return 'patient-feature';
  if (filename.includes('Dashboard')) return 'dashboard-feature';
  if (filename.includes('Calendar')) return 'calendar-feature';
  if (filename.includes('Reports')) return 'reports-feature';
  if (filename.includes('vendor')) return 'vendor';
  if (filename.includes('chunk')) return 'shared-chunk';
  if (filename.includes('index')) return 'main-bundle';
  return 'other';
}

function generateOptimizationReport(analysis) {
  const report = {
    timestamp: new Date().toISOString(),
    totalSizeKB: Math.round(analysis.totalSize / 1024),
    fileCount: analysis.files.length,
    largestFiles: analysis.files.slice(0, 5),
    recommendations: []
  };
  
  // Gerar recomendações específicas
  analysis.files.forEach(file => {
    if (file.sizeKB > 200) {
      report.recommendations.push({
        priority: 'high',
        file: file.name,
        issue: `Bundle muito grande (${file.sizeKB}KB)`,
        solution: 'Implementar code splitting adicional ou lazy loading'
      });
    }
  });
  
  // Salvar relatório
  const reportPath = path.join(__dirname, '../dist/bundle-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Relatório salvo em: ${reportPath}`);
  
  return report;
}

// Execute se chamado diretamente
const analysis = analyzeBundleSize();
generateOptimizationReport(analysis);

export { analyzeBundleSize, generateOptimizationReport };