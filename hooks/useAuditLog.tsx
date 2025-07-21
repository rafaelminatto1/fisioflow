import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './useAuth';
import { useFeatureFlags } from './useFeatureFlags';
import { useNotification } from './useNotification';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  userName: string;
  tenantId: string;
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  metadata?: Record<string, any>;
  tags?: string[];
  riskScore?: number;
  complianceFlags?: string[];
  errorMessage?: string;
  duration?: number;
  success: boolean;
}

type AuditAction =
  // Authentication
  | 'user_login'
  | 'user_logout'
  | 'user_login_failed'
  | 'password_changed'
  | 'password_reset'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'session_expired'
  | 'account_locked'
  | 'account_unlocked'

  // User Management
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_activated'
  | 'user_deactivated'
  | 'role_assigned'
  | 'role_removed'
  | 'permission_granted'
  | 'permission_revoked'

  // Patient Data
  | 'patient_created'
  | 'patient_updated'
  | 'patient_deleted'
  | 'patient_viewed'
  | 'patient_exported'
  | 'patient_imported'
  | 'patient_merged'
  | 'patient_archived'

  // Clinical Data
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_cancelled'
  | 'appointment_completed'
  | 'treatment_created'
  | 'treatment_updated'
  | 'treatment_deleted'
  | 'treatment_completed'
  | 'prescription_created'
  | 'prescription_updated'
  | 'prescription_deleted'
  | 'medical_record_created'
  | 'medical_record_updated'
  | 'medical_record_accessed'

  // Financial
  | 'payment_created'
  | 'payment_updated'
  | 'payment_deleted'
  | 'payment_processed'
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'

  // System
  | 'backup_created'
  | 'backup_restored'
  | 'backup_deleted'
  | 'data_exported'
  | 'data_imported'
  | 'integration_connected'
  | 'integration_disconnected'
  | 'sync_completed'
  | 'sync_failed'
  | 'system_config_changed'
  | 'feature_enabled'
  | 'feature_disabled'

  // Security
  | 'security_alert'
  | 'suspicious_activity'
  | 'data_breach_detected'
  | 'unauthorized_access'
  | 'encryption_key_rotated'
  | 'certificate_renewed'
  | 'firewall_rule_changed'

  // Compliance
  | 'gdpr_request'
  | 'hipaa_access'
  | 'audit_report_generated'
  | 'compliance_check'
  | 'data_retention_applied'
  | 'consent_given'
  | 'consent_withdrawn';

type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'system_administration'
  | 'security'
  | 'compliance'
  | 'financial'
  | 'clinical'
  | 'integration'
  | 'backup'
  | 'user_management';

type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

