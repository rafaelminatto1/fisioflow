import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { User, Patient, Appointment, Assessment, ClinicalCase, ClinicalProtocol, Task } from '../types';
import CrossModuleNotificationService from '../services/crossModuleNotificationService';

// System Event Types
export enum SystemEventType {
  // Patient Events
  PATIENT_CREATED = 'PATIENT_CREATED',
  PATIENT_UPDATED = 'PATIENT_UPDATED',
  PATIENT_ASSESSMENT_COMPLETED = 'PATIENT_ASSESSMENT_COMPLETED',
  
  // Protocol Events
  PROTOCOL_PRESCRIBED = 'PROTOCOL_PRESCRIBED',
  PROTOCOL_PHASE_ADVANCED = 'PROTOCOL_PHASE_ADVANCED',
  PROTOCOL_COMPLETED = 'PROTOCOL_COMPLETED',
  
  // Appointment Events
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  APPOINTMENT_COMPLETED = 'APPOINTMENT_COMPLETED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  
  // Case Events
  CASE_CREATED = 'CASE_CREATED',
  CASE_COMPLEX_IDENTIFIED = 'CASE_COMPLEX_IDENTIFIED',
  
  // Project Events
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_COMPLETED = 'PROJECT_COMPLETED',
  
  // Mentorship Events
  MENTORSHIP_SESSION_SCHEDULED = 'MENTORSHIP_SESSION_SCHEDULED',
  STUDENT_PROGRESS_UPDATED = 'STUDENT_PROGRESS_UPDATED',
  
  // Operational Events
  ALERT_GENERATED = 'ALERT_GENERATED',
  METRICS_UPDATED = 'METRICS_UPDATED',
  REPORT_GENERATED = 'REPORT_GENERATED',
}

export interface SystemEvent {
  id: string;
  type: SystemEventType;
  timestamp: string;
  source: string; // Module that generated the event
  data: any;
  tenantId: string;
  userId: string;
  processed: boolean;
  // Additional fields for cross-module notifications
  module: string;
  action: string;
  metadata?: any;
}

export interface EventHandler {
  eventType: SystemEventType;
  handler: (event: SystemEvent) => void;
  module: string;
}

interface SystemEventsContextType {
  events: SystemEvent[];
  triggerEvent: (type: SystemEventType, data: any, source: string, userId: string, tenantId: string) => void;
  subscribeToEvent: (eventType: SystemEventType, handler: (event: SystemEvent) => void, module: string) => () => void;
  subscribeToSystemEvents: (eventType: SystemEventType, handler: (event: SystemEvent) => void, module: string) => () => void;
  getModuleIntegrations: () => ModuleIntegration[];
  // Integration functions
  convertPatientToClinicalCase: (patientId: string, userId: string) => Promise<ClinicalCase | null>;
  suggestProtocolForDiagnosis: (diagnosis: string, patientId: string) => ClinicalProtocol[];
  createProjectFromComplexCase: (caseId: string, userId: string) => Promise<Task | null>;
  generateConsolidatedMetrics: (period: { start: string; end: string }) => any;
}

export interface ModuleIntegration {
  id: string;
  sourceModule: string;
  targetModule: string;
  eventType: SystemEventType;
  enabled: boolean;
  configuration: any;
}

const SystemEventsContext = createContext<SystemEventsContextType | undefined>(undefined);

export const useSystemEvents = () => {
  const context = useContext(SystemEventsContext);
  if (!context) {
    throw new Error('useSystemEvents must be used within a SystemEventsProvider');
  }
  return context;
};

interface SystemEventsProviderProps {
  children: React.ReactNode;
}

