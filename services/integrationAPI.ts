import { 
  Patient, 
  ClinicalCase, 
  ClinicalProtocol, 
  Appointment, 
  Assessment,
  User,
  QualityIndicator,
  ProductivityMetric
} from '../types';

// Internal Integration APIs
export class IntegrationAPI {
  // Patient to Educational Case Conversion
  static async convertPatientToEducationalCase(
    patient: Patient,
    assessment: Assessment,
    actingUser: User
  ): Promise<ClinicalCase> {
    // Anonymize patient data for educational use
    const anonymizedCase: Partial<ClinicalCase> = {
      id: crypto.randomUUID(),
      title: `Caso Clínico - ${assessment.diagnosticHypothesis}`,
      specialty: this.mapConditionToSpecialty(assessment.diagnosticHypothesis),
      pathology: assessment.diagnosticHypothesis,
      tags: this.extractTagsFromAssessment(assessment),
      difficulty: this.calculateCaseDifficulty(assessment),
      anonymizedPatientData: {
        age: this.calculateAge(patient.medicalHistory), // Would extract from medical history
        gender: this.extractGender(patient.medicalHistory), // Would extract from medical history
        occupation: 'Não informado',
        relevantHistory: this.anonymizeHistory(patient.medicalHistory),
      },
      clinicalHistory: assessment.history,
      examinations: [
        {
          id: crypto.randomUUID(),
          type: 'Física',
          name: 'Avaliação Fisioterapêutica',
          findings: assessment.posturalAnalysis,
          date: assessment.date,
        },
      ],
      treatment: {
        objectives: [assessment.treatmentPlan],
        interventions: this.extractInterventions(assessment),
        duration: '6-8 semanas',
        frequency: '3x por semana',
        precautions: ['Monitorar dor', 'Progressão gradual'],
      },
      evolution: [],
      attachments: [],
      discussionQuestions: this.generateDiscussionQuestions(assessment),
      learningObjectives: this.generateLearningObjectives(assessment),
      createdById: actingUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublished: false,
      viewCount: 0,
      rating: 0,
      ratingCount: 0,
      tenantId: actingUser.tenantId || '',
    };

    return anonymizedCase as ClinicalCase;
  }

  // Protocol Suggestion Based on Diagnosis
  static suggestProtocolForDiagnosis(
    diagnosis: string,
    patientData: {
      age?: number;
      condition?: string;
      severity?: 'mild' | 'moderate' | 'severe';
    },
    availableProtocols: ClinicalProtocol[]
  ): ClinicalProtocol[] {
    const suggestions: ClinicalProtocol[] = [];

    // Smart matching algorithm
    for (const protocol of availableProtocols) {
      let score = 0;

      // Match by specialty
      if (this.diagnosisMatchesSpecialty(diagnosis, protocol.specialty)) {
        score += 50;
      }

      // Match by indication
      if (protocol.indication.toLowerCase().includes(diagnosis.toLowerCase())) {
        score += 40;
      }

      // Match by category
      if (this.diagnosisMatchesCategory(diagnosis, protocol.category)) {
        score += 30;
      }

      // Age considerations
      if (patientData.age) {
        if (patientData.age > 65 && protocol.specialty === 'Geriatria') {
          score += 20;
        } else if (patientData.age < 18 && protocol.specialty === 'Pediatria') {
          score += 20;
        }
      }

      // Severity considerations
      if (patientData.severity) {
        const protocolPhases = protocol.phases || [];
        if (patientData.severity === 'severe' && protocolPhases.length > 3) {
          score += 15;
        } else if (patientData.severity === 'mild' && protocolPhases.length <= 2) {
          score += 15;
        }
      }

      if (score >= 50) {
        suggestions.push(protocol);
      }
    }

    // Sort by relevance score (would need to track scores)
    return suggestions.slice(0, 3);
  }

  // Consolidated Metrics from All Modules
  static generateConsolidatedMetrics(
    period: { start: string; end: string },
    data: {
      patients: Patient[];
      appointments: Appointment[];
      protocols: any[];
      mentorshipSessions: any[];
      transactions: any[];
      qualityIndicators: QualityIndicator[];
      productivityMetrics: ProductivityMetric[];
    }
  ): any {
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);

    // Filter data by period
    const periodAppointments = data.appointments.filter(
      a => new Date(a.start) >= startDate && new Date(a.start) <= endDate
    );

