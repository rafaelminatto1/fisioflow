# Script de Migração: useData → Hooks Especializados
# Migra componentes que ainda usam useData para os novos hooks especializados

param(
    [string]$ComponentPath = "",
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

Write-Host "🚀 Iniciando migração useData → Hooks Especializados" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 MODO DRY RUN - Nenhum arquivo será modificado" -ForegroundColor Yellow
    Write-Host ""
}

# Buscar componentes que usam useData
Write-Host "🔍 Buscando componentes que usam useData..." -ForegroundColor Blue

$components = Get-ChildItem -Path "src" -Recurse -Include "*.tsx", "*.ts" | Where-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    $content -and ($content -match "useData\.minimal" -or ($content -match "from.*useData" -and -not ($_.Name -eq "useData.tsx" -or $_.Name -eq "useData.minimal.tsx")))
}

Write-Host "📊 Encontrados $($components.Count) componentes usando useData" -ForegroundColor Blue
Write-Host ""

$migratedCount = 0

foreach ($component in $components) {
    Write-Host "📝 Analisando: $($component.Name)" -ForegroundColor Yellow
    
    $content = Get-Content $component.FullName -Raw
    $originalContent = $content
    
    # Detectar dependências
    $needsPatients = $content -match "patients|savePatient|deletePatient"
    $needsAppointments = $content -match "appointments|saveAppointment|deleteAppointment"
    $needsTasks = $content -match "tasks|saveTask|deleteTask"
    $needsUsers = $content -match "users|saveUser|deleteUser"
    $needsAssessments = $content -match "assessments|saveAssessment|deleteAssessment"
    $needsPrescriptions = $content -match "prescriptions|savePrescription|deletePrescription"
    $needsDocuments = $content -match "documents|saveDocument|deleteDocument"
    $needsReports = $content -match "reports|generateReport|saveReport"
    $needsAuth = $content -match "currentUser|login|logout"
    
    # Gerar imports
    $imports = @()
    if ($needsPatients) { $imports += "usePatients" }
    if ($needsAppointments) { $imports += "useAppointments" }
    if ($needsTasks) { $imports += "useTasks" }
    if ($needsUsers) { $imports += "useUsers" }
    if ($needsAssessments) { $imports += "useAssessments" }
    if ($needsPrescriptions) { $imports += "usePrescriptions" }
    if ($needsDocuments) { $imports += "useDocuments" }
    if ($needsReports) { $imports += "useReports" }
    if ($needsAuth) { $imports += "useAuth" }
    
    if ($imports.Count -eq 0) {
        Write-Host "   ⚠️  Nenhuma dependência específica detectada - pulando" -ForegroundColor Yellow
        continue
    }
    
    # Remover import antigo
    $content = $content -replace "import \{ useData \} from [^;]+;\s*", ""
    
    # Adicionar novos imports
    $newImport = "import { $($imports -join ', ') } from '../hooks';"
    if ($content -match "(import [^;]+;\s*)+") {
        $content = $content -replace "(import [^;]+;\s*)+", "`$&`n$newImport`n"
    } else {
        $content = "$newImport`n`n$content"
    }
    
    # Gerar hook usage
    $hookUsages = @()
    if ($needsPatients) { $hookUsages += "  const { patients, createPatient, updatePatient, removePatient, isLoading: patientsLoading } = usePatients();" }
    if ($needsAppointments) { $hookUsages += "  const { appointments, createAppointment, updateAppointment, removeAppointment, isLoading: appointmentsLoading } = useAppointments();" }
    if ($needsTasks) { $hookUsages += "  const { tasks, addTask, updateTask, removeTask, loading: tasksLoading } = useTasks();" }
    if ($needsUsers) { $hookUsages += "  const { users, createUser, updateUser, removeUser, isLoading: usersLoading } = useUsers();" }
    if ($needsAssessments) { $hookUsages += "  const { assessments, createAssessment, updateAssessment, removeAssessment, isLoading: assessmentsLoading } = useAssessments();" }
    if ($needsPrescriptions) { $hookUsages += "  const { prescriptions, createPrescription, updatePrescription, removePrescription, isLoading: prescriptionsLoading } = usePrescriptions();" }
    if ($needsDocuments) { $hookUsages += "  const { documents, uploadDocument, updateDocument, removeDocument, isLoading: documentsLoading } = useDocuments();" }
    if ($needsReports) { $hookUsages += "  const { reports, createReport, generateReport, removeReport, isLoading: reportsLoading } = useReports();" }
    if ($needsAuth) { $hookUsages += "  const { user: currentUser, login, logout, updateUser: updateCurrentUser, isLoading: authLoading } = useAuth();" }
    
    $newHookUsage = $hookUsages -join "`n"
    
    # Substituir uso do useData
    $content = $content -replace "const \{[^}]+\} = useData\(\);", $newHookUsage
    
    # Ajustar nomes de funções
    $content = $content -replace "savePatient", "createPatient"
    $content = $content -replace "deletePatient", "removePatient"
    $content = $content -replace "saveAppointment", "createAppointment"
    $content = $content -replace "deleteAppointment", "removeAppointment"
    $content = $content -replace "saveUser", "createUser"
    $content = $content -replace "deleteUser", "removeUser"
    $content = $content -replace "saveAssessment", "createAssessment"
    $content = $content -replace "deleteAssessment", "removeAssessment"
    $content = $content -replace "savePrescription", "createPrescription"
    $content = $content -replace "deletePrescription", "removePrescription"
    $content = $content -replace "saveDocument", "uploadDocument"
    $content = $content -replace "deleteDocument", "removeDocument"
    $content = $content -replace "saveReport", "createReport"
    $content = $content -replace "deleteReport", "removeReport"
    
    if ($content -ne $originalContent) {
        if (-not $DryRun) {
            Set-Content -Path $component.FullName -Value $content -Encoding UTF8
            Write-Host "   ✅ Migrado com sucesso" -ForegroundColor Green
            $migratedCount++
        } else {
            Write-Host "   🔍 [DRY RUN] Mudanças detectadas" -ForegroundColor Cyan
            if ($Verbose) {
                Write-Host "   📋 Dependências: $($imports -join ', ')" -ForegroundColor White
            }
        }
    } else {
        Write-Host "   ℹ️  Nenhuma mudança necessária" -ForegroundColor Blue
    }
}

Write-Host ""
Write-Host "📈 Resumo da Migração:" -ForegroundColor Green
Write-Host "   Total de arquivos analisados: $($components.Count)" -ForegroundColor White
Write-Host "   Arquivos migrados: $migratedCount" -ForegroundColor Green
Write-Host "   Arquivos sem mudanças: $($components.Count - $migratedCount)" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host ""
    Write-Host "💡 Para aplicar as mudanças, execute sem o parâmetro -DryRun" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "✅ Migração concluída!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Blue
    Write-Host "   1. npm run type-check" -ForegroundColor White
    Write-Host "   2. npm run test" -ForegroundColor White
    Write-Host "   3. npm run dev" -ForegroundColor White
}