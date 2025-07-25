# Script de Migração Automática useData → Hooks Especializados
# PowerShell Script para Windows
# Uso: .\scripts\migrate-component.ps1 "src\components\PatientModal.tsx"

param(
    [Parameter(Mandatory=$true)]
    [string]$ComponentPath,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$UseSpecialized = $false
)

# Cores para output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Test-FileExists {
    param([string]$Path)
    return Test-Path $Path
}

function Backup-File {
    param([string]$FilePath)
    $backupPath = "$FilePath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $FilePath $backupPath
    Write-ColorOutput "✅ Backup criado: $backupPath" $Green
    return $backupPath
}

function Get-ComponentType {
    param([string]$Content)
    
    $patterns = @{
        "Patient" = @("patients", "savePatient", "deletePatient", "PatientModal", "PatientPage")
        "Session" = @("appointments", "sessions", "saveAppointment", "CalendarPage")
        "Task" = @("tasks", "saveTask", "KanbanBoard", "TaskModal")
        "Auth" = @("currentUser", "login", "logout", "Header", "AuthPage")
        "Subscription" = @("subscription", "canUseFeature", "BillingPage", "SubscriptionManager")
        "Dashboard" = @("Dashboard", "Analytics", "Reports")
    }
    
    $detectedTypes = @()
    
    foreach ($type in $patterns.Keys) {
        foreach ($pattern in $patterns[$type]) {
            if ($Content -match $pattern) {
                $detectedTypes += $type
                break
            }
        }
    }
    
    return $detectedTypes
}

function Get-MigrationStrategy {
    param([string[]]$ComponentTypes)
    
    if ($UseSpecialized) {
        return "specialized"
    }
    
    # Se usa múltiplos tipos, usar migração gradual
    if ($ComponentTypes.Count -gt 2) {
        return "migration"
    }
    
    # Se usa apenas um tipo, pode usar hook especializado
    if ($ComponentTypes.Count -eq 1) {
        return "specialized"
    }
    
    return "migration"
}

function Get-SpecializedImports {
    param([string[]]$ComponentTypes)
    
    $imports = @()
    
    if ($ComponentTypes -contains "Patient") {
        $imports += "import { usePatients } from '../hooks/usePatients';"
    }
    
    if ($ComponentTypes -contains "Session") {
        $imports += "import { useSessions } from '../hooks/useSessions';"
    }
    
    if ($ComponentTypes -contains "Task") {
        $imports += "import { useTasks } from '../hooks/useTasks';"
    }
    
    if ($ComponentTypes -contains "Auth") {
        $imports += "import { useAuth } from '../hooks/useAuth';"
    }
    
    if ($ComponentTypes -contains "Subscription") {
        $imports += "import { useSubscription } from '../hooks/useSubscription';"
    }
    
    return $imports
}