export const SystemEventsProvider: React.FC<SystemEventsProviderProps> = ({ children }) => {
  const [events, setEvents] = React.useState<SystemEvent[]>([]);
  const [eventHandlers, setEventHandlers] = React.useState<EventHandler[]>([]);

  // Module integrations configuration
  const moduleIntegrations: ModuleIntegration[] = [
    {
      id: '1',
      sourceModule: 'patients',
      targetModule: 'mentorship',
      eventType: SystemEventType.PATIENT_ASSESSMENT_COMPLETED,
      enabled: true,
      configuration: { autoCreateCase: true },
    },
    {
      id: '2',
      sourceModule: 'protocols',
      targetModule: 'exercises',
      eventType: SystemEventType.PROTOCOL_PRESCRIBED,
      enabled: true,
      configuration: { autoAssignExercises: true },
    },
    {
      id: '3',
      sourceModule: 'appointments',
      targetModule: 'operational',
      eventType: SystemEventType.APPOINTMENT_COMPLETED,
      enabled: true,
      configuration: { updateMetrics: true },
    },
    {
      id: '4',
      sourceModule: 'cases',
      targetModule: 'projects',
      eventType: SystemEventType.CASE_COMPLEX_IDENTIFIED,
      enabled: true,
      configuration: { autoCreateProject: true },
    },
  ];

  // Trigger event function
  const triggerEvent = useCallback((
    type: SystemEventType,
    data: any,
    source: string,
    userId: string,
    tenantId: string
  ) => {
    const event: SystemEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      source,
      data,
      tenantId,
      userId,
      processed: false,
      module: source,
      action: type,
      metadata: data,
    };

    setEvents(prev => [...prev, event]);

    // Process event with registered handlers
    const relevantHandlers = eventHandlers.filter(h => h.eventType === type);
    relevantHandlers.forEach(handler => {
      try {
        handler.handler(event);
      } catch (error) {
        console.error(`Error processing event ${type} in module ${handler.module}:`, error);
      }
    });

    // Process cross-module notifications
    try {
      CrossModuleNotificationService.processSystemEvent(event);
    } catch (error) {
      console.error('Error processing cross-module notifications for event:', error);
    }

    // Mark event as processed
    setTimeout(() => {
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, processed: true } : e));
    }, 100);
  }, [eventHandlers]);

  // Subscribe to events
  const subscribeToEvent = useCallback((
    eventType: SystemEventType,
    handler: (event: SystemEvent) => void,
    module: string
  ) => {
    const eventHandler: EventHandler = {
      eventType,
      handler,
      module,
    };

    setEventHandlers(prev => [...prev, eventHandler]);

    // Return unsubscribe function
    return () => {
      setEventHandlers(prev => prev.filter(h => h !== eventHandler));
    };
  }, []);

  // Integration Functions
  const convertPatientToClinicalCase = useCallback(async (
    patientId: string,
    userId: string
  ): Promise<ClinicalCase | null> => {
    try {
      // This would normally fetch patient data and create an anonymized case
      // For now, we'll trigger an event to notify other modules
      triggerEvent(
        SystemEventType.CASE_CREATED,
        { sourcePatientId: patientId, anonymized: true },
        'integration',
        userId,
        '' // tenantId would be passed from calling component
      );
      
      return null; // Would return the created case
    } catch (error) {
      console.error('Error converting patient to clinical case:', error);
      return null;
    }
  }, [triggerEvent]);

  const suggestProtocolForDiagnosis = useCallback((
    diagnosis: string,
    patientId: string
  ): ClinicalProtocol[] => {
    // This would analyze the diagnosis and suggest appropriate protocols
    // For now, return empty array and trigger event
    triggerEvent(
      SystemEventType.PROTOCOL_PRESCRIBED,
      { diagnosis, patientId, suggested: true },
      'integration',
      '', // userId would be passed
      '' // tenantId would be passed
    );
    
    return [];
  }, [triggerEvent]);

  const createProjectFromComplexCase = useCallback(async (
    caseId: string,
    userId: string
  ): Promise<Task | null> => {
    try {
      triggerEvent(
        SystemEventType.PROJECT_CREATED,
        { sourceCaseId: caseId, type: 'research' },
        'integration',
        userId,
        ''
      );
      
      return null; // Would return the created project task
    } catch (error) {
      console.error('Error creating project from complex case:', error);
      return null;
    }
  }, [triggerEvent]);

  const generateConsolidatedMetrics = useCallback((
    period: { start: string; end: string }
  ) => {
    // Consolidate metrics from all modules
    const consolidatedData = {
      period,
      patients: {
        total: 0,
        new: 0,
        active: 0,
      },
      appointments: {
        scheduled: 0,
        completed: 0,
        cancelled: 0,
      },
      protocols: {
        prescribed: 0,
        completed: 0,
        effectiveness: 0,
      },
      mentorship: {
        sessions: 0,
        students: 0,
        cases: 0,
      },
      financial: {
        revenue: 0,
        costs: 0,
        profit: 0,
      },
      operational: {
        utilization: 0,
        satisfaction: 0,
        alerts: 0,
      },
    };

    triggerEvent(
      SystemEventType.METRICS_UPDATED,
      consolidatedData,
      'integration',
      '',
      ''
    );

    return consolidatedData;
  }, [triggerEvent]);

  const getModuleIntegrations = useCallback(() => {
    return moduleIntegrations;
  }, []);

  // Setup default event handlers for integrations
  useEffect(() => {
    // Patient to Case Integration
    const unsubscribePatientCase = subscribeToEvent(
      SystemEventType.PATIENT_ASSESSMENT_COMPLETED,
      (event) => {
        const integration = moduleIntegrations.find(
          i => i.eventType === SystemEventType.PATIENT_ASSESSMENT_COMPLETED && i.enabled
        );
        if (integration?.configuration.autoCreateCase) {
          console.log('Auto-creating clinical case from patient assessment:', event.data);
          // Would trigger case creation
        }
      },
      'integration'
    );

    // Protocol to Exercise Integration
    const unsubscribeProtocolExercise = subscribeToEvent(
      SystemEventType.PROTOCOL_PRESCRIBED,
      (event) => {
        const integration = moduleIntegrations.find(
          i => i.eventType === SystemEventType.PROTOCOL_PRESCRIBED && i.enabled
        );
        if (integration?.configuration.autoAssignExercises) {
          console.log('Auto-assigning exercises from protocol:', event.data);
          // Would trigger exercise assignment
        }
      },
      'integration'
    );

    // Appointment to Metrics Integration
    const unsubscribeAppointmentMetrics = subscribeToEvent(
      SystemEventType.APPOINTMENT_COMPLETED,
      (event) => {
        const integration = moduleIntegrations.find(
          i => i.eventType === SystemEventType.APPOINTMENT_COMPLETED && i.enabled
        );
        if (integration?.configuration.updateMetrics) {
          console.log('Updating operational metrics from appointment:', event.data);
          // Would update productivity and quality metrics
        }
      },
      'integration'
    );

    // Complex Case to Project Integration
    const unsubscribeCaseProject = subscribeToEvent(
      SystemEventType.CASE_COMPLEX_IDENTIFIED,
      (event) => {
        const integration = moduleIntegrations.find(
          i => i.eventType === SystemEventType.CASE_COMPLEX_IDENTIFIED && i.enabled
        );
        if (integration?.configuration.autoCreateProject) {
          console.log('Auto-creating research project from complex case:', event.data);
          // Would trigger project creation
        }
      },
      'integration'
    );

    return () => {
      unsubscribePatientCase();
      unsubscribeProtocolExercise();
      unsubscribeAppointmentMetrics();
      unsubscribeCaseProject();
    };
  }, [subscribeToEvent]);

  const value: SystemEventsContextType = {
    events,
    triggerEvent,
    subscribeToEvent,
    subscribeToSystemEvents: subscribeToEvent, // Alias for compatibility
    getModuleIntegrations,
    convertPatientToClinicalCase,
    suggestProtocolForDiagnosis,
    createProjectFromComplexCase,
    generateConsolidatedMetrics,
  };

  return (
    <SystemEventsContext.Provider value={value}>
      {children}
    </SystemEventsContext.Provider>
  );
};

