# FisioFlow - Script de Validacao do Sistema
# Verifica integridade, performance e conformidade com padroes

param(
    [switch]$Detailed,
    [switch]$Performance,
    [switch]$Security,
    [switch]$iOS
)

Write-Host "FisioFlow - Validacao do Sistema" -ForegroundColor Green
Write-Host "Verificando integridade e melhorias aplicadas..." -ForegroundColor Cyan
Write-Host ""

# Contadores de status
$global:totalChecks = 0
$global:passedChecks = 0
$global:warnings = 0
$global:errors = 0

# Funcao para verificar arquivo
function Test-FileExists {
    param(
        [string]$Path,
        [string]$Description,
        [string]$Category = "GERAL"
    )
    
    $global:totalChecks++
    
    if (Test-Path $Path) {
        Write-Host "   OK $Description" -ForegroundColor Green
        $global:passedChecks++
        return $true
    } else {
        Write-Host "   X $Description" -ForegroundColor Red
        $global:errors++
        return $false
    }
}

# Funcao para verificar conteudo
function Test-FileContent {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Description,
        [string]$Level = "ERROR"
    )
    
    $global:totalChecks++
    
    if (-not (Test-Path $Path)) {
        Write-Host "   X $Description (arquivo nao encontrado)" -ForegroundColor Red
        $global:errors++
        return $false
    }
    
    $content = Get-Content $Path -Raw -ErrorAction SilentlyContinue
    
    if ($content -match $Pattern) {
        Write-Host "   OK $Description" -ForegroundColor Green
        $global:passedChecks++
        return $true
    } else {
        if ($Level -eq "WARN") {
            Write-Host "   WARN $Description" -ForegroundColor Yellow
            $global:warnings++
        } else {
            Write-Host "   X $Description" -ForegroundColor Red
            $global:errors++
        }
        return $false
    }
}

# Funcao para verificar dependencias
function Test-Dependencies {
    Write-Host "DEPENDENCIAS" -ForegroundColor Blue
    Write-Host "Verificando package.json e dependencias criticas..." -ForegroundColor Gray
    
    Test-FileExists "package.json" "package.json existe"
    
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        
        # Dependencias criticas
        $criticalDeps = @(
            "react",
            "react-dom",
            "typescript",
            "vite"
        )
        
        # Dependencias recomendadas
        $recommendedDeps = @(
            "@tanstack/react-query",
            "zod",
            "react-router-dom"
        )
        
        foreach ($dep in $criticalDeps) {
            $global:totalChecks++
            if ($packageJson.dependencies.$dep -or $packageJson.devDependencies.$dep) {
                Write-Host "   OK $dep instalado" -ForegroundColor Green
                $global:passedChecks++
            } else {
                Write-Host "   X $dep OBRIGATORIO nao encontrado" -ForegroundColor Red
                $global:errors++
            }
        }
        
        foreach ($dep in $recommendedDeps) {
            $global:totalChecks++
            if ($packageJson.dependencies.$dep -or $packageJson.devDependencies.$dep) {
                Write-Host "   OK $dep instalado" -ForegroundColor Green
                $global:passedChecks++
            } else {
                Write-Host "   WARN $dep recomendado nao encontrado" -ForegroundColor Yellow
                $global:warnings++
            }
        }
    }
    
    Write-Host ""
}

# Funcao para verificar arquitetura
function Test-Architecture {
    Write-Host "ARQUITETURA" -ForegroundColor Blue
    Write-Host "Verificando estrutura de pastas e arquivos principais..." -ForegroundColor Gray
    
    # Estrutura de pastas
    $folders = @(
        "src",
        "src/components",
        "src/hooks",
        "src/types",
        "src/services",
        "src/utils",
        "public"
    )
    
    foreach ($folder in $folders) {
        Test-FileExists $folder "Pasta $folder" "ESTRUTURA"
    }
    
    # Arquivos principais
    Test-FileExists "src/App.tsx" "App.tsx principal"
    Test-FileExists "src/main.tsx" "main.tsx entry point"
    Test-FileExists "src/types.ts" "types.ts definicoes"
    Test-FileExists "vite.config.ts" "vite.config.ts configuracao"
    Test-FileExists "tsconfig.json" "tsconfig.json TypeScript"
    
    Write-Host ""
}