function Update-ComponentContent {
    param(
        [string]$Content,
        [string]$Strategy,
        [string[]]$ComponentTypes
    )
    
    $updatedContent = $Content
    
    if ($Strategy -eq "migration") {
        # Migração gradual usando useDataMigration
        Write-ColorOutput "📦 Usando estratégia de migração gradual" $Blue
        
        # Substituir imports
        $updatedContent = $updatedContent -replace "import \{ useData \} from ['\"][^'\"]*useData(\.minimal)?['\"];?", "import { useDataMigration } from '../hooks/useDataMigration';"
        $updatedContent = $updatedContent -replace "import \{ useData \} from ['\"][^'\"]*\/hooks\/useData(\.minimal)?['\"];?", "import { useDataMigration } from '../hooks/useDataMigration';"
        
        # Substituir chamadas do hook
        $updatedContent = $updatedContent -replace "const \{([^}]+)\} = useData\(\);", "const {`$1} = useDataMigration();"
        $updatedContent = $updatedContent -replace "useData\(\)", "useDataMigration()"
        
    } elseif ($Strategy -eq "specialized") {
        # Migração para hooks especializados
        Write-ColorOutput "🎯 Usando estratégia de hooks especializados" $Blue
        
        # Remover import antigo
        $updatedContent = $updatedContent -replace "import \{ useData \} from [^;]+;\s*", ""
        
        # Adicionar imports especializados
        $imports = Get-SpecializedImports $ComponentTypes
        $importBlock = $imports -join "`n"
        
        # Inserir imports após outros imports React
        if ($updatedContent -match "(import React[^;]*;)") {
            $updatedContent = $updatedContent -replace "(import React[^;]*;)", "`$1`n$importBlock"
        } else {
            $updatedContent = "$importBlock`n$updatedContent"
        }
        
        # Substituir useData() por hooks especializados
        if ($ComponentTypes -contains "Patient") {
            $updatedContent = $updatedContent -replace "const \{[^}]*patients[^}]*\} = useData\(\);", "const { patients, addPatient, updatePatient, removePatient, loading: patientsLoading } = usePatients();"
        }
        
        if ($ComponentTypes -contains "Session") {
            $updatedContent = $updatedContent -replace "const \{[^}]*appointments[^}]*\} = useData\(\);", "const { sessions: appointments, addSession, updateSession, removeSession, loading: sessionsLoading } = useSessions();"
        }
        
        if ($ComponentTypes -contains "Task") {
            $updatedContent = $updatedContent -replace "const \{[^}]*tasks[^}]*\} = useData\(\);", "const { tasks, addTask, updateTask, removeTask, loading: tasksLoading } = useTasks();"
        }
        
        if ($ComponentTypes -contains "Auth") {
            $updatedContent = $updatedContent -replace "const \{[^}]*currentUser[^}]*\} = useData\(\);", "const { user: currentUser, login, logout, updateUser, loading: authLoading } = useAuth();"
        }
        
        if ($ComponentTypes -contains "Subscription") {
            $updatedContent = $updatedContent -replace "const \{[^}]*subscription[^}]*\} = useData\(\);", "const { subscription, canUseFeature, getUsageStats, checkLimits, loading: subscriptionLoading } = useSubscription();"
        }
    }
    
    return $updatedContent
}

function Add-FreemiumChecks {
    param([string]$Content, [string[]]$ComponentTypes)
    
    if ($ComponentTypes -contains "Patient" -or $ComponentTypes -contains "Session" -or $ComponentTypes -contains "Task") {
        Write-ColorOutput "🔒 Adicionando verificações freemium" $Yellow
        
        # Adicionar verificação antes de savePatient
        $Content = $Content -replace "(const handleSave[^=]*= async \([^)]*\) => \{)", "`$1`n    // Verificar limites freemium`n    if (!canUseFeature('patients')) {`n      showUpgradeModal();`n      return;`n    }`n"
        
        # Adicionar verificação antes de saveAppointment
        $Content = $Content -replace "(saveAppointment\([^)]*\))", "canUseFeature('sessions') ? `$1 : showUpgradeModal()"
        
        # Adicionar verificação antes de saveTask
        $Content = $Content -replace "(saveTask\([^)]*\))", "canUseFeature('tasks') ? `$1 : showUpgradeModal()"
    }
    
    return $Content
}

function Test-Migration {
    param([string]$FilePath)
    
    Write-ColorOutput "🧪 Testando migração..." $Blue
    
    # Verificar se o arquivo compila
    $tscResult = & npx tsc --noEmit $FilePath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ TypeScript compilation OK" $Green
    } else {
        Write-ColorOutput "❌ TypeScript compilation FAILED:" $Red
        Write-ColorOutput $tscResult $Red
        return $false
    }
    
    # Verificar se há testes para o componente
    $testFile = $FilePath -replace "\.tsx?$", ".test.tsx"
    if (Test-Path $testFile) {
        Write-ColorOutput "🧪 Executando testes..." $Blue
        $testResult = & npm run test:jest -- --testPathPattern=$testFile 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Testes passaram" $Green
        } else {
            Write-ColorOutput "⚠️ Testes falharam - revisar manualmente" $Yellow
        }
    }
    
    return $true
}

