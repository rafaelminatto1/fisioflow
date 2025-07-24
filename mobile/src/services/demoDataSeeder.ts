import { Patient, Appointment } from '../types';
import { createPatient, createAppointment } from './database';

// Dados realistas de pacientes para demonstração
const DEMO_PATIENTS: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Maria Silva Santos',
    email: 'maria.silva@email.com',
    phone: '(11) 99999-1234',
    cpf: '123.456.789-01',
    birthDate: '1985-03-15',
    address: {
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 45',
      district: 'Vila Madalena',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '05433-000'
    },
    emergencyContact: {
      name: 'João Santos',
      phone: '(11) 98888-5678',
      relationship: 'Marido'
    },
    medicalInfo: {
      conditions: ['Lombalgia', 'Hérnia de disco L4-L5'],
      medications: ['Relaxante muscular', 'Anti-inflamatório'],
      allergies: ['Dipirona'],
      surgeries: ['Cirurgia de vesícula (2019)'],
      familyHistory: 'Histórico familiar de problemas na coluna'
    },
    sessions: 8,
    progress: 75,
    status: 'active',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dr. Carlos Fisio'
  },
  {
    name: 'José Carlos Oliveira',
    email: 'jose.oliveira@email.com',
    phone: '(11) 97777-2345',
    cpf: '234.567.890-12',
    birthDate: '1978-07-22',
    address: {
      street: 'Avenida Paulista',
      number: '1578',
      complement: '',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-200'
    },
    emergencyContact: {
      name: 'Ana Oliveira',
      phone: '(11) 96666-7890',
      relationship: 'Esposa'
    },
    medicalInfo: {
      conditions: ['Tendinite no ombro', 'Bursite'],
      medications: ['Ibuprofeno'],
      allergies: [],
      surgeries: [],
      familyHistory: 'Sem histórico familiar relevante'
    },
    sessions: 12,
    progress: 90,
    status: 'active',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dra. Ana Fisio'
  },
  {
    name: 'Ana Paula Fernandes',
    email: 'ana.fernandes@email.com',
    phone: '(11) 95555-3456',
    cpf: '345.678.901-23',
    birthDate: '1992-11-08',
    address: {
      street: 'Rua Augusta',
      number: '856',
      complement: 'Casa 2',
      district: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01305-100'
    },
    emergencyContact: {
      name: 'Pedro Fernandes',
      phone: '(11) 94444-1234',
      relationship: 'Pai'
    },
    medicalInfo: {
      conditions: ['Fibromialgia', 'Ansiedade'],
      medications: ['Pregabalina', 'Sertralina'],
      allergies: ['Penicilina'],
      surgeries: [],
      familyHistory: 'Mãe com fibromialgia'
    },
    sessions: 15,
    progress: 65,
    status: 'active',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dr. Carlos Fisio'
  },
  {
    name: 'Roberto Alves Costa',
    email: 'roberto.costa@email.com',
    phone: '(11) 93333-4567',
    cpf: '456.789.012-34',
    birthDate: '1965-09-12',
    address: {
      street: 'Rua Oscar Freire',
      number: '302',
      complement: 'Loja 15',
      district: 'Jardins',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01426-001'
    },
    emergencyContact: {
      name: 'Lucia Costa',
      phone: '(11) 92222-5678',
      relationship: 'Esposa'
    },
    medicalInfo: {
      conditions: ['Artrose no joelho', 'Sobrepeso'],
      medications: ['Condroitina', 'Glucosamina'],
      allergies: [],
      surgeries: ['Meniscectomia (2020)'],
      familyHistory: 'Pai com artrite reumatoide'
    },
    sessions: 20,
    progress: 85,
    status: 'active',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dra. Ana Fisio'
  },
  {
    name: 'Carla Rodrigues Lima',
    email: 'carla.lima@email.com',
    phone: '(11) 91111-6789',
    cpf: '567.890.123-45',
    birthDate: '1988-04-25',
    address: {
      street: 'Rua da Consolação',
      number: '1245',
      complement: 'Apto 78',
      district: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01301-100'
    },
    emergencyContact: {
      name: 'Marcos Lima',
      phone: '(11) 90000-7890',
      relationship: 'Marido'
    },
    medicalInfo: {
      conditions: ['Escoliose', 'Cefaleia tensional'],
      medications: ['Relaxante muscular'],
      allergies: ['Látex'],
      surgeries: [],
      familyHistory: 'Irmã com escoliose'
    },
    sessions: 6,
    progress: 40,
    status: 'active',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dr. Carlos Fisio'
  },
  {
    name: 'Fernando Santos Pereira',
    email: 'fernando.pereira@email.com',
    phone: '(11) 98888-7890',
    cpf: '678.901.234-56',
    birthDate: '1975-12-03',
    address: {
      street: 'Avenida Rebouças',
      number: '2456',
      complement: 'Cobertura',
      district: 'Pinheiros',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '05402-600'
    },
    emergencyContact: {
      name: 'Silvia Pereira',
      phone: '(11) 97777-1234',
      relationship: 'Esposa'
    },
    medicalInfo: {
      conditions: ['Lesão no tornozelo', 'Instabilidade articular'],
      medications: ['Anti-inflamatório tópico'],
      allergies: [],
      surgeries: ['Reparo de ligamento (2023)'],
      familyHistory: 'Sem histórico relevante'
    },
    sessions: 4,
    progress: 25,
    status: 'active',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dra. Ana Fisio'
  },
  {
    name: 'Isabella Costa Martins',
    email: 'isabella.martins@email.com',
    phone: '(11) 96666-8901',
    cpf: '789.012.345-67',
    birthDate: '1995-06-18',
    address: {
      street: 'Rua Haddock Lobo',
      number: '789',
      complement: 'Apto 23',
      district: 'Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01414-001'
    },
    emergencyContact: {
      name: 'Maria Martins',
      phone: '(11) 95555-2345',
      relationship: 'Mãe'
    },
    medicalInfo: {
      conditions: ['Síndrome do túnel do carpo', 'LER/DORT'],
      medications: ['Vitamina B12'],
      allergies: ['Aspirina'],
      surgeries: [],
      familyHistory: 'Avó com artrite'
    },
    sessions: 10,
    progress: 80,
    status: 'active',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dr. Carlos Fisio'
  },
  {
    name: 'Eduardo Silva Nunes',
    email: 'eduardo.nunes@email.com',
    phone: '(11) 94444-9012',
    cpf: '890.123.456-78',
    birthDate: '1982-01-30',
    address: {
      street: 'Rua Estados Unidos',
      number: '1456',
      complement: 'Casa A',
      district: 'Jardim América',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01427-001'
    },
    emergencyContact: {
      name: 'Patricia Nunes',
      phone: '(11) 93333-3456',
      relationship: 'Esposa'
    },
    medicalInfo: {
      conditions: ['Dor ciática', 'Contratura muscular'],
      medications: ['Gabapentina', 'Relaxante muscular'],
      allergies: [],
      surgeries: [],
      familyHistory: 'Pai com hérnia de disco'
    },
    sessions: 18,
    progress: 95,
    status: 'discharged',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dra. Ana Fisio'
  },
  {
    name: 'Luciana Gomes Ribeiro',
    email: 'luciana.ribeiro@email.com',
    phone: '(11) 92222-0123',
    cpf: '901.234.567-89',
    birthDate: '1990-08-14',
    address: {
      street: 'Alameda Jaú',
      number: '654',
      complement: 'Apto 45',
      district: 'Jardim Paulista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01420-001'
    },
    emergencyContact: {
      name: 'Carlos Ribeiro',
      phone: '(11) 91111-4567',
      relationship: 'Pai'
    },
    medicalInfo: {
      conditions: ['Disfunção temporomandibular', 'Bruxismo'],
      medications: ['Placa oclusal noturna'],
      allergies: ['Sulfa'],
      surgeries: [],
      familyHistory: 'Mãe com TMJ'
    },
    sessions: 7,
    progress: 55,
    status: 'active',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dr. Carlos Fisio'
  },
  {
    name: 'Marcelo Almeida Santos',
    email: 'marcelo.santos@email.com',
    phone: '(11) 90000-1234',
    cpf: '012.345.678-90',
    birthDate: '1970-05-09',
    address: {
      street: 'Rua Pamplona',
      number: '987',
      complement: 'Sala 12',
      district: 'Jardim Paulista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01405-030'
    },
    emergencyContact: {
      name: 'Renata Santos',
      phone: '(11) 98888-5678',
      relationship: 'Esposa'
    },
    medicalInfo: {
      conditions: ['Fascite plantar', 'Esporão de calcâneo'],
      medications: ['Anti-inflamatório'],
      allergies: [],
      surgeries: [],
      familyHistory: 'Sem histórico relevante'
    },
    sessions: 2,
    progress: 15,
    status: 'inactive',
    tenantId: 'demo_tenant',
    assignedPhysiotherapist: 'Dra. Ana Fisio'
  }
];

