# Script simples para corrigir importacoes restantes

$files = @(
    'components\NewProtocolModal.tsx',
    'components\PatientPortal.tsx',
    'components\exercises\ExerciseStatsModal.tsx',
    'components\exercises\ExerciseRatingModal.tsx',
    'components\ClinicalProtocolViewerPage.tsx',
    'components\exercises\ExercisePDFModal.tsx',
    'components\SubscriptionManager.tsx',
    'hooks\useTrialManager.tsx',
    'hooks\useFeatureFlags.tsx',
    'components\CompliancePage.tsx',
    'components\chat\ChatInterface.tsx',
    'components\NotebookPage.tsx',
    'components\exercises\ImageSearchModal.tsx',
    'components\chat\CallInterface.tsx',
    'hooks\useReportGeneration.tsx',
    'components\UnifiedDashboard.tsx',
    'components\NewClinicalCaseModal.tsx',
    'components\ClinicalCasesLibraryPage.tsx',
    'hooks\useExternalIntegrations.tsx',
    'hooks\useStripe.tsx',
    'hooks\useAppleIAP.tsx',
    'components\exercises\ImageGalleryModal.tsx',
    'components\CalendarPage.tsx',
    'components\admin\SubscriptionMetricsPanel.tsx',
    'components\ClinicalProtocolsLibraryPage.tsx',
    'hooks\useGlobalSearch.tsx',
    'components\mobile\MobileExercisePage.tsx',
    'hooks\useSubscriptionLimits.tsx',
    'components\exercises\VideoUploadModal.tsx',
    'components\AnalyticsDashboard.tsx',
    'hooks\useABTesting.tsx',
    'components\qr\QRGeneratorModal.tsx',
    'components\MentorshipPage.tsx',
    'components\chat\ChatSidebar.tsx',
    'hooks\useBackupSync.tsx',
    'components\ClinicalCaseViewerPage.tsx',
    'components\exercises\ImageUploadModal.tsx',
    'components\OperationalDashboard.tsx',
    'components\ChatPage.tsx',
    'components\ReportsPage.tsx',
    'components\BillingPage.tsx',
    'hooks\usePushNotifications.tsx',
    'components\StaffPage.tsx',
    'components\ProtocolPrescriptionModal.tsx',
    'components\PatientProtocolTrackingPage.tsx',
    'components\exercises\VideoPlayerModal.tsx',
    'components\chat\ChatHeader.tsx',
    'components\exercises\CacheManagementModal.tsx',
    'components\ProtocolAnalyticsPage.tsx',
    'components\KanbanBoard.tsx',
    'components\FinancialPage.tsx'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $newContent = $content -replace "from '(.*)useData\.minimal'", "from '`$1useData'"
        $newContent = $newContent -replace 'from "(.*)useData\.minimal"', 'from "`$1useData"'
        Set-Content $file $newContent -NoNewline
        Write-Host "Corrigido: $file"
    }
}

Write-Host "Concluido!"