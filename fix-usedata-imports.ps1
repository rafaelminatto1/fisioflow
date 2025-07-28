# Script para corrigir importacoes de useData.minimal para useData

# Lista de arquivos que precisam ser corrigidos
$files = @(
    "components\NewProtocolModal.tsx",
    "components\PatientPortal.tsx",
    "components\exercises\ExerciseStatsModal.tsx",
    "components\exercises\ExerciseRatingModal.tsx",
    "components\ClinicalProtocolViewerPage.tsx",
    "components\exercises\ExercisePDFModal.tsx",
    "components\SubscriptionManager.tsx",
    "hooks\useTrialManager.tsx",
    "components\PatientPage.tsx",
    "hooks\useFeatureFlags.tsx",
    "components\CompliancePage.tsx",
    "components\chat\ChatInterface.tsx",
    "components\NotificationDropdown.tsx",
    "components\NotebookPage.tsx",
    "components\exercises\ImageSearchModal.tsx",
    "components\chat\CallInterface.tsx",
    "hooks\useReportGeneration.tsx",
    "components\UnifiedDashboard.tsx",
    "components\NewClinicalCaseModal.tsx",
    "components\ClinicalCasesLibraryPage.tsx",
    "hooks\useExternalIntegrations.tsx",
    "hooks\useStripe.tsx",
    "hooks\useAppleIAP.tsx",
    "components\exercises\ImageGalleryModal.tsx",
    "components\CalendarPage.tsx",
    "components\admin\SubscriptionMetricsPanel.tsx",
    "components\ClinicalProtocolsLibraryPage.tsx",
    "hooks\useGlobalSearch.tsx",
    "components\mobile\MobileExercisePage.tsx",
    "hooks\useSubscriptionLimits.tsx",
    "components\exercises\VideoUploadModal.tsx",
    "components\AnalyticsDashboard.tsx",
    "hooks\useABTesting.tsx",
    "components\qr\QRGeneratorModal.tsx",
    "components\MentorshipPage.tsx",
    "components\chat\ChatSidebar.tsx",
    "hooks\useBackupSync.tsx",
    "components\ClinicalCaseViewerPage.tsx",
    "components\exercises\ImageUploadModal.tsx",
    "components\OperationalDashboard.tsx",
    "components\ChatPage.tsx",
    "components\ReportsPage.tsx",
    "components\Dashboard.tsx",
    "components\BillingPage.tsx",
    "hooks\usePushNotifications.tsx",
    "components\StaffPage.tsx",
    "components\ProtocolPrescriptionModal.tsx",
    "components\PatientProtocolTrackingPage.tsx",
    "components\AIAssistant.tsx",
    "components\exercises\VideoPlayerModal.tsx",
    "components\chat\ChatHeader.tsx",
    "components\exercises\CacheManagementModal.tsx",
    "components\ProtocolAnalyticsPage.tsx",
    "components\KanbanBoard.tsx",
    "components\FinancialPage.tsx"
)

Write-Host "Iniciando correção das importações useData.minimal -> useData" -ForegroundColor Green

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "Corrigindo: $file" -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw
        
        # Substituir importações de useData.minimal para useData
        $newContent = $content -replace "from '(.*)useData\.minimal'", "from '`$1useData'"
        $newContent = $newContent -replace 'from "(.*)useData\.minimal"', 'from "`$1useData"'
        
        Set-Content $fullPath $newContent -NoNewline
        Write-Host "✓ Corrigido: $file" -ForegroundColor Green
    } else {
        Write-Host "⚠ Arquivo não encontrado: $file" -ForegroundColor Red
    }
}

Write-Host "\nCorreção concluída!" -ForegroundColor Green
Write-Host "Verificando se ainda há importações de useData.minimal..." -ForegroundColor Yellow

# Verificar se ainda há importações problemáticas
$remainingIssues = Get-ChildItem -Path $PSScriptRoot -Recurse -Include "*.tsx", "*.ts" | 
    Where-Object { $_.Name -ne "useData.minimal.tsx" } |
    Select-String "useData\.minimal" | 
    Where-Object { $_.Line -notmatch "^\s*//" }

if ($remainingIssues) {
    Write-Host "\n⚠ Ainda há importações de useData.minimal encontradas:" -ForegroundColor Red
    $remainingIssues | ForEach-Object {
        Write-Host "$($_.Filename):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Red
    }
} else {
    Write-Host "\n✓ Todas as importações foram corrigidas com sucesso!" -ForegroundColor Green
}