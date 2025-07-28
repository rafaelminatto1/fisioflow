import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useNotification } from '../components/Notification';

import { useAuth } from './useAuth';

// Schema para Report
const ReportSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  type: z.enum([
    'patient_progress',
    'financial',
    'operational',
    'clinical',
    'custom',
  ]),
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  status: z.enum(['generating', 'completed', 'failed', 'scheduled']),
  data: z.record(z.any()).optional(),
  filters: z
    .object({
      dateRange: z
        .object({
          start: z.string().datetime(),
          end: z.string().datetime(),
        })
        .optional(),
      patientIds: z.array(z.string().uuid()).optional(),
      professionalIds: z.array(z.string().uuid()).optional(),
      categories: z.array(z.string()).optional(),
      customFilters: z.record(z.any()).optional(),
    })
    .optional(),
  generatedBy: z.string().uuid(),
  generatedAt: z.string().datetime().optional(),
  scheduledFor: z.string().datetime().optional(),
  fileUrl: z.string().url().optional(),
  fileSize: z.number().min(0).optional(),
  expiresAt: z.string().datetime().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
      interval: z.number().min(1).default(1),
      endDate: z.string().datetime().optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Report = z.infer<typeof ReportSchema>;

// Schema para template de relatório
const ReportTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  type: z.enum([
    'patient_progress',
    'financial',
    'operational',
    'clinical',
    'custom',
  ]),
  template: z.object({
    sections: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum(['chart', 'table', 'text', 'image', 'metric']),
        config: z.record(z.any()),
      })
    ),
    layout: z.record(z.any()).optional(),
    styling: z.record(z.any()).optional(),
  }),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  createdBy: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;

const REPORTS_STORAGE_KEY = 'fisioflow_reports';
const TEMPLATES_STORAGE_KEY = 'fisioflow_report_templates';
const REPORTS_QUERY_KEY = 'reports';
const TEMPLATES_QUERY_KEY = 'report_templates';

// Simulação de API para relatórios
const reportsAPI = {
  getAll: async (tenantId: string): Promise<Report[]> => {
    const data = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!data) return [];

    const reports = JSON.parse(data) as Report[];
    return reports.filter((r) => r.tenantId === tenantId);
  },

  create: async (
    report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Report> => {
    const newReport: Report = {
      ...report,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = localStorage.getItem(REPORTS_STORAGE_KEY);
    const reports = data ? (JSON.parse(data) as Report[]) : [];
    reports.push(newReport);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));

    return newReport;
  },

  update: async (id: string, updates: Partial<Report>): Promise<Report> => {
    const data = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!data) throw new Error('Relatório não encontrado');

    const reports = JSON.parse(data) as Report[];
    const index = reports.findIndex((r) => r.id === id);

    if (index === -1) throw new Error('Relatório não encontrado');

    const updatedReport = {
      ...reports[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    reports[index] = updatedReport;
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));

    return updatedReport;
  },

  delete: async (id: string): Promise<void> => {
    const data = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!data) return;

    const reports = JSON.parse(data) as Report[];
    const filtered = reports.filter((r) => r.id !== id);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(filtered));
  },

  generate: async (reportId: string): Promise<Report> => {
    // Simula geração de relatório
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const data = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!data) throw new Error('Relatório não encontrado');

    const reports = JSON.parse(data) as Report[];
    const report = reports.find((r) => r.id === reportId);

    if (!report) throw new Error('Relatório não encontrado');

    const updatedReport = {
      ...report,
      status: 'completed' as const,
      generatedAt: new Date().toISOString(),
      fileUrl: `https://example.com/reports/${reportId}.pdf`,
      fileSize: Math.floor(Math.random() * 1000000) + 100000, // 100KB - 1MB
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      updatedAt: new Date().toISOString(),
    };

    const index = reports.findIndex((r) => r.id === reportId);
    reports[index] = updatedReport;
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));

    return updatedReport;
  },
};

