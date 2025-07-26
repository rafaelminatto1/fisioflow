#!/usr/bin/env pwsh
# Script de validacao da configuracao do Git para FisioFlow
# Verifica se todas as melhorias foram aplicadas corretamente

Write-Host "Validando configuracao do Git..." -ForegroundColor Blue

$errors = @()
$warnings = @()
$success = @()

# Funcao para verificar configuracao
function Test-GitConfig {
    param(
        [string]$ConfigKey,
        [string]$ExpectedValue,
        [string]$Description
    )
    
    $actualValue = git config --local --get $ConfigKey 2>$null
    
    if ($actualValue -eq $ExpectedValue) {
        $script:success += "[OK] $Description"
        return $true
    } elseif ($actualValue) {
        $script:warnings += "[WARN] $Description - Valor atual: '$actualValue', esperado: '$ExpectedValue'"
        return $false
    } else {
        $script:errors += "[ERRO] $Description - Nao configurado"
        return $false
    }
}

# Funcao para verificar se arquivo existe
function Test-FileExists {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    if (Test-Path $FilePath) {
        $script:success += "[OK] $Description"
        return $true
    } else {
        $script:errors += "[ERRO] $Description - Arquivo nao encontrado: $FilePath"
        return $false
    }
}

Write-Host "Verificando configuracoes basicas..." -ForegroundColor Yellow

# Verificar configuracoes basicas
Test-GitConfig "core.autocrlf" "true" "Line endings configurados (autocrlf)"
Test-GitConfig "core.safecrlf" "warn" "Aviso de line endings configurado"
Test-GitConfig "push.default" "simple" "Push padrao configurado"
Test-GitConfig "commit.template" ".gitmessage" "Template de commit configurado"
Test-GitConfig "core.hooksPath" ".githooks" "Caminho dos hooks configurado"

Write-Host "Verificando configuracoes avancadas..." -ForegroundColor Yellow

# Verificar configuracoes avancadas
Test-GitConfig "pull.rebase" "true" "Pull com rebase configurado"
Test-GitConfig "merge.ff" "false" "Merge sem fast-forward configurado"
Test-GitConfig "branch.autosetupmerge" "always" "Auto setup merge configurado"
Test-GitConfig "branch.autosetuprebase" "always" "Auto setup rebase configurado"
Test-GitConfig "rerere.enabled" "true" "Rerere habilitado"
Test-GitConfig "core.preloadindex" "true" "Preload index habilitado"
Test-GitConfig "core.fscache" "true" "FS cache habilitado"
Test-GitConfig "gc.auto" "256" "Garbage collection configurado"
Test-GitConfig "diff.algorithm" "patience" "Algoritmo de diff configurado"
Test-GitConfig "log.date" "iso" "Formato de data configurado"
Test-GitConfig "color.ui" "auto" "Cores habilitadas"
Test-GitConfig "transfer.fsckobjects" "true" "Verificacao de objetos habilitada"
Test-GitConfig "fetch.fsckobjects" "true" "Verificacao no fetch habilitada"
Test-GitConfig "receive.fsckObjects" "true" "Verificacao no receive habilitada"

Write-Host "Verificando aliases..." -ForegroundColor Yellow

# Verificar aliases
$aliases = @{
    "alias.st" = "status"
    "alias.co" = "checkout"
    "alias.br" = "branch"
    "alias.ci" = "commit"
    "alias.graph" = "log --oneline --graph --decorate --all"
    "alias.unstage" = "reset HEAD --"
    "alias.last" = "log -1 HEAD"
    "alias.visual" = "!gitk"
    "alias.amend" = "commit --amend --no-edit"
    "alias.pushf" = "push --force-with-lease"
}

foreach ($alias in $aliases.GetEnumerator()) {
    Test-GitConfig $alias.Key $alias.Value "Alias '$($alias.Key.Split('.')[1])' configurado"
}

Write-Host "Verificando arquivos..." -ForegroundColor Yellow

# Verificar arquivos importantes
Test-FileExists ".gitignore" "Arquivo .gitignore existe"
Test-FileExists ".gitattributes" "Arquivo .gitattributes existe"
Test-FileExists ".gitmessage" "Template de mensagem de commit existe"
Test-FileExists ".githooks" "Diretorio de hooks existe"
Test-FileExists ".githooks/pre-commit" "Hook pre-commit existe"
Test-FileExists ".githooks/commit-msg" "Hook commit-msg existe"
Test-FileExists ".githooks/post-commit" "Hook post-commit existe"

Write-Host "Verificando conteudo do .gitignore..." -ForegroundColor Yellow

# Verificar conteudo critico do .gitignore
$gitignoreContent = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
if ($gitignoreContent) {
    $criticalEntries = @(
        "node_modules",
        ".env",
        "dist",
        "*.log",
        "NUL",
        ".vscode/settings.json"
    )
    
    foreach ($entry in $criticalEntries) {
        if ($gitignoreContent -match [regex]::Escape($entry)) {
            $success += "[OK] .gitignore contem '$entry'"
        } else {
            $warnings += "[WARN] .gitignore nao contem '$entry'"
        }
    }
} else {
    $errors += "[ERRO] Nao foi possivel ler o arquivo .gitignore"
}

