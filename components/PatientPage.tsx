import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Patient } from '../types';
import PatientModal from './PatientModal';
import { IconPlus } from './icons/IconComponents';
import PageLoader from './ui/PageLoader';
import PageShell from './ui/PageShell';
import Button from './ui/Button';
import SearchInput from './ui/SearchInput';
import VirtualizedPatientList from './ui/VirtualizedPatientList';

const PatientPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const {
    patients,
    exercises,
    savePatient,
    deletePatient,
    getTasksForPatient,
    getAppointmentsForPatient,
    getPrescriptionsForPatient,
    getExerciseLogsForPatient,
    getAssessmentsForPatient,
    getTransactionsForPatient,
    getDocumentsForPatient,
  } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<
    Patient | Partial<Patient> | null
  >(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300); // Simulate loading
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
    setSelectedPatient(patient);
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
    setSelectedPatient(null);
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

  return (
    <PageShell
      title="Pacientes"
      action={
        <Button onClick={handleOpenNewModal} icon={<IconPlus />}>
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
        onPatientClick={handleOpenModal}
        getTasksCount={(patientId: string) =>
          getTasksForPatient(patientId).length
        }
        height={Math.min(filteredPatients.length * 80 + 20, 600)} // Max height of 600px
      />

      {isModalOpen && (
        <PatientModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSavePatient}
          onDelete={handleDeletePatient}
          patient={selectedPatient}
          tasks={
            selectedPatient && 'id' in selectedPatient
              ? getTasksForPatient(selectedPatient.id!)
              : []
          }
          appointments={
            selectedPatient && 'id' in selectedPatient
              ? getAppointmentsForPatient(selectedPatient.id!)
              : []
          }
          prescribedExercises={
            selectedPatient && 'id' in selectedPatient
              ? getPrescriptionsForPatient(selectedPatient.id!)
              : []
          }
          exercises={exercises}
          exerciseLogs={
            selectedPatient && 'id' in selectedPatient
              ? getExerciseLogsForPatient(selectedPatient.id!)
              : []
          }
          assessments={
            selectedPatient && 'id' in selectedPatient
              ? getAssessmentsForPatient(selectedPatient.id!)
              : []
          }
          transactions={
            selectedPatient && 'id' in selectedPatient
              ? getTransactionsForPatient(selectedPatient.id!)
              : []
          }
          documents={
            selectedPatient && 'id' in selectedPatient
              ? getDocumentsForPatient(selectedPatient.id!)
              : []
          }
        />
      )}
    </PageShell>
  );
};

export default PatientPage;