# Funcao para verificar hooks especializados
function Test-SpecializedHooks {
    Write-Host "HOOKS ESPECIALIZADOS" -ForegroundColor Blue
    Write-Host "Verificando migracao do useData monolitico..." -ForegroundColor Gray
    
    # Hooks criticos
    $criticalHooks = @(
        "useAuth.ts",
        "useSubscription.ts",
        "usePatients.ts",
        "useAppointments.ts"
    )
    
    # Hooks recomendados
    $recommendedHooks = @(
        "useTasks.ts",
        "useUsers.ts",
        "useReports.ts",
        "useExercises.ts",
        "useNotification.ts"
    )
    
    $implementedHooks = 0
    $totalHooks = $criticalHooks.Count + $recommendedHooks.Count
    
    foreach ($hook in $criticalHooks) {
        if (Test-FileExists "src/hooks/$hook" "Hook critico: $hook") {
            $implementedHooks++
            
            # Verificar se tem React Query
            Test-FileContent "src/hooks/$hook" "useQuery|useMutation" "$hook usa React Query" "WARN"
            
            # Verificar se tem Zod
            Test-FileContent "src/hooks/$hook" "z\.|zod" "$hook usa validacao Zod" "WARN"
        }
    }
    
    foreach ($hook in $recommendedHooks) {
        if (Test-FileExists "src/hooks/$hook" "Hook recomendado: $hook") {
            $implementedHooks++
        }
    }
    
    # Verificar useData monolitico
    if (Test-Path "src/hooks/useData.tsx") {
        $useDataContent = Get-Content "src/hooks/useData.tsx" -Raw
        $lines = ($useDataContent -split "`n").Count
        
        if ($lines -gt 1000) {
            Write-Host "   WARN useData.tsx ainda muito grande ($lines linhas)" -ForegroundColor Yellow
            $global:warnings++
        } else {
            Write-Host "   OK useData.tsx refatorado ($lines linhas)" -ForegroundColor Green
        }
    }
    
    $migrationPercent = [math]::Round(($implementedHooks / $totalHooks) * 100, 1)
    Write-Host "   INFO Migracao de hooks: $migrationPercent% ($implementedHooks/$totalHooks)" -ForegroundColor Cyan
    
    Write-Host ""
}

# Funcao para verificar sistema freemium
function Test-FreemiumSystem {
    Write-Host "SISTEMA FREEMIUM" -ForegroundColor Blue
    Write-Host "Verificando implementacao de tiers e limites..." -ForegroundColor Gray
    
    # Verificar useAuth com tiers
    if (Test-Path "src/hooks/useAuth.ts") {
        Test-FileContent "src/hooks/useAuth.ts" "tier|Tier" "useAuth implementa tiers"
        Test-FileContent "src/hooks/useAuth.ts" "checkLimit|limits" "useAuth verifica limites"
        Test-FileContent "src/hooks/useAuth.ts" "free|premium|enterprise" "useAuth define planos"
    }
    
    # Verificar useSubscription
    if (Test-Path "src/hooks/useSubscription.ts") {
        Test-FileContent "src/hooks/useSubscription.ts" "upgrade|downgrade" "useSubscription gerencia upgrades"
        Test-FileContent "src/hooks/useSubscription.ts" "billing|payment" "useSubscription integra pagamentos" "WARN"
    }
    
    # Verificar enforcement em hooks
    $hooksWithLimits = @()
    $hookFiles = Get-ChildItem "src/hooks" -Filter "*.ts" -ErrorAction SilentlyContinue
    
    foreach ($hookFile in $hookFiles) {
        $content = Get-Content $hookFile.FullName -Raw
        if ($content -match "checkLimit|useAuth|tier") {
            $hooksWithLimits += $hookFile.Name
        }
    }
    
    Write-Host "   INFO Hooks com enforcement freemium: $($hooksWithLimits.Count)" -ForegroundColor Cyan
    if ($hooksWithLimits.Count -gt 0) {
        Write-Host "   LIST Hooks: $($hooksWithLimits -join ', ')" -ForegroundColor Gray
    }
    
    Write-Host ""
}