Write-Host "Verificando .gitattributes..." -ForegroundColor Yellow

# Verificar conteudo do .gitattributes
$gitattributesContent = Get-Content ".gitattributes" -Raw -ErrorAction SilentlyContinue
if ($gitattributesContent) {
    $attributeEntries = @(
        "* text=auto",
        "*.ts text",
        "*.js text",
        "*.json text"
    )
    
    foreach ($entry in $attributeEntries) {
        if ($gitattributesContent -match [regex]::Escape($entry)) {
            $success += "[OK] .gitattributes contem '$entry'"
        } else {
            $warnings += "[WARN] .gitattributes nao contem '$entry'"
        }
    }
} else {
    $errors += "[ERRO] Nao foi possivel ler o arquivo .gitattributes"
}

Write-Host "Verificando hooks..." -ForegroundColor Yellow

# Verificar se os hooks tem conteudo
if (Test-Path ".githooks/pre-commit") {
    $preCommitSize = (Get-Item ".githooks/pre-commit").Length
    if ($preCommitSize -gt 100) {
        $success += "[OK] Hook pre-commit tem conteudo ($preCommitSize bytes)"
    } else {
        $warnings += "[WARN] Hook pre-commit parece estar vazio"
    }
}

if (Test-Path ".githooks/commit-msg") {
    $commitMsgSize = (Get-Item ".githooks/commit-msg").Length
    if ($commitMsgSize -gt 100) {
        $success += "[OK] Hook commit-msg tem conteudo ($commitMsgSize bytes)"
    } else {
        $warnings += "[WARN] Hook commit-msg parece estar vazio"
    }
}

if (Test-Path ".githooks/post-commit") {
    $postCommitSize = (Get-Item ".githooks/post-commit").Length
    if ($postCommitSize -gt 100) {
        $success += "[OK] Hook post-commit tem conteudo ($postCommitSize bytes)"
    } else {
        $warnings += "[WARN] Hook post-commit parece estar vazio"
    }
}

Write-Host "Verificando status do repositorio..." -ForegroundColor Yellow

# Verificar status do repositorio
try {
    $gitStatus = git status --porcelain 2>$null
    if ($gitStatus) {
        $fileCount = ($gitStatus | Measure-Object).Count
        $warnings += "[WARN] $fileCount arquivo(s) com alteracoes nao commitadas"
    } else {
        $success += "[OK] Repositorio limpo (sem alteracoes pendentes)"
    }
} catch {
    $warnings += "[WARN] Nao foi possivel verificar o status do Git"
}

# Verificar se estamos em um repositorio Git
try {
    $gitDir = git rev-parse --git-dir 2>$null
    if ($gitDir) {
        $success += "[OK] Repositorio Git valido"
    }
} catch {
    $errors += "[ERRO] Nao e um repositorio Git valido"
}

Write-Host "`nResumo da Validacao" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

# Mostrar sucessos
if ($success.Count -gt 0) {
    Write-Host "`nSucessos ($($success.Count)):" -ForegroundColor Green
    foreach ($item in $success) {
        Write-Host "  $item" -ForegroundColor Green
    }
}

# Mostrar avisos
if ($warnings.Count -gt 0) {
    Write-Host "`nAvisos ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($item in $warnings) {
        Write-Host "  $item" -ForegroundColor Yellow
    }
}

# Mostrar erros
if ($errors.Count -gt 0) {
    Write-Host "`nErros ($($errors.Count)):" -ForegroundColor Red
    foreach ($item in $errors) {
        Write-Host "  $item" -ForegroundColor Red
    }
}

# Calcular score
$totalChecks = $success.Count + $warnings.Count + $errors.Count
$score = if ($totalChecks -gt 0) { [math]::Round(($success.Count / $totalChecks) * 100, 1) } else { 0 }

Write-Host "`nScore de Configuracao: $score%" -ForegroundColor Cyan

if ($score -ge 90) {
    Write-Host "Excelente! Configuracao do Git esta otimizada." -ForegroundColor Green
} elseif ($score -ge 75) {
    Write-Host "Boa configuracao, mas ha espaco para melhorias." -ForegroundColor Yellow
} elseif ($score -ge 50) {
    Write-Host "Configuracao basica, recomenda-se melhorias." -ForegroundColor Yellow
} else {
    Write-Host "Configuracao precisa de atencao urgente." -ForegroundColor Red
}

Write-Host "`nProximos passos recomendados:" -ForegroundColor Cyan
if ($errors.Count -gt 0) {
    Write-Host "  1. Corrigir os erros listados acima" -ForegroundColor White
}
if ($warnings.Count -gt 0) {
    Write-Host "  2. Revisar e corrigir os avisos" -ForegroundColor White
}
Write-Host "  3. Testar um commit para validar os hooks" -ForegroundColor White
Write-Host "  4. Executar 'git st' para testar os aliases" -ForegroundColor White

Write-Host "`nValidacao concluida!" -ForegroundColor Green

# Retornar codigo de saida baseado nos erros
if ($errors.Count -gt 0) {
    exit 1
} else {
    exit 0
}