interface AuditFilter {
  startDate?: string;
  endDate?: string;
  userId?: string;
  tenantId?: string;
  actions?: AuditAction[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  entityTypes?: string[];
  success?: boolean;
  riskScoreMin?: number;
  riskScoreMax?: number;
  searchTerm?: string;
  tags?: string[];
  complianceFlags?: string[];
}

interface AuditStats {
  totalEntries: number;
  entriesLast24h: number;
  entriesLast7d: number;
  entriesLast30d: number;
  failureRate: number;
  averageRiskScore: number;
  topActions: { action: AuditAction; count: number }[];
  topUsers: { userId: string; userName: string; count: number }[];
  securityAlerts: number;
  complianceIssues: number;
  categoryDistribution: {
    category: AuditCategory;
    count: number;
    percentage: number;
  }[];
  severityDistribution: {
    severity: AuditSeverity;
    count: number;
    percentage: number;
  }[];
  hourlyActivity: { hour: number; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

interface AuditReport {
  id: string;
  name: string;
  description: string;
  type: 'security' | 'compliance' | 'activity' | 'performance' | 'custom';
  filter: AuditFilter;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string;
    recipients: string[];
    format: 'pdf' | 'csv' | 'json' | 'html';
  };
  createdAt: string;
  createdBy: string;
  lastGenerated?: string;
  isActive: boolean;
}

interface AuditLogContextType {
  entries: AuditLogEntry[];
  stats: AuditStats;
  reports: AuditReport[];
  isLoading: boolean;
  logEntry: (
    entry: Omit<
      AuditLogEntry,
      | 'id'
      | 'timestamp'
      | 'userId'
      | 'userEmail'
      | 'userName'
      | 'tenantId'
      | 'success'
    > & { success?: boolean }
  ) => void;
  getEntries: (
    filter?: AuditFilter,
    page?: number,
    limit?: number
  ) => Promise<AuditLogEntry[]>;
  getStats: (filter?: AuditFilter) => Promise<AuditStats>;
  exportLogs: (
    filter?: AuditFilter,
    format?: 'csv' | 'json' | 'pdf'
  ) => Promise<Blob>;
  createReport: (
    report: Omit<AuditReport, 'id' | 'createdAt' | 'createdBy'>
  ) => void;
  updateReport: (reportId: string, updates: Partial<AuditReport>) => void;
  deleteReport: (reportId: string) => void;
  generateReport: (reportId: string) => Promise<Blob | null>;
  searchEntries: (
    query: string,
    filter?: AuditFilter
  ) => Promise<AuditLogEntry[]>;
  getComplianceReport: (
    standard: 'gdpr' | 'hipaa' | 'lgpd',
    dateRange: { start: string; end: string }
  ) => Promise<any>;
  detectAnomalies: () => Promise<AuditLogEntry[]>;
  getRiskAssessment: (
    userId?: string,
    timeframe?: string
  ) => Promise<{
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    recommendations: string[];
    score: number;
  }>;
  archiveOldEntries: (olderThan: string) => Promise<number>;
  validateIntegrity: () => Promise<boolean>;
}

const AuditLogContext = createContext<AuditLogContextType | undefined>(
  undefined
);

interface AuditLogProviderProps {
  children: ReactNode;
}

export const AuditLogProvider: React.FC<AuditLogProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const { addNotification } = useNotification();

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedEntries = localStorage.getItem('fisioflow_audit_logs');
    const savedReports = localStorage.getItem('fisioflow_audit_reports');

    if (savedEntries) {
      try {
        setEntries(JSON.parse(savedEntries));
      } catch (error) {
        console.error('Error loading audit logs:', error);
      }
    }