# Funcao para verificar PWA iOS
function Test-iOSPWA {
    Write-Host "PWA iOS" -ForegroundColor Blue
    Write-Host "Verificando configuracao para iOS..." -ForegroundColor Gray
    
    # Manifest
    Test-FileExists "public/manifest.json" "PWA manifest.json"
    
    if (Test-Path "public/manifest.json") {
        Test-FileContent "public/manifest.json" "standalone" "Manifest modo standalone"
        Test-FileContent "public/manifest.json" "icons" "Manifest tem icones"
        Test-FileContent "public/manifest.json" "shortcuts" "Manifest tem shortcuts" "WARN"
    }
    
    # Service Worker
    Test-FileExists "public/sw.js" "Service Worker"
    
    if (Test-Path "public/sw.js") {
        Test-FileContent "public/sw.js" "cache|Cache" "Service Worker implementa cache"
        Test-FileContent "public/sw.js" "offline|Offline" "Service Worker suporte offline"
        Test-FileContent "public/sw.js" "sync|Sync" "Service Worker background sync" "WARN"
    }
    
    # Meta tags iOS no index.html
    if (Test-Path "index.html") {
        Test-FileContent "index.html" "apple-mobile-web-app" "Meta tags iOS"
        Test-FileContent "index.html" "apple-touch-icon" "Icones iOS"
        Test-FileContent "index.html" "theme-color" "Theme color definido"
    }
    
    # Icones PWA
    $iconSizes = @("72", "96", "128", "144", "152", "192", "384", "512")
    $iconsFound = 0
    
    foreach ($size in $iconSizes) {
        if (Test-Path "public/icons/icon-$size.png") {
            $iconsFound++
        }
    }
    
    $global:totalChecks++
    if ($iconsFound -ge 4) {
        Write-Host "   OK Icones PWA ($iconsFound/$($iconSizes.Count))" -ForegroundColor Green
        $global:passedChecks++
    } else {
        Write-Host "   WARN Poucos icones PWA ($iconsFound/$($iconSizes.Count))" -ForegroundColor Yellow
        $global:warnings++
    }
    
    Write-Host ""
}

# Funcao para verificar performance
function Test-Performance {
    Write-Host "PERFORMANCE" -ForegroundColor Blue
    Write-Host "Verificando otimizacoes de performance..." -ForegroundColor Gray
    
    # Vite config otimizacoes
    if (Test-Path "vite.config.ts") {
        Test-FileContent "vite.config.ts" "minify" "Vite minificacao habilitada" "WARN"
        Test-FileContent "vite.config.ts" "rollupOptions" "Vite rollup otimizado" "WARN"
        Test-FileContent "vite.config.ts" "manualChunks" "Vite code splitting" "WARN"
    }
    
    # Lazy loading
    $lazyComponents = 0
    $componentFiles = Get-ChildItem "src" -Recurse -Filter "*.tsx" -ErrorAction SilentlyContinue
    
    foreach ($file in $componentFiles) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "React\.lazy|lazy\(|Suspense") {
            $lazyComponents++
        }
    }
    
    Write-Host "   INFO Componentes com lazy loading: $lazyComponents" -ForegroundColor Cyan
    
    # React Query cache
    $queryFiles = Get-ChildItem "src" -Recurse -Filter "*.ts*" -ErrorAction SilentlyContinue | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -match "useQuery|useMutation"
    }
    
    Write-Host "   INFO Arquivos usando React Query: $($queryFiles.Count)" -ForegroundColor Cyan
    
    Write-Host ""
}

