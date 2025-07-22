# Scripts de Automação Git para FisioFlow
# PowerShell script para Windows

# Função para criar branch de feature
function New-FeatureBranch {
    param(
        [Parameter(Mandatory=$true)]
        [string]$FeatureName
    )
    
    Write-Host "🚀 Criando nova feature branch: feature/$FeatureName" -ForegroundColor Green
    
    # Verificar se está na main/master
    $currentBranch = git branch --show-current
    if ($currentBranch -ne "main" -and $currentBranch -ne "master") {
        Write-Host "⚠️  Mudando para branch main..." -ForegroundColor Yellow
        git checkout main
    }
    
    # Atualizar branch principal
    Write-Host "📥 Atualizando branch principal..." -ForegroundColor Blue
    git pull origin main
    
    # Criar e mudar para nova branch
    git checkout -b "feature/$FeatureName"
    
    Write-Host "✅ Feature branch criada com sucesso!" -ForegroundColor Green
    Write-Host "💡 Para fazer push: git push -u origin feature/$FeatureName" -ForegroundColor Cyan
}

# Função para finalizar feature
function Complete-FeatureBranch {
    param(
        [string]$Message = "feat: implementar nova funcionalidade"
    )
    
    $currentBranch = git branch --show-current
    
    if (-not $currentBranch.StartsWith("feature/")) {
        Write-Host "❌ Você não está em uma feature branch!" -ForegroundColor Red
        return
    }
    
    Write-Host "🔄 Finalizando feature branch: $currentBranch" -ForegroundColor Green
    
    # Adicionar todos os arquivos
    git add .
    
    # Commit com mensagem
    git commit -m $Message
    
    # Push da branch
    git push -u origin $currentBranch
    
    Write-Host "✅ Feature finalizada!" -ForegroundColor Green
    Write-Host "💡 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Criar Pull Request no GitHub" -ForegroundColor White
    Write-Host "   2. Solicitar code review" -ForegroundColor White
    Write-Host "   3. Aguardar aprovação e merge" -ForegroundColor White
}

# Função para hotfix rápido
function New-HotfixBranch {
    param(
        [Parameter(Mandatory=$true)]
        [string]$HotfixName
    )
    
    Write-Host "🚨 Criando hotfix branch: hotfix/$HotfixName" -ForegroundColor Red
    
    # Ir para main
    git checkout main
    git pull origin main
    
    # Criar hotfix branch
    git checkout -b "hotfix/$HotfixName"
    
    Write-Host "✅ Hotfix branch criada!" -ForegroundColor Green
    Write-Host "⚡ Faça as correções necessárias e use Complete-HotfixBranch" -ForegroundColor Yellow
}

# Função para completar hotfix
function Complete-HotfixBranch {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )
    
    $currentBranch = git branch --show-current
    
    if (-not $currentBranch.StartsWith("hotfix/")) {
        Write-Host "❌ Você não está em uma hotfix branch!" -ForegroundColor Red
        return
    }
    
    Write-Host "🔧 Finalizando hotfix: $currentBranch" -ForegroundColor Red
    
    # Commit das correções
    git add .
    git commit -m "fix: $Message"
    git push -u origin $currentBranch
    
    Write-Host "✅ Hotfix finalizado!" -ForegroundColor Green
    Write-Host "🚨 URGENTE: Criar PR imediatamente!" -ForegroundColor Red
}

# Função para limpeza de branches
function Remove-MergedBranches {
    Write-Host "🧹 Limpando branches já merged..." -ForegroundColor Yellow
    
    # Ir para main
    git checkout main
    git pull origin main
    
    # Listar branches merged
    $mergedBranches = git branch --merged | Where-Object { $_ -notmatch "main|master|develop|\*" }
    
    if ($mergedBranches) {
        Write-Host "📋 Branches para remover:" -ForegroundColor Cyan
        $mergedBranches | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
        
        $confirm = Read-Host "Confirma remoção? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            $mergedBranches | ForEach-Object {
                $branch = $_.Trim()
                git branch -d $branch
                Write-Host "✅ Removido: $branch" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "✨ Nenhuma branch para limpar!" -ForegroundColor Green
    }
}