    if (savedReports) {
      try {
        setReports(JSON.parse(savedReports));
      } catch (error) {
        console.error('Error loading audit reports:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('fisioflow_audit_logs', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('fisioflow_audit_reports', JSON.stringify(reports));
  }, [reports]);

  // Auto-cleanup old entries (keep last 10000 entries)
  useEffect(() => {
    if (entries.length > 10000) {
      const sortedEntries = [...entries].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEntries(sortedEntries.slice(0, 10000));
    }
  }, [entries]);

  const calculateRiskScore = (
    action: AuditAction,
    metadata?: Record<string, any>
  ): number => {
    let score = 0;

    // Base risk scores by action type
    const riskScores: Record<string, number> = {
      // High risk actions
      user_deleted: 8,
      patient_deleted: 9,
      data_exported: 7,
      backup_deleted: 8,
      system_config_changed: 7,
      unauthorized_access: 10,
      data_breach_detected: 10,
      security_alert: 8,

      // Medium risk actions
      user_created: 5,
      patient_created: 4,
      user_login_failed: 6,
      password_changed: 4,
      role_assigned: 5,
      integration_connected: 5,

      // Low risk actions
      user_login: 2,
      patient_viewed: 3,
      appointment_created: 2,
      treatment_created: 2,
      user_logout: 1,
    };

    score = riskScores[action] || 3;

    // Adjust based on metadata
    if (metadata) {
      if (metadata.failedAttempts && metadata.failedAttempts > 3) score += 2;
      if (metadata.outsideBusinessHours) score += 1;
      if (metadata.newLocation) score += 2;
      if (metadata.bulkOperation) score += 1;
      if (metadata.adminAction) score += 1;
    }

    return Math.min(score, 10);
  };

  const categorizeAction = (action: AuditAction): AuditCategory => {
    const categoryMap: Record<string, AuditCategory> = {
      user_login: 'authentication',
      user_logout: 'authentication',
      user_login_failed: 'authentication',
      password_changed: 'authentication',
      password_reset: 'authentication',
      mfa_enabled: 'authentication',
      mfa_disabled: 'authentication',

      user_created: 'user_management',
      user_updated: 'user_management',
      user_deleted: 'user_management',
      role_assigned: 'authorization',
      role_removed: 'authorization',
      permission_granted: 'authorization',
      permission_revoked: 'authorization',

      patient_created: 'clinical',
      patient_updated: 'clinical',
      patient_deleted: 'clinical',
      patient_viewed: 'data_access',
      appointment_created: 'clinical',
      treatment_created: 'clinical',
      medical_record_accessed: 'data_access',

      payment_created: 'financial',
      payment_processed: 'financial',
      invoice_created: 'financial',
      subscription_created: 'financial',

      backup_created: 'backup',
      backup_restored: 'backup',
      data_exported: 'data_access',
      data_imported: 'data_modification',
      integration_connected: 'integration',

      security_alert: 'security',
      unauthorized_access: 'security',
      suspicious_activity: 'security',

      gdpr_request: 'compliance',
      hipaa_access: 'compliance',
      consent_given: 'compliance',

      system_config_changed: 'system_administration',
    };

    return categoryMap[action] || 'data_access';
  };

  const determineSeverity = (
    action: AuditAction,
    riskScore: number
  ): AuditSeverity => {
    if (riskScore >= 8) return 'critical';
    if (riskScore >= 6) return 'high';
    if (riskScore >= 4) return 'medium';
    return 'low';
  };

  const getComplianceFlags = (
    action: AuditAction,
    entityType?: string
  ): string[] => {
    const flags: string[] = [];

    // GDPR flags
    if (
      [
        'patient_created',
        'patient_updated',
        'patient_deleted',
        'patient_viewed',
        'data_exported',
      ].includes(action)
    ) {
      flags.push('gdpr_relevant');
    }

    // HIPAA flags
    if (
      [
        'medical_record_accessed',
        'patient_viewed',
        'treatment_created',
        'prescription_created',
      ].includes(action)
    ) {
      flags.push('hipaa_relevant');
    }

    // LGPD flags (Brazilian data protection)
    if (
      [
        'patient_created',
        'patient_updated',
        'patient_deleted',
        'consent_given',
        'consent_withdrawn',
      ].includes(action)
    ) {
      flags.push('lgpd_relevant');
    }

    // SOX compliance (financial)
    if (
      [
        'payment_created',
        'payment_processed',
        'invoice_created',
        'financial_report_generated',
      ].includes(action)
    ) {
      flags.push('sox_relevant');
    }

    return flags;
  };

  const logEntry = (
    entryData: Omit<
      AuditLogEntry,
      | 'id'
      | 'timestamp'
      | 'userId'
      | 'userEmail'
      | 'userName'
      | 'tenantId'
      | 'success'
    > & { success?: boolean }
  ) => {
    if (!user || !isFeatureEnabled('audit_logging')) return;

    const riskScore = calculateRiskScore(entryData.action, entryData.metadata);
    const category = categorizeAction(entryData.action);
    const severity = determineSeverity(entryData.action, riskScore);
    const complianceFlags = getComplianceFlags(
      entryData.action,
      entryData.entityType
    );

    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      tenantId: user.tenantId,
      category,
      severity,
      riskScore,
      complianceFlags,
      success: entryData.success ?? true,
      ipAddress: '127.0.0.1', // In real implementation, get from request
      userAgent: navigator.userAgent,
      sessionId: user.sessionId || 'unknown',
      ...entryData,
    };

    setEntries((prev) => [entry, ...prev]);

    // Trigger alerts for high-risk activities
    if (severity === 'critical' || riskScore >= 8) {
      addNotification({
        type: 'warning',
        title: 'Atividade de Alto Risco Detectada',
        message: `Ação: ${entryData.action} - Score de Risco: ${riskScore}`,
        persistent: true,
      });
    }

    // Log security events
    if (
      category === 'security' ||
      entryData.action.includes('security') ||
      entryData.action.includes('unauthorized')
    ) {
      console.warn('Security event logged:', entry);
    }
  };

