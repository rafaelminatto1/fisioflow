import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the entire services
jest.mock('../../services/secureStorage');
jest.mock('../../services/encryption');
jest.mock('../../services/auditLogger');

// Patient Management Integration Tests
// These tests verify the complete patient management workflow from creation to deletion
describe('Patient Management Integration', () => {
  let queryClient: QueryClient;
  let mockSecureStorage: any;
  let mockEncryption: any;
  let mockAuditLogger: any;

  // Mock App component with providers
  const TestApp = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <div data-testid="app-container">
        {children}
      </div>
    </QueryClientProvider>
  );

  beforeEach(() => {
    // Fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Setup mocks
    const { SecureStorageManager } = require('../../services/secureStorage');
    const { EncryptionManager } = require('../../services/encryption');
    const { AuditLogger } = require('../../services/auditLogger');

    mockSecureStorage = {
      storePatient: jest.fn(),
      getPatient: jest.fn(),
      getAllPatients: jest.fn(),
      deletePatient: jest.fn(),
    };

    mockEncryption = {
      encryptPatientData: jest.fn(),
      decryptPatientData: jest.fn(),
      verifyDataIntegrity: jest.fn(),
    };

    mockAuditLogger = {
      log: jest.fn(),
    };

    SecureStorageManager.mockImplementation(() => mockSecureStorage);
    EncryptionManager.mockImplementation(() => mockEncryption);
    AuditLogger.mockImplementation(() => mockAuditLogger);

    // Mock sessionStorage for master key
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: jest.fn((key) => {
          if (key === 'masterKey') return 'test-master-key-123';
          return null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock auth context
    jest.doMock('../../hooks/useAuth', () => ({
      useAuth: () => ({
        currentUser: {
          id: 'user-1',
          name: 'Dr. João Silva',
          role: 'FISIOTERAPEUTA',
          tenantId: 'tenant-1',
        },
        currentTenant: {
          id: 'tenant-1',
          name: 'Clínica Teste',
        },
        isAuthenticated: true,
      }),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  describe('Complete Patient Lifecycle', () => {
    it('should create, read, update and delete a patient with proper encryption and audit', async () => {
      const user = userEvent.setup();

      // Mock patient data
      const newPatient = {
        id: 'patient-1',
        name: 'João Silva',
        cpf: '123.456.789-09',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        birthDate: '1985-01-15',
        tenantId: 'tenant-1',
      };

      const encryptedPatientData = {
        id: 'patient-1',
        publicData: { id: 'patient-1', name: 'João Silva' },
        encryptedData: {
          data: new ArrayBuffer(32),
          iv: new Uint8Array(12),
          salt: new Uint8Array(16),
          algorithm: 'AES-GCM' as const,
          keyLength: 256 as const,
        },
        dataHash: {
          hash: new ArrayBuffer(32),
          algorithm: 'SHA-256' as const,
          timestamp: Date.now(),
        },
        tenantId: 'tenant-1',
      };

      const decryptedSensitiveData = {
        cpf: '123.456.789-09',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        birthDate: '1985-01-15',
      };

      // Setup mocks for CREATE operation
      mockEncryption.encryptPatientData.mockResolvedValue({
        publicData: encryptedPatientData.publicData,
        encryptedData: encryptedPatientData.encryptedData,
        dataHash: encryptedPatientData.dataHash,
      });
      mockSecureStorage.storePatient.mockResolvedValue(undefined);
      mockAuditLogger.log.mockResolvedValue(undefined);

      // Step 1: CREATE PATIENT
      const PatientForm = () => {
        const [formData, setFormData] = React.useState({
          name: '',
          cpf: '',
          email: '',
          phone: '',
          birthDate: '',
        });

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          
          // Use the secure data hook (mocked)
          const { useSecureData } = require('../../hooks/useSecureData');
          const { saveSecurePatient } = useSecureData();
          
          await saveSecurePatient(
            { ...formData, id: 'patient-1', tenantId: 'tenant-1' },
            { id: 'user-1', name: 'Dr. João Silva', role: 'FISIOTERAPEUTA', tenantId: 'tenant-1' },
            'test-master-key-123'
          );
        };

        return (
          <form onSubmit={handleSubmit} data-testid="patient-form">
            <input
              data-testid="name-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome"
            />
            <input
              data-testid="cpf-input"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              placeholder="CPF"
            />
            <input
              data-testid="email-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email"
            />
            <input
              data-testid="phone-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Telefone"
            />
            <input
              data-testid="birthdate-input"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
            />
            <button type="submit" data-testid="submit-button">
              Salvar Paciente
            </button>
          </form>
        );
      };

      render(
        <TestApp>
          <PatientForm />
        </TestApp>
      );

      // Fill in the form
      await user.type(screen.getByTestId('name-input'), newPatient.name);
      await user.type(screen.getByTestId('cpf-input'), newPatient.cpf);
      await user.type(screen.getByTestId('email-input'), newPatient.email);
      await user.type(screen.getByTestId('phone-input'), newPatient.phone);
      await user.type(screen.getByTestId('birthdate-input'), newPatient.birthDate);

      // Submit the form
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        // Verify encryption was called
        expect(mockEncryption.encryptPatientData).toHaveBeenCalledWith(
          expect.objectContaining({
            name: newPatient.name,
            cpf: newPatient.cpf,
            email: newPatient.email,
          }),
          'tenant-1',
          'test-master-key-123'
        );

        // Verify storage was called
        expect(mockSecureStorage.storePatient).toHaveBeenCalled();

        // Verify audit log was created
        expect(mockAuditLogger.log).toHaveBeenCalledWith(
          'CREATE',
          expect.objectContaining({ id: 'user-1' }),
          'tenant-1',
          expect.objectContaining({
            patientId: 'patient-1',
            patientName: newPatient.name,
          })
        );
      });

      // Step 2: READ PATIENT
      // Setup mocks for READ operation
      mockSecureStorage.getPatient.mockResolvedValue(encryptedPatientData);
      mockEncryption.decryptPatientData.mockResolvedValue(decryptedSensitiveData);
      mockEncryption.verifyDataIntegrity.mockResolvedValue(true);

      const PatientView = ({ patientId }: { patientId: string }) => {
        const [patient, setPatient] = React.useState<any>(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const loadPatient = async () => {
            const { useSecureData } = require('../../hooks/useSecureData');
            const { getSecurePatient } = useSecureData();
            
            try {
              const patientData = await getSecurePatient(patientId, 'tenant-1', 'test-master-key-123');
              setPatient(patientData);
            } finally {
              setLoading(false);
            }
          };

          loadPatient();
        }, [patientId]);

        if (loading) return <div data-testid="loading">Carregando...</div>;
        if (!patient) return <div data-testid="not-found">Paciente não encontrado</div>;

        return (
          <div data-testid="patient-view">
            <div data-testid="patient-name">{patient.name}</div>
            <div data-testid="patient-cpf">{patient.cpf}</div>
            <div data-testid="patient-email">{patient.email}</div>
            <div data-testid="patient-phone">{patient.phone}</div>
          </div>
        );
      };

      // Render patient view
      const { rerender } = render(
        <TestApp>
          <PatientView patientId="patient-1" />
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('patient-view')).toBeInTheDocument();
        expect(screen.getByTestId('patient-name')).toHaveTextContent('João Silva');
        expect(screen.getByTestId('patient-cpf')).toHaveTextContent('123.456.789-09');
      });

      // Verify decrypt and integrity check were called
      expect(mockEncryption.decryptPatientData).toHaveBeenCalledWith(
        encryptedPatientData.encryptedData,
        'tenant-1',
        'test-master-key-123'
      );
      expect(mockEncryption.verifyDataIntegrity).toHaveBeenCalled();

      // Verify audit log for viewing patient
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'VIEW_PATIENT',
        expect.objectContaining({ id: 'user-1' }),
        'tenant-1',
        expect.objectContaining({
          patientId: 'patient-1',
          patientName: 'João Silva',
        })
      );

      // Step 3: UPDATE PATIENT
      const updatedPatient = {
        ...newPatient,
        email: 'joao.silva@newemail.com',
        phone: '(11) 88888-8888',
      };

      // Reset mocks for update
      jest.clearAllMocks();
      mockEncryption.encryptPatientData.mockResolvedValue({
        publicData: { id: 'patient-1', name: 'João Silva' },
        encryptedData: encryptedPatientData.encryptedData,
        dataHash: encryptedPatientData.dataHash,
      });
      mockSecureStorage.storePatient.mockResolvedValue(undefined);

      const PatientEditForm = () => {
        const [formData, setFormData] = React.useState(updatedPatient);

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          
          const { useSecureData } = require('../../hooks/useSecureData');
          const { saveSecurePatient } = useSecureData();
          
          await saveSecurePatient(
            formData,
            { id: 'user-1', name: 'Dr. João Silva', role: 'FISIOTERAPEUTA', tenantId: 'tenant-1' },
            'test-master-key-123'
          );
        };

        return (
          <form onSubmit={handleSubmit} data-testid="edit-form">
            <input
              data-testid="edit-email-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              data-testid="edit-phone-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <button type="submit" data-testid="update-button">
              Atualizar Paciente
            </button>
          </form>
        );
      };

      rerender(
        <TestApp>
          <PatientEditForm />
        </TestApp>
      );

      // Update email and phone
      const emailInput = screen.getByTestId('edit-email-input');
      const phoneInput = screen.getByTestId('edit-phone-input');

      await user.clear(emailInput);
      await user.type(emailInput, updatedPatient.email);
      await user.clear(phoneInput);
      await user.type(phoneInput, updatedPatient.phone);

      // Submit update
      await user.click(screen.getByTestId('update-button'));

      await waitFor(() => {
        // Verify update encryption was called
        expect(mockEncryption.encryptPatientData).toHaveBeenCalledWith(
          expect.objectContaining({
            email: updatedPatient.email,
            phone: updatedPatient.phone,
          }),
          'tenant-1',
          'test-master-key-123'
        );

        // Verify storage was called for update
        expect(mockSecureStorage.storePatient).toHaveBeenCalled();

        // Verify audit log for update
        expect(mockAuditLogger.log).toHaveBeenCalledWith(
          'UPDATE',
          expect.objectContaining({ id: 'user-1' }),
          'tenant-1',
          expect.objectContaining({
            patientId: 'patient-1',
          })
        );
      });

      // Step 4: DELETE PATIENT
      jest.clearAllMocks();
      mockSecureStorage.deletePatient.mockResolvedValue(undefined);

      const PatientDeleteButton = ({ patientId }: { patientId: string }) => {
        const handleDelete = async () => {
          const { useSecureData } = require('../../hooks/useSecureData');
          const { deleteSecurePatient } = useSecureData();
          
          await deleteSecurePatient(
            patientId,
            'tenant-1',
            { id: 'user-1', name: 'Dr. João Silva', role: 'FISIOTERAPEUTA', tenantId: 'tenant-1' }
          );
        };

        return (
          <button onClick={handleDelete} data-testid="delete-button">
            Excluir Paciente
          </button>
        );
      };

      rerender(
        <TestApp>
          <PatientDeleteButton patientId="patient-1" />
        </TestApp>
      );

      // Delete patient
      await user.click(screen.getByTestId('delete-button'));

      await waitFor(() => {
        // Verify deletion was called
        expect(mockSecureStorage.deletePatient).toHaveBeenCalledWith('patient-1', 'tenant-1');

        // Verify audit log for deletion
        expect(mockAuditLogger.log).toHaveBeenCalledWith(
          'DELETE',
          expect.objectContaining({ id: 'user-1' }),
          'tenant-1',
          expect.objectContaining({
            patientId: 'patient-1',
          })
        );
      });
    });

    it('should handle patient management errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock error scenarios
      mockEncryption.encryptPatientData.mockRejectedValue(new Error('Encryption failed'));

      const PatientFormWithError = () => {
        const [error, setError] = React.useState<string | null>(null);

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          
          try {
            const { useSecureData } = require('../../hooks/useSecureData');
            const { saveSecurePatient } = useSecureData();
            
            await saveSecurePatient(
              { id: 'patient-1', name: 'Test Patient', tenantId: 'tenant-1' },
              { id: 'user-1', name: 'Dr. João Silva', role: 'FISIOTERAPEUTA', tenantId: 'tenant-1' },
              'test-master-key-123'
            );
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
          }
        };

        return (
          <div>
            <form onSubmit={handleSubmit} data-testid="error-form">
              <button type="submit" data-testid="submit-error-button">
                Salvar
              </button>
            </form>
            {error && <div data-testid="error-message">{error}</div>}
          </div>
        );
      };

      render(
        <TestApp>
          <PatientFormWithError />
        </TestApp>
      );

      await user.click(screen.getByTestId('submit-error-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Encryption failed');
      });
    });

    it('should enforce tenant isolation throughout patient operations', async () => {
      const user = userEvent.setup();

      // Mock different tenant context
      jest.doMock('../../hooks/useAuth', () => ({
        useAuth: () => ({
          currentUser: {
            id: 'user-2',
            name: 'Dr. Maria Santos',
            role: 'FISIOTERAPEUTA',
            tenantId: 'tenant-2', // Different tenant
          },
          currentTenant: {
            id: 'tenant-2',
            name: 'Outra Clínica',
          },
          isAuthenticated: true,
        }),
      }));

      const TenantIsolationTest = () => {
        const [result, setResult] = React.useState<string>('');

        const testTenantIsolation = async () => {
          try {
            const { useSecureData } = require('../../hooks/useSecureData');
            const { saveSecurePatient } = useSecureData();
            
            // Try to save patient with wrong tenant ID
            await saveSecurePatient(
              { id: 'patient-1', name: 'Test', tenantId: 'tenant-1' }, // Wrong tenant
              { id: 'user-2', name: 'Dr. Maria Santos', role: 'FISIOTERAPEUTA', tenantId: 'tenant-2' },
              'test-master-key-123'
            );
            setResult('Should not reach here');
          } catch (err) {
            setResult(err instanceof Error ? err.message : 'Error occurred');
          }
        };

        return (
          <div>
            <button onClick={testTenantIsolation} data-testid="test-isolation">
              Test Tenant Isolation
            </button>
            <div data-testid="isolation-result">{result}</div>
          </div>
        );
      };

      render(
        <TestApp>
          <TenantIsolationTest />
        </TestApp>
      );

      await user.click(screen.getByTestId('test-isolation'));

      await waitFor(() => {
        const result = screen.getByTestId('isolation-result');
        expect(result).toHaveTextContent(/tenant/i); // Should contain tenant-related error
      });
    });

    it('should maintain data integrity throughout operations', async () => {
      const user = userEvent.setup();

      // Mock data integrity failure
      mockSecureStorage.getPatient.mockResolvedValue({
        id: 'patient-1',
        publicData: { id: 'patient-1', name: 'João Silva' },
        encryptedData: { data: new ArrayBuffer(32), iv: new Uint8Array(12), salt: new Uint8Array(16), algorithm: 'AES-GCM' as const, keyLength: 256 as const },
        dataHash: { hash: new ArrayBuffer(32), algorithm: 'SHA-256' as const, timestamp: Date.now() },
        tenantId: 'tenant-1',
      });
      mockEncryption.verifyDataIntegrity.mockResolvedValue(false); // Integrity check fails

      const IntegrityTest = () => {
        const [error, setError] = React.useState<string>('');

        const testIntegrity = async () => {
          try {
            const { useSecureData } = require('../../hooks/useSecureData');
            const { getSecurePatient } = useSecureData();
            
            await getSecurePatient('patient-1', 'tenant-1', 'test-master-key-123');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
          }
        };

        React.useEffect(() => {
          testIntegrity();
        }, []);

        return <div data-testid="integrity-error">{error}</div>;
      };

      render(
        <TestApp>
          <IntegrityTest />
        </TestApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('integrity-error')).toHaveTextContent(/integrity/i);
      });

      // Verify that integrity check was actually called
      expect(mockEncryption.verifyDataIntegrity).toHaveBeenCalled();
    });
  });

  describe('Performance under load', () => {
    it('should handle bulk patient operations efficiently', async () => {
      const batchSize = 100;
      const patients = Array.from({ length: batchSize }, (_, i) => ({
        id: `patient-${i}`,
        name: `Patient ${i}`,
        email: `patient${i}@email.com`,
        tenantId: 'tenant-1',
      }));

      // Mock batch operations
      mockEncryption.encryptPatientData.mockResolvedValue({
        publicData: { id: 'patient-1', name: 'Test' },
        encryptedData: { data: new ArrayBuffer(32), iv: new Uint8Array(12), salt: new Uint8Array(16), algorithm: 'AES-GCM' as const, keyLength: 256 as const },
        dataHash: { hash: new ArrayBuffer(32), algorithm: 'SHA-256' as const, timestamp: Date.now() },
      });
      mockSecureStorage.storePatient.mockResolvedValue(undefined);
      mockAuditLogger.log.mockResolvedValue(undefined);

      const BulkOperationTest = () => {
        const [progress, setProgress] = React.useState(0);
        const [completed, setCompleted] = React.useState(false);

        const processBatch = async () => {
          const startTime = Date.now();

          for (let i = 0; i < patients.length; i++) {
            const { useSecureData } = require('../../hooks/useSecureData');
            const { saveSecurePatient } = useSecureData();
            
            await saveSecurePatient(
              patients[i],
              { id: 'user-1', name: 'Dr. João Silva', role: 'FISIOTERAPEUTA', tenantId: 'tenant-1' },
              'test-master-key-123'
            );
            
            setProgress(i + 1);
          }

          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Should complete batch within reasonable time (< 5 seconds for 100 items)
          expect(duration).toBeLessThan(5000);
          setCompleted(true);
        };

        React.useEffect(() => {
          processBatch();
        }, []);

        return (
          <div>
            <div data-testid="progress">{progress}/{batchSize}</div>
            <div data-testid="completed">{completed ? 'Completed' : 'Processing'}</div>
          </div>
        );
      };

      render(
        <TestApp>
          <BulkOperationTest />
        </TestApp>
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('completed')).toHaveTextContent('Completed');
        },
        { timeout: 10000 }
      );

      expect(screen.getByTestId('progress')).toHaveTextContent(`${batchSize}/${batchSize}`);
      
      // Verify all operations were called
      expect(mockEncryption.encryptPatientData).toHaveBeenCalledTimes(batchSize);
      expect(mockSecureStorage.storePatient).toHaveBeenCalledTimes(batchSize);
    });
  });
});