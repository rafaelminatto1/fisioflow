# Script de Validação Final - Sistema Freemium iOS
# Verifica integridade dos hooks especializados e funcionalidades do sistema

Write-Host "FisioFlow - Validacao Final do Sistema" -ForegroundColor Green
Write-Host "Foco: iOS | Sistema Freemium | Escalavel" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar estrutura dos hooks especializados
Write-Host "1. Verificando Hooks Especializados..." -ForegroundColor Blue

$hooks = @(
    "usePatients.ts",
    "useAppointments.ts", 
    "useTasks.ts",
    "useReports.ts",
    "useAuth.ts",
    "useUsers.ts",
    "useAssessments.ts",
    "usePrescriptions.ts",
    "useDocuments.ts"
)

$hooksPath = "src/hooks"
$validHooks = 0

foreach ($hook in $hooks) {
    $hookPath = Join-Path $hooksPath $hook
    if (Test-Path $hookPath) {
        $content = Get-Content $hookPath -Raw
        
        # Verificar se tem React Query
        $hasReactQuery = $content -match "useQuery|useMutation|useQueryClient"
        
        # Verificar se tem validação Zod
        $hasZodValidation = $content -match "z\.|Schema"
        
        # Verificar se tem tratamento de erro
        $hasErrorHandling = $content -match "try|catch|Error"
        
        # Verificar se tem cache/localStorage
        $hasCaching = $content -match "localStorage|cache"
        
        if ($hasReactQuery -and $hasZodValidation -and $hasErrorHandling -and $hasCaching) {
            Write-Host "   OK $hook - Completo" -ForegroundColor Green
            $validHooks++
        } else {
            Write-Host "   WARN $hook - Incompleto" -ForegroundColor Yellow
            if (-not $hasReactQuery) { Write-Host "      - Falta React Query" -ForegroundColor Red }
            if (-not $hasZodValidation) { Write-Host "      - Falta validação Zod" -ForegroundColor Red }
            if (-not $hasErrorHandling) { Write-Host "      - Falta tratamento de erro" -ForegroundColor Red }
            if (-not $hasCaching) { Write-Host "      - Falta sistema de cache" -ForegroundColor Red }
        }
    } else {
        Write-Host "   ERROR $hook - Nao encontrado" -ForegroundColor Red
    }
}

Write-Host "   Hooks validos: $validHooks/$($hooks.Count)" -ForegroundColor White
Write-Host ""

# 2. Verificar sistema freemium
Write-Host "2. Verificando Sistema Freemium..." -ForegroundColor Blue

$freemiumFiles = @(
    "src/hooks/useAuth.ts",
    "src/hooks/usePatients.ts",
    "src/hooks/useSubscription.ts"
)

$freemiumFeatures = 0

foreach ($file in $freemiumFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Verificar limites freemium
        $hasLimits = $content -match "limit|max|premium|subscription"
        
        # Verificar validação de plano
        $hasPlanValidation = $content -match "plan|tier|subscription"
        
        if ($hasLimits -and $hasPlanValidation) {
            Write-Host "   OK $(Split-Path $file -Leaf) - Sistema freemium implementado" -ForegroundColor Green
            $freemiumFeatures++
        } else {
            Write-Host "   WARN $(Split-Path $file -Leaf) - Sistema freemium incompleto" -ForegroundColor Yellow
        }
    }
}

Write-Host "   Recursos freemium: $freemiumFeatures/$($freemiumFiles.Count)" -ForegroundColor White
Write-Host ""

# 3. Verificar integridade de dados
Write-Host "3. Verificando Integridade de Dados..." -ForegroundColor Blue

$dataIntegrityChecks = @(
    @{ Name = "Schemas Zod"; Pattern = "z\.(object|string|number|boolean|array)" },
    @{ Name = "Validações"; Pattern = "validate|parse|safeParse" },
    @{ Name = "Sanitização"; Pattern = "sanitize|clean|trim" },
    @{ Name = "Criptografia"; Pattern = "encrypt|hash|bcrypt" }
)

$integrityScore = 0

foreach ($check in $dataIntegrityChecks) {
    $found = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx" | 
        Where-Object { (Get-Content $_.FullName -Raw) -match $check.Pattern }
    
    if ($found.Count -gt 0) {
        Write-Host "   OK $($check.Name) - $($found.Count) arquivos" -ForegroundColor Green
        $integrityScore++
    } else {
        Write-Host "   ERROR $($check.Name) - Nao encontrado" -ForegroundColor Red
    }
}

Write-Host "   Score de integridade: $integrityScore/$($dataIntegrityChecks.Count)" -ForegroundColor White
Write-Host ""

