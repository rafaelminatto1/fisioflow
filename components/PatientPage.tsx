import { Brain } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';

import { useAuth } from '../src/hooks/useAuthSimple';
import { useData } from '../hooks/useData';
import { Patient } from '../types';

import { AIDocumentationAssistant } from './AIDocumentationAssistant';
import { IconPlus, IconArrowLeft } from './icons/IconComponents';
import PatientModal from './PatientModal'; // Manteremos o modal para edição/criação
import { Button } from './ui/Button';
import PageLoader from './ui/PageLoader';
import PageShell from './ui/PageShell';
import SearchInput from './ui/SearchInput';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import VirtualizedPatientList from './ui/VirtualizedPatientList';

// Componente para os detalhes do paciente com abas
const PatientDetails: React.FC<{ patient: Patient; onBack: () => void }> = ({
  patient,
  onBack,
}) => {
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const {
    getTasksForPatient,
    getAppointmentsForPatient,
    getPrescriptionsForPatient,
    getExerciseLogsForPatient,
    getAssessmentsForPatient,
    getTransactionsForPatient,
    getDocumentsForPatient,
  } = useData();

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <Button onClick={onBack} variant="ghost">
          <IconArrowLeft className="mr-2" />
          Voltar para a lista
        </Button>
        <Button 
          onClick={() => setIsAIAssistantOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Brain className="h-4 w-4 mr-2" />
          Documentação IA
        </Button>
      </div>
      <h2 className="mb-4 text-2xl font-bold">{patient.name}</h2>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="appointments">Agenda</TabsTrigger>
          <TabsTrigger value="protocols">Protocolos</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="rounded-lg bg-secondary p-4">
            <p>
              <strong>Email:</strong> {patient.email}
            </p>
            <p>
              <strong>Telefone:</strong> {patient.phone}
            </p>
            <p>
              <strong>Histórico:</strong> {patient.medicalHistory}
            </p>
          </div>
        </TabsContent>
        <TabsContent value="appointments">
          {/* Aqui entraria a lista de agendamentos */}
          <p>
            {getAppointmentsForPatient(patient.id!).length} agendamento(s)
            encontrado(s).
          </p>
        </TabsContent>
        <TabsContent value="protocols">
          {/* Aqui entraria a lista de protocolos */}
          <p>
            {getPrescriptionsForPatient(patient.id!).length} protocolo(s)
            prescrito(s).
          </p>
        </TabsContent>
        <TabsContent value="financial">
          {/* Aqui entraria a lista de transações */}
          <p>
            {getTransactionsForPatient(patient.id!).length} transação(ões)
            encontrada(s).
          </p>
        </TabsContent>
        <TabsContent value="documents">
          {/* Aqui entraria a lista de documentos */}
          <p>
            {getDocumentsForPatient(patient.id!).length} documento(s)
            encontrado(s).
          </p>
        </TabsContent>
      </Tabs>

      {/* Assistente de Documentação IA - Suas Assinaturas! */}
      <AIDocumentationAssistant
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        patient={patient}
        contextType="assessment"
      />
    </div>
  );
};

const PatientPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { patients, savePatient, deletePatient, getTasksForPatient } =
    useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<
    Patient | Partial<Patient> | null
  >(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const filteredPatients = useMemo(
    () =>
      patients.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [patients, searchTerm]
  );

  const handleOpenModal = (patient: Patient | Partial<Patient> | null) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    handleOpenModal({
      name: '',
      email: '',
      phone: '',
      medicalHistory: '',
      avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
      consent: { given: false },
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
  };

  const handleSavePatient = (patientToSave: Patient) => {
    if (!user) return;
    savePatient(patientToSave, user);
    handleCloseModal();
  };

  const handleDeletePatient = (patientId: string) => {
    if (!user) return;
    deletePatient(patientId, user);
    handleCloseModal();
  };

  if (isLoading) {
    return <PageLoader message="Carregando lista de pacientes..." />;
  }

  if (selectedPatient) {
    return (
      <PatientDetails
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  return (
    <PageShell
      title="Pacientes"
      action={
        <Button onClick={handleOpenNewModal} className="new-patient-button">
          <IconPlus className="mr-2" />
          Novo Paciente
        </Button>
      }
    >
      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar paciente por nome..."
        />
      </div>

      <VirtualizedPatientList
        patients={filteredPatients}
        onPatientClick={(patient) => setSelectedPatient(patient)} // Alterado para mostrar detalhes
        getTasksCount={(patientId: string) =>
          getTasksForPatient(patientId).length
        }
        height={Math.min(filteredPatients.length * 80 + 20, 600)}
      />

      {isModalOpen && (
        <PatientModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSavePatient}
          onDelete={handleDeletePatient}
          patient={editingPatient}
          // As props complexas podem ser removidas se o modal for apenas para edição de dados básicos
        />
      )}
    </PageShell>
  );
};

export default PatientPage;