// Hook for integration workflows
export const useIntegrationWorkflows = () => {
  const { triggerEvent, subscribeToEvent } = useSystemEvents();

  // Workflow 1: New Patient → Protocol → Exercises → Monitoring
  const startPatientWorkflow = useCallback((
    patient: Patient,
    diagnosis: string,
    userId: string
  ) => {
    // Step 1: Patient created
    triggerEvent(
      SystemEventType.PATIENT_CREATED,
      { patient, diagnosis },
      'workflow',
      userId,
      patient.tenantId
    );

    // Step 2: Suggest protocol automatically (would be handled by event listener)
    // Step 3: Assign exercises based on protocol (would be handled by event listener)
    // Step 4: Schedule appointments according to protocol (would be handled by event listener)
    // Step 5: Monitor progress automatically (would be handled by event listener)
  }, [triggerEvent]);

  // Workflow 2: Complex Case → Project → Mentorship → Protocol Update
  const startComplexCaseWorkflow = useCallback((
    caseId: string,
    complexity: 'high' | 'research' | 'innovation',
    userId: string,
    tenantId: string
  ) => {
    // Step 1: Identify complex case
    triggerEvent(
      SystemEventType.CASE_COMPLEX_IDENTIFIED,
      { caseId, complexity },
      'workflow',
      userId,
      tenantId
    );

    // Step 2: Create research project (handled by event listener)
    // Step 3: Generate educational content (handled by event listener)
    // Step 4: Update protocols with learnings (handled by event listener)
    // Step 5: Train staff on new protocols (handled by event listener)
  }, [triggerEvent]);

  return {
    startPatientWorkflow,
    startComplexCaseWorkflow,
  };
};

export default SystemEventsProvider;