  const getEntries = async (
    filter?: AuditFilter,
    page: number = 1,
    limit: number = 100
  ): Promise<AuditLogEntry[]> => {
    setIsLoading(true);

    try {
      let filteredEntries = [...entries];

      if (filter) {
        if (filter.startDate) {
          filteredEntries = filteredEntries.filter(
            (entry) => new Date(entry.timestamp) >= new Date(filter.startDate!)
          );
        }

        if (filter.endDate) {
          filteredEntries = filteredEntries.filter(
            (entry) => new Date(entry.timestamp) <= new Date(filter.endDate!)
          );
        }

        if (filter.userId) {
          filteredEntries = filteredEntries.filter(
            (entry) => entry.userId === filter.userId
          );
        }

        if (filter.tenantId) {
          filteredEntries = filteredEntries.filter(
            (entry) => entry.tenantId === filter.tenantId
          );
        }

        if (filter.actions && filter.actions.length > 0) {
          filteredEntries = filteredEntries.filter((entry) =>
            filter.actions!.includes(entry.action)
          );
        }

        if (filter.categories && filter.categories.length > 0) {
          filteredEntries = filteredEntries.filter((entry) =>
            filter.categories!.includes(entry.category)
          );
        }

        if (filter.severities && filter.severities.length > 0) {
          filteredEntries = filteredEntries.filter((entry) =>
            filter.severities!.includes(entry.severity)
          );
        }

        if (filter.success !== undefined) {
          filteredEntries = filteredEntries.filter(
            (entry) => entry.success === filter.success
          );
        }

        if (filter.riskScoreMin !== undefined) {
          filteredEntries = filteredEntries.filter(
            (entry) => (entry.riskScore || 0) >= filter.riskScoreMin!
          );
        }

        if (filter.riskScoreMax !== undefined) {
          filteredEntries = filteredEntries.filter(
            (entry) => (entry.riskScore || 0) <= filter.riskScoreMax!
          );
        }

        if (filter.searchTerm) {
          const searchLower = filter.searchTerm.toLowerCase();
          filteredEntries = filteredEntries.filter(
            (entry) =>
              entry.action.toLowerCase().includes(searchLower) ||
              entry.userName.toLowerCase().includes(searchLower) ||
              entry.userEmail.toLowerCase().includes(searchLower) ||
              (entry.entityName &&
                entry.entityName.toLowerCase().includes(searchLower)) ||
              (entry.errorMessage &&
                entry.errorMessage.toLowerCase().includes(searchLower))
          );
        }

        if (filter.tags && filter.tags.length > 0) {
          filteredEntries = filteredEntries.filter(
            (entry) =>
              entry.tags &&
              filter.tags!.some((tag) => entry.tags!.includes(tag))
          );
        }

        if (filter.complianceFlags && filter.complianceFlags.length > 0) {
          filteredEntries = filteredEntries.filter(
            (entry) =>
              entry.complianceFlags &&
              filter.complianceFlags!.some((flag) =>
                entry.complianceFlags!.includes(flag)
              )
          );
        }
      }

      // Sort by timestamp (newest first)
      filteredEntries.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      return filteredEntries.slice(startIndex, endIndex);
    } finally {
      setIsLoading(false);
    }
  };