// Função para criar agendamentos realistas baseados nos pacientes
const createDemoAppointments = (patients: Patient[]): Omit<Appointment, 'id' | 'createdAt'>[] => {
  const appointments: Omit<Appointment, 'id' | 'createdAt'>[] = [];
  const today = new Date();
  
  // Criar agendamentos para os próximos 30 dias
  for (let day = -7; day <= 30; day++) {
    const appointmentDate = new Date(today);
    appointmentDate.setDate(today.getDate() + day);
    
    // Pular fins de semana
    if (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
      continue;
    }
    
    // Criar 3-6 agendamentos por dia
    const appointmentsPerDay = Math.floor(Math.random() * 4) + 3;
    const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    
    for (let i = 0; i < appointmentsPerDay && i < timeSlots.length; i++) {
      const patient = patients[Math.floor(Math.random() * patients.length)];
      const timeSlot = timeSlots[i];
      
      const startTime = new Date(appointmentDate);
      const [hours, minutes] = timeSlot.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + (45 + Math.floor(Math.random() * 30))); // 45-75 min
      
      // Determinar status baseado na data
      let status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
      if (day < -1) {
        // Agendamentos passados - maioria completados
        status = Math.random() > 0.1 ? 'completed' : 'cancelled';
      } else if (day === -1 || day === 0) {
        // Ontem e hoje - mix de status
        const rand = Math.random();
        if (rand > 0.7) status = 'completed';
        else if (rand > 0.5) status = 'in-progress';
        else if (rand > 0.1) status = 'scheduled';
        else status = 'cancelled';
      } else {
        // Futuros - maioria agendados
        status = Math.random() > 0.05 ? 'scheduled' : 'cancelled';
      }
      
      const appointmentTypes = ['evaluation', 'treatment', 'reevaluation'];
      const type = appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)] as 'evaluation' | 'treatment' | 'reevaluation';
      
      // Notas específicas por tipo
      let notes = '';
      switch (type) {
        case 'evaluation':
          notes = `Avaliação inicial - ${patient.medicalInfo.conditions[0] || 'Consulta geral'}`;
          break;
        case 'treatment':
          notes = `Sessão ${Math.floor(Math.random() * 15) + 1} - ${patient.medicalInfo.conditions[0] || 'Tratamento'}`;
          break;
        case 'reevaluation':
          notes = `Reavaliação de progresso - ${patient.medicalInfo.conditions[0] || 'Acompanhamento'}`;
          break;
      }
      
      appointments.push({
        patientId: patient.id,
        physiotherapistId: patient.assignedPhysiotherapist === 'Dr. Carlos Fisio' ? 'physio_1' : 'physio_2',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type,
        status,
        notes,
        tenantId: 'demo_tenant'
      });
    }
  }
  
  return appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
};

