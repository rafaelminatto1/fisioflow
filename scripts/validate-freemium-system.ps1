# Script de Validação do Sistema Freemium
# Valida a integridade dos dados e funcionalidades do sistema freemium após migração

param(
    [switch]$Verbose = $false,
    [switch]$FixIssues = $false,
    [string]$Environment = "development"
)

# Cores para output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"
$White = "White"
$Magenta = "Magenta"

function Write-ColorOutput {
    param([string]$Message, [string]$Color)
    Write-Host $Message -ForegroundColor $Color
}

function Test-HookIntegrity {
    Write-ColorOutput "🔍 Validando integridade dos hooks especializados..." $Blue
    
    $hookFiles = @(
        "src\hooks\usePatients.ts",
        "src\hooks\useAppointments.ts",
        "src\hooks\useTasks.ts",
        "src\hooks\useUsers.ts",
        "src\hooks\useAssessments.ts",
        "src\hooks\usePrescriptions.ts",
        "src\hooks\useDocuments.ts",
        "src\hooks\useReports.ts",
        "src\hooks\useAuth.ts"
    )
    
    $issues = @()
    
    foreach ($hookFile in $hookFiles) {
        if (-not (Test-Path $hookFile)) {
            $issues += "❌ Hook não encontrado: $hookFile"
            continue
        }
        
        $content = Get-Content $hookFile -Raw
        
        # Verificar estrutura básica
        if (-not ($content -match "export.*function.*use")) {
            $issues += "❌ $hookFile: Estrutura de hook inválida"
        }
        
        # Verificar React Query
        if (-not ($content -match "useQuery|useMutation")) {
            $issues += "⚠️  $hookFile: Não usa React Query (pode impactar performance)"
        }
        
        # Verificar validação Zod
        if (-not ($content -match "z\.|ZodSchema|parse|safeParse")) {
            $issues += "⚠️  $hookFile: Não usa validação Zod (pode impactar integridade)"
        }
        
        # Verificar tratamento de erros
        if (-not ($content -match "try.*catch|onError|isError")) {
            $issues += "⚠️  $hookFile: Tratamento de erros limitado"
        }
        
        Write-ColorOutput "   ✅ $hookFile validado" $Green
    }
    
    return $issues
}

function Test-FreemiumLimits {
    Write-ColorOutput "🎯 Validando limites do sistema freemium..." $Blue
    
    $envFile = ".env.local"
    $issues = @()
    
    if (-not (Test-Path $envFile)) {
        $issues += "❌ Arquivo .env.local não encontrado"
        return $issues
    }
    
    $envContent = Get-Content $envFile -Raw
    
    # Verificar variáveis de limite
    $requiredLimits = @(
        "FREE_PLAN_PATIENTS_LIMIT",
        "FREE_PLAN_SESSIONS_LIMIT",
        "FREE_PLAN_STORAGE_LIMIT",
        "PRO_PLAN_PATIENTS_LIMIT",
        "PRO_PLAN_SESSIONS_LIMIT",
        "PRO_PLAN_STORAGE_LIMIT",
        "PREMIUM_PLAN_PATIENTS_LIMIT",
        "PREMIUM_PLAN_SESSIONS_LIMIT",
        "PREMIUM_PLAN_STORAGE_LIMIT"
    )
    
    foreach ($limit in $requiredLimits) {
        if (-not ($envContent -match "$limit=")) {
            $issues += "❌ Limite não configurado: $limit"
        } else {
            $value = ($envContent | Select-String "$limit=(.+)" | ForEach-Object { $_.Matches[0].Groups[1].Value })
            if (-not $value -or $value -eq "" -or -not ($value -match "^\d+$")) {
                $issues += "❌ Valor inválido para $limit: '$value'"
            } else {
                Write-ColorOutput "   ✅ $limit = $value" $Green
            }
        }
    }
    
    # Verificar feature flags
    $featureFlags = @(
        "FEATURE_ANALYTICS",
        "FEATURE_ERROR_TRACKING",
        "FEATURE_PERFORMANCE_MONITORING",
        "FEATURE_OFFLINE_MODE"
    )
    
    foreach ($flag in $featureFlags) {
        if (-not ($envContent -match "$flag=")) {
            $issues += "⚠️  Feature flag não configurado: $flag"
        } else {
            $value = ($envContent | Select-String "$flag=(.+)" | ForEach-Object { $_.Matches[0].Groups[1].Value })
            Write-ColorOutput "   ✅ $flag = $value" $Green
        }
    }
    
    return $issues
}