function Show-MigrationSummary {
    param(
        [string]$ComponentPath,
        [string[]]$ComponentTypes,
        [string]$Strategy,
        [string]$BackupPath
    )
    
    Write-ColorOutput "`n=== 📊 RESUMO DA MIGRAÇÃO ===" $Blue
    Write-ColorOutput "Componente: $ComponentPath" $White
    Write-ColorOutput "Tipos detectados: $($ComponentTypes -join ', ')" $White
    Write-ColorOutput "Estratégia: $Strategy" $White
    Write-ColorOutput "Backup: $BackupPath" $White
    
    Write-ColorOutput "`n=== ✅ PRÓXIMOS PASSOS ===" $Green
    Write-ColorOutput "1. Revisar o código migrado" $White
    Write-ColorOutput "2. Testar funcionalidade manualmente" $White
    Write-ColorOutput "3. Executar: npm run test:jest" $White
    Write-ColorOutput "4. Executar: npm run build:check" $White
    Write-ColorOutput "5. Se tudo OK, deletar backup" $White
    
    if ($Strategy -eq "migration") {
        Write-ColorOutput "`n=== 🔄 MIGRAÇÃO FUTURA ===" $Yellow
        Write-ColorOutput "Este componente usa useDataMigration (transição)" $White
        Write-ColorOutput "Considere migrar para hooks especializados depois" $White
    }
}

# === SCRIPT PRINCIPAL ===

Write-ColorOutput "🚀 Iniciando migração de $ComponentPath" $Blue

# Verificar se o arquivo existe
if (-not (Test-FileExists $ComponentPath)) {
    Write-ColorOutput "❌ Arquivo não encontrado: $ComponentPath" $Red
    exit 1
}

# Ler conteúdo do arquivo
$content = Get-Content $ComponentPath -Raw

# Verificar se usa useData
if ($content -notmatch "useData") {
    Write-ColorOutput "ℹ️ Arquivo não usa useData - migração não necessária" $Yellow
    exit 0
}

# Detectar tipos de componente
$componentTypes = Get-ComponentType $content
Write-ColorOutput "🔍 Tipos detectados: $($componentTypes -join ', ')" $Blue

if ($componentTypes.Count -eq 0) {
    Write-ColorOutput "⚠️ Não foi possível detectar o tipo do componente" $Yellow
    $componentTypes = @("Generic")
}

# Determinar estratégia de migração
$strategy = Get-MigrationStrategy $componentTypes
Write-ColorOutput "📋 Estratégia: $strategy" $Blue

if ($DryRun) {
    Write-ColorOutput "🔍 DRY RUN - Nenhuma alteração será feita" $Yellow
    Write-ColorOutput "Estratégia que seria usada: $strategy" $White
    Write-ColorOutput "Tipos detectados: $($componentTypes -join ', ')" $White
    exit 0
}

# Criar backup
$backupPath = Backup-File $ComponentPath

try {
    # Atualizar conteúdo
    $updatedContent = Update-ComponentContent $content $strategy $componentTypes
    
    # Adicionar verificações freemium
    $updatedContent = Add-FreemiumChecks $updatedContent $componentTypes
    
    # Salvar arquivo atualizado
    Set-Content $ComponentPath $updatedContent -Encoding UTF8
    Write-ColorOutput "✅ Arquivo migrado com sucesso" $Green
    
    # Testar migração
    $testSuccess = Test-Migration $ComponentPath
    
    if ($testSuccess) {
        Show-MigrationSummary $ComponentPath $componentTypes $strategy $backupPath
        Write-ColorOutput "`n🎉 Migração concluída com sucesso!" $Green
    } else {
        Write-ColorOutput "⚠️ Migração concluída mas com avisos" $Yellow
    }
    
} catch {
    Write-ColorOutput "❌ Erro durante migração: $($_.Exception.Message)" $Red
    
    # Restaurar backup
    Copy-Item $backupPath $ComponentPath
    Write-ColorOutput "🔄 Backup restaurado" $Yellow
    
    exit 1
}

Write-ColorOutput "`n📝 Log de migração salvo em: migration.log" $Blue