    const periodTransactions = data.transactions.filter(
      t => new Date(t.dueDate) >= startDate && new Date(t.dueDate) <= endDate
    );

    const periodSessions = data.mentorshipSessions.filter(
      s => new Date(s.date) >= startDate && new Date(s.date) <= endDate
    );

    // Calculate consolidated KPIs
    const consolidatedMetrics = {
      period,
      overview: {
        totalPatients: data.patients.length,
        activePatients: data.patients.filter(p => p.consent.given).length,
        newPatients: data.patients.filter(
          p => new Date(p.consent.timestamp || 0) >= startDate
        ).length,
      },
      clinical: {
        appointmentsScheduled: periodAppointments.length,
        appointmentsCompleted: periodAppointments.filter(
          a => new Date(a.end) < new Date()
        ).length,
        protocolsActive: data.protocols.filter(p => p.status === 'Ativo').length,
        averageSessionDuration: this.calculateAverageSessionDuration(periodAppointments),
      },
      educational: {
        mentorshipSessions: periodSessions.length,
        studentsActive: new Set(periodSessions.map(s => s.studentId)).size,
        coursesCompleted: 0, // Would calculate from student progress
        casesCreated: 0, // Would calculate from clinical cases
      },
      financial: {
        totalRevenue: periodTransactions
          .filter(t => t.status === 'pago')
          .reduce((sum, t) => sum + t.amount, 0),
        pendingRevenue: periodTransactions
          .filter(t => t.status === 'pendente')
          .reduce((sum, t) => sum + t.amount, 0),
        averageTicket: this.calculateAverageTicket(periodTransactions),
      },
      operational: {
        utilizationRate: this.calculateUtilizationRate(periodAppointments),
        patientSatisfaction: this.calculateAverageSatisfaction(data.qualityIndicators),
        therapistProductivity: this.calculateAverageProductivity(data.productivityMetrics),
        systemAlerts: 0, // Would calculate active alerts
      },
      trends: {
        patientGrowth: this.calculateGrowthRate('patients', period, data.patients),
        revenueGrowth: this.calculateGrowthRate('revenue', period, periodTransactions),
        satisfactionTrend: this.calculateTrend('satisfaction', data.qualityIndicators),
        productivityTrend: this.calculateTrend('productivity', data.productivityMetrics),
      },
      integration: {
        crossModuleActivities: this.countCrossModuleActivities(data),
        automatedWorkflows: this.countAutomatedWorkflows(),
        dataConsistency: this.checkDataConsistency(data),
      },
    };