# Função para sincronizar com upstream
function Sync-WithUpstream {
    Write-Host "🔄 Sincronizando com upstream..." -ForegroundColor Blue
    
    # Verificar se upstream existe
    $upstream = git remote | Where-Object { $_ -eq "upstream" }
    
    if (-not $upstream) {
        Write-Host "❌ Upstream não configurado!" -ForegroundColor Red
        $upstreamUrl = Read-Host "Digite a URL do repositório upstream"
        git remote add upstream $upstreamUrl
    }
    
    # Fetch upstream
    git fetch upstream
    
    # Merge upstream/main
    git checkout main
    git merge upstream/main
    
    # Push para origin
    git push origin main
    
    Write-Host "✅ Sincronização concluída!" -ForegroundColor Green
}

# Função para backup do trabalho atual
function Backup-CurrentWork {
    param(
        [string]$BackupMessage = "WIP: backup automático $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    )
    
    Write-Host "💾 Fazendo backup do trabalho atual..." -ForegroundColor Yellow
    
    $currentBranch = git branch --show-current
    $backupBranch = "backup/$currentBranch-$(Get-Date -Format 'yyyyMMdd-HHmm')"
    
    # Criar branch de backup
    git checkout -b $backupBranch
    
    # Adicionar tudo (incluindo não rastreados)
    git add -A
    
    # Commit de backup
    git commit -m $BackupMessage
    
    # Push backup
    git push -u origin $backupBranch
    
    # Voltar para branch original
    git checkout $currentBranch
    
    Write-Host "✅ Backup criado: $backupBranch" -ForegroundColor Green
}

# Função para mostrar estatísticas do repositório
function Show-RepoStats {
    Write-Host "📊 Estatísticas do Repositório FisioFlow" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Informações básicas
    Write-Host "📁 Repositório: $(Split-Path -Leaf (git rev-parse --show-toplevel))" -ForegroundColor White
    Write-Host "🌿 Branch atual: $(git branch --show-current)" -ForegroundColor White
    Write-Host "📝 Total de commits: $(git rev-list --all --count)" -ForegroundColor White
    Write-Host "👥 Contribuidores: $(git shortlog -sn | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor White
    
    # Estatísticas de arquivos
    Write-Host "\n📈 Estatísticas de Código:" -ForegroundColor Yellow
    $stats = git ls-files | Where-Object { $_ -match "\.(ts|tsx|js|jsx)$" } | Measure-Object
    Write-Host "   TypeScript/JavaScript: $($stats.Count) arquivos" -ForegroundColor White
    
    # Últimos commits
    Write-Host "\n🕒 Últimos 5 commits:" -ForegroundColor Yellow
    git log --oneline -5
    
    # Status atual
    Write-Host "\n📋 Status atual:" -ForegroundColor Yellow
    git status --short
}

# Exportar funções
Export-ModuleMember -Function New-FeatureBranch, Complete-FeatureBranch, New-HotfixBranch, Complete-HotfixBranch, Remove-MergedBranches, Sync-WithUpstream, Backup-CurrentWork, Show-RepoStats

# Aliases para facilitar uso
Set-Alias -Name "feature" -Value New-FeatureBranch
Set-Alias -Name "hotfix" -Value New-HotfixBranch
Set-Alias -Name "cleanup" -Value Remove-MergedBranches
Set-Alias -Name "sync" -Value Sync-WithUpstream
Set-Alias -Name "backup" -Value Backup-CurrentWork
Set-Alias -Name "stats" -Value Show-RepoStats

Write-Host "🚀 Scripts Git carregados com sucesso!" -ForegroundColor Green
Write-Host "💡 Comandos disponíveis:" -ForegroundColor Cyan
Write-Host "   feature <nome>     - Criar feature branch" -ForegroundColor White
Write-Host "   hotfix <nome>      - Criar hotfix branch" -ForegroundColor White
Write-Host "   cleanup            - Limpar branches merged" -ForegroundColor White
Write-Host "   sync               - Sincronizar com upstream" -ForegroundColor White
Write-Host "   backup             - Backup do trabalho atual" -ForegroundColor White
Write-Host "   stats              - Estatísticas do repo" -ForegroundColor White