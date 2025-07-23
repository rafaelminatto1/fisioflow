const fs = require('fs');
const path = require('path');

// Lista de arquivos que precisam ser corrigidos
const filesToFix = [
  'components/NotificationDropdown.tsx',
  'components/PaymentModal.tsx',
  'components/Header.tsx',
  'components/EquipmentModal.tsx',
  'components/ReportGenerationModal.tsx',
  'components/ClinicalProtocolViewerPage.tsx',
  'components/ClinicalCasesLibraryPage.tsx',
  'components/NotebookPage.tsx',
  'components/ClinicalCaseViewerPage.tsx',
  'components/PatientModal.tsx',
  'components/KanbanBoard.tsx',
  'components/CrossModuleNotifications.tsx',
  'components/ExercisePage.tsx',
  'components/ProtocolPrescriptionModal.tsx',
  'components/ReportsPage.tsx',
  'components/FinancialPage.tsx',
  'components/ExerciseHistoryModal.tsx',
  'components/TaskModal.tsx',
  'components/StaffModal.tsx',
  'components/EditExerciseModal.tsx',
  'components/Dashboard.tsx',
  'components/TransactionModal.tsx',
  'components/MentorshipPage.tsx',
  'components/CalendarPage.tsx',
  'components/ProtocolAnalyticsPage.tsx',
  'components/ClinicOnboardingModal.tsx',
  'components/AssessmentModal.tsx',
  'components/NewClinicalCaseModal.tsx',
  'components/ChatPage.tsx',
  'components/PatientProtocolTrackingPage.tsx',
  'components/CompliancePage.tsx',
  'components/NotificationToast.tsx',
  'components/PrescriptionModal.tsx',
  'components/PatientFeedbackModal.tsx',
  'components/StaffPage.tsx',
  'components/OnboardingChecklist.tsx',
  'components/AppointmentModal.tsx',
  'components/PatientPage.tsx',
  'components/ExerciseFeedbackModal.tsx',
  'components/ExerciseModal.tsx',
  'components/LoginPage.tsx',
  'components/OperationalDashboard.tsx',
  'components/SystemStatusPage.tsx',
  'components/NotebookTree.tsx',
  'components/ClinicalProtocolsLibraryPage.tsx',
  'components/UnifiedDashboard.tsx',
  'components/NewProtocolModal.tsx',
  'components/BillingPage.tsx',
  'components/FinancialSummaryDashboard.tsx',
  'components/AIAssistant.tsx',
  'components/PatientPortal.tsx'
];

// Função para corrigir imports
function fixImports() {
  filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Corrigir import relativo para absoluto
      content = content.replace(
        /from\s+['"]\.\/icons\/IconComponents['"]/g,
        "from './icons/IconComponents'"
      );
      
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Fixed imports in: ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
  });
}

// Executar correção
fixImports();
console.log('Import fixes completed!');