  const getStats = async (filter?: AuditFilter): Promise<AuditStats> => {
    const filteredEntries = await getEntries(filter, 1, 10000); // Get all for stats
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const entriesLast24h = filteredEntries.filter(
      (entry) => new Date(entry.timestamp) >= last24h
    ).length;
    const entriesLast7d = filteredEntries.filter(
      (entry) => new Date(entry.timestamp) >= last7d
    ).length;
    const entriesLast30d = filteredEntries.filter(
      (entry) => new Date(entry.timestamp) >= last30d
    ).length;

    const failedEntries = filteredEntries.filter(
      (entry) => !entry.success
    ).length;
    const failureRate =
      filteredEntries.length > 0
        ? (failedEntries / filteredEntries.length) * 100
        : 0;

    const riskScores = filteredEntries
      .map((entry) => entry.riskScore || 0)
      .filter((score) => score > 0);
    const averageRiskScore =
      riskScores.length > 0
        ? riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
        : 0;

    // Top actions
    const actionCounts = filteredEntries.reduce(
      (acc, entry) => {
        acc[entry.action] = (acc[entry.action] || 0) + 1;
        return acc;
      },
      {} as Record<AuditAction, number>
    );

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action: action as AuditAction, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top users
    const userCounts = filteredEntries.reduce(
      (acc, entry) => {
        const key = entry.userId;
        if (!acc[key]) {
          acc[key] = {
            userId: entry.userId,
            userName: entry.userName,
            count: 0,
          };
        }
        acc[key].count++;
        return acc;
      },
      {} as Record<string, { userId: string; userName: string; count: number }>
    );

    const topUsers = Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Security alerts and compliance issues
    const securityAlerts = filteredEntries.filter(
      (entry) => entry.category === 'security' || entry.severity === 'critical'
    ).length;

    const complianceIssues = filteredEntries.filter(
      (entry) =>
        entry.complianceFlags &&
        entry.complianceFlags.length > 0 &&
        !entry.success
    ).length;

    // Category distribution
    const categoryCounts = filteredEntries.reduce(
      (acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      },
      {} as Record<AuditCategory, number>
    );

    const categoryDistribution = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category: category as AuditCategory,
        count,
        percentage: (count / filteredEntries.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Severity distribution
    const severityCounts = filteredEntries.reduce(
      (acc, entry) => {
        acc[entry.severity] = (acc[entry.severity] || 0) + 1;
        return acc;
      },
      {} as Record<AuditSeverity, number>
    );

    const severityDistribution = Object.entries(severityCounts)
      .map(([severity, count]) => ({
        severity: severity as AuditSeverity,
        count,
        percentage: (count / filteredEntries.length) * 100,
      }))
      .sort((a, b) => {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        return (
          order[b.severity as keyof typeof order] -
          order[a.severity as keyof typeof order]
        );
      });

    // Hourly activity (last 24 hours)
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
      const count = filteredEntries.filter((entry) => {
        const entryHour = new Date(entry.timestamp).getHours();
        const entryDate = new Date(entry.timestamp);
        return entryHour === hour && entryDate >= last24h;
      }).length;
      return { hour, count };
    });

    // Daily activity (last 30 days)
    const dailyActivity = Array.from({ length: 30 }, (_, dayIndex) => {
      const date = new Date(now.getTime() - dayIndex * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = filteredEntries.filter((entry) => {
        const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
        return entryDate === dateStr;
      }).length;
      return { date: dateStr, count };
    }).reverse();

    return {
      totalEntries: filteredEntries.length,
      entriesLast24h,
      entriesLast7d,
      entriesLast30d,
      failureRate,
      averageRiskScore,
      topActions,
      topUsers,
      securityAlerts,
      complianceIssues,
      categoryDistribution,
      severityDistribution,
      hourlyActivity,
      dailyActivity,
    };
  };

  const exportLogs = async (
    filter?: AuditFilter,
    format: 'csv' | 'json' | 'pdf' = 'json'
  ): Promise<Blob> => {
    const filteredEntries = await getEntries(filter, 1, 10000);

    let content: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(filteredEntries, null, 2);
        mimeType = 'application/json';
        break;

      case 'csv':
        const headers = [
          'Timestamp',
          'User',
          'Action',
          'Category',
          'Severity',
          'Entity Type',
          'Entity ID',
          'Success',
          'Risk Score',
          'IP Address',
          'Compliance Flags',
        ];

        const csvRows = filteredEntries.map((entry) => [
          entry.timestamp,
          entry.userName,
          entry.action,
          entry.category,
          entry.severity,
          entry.entityType || '',
          entry.entityId || '',
          entry.success ? 'Yes' : 'No',
          entry.riskScore || '',
          entry.ipAddress || '',
          entry.complianceFlags?.join(';') || '',
        ]);

        content = [headers, ...csvRows]
          .map((row) => row.map((cell) => `"${cell}"`).join(','))
          .join('\n');
        mimeType = 'text/csv';
        break;

      case 'pdf':
        // In a real implementation, you would use a PDF library
        content =
          `Audit Log Report\n\nGenerated: ${new Date().toISOString()}\n\nTotal Entries: ${filteredEntries.length}\n\n` +
          filteredEntries
            .map(
              (entry) =>
                `${entry.timestamp} - ${entry.userName} - ${entry.action} - ${entry.category} - ${entry.severity}`
            )
            .join('\n');
        mimeType = 'application/pdf';
        break;

      default:
        throw new Error('Unsupported format');
    }

