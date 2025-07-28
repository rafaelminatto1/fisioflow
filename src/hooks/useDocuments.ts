import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';

import { Document, User } from '../../types';

// Simulação de API - substituir por chamadas reais
const documentsApi = {
  getAll: async (): Promise<Document[]> => {
    // Simular delay de rede
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stored = localStorage.getItem('fisioflow_documents');
    return stored ? JSON.parse(stored) : [];
  },

  save: async (
    document: Omit<Document, 'id' | 'uploadDate'>,
    file: File,
    user: User
  ): Promise<Document> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Simular upload de arquivo
    const fileUrl = URL.createObjectURL(file);

    const stored = localStorage.getItem('fisioflow_documents');
    const documents: Document[] = stored ? JSON.parse(stored) : [];

    const now = new Date().toISOString();
    const savedDocument: Document = {
      ...document,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileUrl,
      uploadDate: now,
      uploadedById: user.id,
    };

    documents.push(savedDocument);
    localStorage.setItem('fisioflow_documents', JSON.stringify(documents));
    return savedDocument;
  },

  delete: async (documentId: string, user: User): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const stored = localStorage.getItem('fisioflow_documents');
    const documents: Document[] = stored ? JSON.parse(stored) : [];

    const filtered = documents.filter((d) => d.id !== documentId);
    localStorage.setItem('fisioflow_documents', JSON.stringify(filtered));
  },

  getByPatientId: async (patientId: string): Promise<Document[]> => {
    const all = await documentsApi.getAll();
    return all.filter((document) => document.patientId === patientId);
  },

  getByType: async (fileType: string): Promise<Document[]> => {
    const all = await documentsApi.getAll();
    return all.filter((document) => document.fileType.includes(fileType));
  },
};

export interface UseDocumentsReturn {
  // Data
  documents: Document[];
  loading: boolean;
  error: Error | null;

  // Actions
  uploadDocument: (
    document: Omit<
      Document,
      | 'id'
      | 'uploadDate'
      | 'fileName'
      | 'fileSize'
      | 'fileType'
      | 'fileUrl'
      | 'uploadedById'
    >,
    file: File,
    user: User
  ) => Promise<Document>;
  removeDocument: (documentId: string, user: User) => Promise<void>;

  // Queries
  getDocumentsByPatient: (patientId: string) => Document[];
  getDocumentsByType: (fileType: string) => Document[];

  // Utils
  formatFileSize: (bytes: number) => string;
  isValidFileType: (file: File, allowedTypes?: string[]) => boolean;
  refetch: () => void;
  invalidate: () => void;
}

/**
 * Hook para gerenciar documentos de pacientes
 *
 * Funcionalidades:
 * - Listagem de documentos
 * - Upload de novos documentos
 * - Exclusão de documentos
 * - Filtros por paciente e tipo de arquivo
 * - Validação de tipos de arquivo
 * - Formatação de tamanho de arquivo
 * - Cache otimizado com React Query
 *
 * @returns {UseDocumentsReturn} Objeto com dados e funções para gerenciar documentos
 */
export const useDocuments = (): UseDocumentsReturn => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Query para buscar todos os documentos
  const {
    data: documents = [],
    isLoading: loading,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });

  // Mutation para upload de documento
  const uploadMutation = useMutation({
    mutationFn: ({
      document,
      file,
      user,
    }: {
      document: Omit<
        Document,
        | 'id'
        | 'uploadDate'
        | 'fileName'
        | 'fileSize'
        | 'fileType'
        | 'fileUrl'
        | 'uploadedById'
      >;
      file: File;
      user: User;
    }) => documentsApi.save(document, file, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao fazer upload do documento:', error);
    },
  });

  // Mutation para remover documento
  const removeMutation = useMutation({
    mutationFn: ({ documentId, user }: { documentId: string; user: User }) =>
      documentsApi.delete(documentId, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao remover documento:', error);
    },
  });

  // Actions
  const uploadDocument = useCallback(
    async (
      document: Omit<
        Document,
        | 'id'
        | 'uploadDate'
        | 'fileName'
        | 'fileSize'
        | 'fileType'
        | 'fileUrl'
        | 'uploadedById'
      >,
      file: File,
      user: User
    ): Promise<Document> => {
      return await uploadMutation.mutateAsync({ document, file, user });
    },
    [uploadMutation]
  );

  const removeDocument = useCallback(
    async (documentId: string, user: User) => {
      await removeMutation.mutateAsync({ documentId, user });
    },
    [removeMutation]
  );

  // Queries
  const getDocumentsByPatient = useCallback(
    (patientId: string): Document[] => {
      return documents.filter((document) => document.patientId === patientId);
    },
    [documents]
  );

  const getDocumentsByType = useCallback(
    (fileType: string): Document[] => {
      return documents.filter((document) =>
        document.fileType.includes(fileType)
      );
    },
    [documents]
  );

  // Utils
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const isValidFileType = useCallback(
    (file: File, allowedTypes?: string[]): boolean => {
      if (!allowedTypes || allowedTypes.length === 0) {
        // Tipos padrão permitidos
        const defaultAllowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        return defaultAllowedTypes.includes(file.type);
      }

      return allowedTypes.includes(file.type);
    },
    []
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  }, [queryClient]);

  // Sync error states
  useEffect(() => {
    if (queryError) {
      setError(queryError as Error);
    }
  }, [queryError]);

  return {
    // Data
    documents,
    loading: loading || uploadMutation.isPending || removeMutation.isPending,
    error,

    // Actions
    uploadDocument,
    removeDocument,

    // Queries
    getDocumentsByPatient,
    getDocumentsByType,

    // Utils
    formatFileSize,
    isValidFileType,
    refetch,
    invalidate,
  };
};

export default useDocuments;