function Test-DataIntegrity {
    Write-ColorOutput "🗄️  Validando integridade dos dados..." $Blue
    
    $issues = @()
    
    # Verificar schemas Zod
    $schemaFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx" | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "z\.(object|string|number|boolean|array)")
    }
    
    if ($schemaFiles.Count -eq 0) {
        $issues += "❌ Nenhum schema Zod encontrado"
    } else {
        Write-ColorOutput "   ✅ Encontrados $($schemaFiles.Count) arquivos com schemas Zod" $Green
    }
    
    # Verificar consistência de tipos
    $typeFiles = Get-ChildItem -Path "src\types" -Include "*.ts" -ErrorAction SilentlyContinue
    if ($typeFiles.Count -eq 0) {
        $issues += "⚠️  Nenhum arquivo de tipos encontrado em src\types"
    } else {
        Write-ColorOutput "   ✅ Encontrados $($typeFiles.Count) arquivos de tipos" $Green
    }
    
    return $issues
}

function Test-ComponentMigration {
    Write-ColorOutput "🔄 Validando migração de componentes..." $Blue
    
    $issues = @()
    
    # Buscar componentes que ainda usam useData
    $componentsWithUseData = Get-ChildItem -Path "src" -Recurse -Include "*.tsx", "*.ts" | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "useData\.minimal" -or ($content -match "from.*useData['\"]" -and -not ($_.Name -eq "useData.tsx" -or $_.Name -eq "useData.minimal.tsx")))
    }
    
    if ($componentsWithUseData.Count -gt 0) {
        $issues += "⚠️  $($componentsWithUseData.Count) componentes ainda usam useData:"
        foreach ($component in $componentsWithUseData | Select-Object -First 10) {
            $issues += "     - $($component.FullName)"
        }
        if ($componentsWithUseData.Count -gt 10) {
            $issues += "     ... e mais $($componentsWithUseData.Count - 10) arquivos"
        }
    } else {
        Write-ColorOutput "   ✅ Todos os componentes migrados para hooks especializados" $Green
    }
    
    # Verificar imports dos novos hooks
    $componentsWithNewHooks = Get-ChildItem -Path "src" -Recurse -Include "*.tsx", "*.ts" | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "use(Patients|Appointments|Tasks|Users|Assessments|Prescriptions|Documents|Reports)")
    }
    
    Write-ColorOutput "   ✅ $($componentsWithNewHooks.Count) componentes usando novos hooks" $Green
    
    return $issues
}

function Test-PerformanceOptimizations {
    Write-ColorOutput "⚡ Validando otimizações de performance..." $Blue
    
    $issues = @()
    
    # Verificar React Query configuration
    $queryClientFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx" | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "QueryClient|queryClient")
    }
    
    if ($queryClientFiles.Count -eq 0) {
        $issues += "❌ Configuração do React Query não encontrada"
    } else {
        Write-ColorOutput "   ✅ React Query configurado" $Green
    }
    
    # Verificar lazy loading
    $lazyComponents = Get-ChildItem -Path "src" -Recurse -Include "*.tsx", "*.ts" | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "React\.lazy|lazy\(")
    }
    
    if ($lazyComponents.Count -eq 0) {
        $issues += "⚠️  Nenhum componente com lazy loading encontrado"
    } else {
        Write-ColorOutput "   ✅ $($lazyComponents.Count) componentes com lazy loading" $Green
    }
    
    # Verificar memoization
    $memoizedComponents = Get-ChildItem -Path "src" -Recurse -Include "*.tsx", "*.ts" | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "React\.memo|useMemo|useCallback")
    }
    
    if ($memoizedComponents.Count -eq 0) {
        $issues += "⚠️  Nenhuma otimização de memoization encontrada"
    } else {
        Write-ColorOutput "   ✅ $($memoizedComponents.Count) componentes com memoization" $Green
    }
    
    return $issues
}

function Test-SecurityAndScalability {
    Write-ColorOutput "🔒 Validando segurança e escalabilidade..." $Blue
    
    $issues = @()
    
    # Verificar validação de entrada
    $validationFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx" | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "parse\(|safeParse\(|validate\(")
    }
    
    if ($validationFiles.Count -eq 0) {
        $issues += "❌ Nenhuma validação de entrada encontrada"
    } else {
        Write-ColorOutput "   ✅ $($validationFiles.Count) arquivos com validação" $Green
    }
    
    # Verificar tratamento de erros
    $errorHandlingFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx" | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "try.*catch|onError|ErrorBoundary")
    }
    
    if ($errorHandlingFiles.Count -eq 0) {
        $issues += "❌ Tratamento de erros limitado"
    } else {
        Write-ColorOutput "   ✅ $($errorHandlingFiles.Count) arquivos com tratamento de erros" $Green
    }
    
    # Verificar rate limiting e throttling
    $rateLimitingFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx" | Where-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "throttle|debounce|rateLimit")
    }
    
    if ($rateLimitingFiles.Count -eq 0) {
        $issues += "⚠️  Nenhum rate limiting/throttling encontrado"
    } else {
        Write-ColorOutput "   ✅ $($rateLimitingFiles.Count) arquivos com rate limiting" $Green
    }
    
    return $issues
}