// Simulação de API para templates
const templatesAPI = {
  getAll: async (tenantId: string): Promise<ReportTemplate[]> => {
    const data = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!data) return [];

    const templates = JSON.parse(data) as ReportTemplate[];
    return templates.filter((t) => t.tenantId === tenantId || t.isPublic);
  },

  create: async (
    template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ReportTemplate> => {
    const newTemplate: ReportTemplate = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const templates = data ? (JSON.parse(data) as ReportTemplate[]) : [];
    templates.push(newTemplate);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));

    return newTemplate;
  },

  update: async (
    id: string,
    updates: Partial<ReportTemplate>
  ): Promise<ReportTemplate> => {
    const data = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!data) throw new Error('Template não encontrado');

    const templates = JSON.parse(data) as ReportTemplate[];
    const index = templates.findIndex((t) => t.id === id);

    if (index === -1) throw new Error('Template não encontrado');

    const updatedTemplate = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    templates[index] = updatedTemplate;
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));

    return updatedTemplate;
  },

  delete: async (id: string): Promise<void> => {
    const data = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!data) return;

    const templates = JSON.parse(data) as ReportTemplate[];
    const filtered = templates.filter((t) => t.id !== id);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
  },
};

export const useReports = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const tenantId = user?.tenantId || 'default';

  // Query para listar relatórios
  const {
    data: reports = [],
    isLoading: isLoadingReports,
    error: reportsError,
    refetch: refetchReports,
  } = useQuery({
    queryKey: [REPORTS_QUERY_KEY, tenantId],
    queryFn: () => reportsAPI.getAll(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Query para listar templates
  const {
    data: templates = [],
    isLoading: isLoadingTemplates,
    error: templatesError,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: [TEMPLATES_QUERY_KEY, tenantId],
    queryFn: () => templatesAPI.getAll(tenantId),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });

  // Mutations para relatórios
  const createReportMutation = useMutation({
    mutationFn: reportsAPI.create,
    onSuccess: (newReport) => {
      queryClient.setQueryData(
        [REPORTS_QUERY_KEY, tenantId],
        (old: Report[] = []) => [...old, newReport]
      );
      showNotification('Relatório criado com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`Erro ao criar relatório: ${error.message}`, 'error');
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Report> }) =>
      reportsAPI.update(id, updates),
    onSuccess: (updatedReport) => {
      queryClient.setQueryData(
        [REPORTS_QUERY_KEY, tenantId],
        (old: Report[] = []) =>
          old.map((r) => (r.id === updatedReport.id ? updatedReport : r))
      );
      showNotification('Relatório atualizado com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(
        `Erro ao atualizar relatório: ${error.message}`,
        'error'
      );
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: reportsAPI.delete,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(
        [REPORTS_QUERY_KEY, tenantId],
        (old: Report[] = []) => old.filter((r) => r.id !== deletedId)
      );
      showNotification('Relatório excluído com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`Erro ao excluir relatório: ${error.message}`, 'error');
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: reportsAPI.generate,
    onSuccess: (generatedReport) => {
      queryClient.setQueryData(
        [REPORTS_QUERY_KEY, tenantId],
        (old: Report[] = []) =>
          old.map((r) => (r.id === generatedReport.id ? generatedReport : r))
      );
      showNotification('Relatório gerado com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`Erro ao gerar relatório: ${error.message}`, 'error');
    },
  });

  // Mutations para templates
  const createTemplateMutation = useMutation({
    mutationFn: templatesAPI.create,
    onSuccess: (newTemplate) => {
      queryClient.setQueryData(
        [TEMPLATES_QUERY_KEY, tenantId],
        (old: ReportTemplate[] = []) => [...old, newTemplate]
      );
      showNotification('Template criado com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`Erro ao criar template: ${error.message}`, 'error');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ReportTemplate>;
    }) => templatesAPI.update(id, updates),
    onSuccess: (updatedTemplate) => {
      queryClient.setQueryData(
        [TEMPLATES_QUERY_KEY, tenantId],
        (old: ReportTemplate[] = []) =>
          old.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
      );
      showNotification('Template atualizado com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`Erro ao atualizar template: ${error.message}`, 'error');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: templatesAPI.delete,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(
        [TEMPLATES_QUERY_KEY, tenantId],
        (old: ReportTemplate[] = []) => old.filter((t) => t.id !== deletedId)
      );
      showNotification('Template excluído com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`Erro ao excluir template: ${error.message}`, 'error');
    },
  });

  // Funções de conveniência para relatórios
  const createReport = async (
    reportData: Omit<
      Report,
      'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'generatedBy'
    >
  ) => {
    return createReportMutation.mutateAsync({
      ...reportData,
      tenantId,
      generatedBy: user?.id || 'unknown',
    });
  };

  const updateReport = async (id: string, updates: Partial<Report>) => {
    return updateReportMutation.mutateAsync({ id, updates });
  };

  const removeReport = async (id: string) => {
    return deleteReportMutation.mutateAsync(id);
  };

  const generateReport = async (id: string) => {
    // Atualizar status para 'generating'
    await updateReport(id, { status: 'generating' });

    // Gerar relatório
    return generateReportMutation.mutateAsync(id);
  };

  // Funções de conveniência para templates
  const createTemplate = async (
    templateData: Omit<
      ReportTemplate,
      'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'createdBy'
    >
  ) => {
    return createTemplateMutation.mutateAsync({
      ...templateData,
      tenantId,
      createdBy: user?.id || 'unknown',
    });
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<ReportTemplate>
  ) => {
    return updateTemplateMutation.mutateAsync({ id, updates });
  };

  const removeTemplate = async (id: string) => {
    return deleteTemplateMutation.mutateAsync(id);
  };

  // Funções de busca e filtro
  const searchReports = (query: string) => {
    if (!query.trim()) return reports;

    const lowercaseQuery = query.toLowerCase();
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(lowercaseQuery) ||
        r.description?.toLowerCase().includes(lowercaseQuery)
    );
  };

  const getReportsByType = (type: Report['type']) => {
    return reports.filter((r) => r.type === type);
  };

  const getReportsByStatus = (status: Report['status']) => {
    return reports.filter((r) => r.status === status);
  };

  const getRecentReports = (days: number = 7) => {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return reports.filter((r) => new Date(r.createdAt) >= cutoffDate);
  };

  const getScheduledReports = () => {
    return reports.filter((r) => r.status === 'scheduled' && r.scheduledFor);
  };

  const searchTemplates = (query: string) => {
    if (!query.trim()) return templates;

    const lowercaseQuery = query.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(lowercaseQuery) ||
        t.description?.toLowerCase().includes(lowercaseQuery)
    );
  };

  const getTemplatesByType = (type: ReportTemplate['type']) => {
    return templates.filter((t) => t.type === type);
  };

  const getDefaultTemplates = () => {
    return templates.filter((t) => t.isDefault);
  };

  const getPublicTemplates = () => {
    return templates.filter((t) => t.isPublic);
  };

  // Estatísticas
  const getReportStats = () => {
    const total = reports.length;
    const completed = reports.filter((r) => r.status === 'completed').length;
    const generating = reports.filter((r) => r.status === 'generating').length;
    const scheduled = reports.filter((r) => r.status === 'scheduled').length;
    const failed = reports.filter((r) => r.status === 'failed').length;

    return {
      total,
      completed,
      generating,
      scheduled,
      failed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  return {
    // Dados
    reports,
    templates,
    isLoading: isLoadingReports || isLoadingTemplates,
    error: reportsError || templatesError,

    // Ações - Relatórios
    createReport,
    updateReport,
    removeReport,
    generateReport,
    refetchReports,

    // Ações - Templates
    createTemplate,
    updateTemplate,
    removeTemplate,
    refetchTemplates,

    // Busca e filtros - Relatórios
    searchReports,
    getReportsByType,
    getReportsByStatus,
    getRecentReports,
    getScheduledReports,
    getReportStats,

    // Busca e filtros - Templates
    searchTemplates,
    getTemplatesByType,
    getDefaultTemplates,
    getPublicTemplates,

    // Estados de loading
    isCreatingReport: createReportMutation.isPending,
    isUpdatingReport: updateReportMutation.isPending,
    isDeletingReport: deleteReportMutation.isPending,
    isGeneratingReport: generateReportMutation.isPending,
    isCreatingTemplate: createTemplateMutation.isPending,
    isUpdatingTemplate: updateTemplateMutation.isPending,
    isDeletingTemplate: deleteTemplateMutation.isPending,
  };
};

export default useReports;