// Função principal para popular o banco com dados de demonstração
export const seedDemoData = async (): Promise<void> => {
  try {
    console.log('🌱 Iniciando população de dados de demonstração...');
    
    // Criar pacientes de demonstração
    const patients: Patient[] = [];
    
    for (const patientData of DEMO_PATIENTS) {
      const patient: Patient = {
        ...patientData,
        id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await createPatient(patient);
      patients.push(patient);
      console.log(`✅ Paciente criado: ${patient.name}`);
    }
    
    // Criar agendamentos de demonstração
    const appointmentsData = createDemoAppointments(patients);
    
    for (const appointmentData of appointmentsData) {
      const appointment: Appointment = {
        ...appointmentData,
        id: `appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      
      await createAppointment(appointment);
    }
    
    console.log(`✅ ${appointmentsData.length} agendamentos criados`);
    console.log('🎉 População de dados concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao popular dados de demonstração:', error);
    throw error;
  }
};

// Função para verificar se já existem dados
export const hasDemoData = async (): Promise<boolean> => {
  try {
    const { getAllPatients } = await import('./database');
    const patients = await getAllPatients();
    return patients.length > 0;
  } catch (error) {
    console.error('Erro ao verificar dados existentes:', error);
    return false;
  }
};

// Dados estatísticos para dashboard
export const getDemoStats = () => ({
  totalPatients: DEMO_PATIENTS.length,
  activePatients: DEMO_PATIENTS.filter(p => p.status === 'active').length,
  avgSessions: Math.round(DEMO_PATIENTS.reduce((sum, p) => sum + p.sessions, 0) / DEMO_PATIENTS.length),
  avgProgress: Math.round(DEMO_PATIENTS.reduce((sum, p) => sum + p.progress, 0) / DEMO_PATIENTS.length),
  commonConditions: [
    'Lombalgia',
    'Tendinite',
    'Fibromialgia',
    'Artrose',
    'Hérnia de disco'
  ]
});