#!/bin/bash
# Script de limpeza e otimização do Git para FisioFlow
# Executa automaticamente operações de manutenção para melhor performance

echo "🧹 Iniciando limpeza e otimização do repositório Git..."

# Limpar arquivos não rastreados
echo "🗑️  Limpando arquivos não rastreados..."
git clean -fd

# Garbage collection agressivo
echo "♻️  Executando garbage collection..."
git gc --aggressive --prune=now

# Repack para otimizar armazenamento
echo "📦 Reempacotando objetos..."
git repack -Ad

# Limpar reflogs antigos
echo "📋 Limpando reflogs antigos..."
git reflog expire --expire=30.days --all
git reflog expire --expire-unreachable=7.days --all

# Verificar integridade do repositório
echo "🔍 Verificando integridade..."
git fsck --full

# Estatísticas finais
echo "📊 Estatísticas do repositório:"
echo "   Objetos: $(git count-objects -v | grep "count" | cut -d' ' -f2)"
echo "   Tamanho: $(git count-objects -vH | grep "size-pack" | cut -d' ' -f2)"
echo "   Branches: $(git branch -a | wc -l)"

# Configurar otimizações se ainda não estiverem definidas
echo "⚙️  Aplicando configurações de performance..."
git config core.preloadindex true
git config core.fscache true
git config gc.auto 256
git config feature.manyFiles true
git config index.threads 0
git config pack.threads 0
git config core.autocrlf input
git config core.safecrlf false

echo "✅ Limpeza concluída! Repositório otimizado para melhor performance."