    return new Blob([content], { type: mimeType });
  };

  const createReport = (
    reportData: Omit<AuditReport, 'id' | 'createdAt' | 'createdBy'>
  ) => {
    if (!user) return;

    const report: AuditReport = {
      ...reportData,
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    setReports((prev) => [...prev, report]);
  };

  const updateReport = (reportId: string, updates: Partial<AuditReport>) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === reportId ? { ...report, ...updates } : report
      )
    );
  };

  const deleteReport = (reportId: string) => {
    setReports((prev) => prev.filter((report) => report.id !== reportId));
  };

  const generateReport = async (reportId: string): Promise<Blob | null> => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return null;

    try {
      const reportData = await exportLogs(
        report.filter,
        report.schedule?.format || 'json'
      );

      // Update last generated timestamp
      updateReport(reportId, { lastGenerated: new Date().toISOString() });

      return reportData;
    } catch (error) {
      console.error('Report generation failed:', error);
      return null;
    }
  };

  const searchEntries = async (
    query: string,
    filter?: AuditFilter
  ): Promise<AuditLogEntry[]> => {
    const searchFilter = {
      ...filter,
      searchTerm: query,
    };

    return getEntries(searchFilter, 1, 1000);
  };

  const getComplianceReport = async (
    standard: 'gdpr' | 'hipaa' | 'lgpd',
    dateRange: { start: string; end: string }
  ) => {
    const complianceFilter: AuditFilter = {
      startDate: dateRange.start,
      endDate: dateRange.end,
      complianceFlags: [`${standard}_relevant`],
    };

    const relevantEntries = await getEntries(complianceFilter, 1, 10000);
    const stats = await getStats(complianceFilter);

    return {
      standard,
      dateRange,
      totalEntries: relevantEntries.length,
      successfulEntries: relevantEntries.filter((e) => e.success).length,
      failedEntries: relevantEntries.filter((e) => !e.success).length,
      highRiskEntries: relevantEntries.filter((e) => (e.riskScore || 0) >= 7)
        .length,
      entries: relevantEntries,
      stats,
      recommendations: [
        'Review failed compliance-related activities',
        'Implement additional monitoring for high-risk actions',
        'Ensure proper documentation for audit purposes',
        'Regular compliance training for staff',
      ],
    };
  };

  const detectAnomalies = async (): Promise<AuditLogEntry[]> => {
    const recentEntries = await getEntries(
      {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      1,
      10000
    );

    const anomalies: AuditLogEntry[] = [];

    // Detect unusual patterns
    recentEntries.forEach((entry) => {
      // High risk score
      if ((entry.riskScore || 0) >= 8) {
        anomalies.push(entry);
      }

      // Failed login attempts
      if (
        entry.action === 'user_login_failed' &&
        entry.metadata?.consecutiveFailures >= 3
      ) {
        anomalies.push(entry);
      }

      // Unusual time access
      const hour = new Date(entry.timestamp).getHours();
      if (hour < 6 || hour > 22) {
        anomalies.push(entry);
      }

      // Bulk operations
      if (entry.metadata?.bulkOperation && entry.metadata?.recordCount > 100) {
        anomalies.push(entry);
      }
    });

    return [...new Set(anomalies)]; // Remove duplicates
  };

  const getRiskAssessment = async (
    userId?: string,
    timeframe: string = '7d'
  ) => {
    const days = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
    const startDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    const filter: AuditFilter = {
      startDate,
      ...(userId && { userId }),
    };

    const relevantEntries = await getEntries(filter, 1, 10000);
    const riskScores = relevantEntries
      .map((e) => e.riskScore || 0)
      .filter((s) => s > 0);
    const averageRisk =
      riskScores.length > 0
        ? riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
        : 0;

    const failedActions = relevantEntries.filter((e) => !e.success).length;
    const securityEvents = relevantEntries.filter(
      (e) => e.category === 'security'
    ).length;
    const highRiskActions = relevantEntries.filter(
      (e) => (e.riskScore || 0) >= 7
    ).length;

    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (averageRisk >= 8 || securityEvents > 0) {
      overallRisk = 'critical';
      riskFactors.push('High average risk score', 'Security events detected');
      recommendations.push(
        'Immediate security review required',
        'Consider account restrictions'
      );
    } else if (averageRisk >= 6 || highRiskActions > 5) {
      overallRisk = 'high';
      riskFactors.push(
        'Elevated risk activities',
        'Multiple high-risk actions'
      );
      recommendations.push(
        'Enhanced monitoring',
        'Additional authentication required'
      );
    } else if (averageRisk >= 4 || failedActions > 10) {
      overallRisk = 'medium';
      riskFactors.push('Moderate risk activities', 'Some failed actions');
      recommendations.push('Regular monitoring', 'Review access patterns');
    } else {
      overallRisk = 'low';
      recommendations.push('Continue normal monitoring');
    }

    return {
      overallRisk,
      riskFactors,
      recommendations,
      score: Math.round(averageRisk * 10) / 10,
    };
  };

  const archiveOldEntries = async (olderThan: string): Promise<number> => {
    const cutoffDate = new Date(olderThan);
    const entriesToArchive = entries.filter(
      (entry) => new Date(entry.timestamp) < cutoffDate
    );

    // In a real implementation, you would move these to long-term storage
    console.log(
      `Archiving ${entriesToArchive.length} entries older than ${olderThan}`
    );

    // Remove from active entries
    setEntries((prev) =>
      prev.filter((entry) => new Date(entry.timestamp) >= cutoffDate)
    );

    return entriesToArchive.length;
  };

  const validateIntegrity = async (): Promise<boolean> => {
    // In a real implementation, this would verify checksums, signatures, etc.
    try {
      // Check for required fields
      const invalidEntries = entries.filter(
        (entry) =>
          !entry.id || !entry.timestamp || !entry.userId || !entry.action
      );

      if (invalidEntries.length > 0) {
        console.error(`Found ${invalidEntries.length} invalid audit entries`);
        return false;
      }

      // Check chronological order
      const sortedEntries = [...entries].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (let i = 1; i < sortedEntries.length; i++) {
        if (
          new Date(sortedEntries[i].timestamp) <
          new Date(sortedEntries[i - 1].timestamp)
        ) {
          console.error('Audit log chronological integrity violation detected');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Integrity validation failed:', error);
      return false;
    }
  };

  // Calculate stats for the context
  const [stats, setStats] = useState<AuditStats>({
    totalEntries: 0,
    entriesLast24h: 0,
    entriesLast7d: 0,
    entriesLast30d: 0,
    failureRate: 0,
    averageRiskScore: 0,
    topActions: [],
    topUsers: [],
    securityAlerts: 0,
    complianceIssues: 0,
    categoryDistribution: [],
    severityDistribution: [],
    hourlyActivity: [],
    dailyActivity: [],
  });

  useEffect(() => {
    getStats().then(setStats);
  }, [entries]);

  const value: AuditLogContextType = {
    entries,
    stats,
    reports,
    isLoading,
    logEntry,
    getEntries,
    getStats,
    exportLogs,
    createReport,
    updateReport,
    deleteReport,
    generateReport,
    searchEntries,
    getComplianceReport,
    detectAnomalies,
    getRiskAssessment,
    archiveOldEntries,
    validateIntegrity,
  };

  return (
    <AuditLogContext.Provider value={value}>
      {children}
    </AuditLogContext.Provider>
  );
};

export const useAuditLog = (): AuditLogContextType => {
  const context = useContext(AuditLogContext);
  if (!context) {
    throw new Error('useAuditLog must be used within an AuditLogProvider');
  }
  return context;
};

export default useAuditLog;
export type {
  AuditLogEntry,
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditFilter,
  AuditStats,
  AuditReport,
};