# Funcao para verificar seguranca
function Test-Security {
    Write-Host "SEGURANCA" -ForegroundColor Blue
    Write-Host "Verificando validacoes e seguranca..." -ForegroundColor Gray
    
    # Zod schemas
    $zodFiles = Get-ChildItem "src" -Recurse -Filter "*.ts*" -ErrorAction SilentlyContinue | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -match "z\.|zod|Schema"
    }
    
    Write-Host "   INFO Arquivos com validacao Zod: $($zodFiles.Count)" -ForegroundColor Cyan
    
    # Sanitizacao
    Test-FileContent "src/utils" "sanitize|escape" "Utilitarios de sanitizacao" "WARN"
    
    # Criptografia
    Test-FileContent "src" "encrypt|crypto" "Implementacao de criptografia" "WARN"
    
    # Auditoria
    Test-FileContent "src" "audit|log" "Sistema de auditoria" "WARN"
    
    Write-Host ""
}

# Funcao para gerar relatorio
function Show-Report {
    Write-Host "RELATORIO FINAL" -ForegroundColor Magenta
    Write-Host "==========================================" -ForegroundColor Gray
    
    $successRate = if ($global:totalChecks -gt 0) { [math]::Round(($global:passedChecks / $global:totalChecks) * 100, 1) } else { 0 }
    
    Write-Host "Total de verificacoes: $($global:totalChecks)" -ForegroundColor White
    Write-Host "Aprovadas: $($global:passedChecks)" -ForegroundColor Green
    Write-Host "Avisos: $($global:warnings)" -ForegroundColor Yellow
    Write-Host "Erros: $($global:errors)" -ForegroundColor Red
    Write-Host "Taxa de sucesso: $successRate%" -ForegroundColor Cyan
    
    Write-Host ""
    
    if ($successRate -ge 90) {
        Write-Host "EXCELENTE! Sistema bem configurado." -ForegroundColor Green
    } elseif ($successRate -ge 70) {
        Write-Host "BOM! Algumas melhorias recomendadas." -ForegroundColor Yellow
    } elseif ($successRate -ge 50) {
        Write-Host "REGULAR! Varias melhorias necessarias." -ForegroundColor Yellow
    } else {
        Write-Host "CRITICO! Muitas correcoes necessarias." -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "RECOMENDACOES:" -ForegroundColor Blue
    
    if ($global:errors -gt 0) {
        Write-Host "1. Corrigir erros criticos primeiro" -ForegroundColor Red
    }
    
    if ($global:warnings -gt 5) {
        Write-Host "2. Implementar melhorias recomendadas" -ForegroundColor Yellow
    }
    
    if ($successRate -lt 80) {
        Write-Host "3. Executar script de implementacao:" -ForegroundColor White
        Write-Host "   .\scripts\implement-improvements.ps1 -Opcao 1" -ForegroundColor Gray
    }
    
    Write-Host "4. Executar testes apos correcoes" -ForegroundColor White
    Write-Host "5. Monitorar performance em producao" -ForegroundColor White
}

# Execucao principal
Try {
    # Verificacoes basicas
    Test-Dependencies
    Test-Architecture
    Test-SpecializedHooks
    Test-FreemiumSystem
    
    # Verificacoes condicionais
    if ($iOS -or $Detailed) {
        Test-iOSPWA
    }
    
    if ($Performance -or $Detailed) {
        Test-Performance
    }
    
    if ($Security -or $Detailed) {
        Test-Security
    }
    
    # Relatorio final
    Show-Report
    
} Catch {
    Write-Host "ERRO durante validacao: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Validacao concluida! Use -Detailed para analise completa." -ForegroundColor Green