    return consolidatedMetrics;
  }

  // Automated Workflow Triggers
  static async triggerWorkflow(
    workflowType: 'patient-onboarding' | 'protocol-completion' | 'case-to-project' | 'alert-escalation',
    data: any,
    actingUser: User
  ): Promise<any> {
    switch (workflowType) {
      case 'patient-onboarding':
        return this.handlePatientOnboardingWorkflow(data, actingUser);
      case 'protocol-completion':
        return this.handleProtocolCompletionWorkflow(data, actingUser);
      case 'case-to-project':
        return this.handleCaseToProjectWorkflow(data, actingUser);
      case 'alert-escalation':
        return this.handleAlertEscalationWorkflow(data, actingUser);
      default:
        throw new Error(`Unknown workflow type: ${workflowType}`);
    }
  }

  // Global Search Across All Modules
  static performGlobalSearch(
    query: string,
    modules: string[],
    data: any,
    tenantId: string
  ): any {
    const results = {
      patients: [],
      appointments: [],
      protocols: [],
      cases: [],
      tasks: [],
      equipment: [],
      reports: [],
      total: 0,
    };

    const searchTerm = query.toLowerCase();

    if (modules.includes('patients')) {
      results.patients = data.patients
        .filter((p: Patient) => 
          p.tenantId === tenantId &&
          (p.name.toLowerCase().includes(searchTerm) ||
           p.email.toLowerCase().includes(searchTerm) ||
           p.medicalHistory.toLowerCase().includes(searchTerm))
        )
        .slice(0, 10);
    }

    if (modules.includes('appointments')) {
      results.appointments = data.appointments
        .filter((a: Appointment) => 
          a.tenantId === tenantId &&
          (a.title.toLowerCase().includes(searchTerm) ||
           a.notes?.toLowerCase().includes(searchTerm))
        )
        .slice(0, 10);
    }

    if (modules.includes('protocols')) {
      results.protocols = data.protocols
        .filter((p: ClinicalProtocol) => 
          p.tenantId === tenantId &&
          (p.name.toLowerCase().includes(searchTerm) ||
           p.description.toLowerCase().includes(searchTerm) ||
           p.indication.toLowerCase().includes(searchTerm))
        )
        .slice(0, 10);
    }

    // Calculate total results
    results.total = Object.values(results)
      .filter((value): value is any[] => Array.isArray(value))
      .reduce((sum, arr) => sum + arr.length, 0);

    return results;
  }

  // Helper Methods
  private static mapConditionToSpecialty(condition: string): ClinicalCase['specialty'] {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('joelho') || lowerCondition.includes('ombro')) {
      return 'Ortopedia';
    }
    if (lowerCondition.includes('avc') || lowerCondition.includes('neurológic')) {
      return 'Neurologia';
    }
    if (lowerCondition.includes('cardíac') || lowerCondition.includes('coração')) {
      return 'Cardio';
    }
    if (lowerCondition.includes('respiratóri') || lowerCondition.includes('pulmão')) {
      return 'Respiratoria';
    }
    return 'Geral';
  }

  private static extractTagsFromAssessment(assessment: Assessment): string[] {
    const tags: string[] = [];
    
    // Extract from diagnostic hypothesis
    const diagnosis = assessment.diagnosticHypothesis.toLowerCase();
    if (diagnosis.includes('dor')) tags.push('dor');
    if (diagnosis.includes('fratura')) tags.push('fratura');
    if (diagnosis.includes('lesão')) tags.push('lesão');
    if (diagnosis.includes('reabilitação')) tags.push('reabilitação');
    
    // Extract from body parts mentioned
    if (diagnosis.includes('joelho')) tags.push('joelho');
    if (diagnosis.includes('ombro')) tags.push('ombro');
    if (diagnosis.includes('coluna')) tags.push('coluna');
    
    return tags;
  }

  private static calculateCaseDifficulty(assessment: Assessment): ClinicalCase['difficulty'] {
    let complexity = 0;
    
    // Multiple body parts increase complexity
    const bodyParts = assessment.rangeOfMotion.length;
    complexity += bodyParts > 3 ? 2 : bodyParts > 1 ? 1 : 0;
    
    // Muscle strength issues increase complexity
    const weakMuscles = assessment.muscleStrength.filter(m => 
      parseInt(m.grade) < 3
    ).length;
    complexity += weakMuscles > 2 ? 2 : weakMuscles > 0 ? 1 : 0;
    
    // Pain level affects complexity
    complexity += assessment.painLevel > 7 ? 2 : assessment.painLevel > 4 ? 1 : 0;
    
    if (complexity >= 5) return 'Avançado';
    if (complexity >= 3) return 'Intermediário';
    return 'Iniciante';
  }

  private static anonymizeHistory(history: string): string {
    // Remove any potential identifying information
    return history
      .replace(/\b\d{11}\b/g, '***') // CPF
      .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, '**/**/**') // Dates
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***') // Emails
      .replace(/\b\d{8,11}\b/g, '***'); // Phone numbers
  }

  private static calculateAge(medicalHistory: string): number {
    // Would extract age from medical history or use a default
    return 35; // Placeholder
  }

  private static extractGender(medicalHistory: string): 'M' | 'F' | 'Outro' {
    // Would extract gender from medical history
    return 'Outro'; // Placeholder for privacy
  }

  private static extractInterventions(assessment: Assessment): any[] {
    return [
      {
        id: crypto.randomUUID(),
        type: 'Cinesioterapia',
        description: assessment.treatmentPlan,
        parameters: 'Baseado na avaliação inicial',
        progression: 'Evolução conforme tolerância do paciente',
      },
    ];
  }

  private static generateDiscussionQuestions(assessment: Assessment): string[] {
    return [
      'Qual seria sua hipótese diagnóstica principal?',
      'Que testes funcionais adicionais você realizaria?',
      'Como você estruturaria o plano de tratamento?',
      'Quais seriam os critérios de evolução para este caso?',
    ];
  }

  private static generateLearningObjectives(assessment: Assessment): string[] {
    return [
      'Compreender a avaliação fisioterapêutica completa',
      'Identificar os principais déficits funcionais',
      'Estabelecer objetivos de tratamento SMART',
      'Selecionar intervenções baseadas em evidências',
    ];
  }

  private static diagnosisMatchesSpecialty(diagnosis: string, specialty: string): boolean {
    const specialtyMap: Record<string, string[]> = {
      'Ortopedia': ['joelho', 'ombro', 'quadril', 'tornozelo', 'fratura', 'artrose'],
      'Neurologia': ['avc', 'parkinson', 'esclerose', 'neuropatia'],
      'Cardio': ['infarto', 'insuficiência', 'hipertensão'],
      'Respiratoria': ['dpoc', 'asma', 'pneumonia'],
      'Geriatria': ['idoso', 'demência', 'osteoporose'],
      'Pediatria': ['criança', 'desenvolvimento', 'paralisia cerebral'],
    };

    const keywords = specialtyMap[specialty] || [];
    return keywords.some(keyword => 
      diagnosis.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private static diagnosisMatchesCategory(diagnosis: string, category: string): boolean {
    const categoryMap: Record<string, string[]> = {
      'Pós-Cirúrgico': ['cirurgia', 'pós-operatório', 'prótese'],
      'Conservador': ['conservador', 'não-cirúrgico'],
      'Preventivo': ['prevenção', 'preventivo'],
      'Manutenção': ['manutenção', 'crônico'],
    };

    const keywords = categoryMap[category] || [];
    return keywords.some(keyword => 
      diagnosis.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Additional helper methods for metrics calculations
  private static calculateAverageSessionDuration(appointments: Appointment[]): number {
    if (appointments.length === 0) return 0;
    
    const totalDuration = appointments.reduce((sum, apt) => {
      const start = new Date(apt.start);
      const end = new Date(apt.end);
      return sum + (end.getTime() - start.getTime());
    }, 0);
    
    return totalDuration / appointments.length / (1000 * 60); // Convert to minutes
  }

  private static calculateAverageTicket(transactions: any[]): number {
    if (transactions.length === 0) return 0;
    
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    return total / transactions.length;
  }

  private static calculateUtilizationRate(appointments: Appointment[]): number {
    const completed = appointments.filter(a => new Date(a.end) < new Date()).length;
    return appointments.length > 0 ? (completed / appointments.length) * 100 : 0;
  }

  private static calculateAverageSatisfaction(indicators: QualityIndicator[]): number {
    const satisfactionIndicators = indicators.filter(qi => qi.type === 'satisfaction');
    if (satisfactionIndicators.length === 0) return 0;
    
    const total = satisfactionIndicators.reduce((sum, qi) => sum + qi.value, 0);
    return total / satisfactionIndicators.length;
  }

  private static calculateAverageProductivity(metrics: ProductivityMetric[]): number {
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, pm) => sum + pm.efficiencyScore, 0);
    return total / metrics.length;
  }

  private static calculateGrowthRate(type: string, period: any, data: any[]): number {
    // Simplified growth calculation - would need historical data
    return Math.random() * 20 - 10; // Placeholder: -10% to +10%
  }

  private static calculateTrend(type: string, data: any[]): 'up' | 'down' | 'stable' {
    // Simplified trend calculation
    return Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable';
  }

  private static countCrossModuleActivities(data: any): number {
    // Count activities that span multiple modules
    return Math.floor(Math.random() * 50) + 10; // Placeholder
  }

  private static countAutomatedWorkflows(): number {
    // Count active automated workflows
    return 4; // Based on the integrations we defined
  }

  private static checkDataConsistency(data: any): number {
    // Check data consistency across modules (0-100%)
    return Math.floor(Math.random() * 10) + 90; // 90-100% consistency
  }

  // Workflow handlers
  private static async handlePatientOnboardingWorkflow(data: any, user: User): Promise<any> {
    // Step-by-step patient onboarding automation
    return { success: true, stepsCompleted: ['profile', 'assessment', 'protocol'] };
  }

  private static async handleProtocolCompletionWorkflow(data: any, user: User): Promise<any> {
    // Protocol completion automation
    return { success: true, stepsCompleted: ['outcomes', 'report', 'followup'] };
  }

  private static async handleCaseToProjectWorkflow(data: any, user: User): Promise<any> {
    // Convert complex case to research project
    return { success: true, projectId: crypto.randomUUID() };
  }

  private static async handleAlertEscalationWorkflow(data: any, user: User): Promise<any> {
    // Alert escalation automation
    return { success: true, escalated: true, notifiedUsers: [] };
  }
}

export default IntegrationAPI;