function Generate-ValidationReport {
    param([array]$AllIssues)
    
    $reportPath = "validation-report-$(Get-Date -Format 'yyyy-MM-dd-HHmm').md"
    
    $report = @"
# Relatório de Validação do Sistema Freemium

**Data:** $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
**Ambiente:** $Environment

## Resumo

- **Total de problemas encontrados:** $($AllIssues.Count)
- **Problemas críticos (❌):** $($AllIssues | Where-Object { $_ -match "❌" } | Measure-Object).Count
- **Avisos (⚠️):** $($AllIssues | Where-Object { $_ -match "⚠️" } | Measure-Object).Count

## Detalhes

"@
    
    if ($AllIssues.Count -eq 0) {
        $report += "`n✅ **Nenhum problema encontrado! Sistema validado com sucesso.**`n"
    } else {
        $report += "`n### Problemas Encontrados`n`n"
        foreach ($issue in $AllIssues) {
            $report += "- $issue`n"
        }
    }
    
    $report += @"

## Recomendações

### Próximos Passos
1. **Corrigir problemas críticos (❌)** - Estes podem impactar a funcionalidade
2. **Revisar avisos (⚠️)** - Podem impactar performance ou escalabilidade
3. **Executar testes automatizados** - `npm run test`
4. **Verificar tipos TypeScript** - `npm run type-check`
5. **Testar aplicação manualmente** - `npm run dev`

### Monitoramento Contínuo
- Execute este script regularmente durante o desenvolvimento
- Configure CI/CD para executar validações automaticamente
- Monitore métricas de performance em produção

### Sistema Freemium
- Verifique se os limites estão sendo respeitados
- Teste fluxos de upgrade/downgrade de planos
- Monitore uso de recursos por usuário

---
*Relatório gerado automaticamente pelo script de validação*
"@
    
    Set-Content -Path $reportPath -Value $report -Encoding UTF8
    Write-ColorOutput "📄 Relatório salvo em: $reportPath" $Cyan
}

function Main {
    Write-ColorOutput "🚀 Iniciando Validação do Sistema Freemium" $Green
    Write-ColorOutput "" $White
    
    $allIssues = @()
    
    # Executar todas as validações
    $allIssues += Test-HookIntegrity
    $allIssues += Test-FreemiumLimits
    $allIssues += Test-DataIntegrity
    $allIssues += Test-ComponentMigration
    $allIssues += Test-PerformanceOptimizations
    $allIssues += Test-SecurityAndScalability
    
    Write-ColorOutput "" $White
    Write-ColorOutput "📊 Resumo da Validação:" $Green
    
    $criticalIssues = $allIssues | Where-Object { $_ -match "❌" }
    $warnings = $allIssues | Where-Object { $_ -match "⚠️" }
    
    Write-ColorOutput "   Total de problemas: $($allIssues.Count)" $White
    Write-ColorOutput "   Problemas críticos: $($criticalIssues.Count)" $(if ($criticalIssues.Count -gt 0) { $Red } else { $Green })
    Write-ColorOutput "   Avisos: $($warnings.Count)" $(if ($warnings.Count -gt 0) { $Yellow } else { $Green })
    
    if ($allIssues.Count -gt 0) {
        Write-ColorOutput "" $White
        Write-ColorOutput "🔍 Problemas Encontrados:" $Yellow
        foreach ($issue in $allIssues) {
            Write-ColorOutput "   $issue" $White
        }
    } else {
        Write-ColorOutput "" $White
        Write-ColorOutput "✅ Nenhum problema encontrado! Sistema validado com sucesso." $Green
    }
    
    # Gerar relatório
    Generate-ValidationReport -AllIssues $allIssues
    
    Write-ColorOutput "" $White
    if ($criticalIssues.Count -gt 0) {
        Write-ColorOutput "❌ Validação concluída com problemas críticos" $Red
        exit 1
    } elseif ($warnings.Count -gt 0) {
        Write-ColorOutput "⚠️  Validação concluída com avisos" $Yellow
        exit 0
    } else {
        Write-ColorOutput "✅ Validação concluída com sucesso!" $Green
        exit 0
    }
}

# Executar script
Main