# 4. Verificar otimizações para iOS
Write-Host "4. Verificando Otimizacoes iOS..." -ForegroundColor Blue

$iosOptimizations = @(
    @{ Name = "PWA Manifest"; File = "public/manifest.json" },
    @{ Name = "Service Worker"; Pattern = "serviceWorker|sw\.js" },
    @{ Name = "Touch Gestures"; Pattern = "touch|gesture|swipe" },
    @{ Name = "Responsive Design"; Pattern = "mobile|tablet|responsive" }
)

$iosScore = 0

foreach ($opt in $iosOptimizations) {
    if ($opt.File) {
        if (Test-Path $opt.File) {
            Write-Host "   OK $($opt.Name) - Configurado" -ForegroundColor Green
            $iosScore++
        } else {
            Write-Host "   ERROR $($opt.Name) - Nao encontrado" -ForegroundColor Red
        }
    } else {
        $found = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx", "*.css" | 
            Where-Object { (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) -match $opt.Pattern }
        
        if ($found.Count -gt 0) {
            Write-Host "   OK $($opt.Name) - $($found.Count) implementacoes" -ForegroundColor Green
            $iosScore++
        } else {
            Write-Host "   WARN $($opt.Name) - Limitado" -ForegroundColor Yellow
        }
    }
}

Write-Host "   Score iOS: $iosScore/$($iosOptimizations.Count)" -ForegroundColor White
Write-Host ""

# 5. Verificar escalabilidade
Write-Host "5. Verificando Escalabilidade..." -ForegroundColor Blue

$scalabilityChecks = @(
    @{ Name = "Lazy Loading"; Pattern = "lazy|Suspense|dynamic" },
    @{ Name = "Memoização"; Pattern = "useMemo|useCallback|memo" },
    @{ Name = "Virtualização"; Pattern = "virtual|windowing" },
    @{ Name = "Code Splitting"; Pattern = "import\(|loadable" }
)

$scalabilityScore = 0

foreach ($check in $scalabilityChecks) {
    $found = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx" | 
        Where-Object { (Get-Content $_.FullName -Raw) -match $check.Pattern }
    
    if ($found.Count -gt 0) {
        Write-Host "   OK $($check.Name) - $($found.Count) implementacoes" -ForegroundColor Green
        $scalabilityScore++
    } else {
        Write-Host "   WARN $($check.Name) - Nao implementado" -ForegroundColor Yellow
    }
}

Write-Host "   Score de escalabilidade: $scalabilityScore/$($scalabilityChecks.Count)" -ForegroundColor White
Write-Host ""

# 6. Relatório final
Write-Host "RELATORIO FINAL" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green

$totalScore = $validHooks + $freemiumFeatures + $integrityScore + $iosScore + $scalabilityScore
$maxScore = $hooks.Count + $freemiumFiles.Count + $dataIntegrityChecks.Count + $iosOptimizations.Count + $scalabilityChecks.Count

$percentage = [math]::Round(($totalScore / $maxScore) * 100, 1)

Write-Host "Score Total: $totalScore/$maxScore ($percentage%)" -ForegroundColor White
Write-Host ""

if ($percentage -ge 80) {
    Write-Host "OK SISTEMA APROVADO - Pronto para producao!" -ForegroundColor Green
    Write-Host "Recomendacoes:" -ForegroundColor Blue
    Write-Host "   - Deploy em ambiente de staging" -ForegroundColor White
    Write-Host "   - Testes de carga" -ForegroundColor White
    Write-Host "   - Monitoramento de performance" -ForegroundColor White
} elseif ($percentage -ge 60) {
    Write-Host "WARN SISTEMA PARCIALMENTE APROVADO" -ForegroundColor Yellow
    Write-Host "Melhorias necessarias antes do deploy" -ForegroundColor Blue
} else {
    Write-Host "ERROR SISTEMA REPROVADO" -ForegroundColor Red
    Write-Host "Correcoes criticas necessarias" -ForegroundColor Blue
}

Write-Host ""
Write-Host "Proximos passos sugeridos:" -ForegroundColor Blue
Write-Host "   1. Implementar testes automatizados" -ForegroundColor White
Write-Host "   2. Configurar CI/CD pipeline" -ForegroundColor White
Write-Host "   3. Otimizar bundle size" -ForegroundColor White
Write-Host "   4. Implementar analytics" -ForegroundColor White
Write-Host "   5. Configurar monitoramento de erros" -ForegroundColor White

Write-Host ""
Write-Host "Validacao concluida!" -ForegroundColor Green