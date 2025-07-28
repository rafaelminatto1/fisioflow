import React from 'react';

import {
  IconBook,
  IconClipboardList,
  IconUsers,
  IconChartBar,
} from './components/icons/IconComponents';
import {
  User,
  UserRole,
  Task,
  Notebook,
  Patient,
  Appointment,
  TimeBlock,
  Exercise,
  Prescription,
  ExerciseLog,
  Assessment,
  Transaction,
  AuditLog,
  Tenant,
  Document,
  Chat,
  ChatMessage,
  ClinicalCase,
  CaseAttachment,
  CaseComment,
  CaseView,
  CaseRating,
  CaseFavorite,
  Course,
  StudentProgress,
  MentorshipSession,
  ClinicalProtocol,
  ProtocolPhase,
  ProtocolExercise,
  ProtocolEvidence,
  PatientProtocol,
  ProtocolCustomization,
  ProtocolProgressNote,
  ProtocolOutcome,
  ProtocolAnalytics,
  QualityIndicator,
  ProductivityMetric,
  Equipment,
  OperationalAlert,
  ExecutiveReport,
  KPIData,
} from './types';

export const INITIAL_TENANTS: Tenant[] = [
  { id: 't1', name: 'FisioPrime', plan: 'gold' },
];

export const INITIAL_USERS: Record<string, User> = {
  '1': {
    id: '1',
    name: 'Dr. Ana Costa',
    email: 'ana.costa@fisioflow.com',
    role: UserRole.ADMIN,
    avatarUrl: 'https://picsum.photos/seed/dra_ana/100/100',
    tenantId: 't1',
  },
  '2': {
    id: '2',
    name: 'Carlos Martins',
    email: 'carlos.martins@fisioflow.com',
    role: UserRole.FISIOTERAPEUTA,
    avatarUrl: 'https://picsum.photos/seed/carlos/100/100',
    tenantId: 't1',
  },
  '3': {
    id: '3',
    name: 'Beatriz Lima',
    email: 'beatriz.lima@fisioflow.com',
    role: UserRole.ESTAGIARIO,
    avatarUrl: 'https://picsum.photos/seed/beatriz/100/100',
    tenantId: 't1',
  },
  '4': {
    id: '4',
    name: 'José Silva (Paciente)',
    email: 'jose.paciente@email.com',
    role: UserRole.PACIENTE,
    avatarUrl: 'https://picsum.photos/seed/jose_silva/100/100',
    patientProfileId: 'p1',
    tenantId: 't1',
  },
  '5': {
    id: '5',
    name: 'Novo Admin',
    email: 'novo.admin@clinic.com',
    role: UserRole.ADMIN,
    avatarUrl: 'https://i.pravatar.cc/100?u=newadmin',
  },
};

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'José Silva',
    email: 'jsilva@email.com',
    phone: '(11) 98765-4321',
    avatarUrl: 'https://picsum.photos/seed/jose_silva/100/100',
    medicalHistory:
      'Histórico de hérnia de disco L4-L5. Apresenta dor irradiada para membro inferior esquerdo.',
    consent: { given: true, timestamp: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    tenantId: 't1',
  },
  {
    id: 'p2',
    name: 'Laura Mendes',
    email: 'lmendes@email.com',
    phone: '(21) 91234-5678',
    avatarUrl: 'https://picsum.photos/seed/laura_mendes/100/100',
    medicalHistory:
      'Pós-operatório de reconstrução de LCA no joelho direito, 4ª semana. Foco em ganho de ADM e ativação do quadríceps.',
    consent: { given: true, timestamp: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    tenantId: 't1',
  },
  {
    id: 'p3',
    name: 'Mariana Andrade',
    email: 'mandrade@email.com',
    phone: '(31) 95555-1212',
    avatarUrl: 'https://picsum.photos/seed/mariana_andrade/100/100',
    medicalHistory:
      'Diagnóstico de tendinite crônica no ombro esquerdo (supraespinhal). Limitação para atividades acima da cabeça.',
    consent: { given: true, timestamp: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    tenantId: 't1',
  },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Avaliação inicial do paciente J. Silva',
    status: 'todo',
    priority: 'high',
    assigneeId: '2',
    patientId: 'p1',
    tenantId: 't1',
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Desenvolver plano de tratamento para L. Mendes',
    status: 'todo',
    priority: 'medium',
    assigneeId: '2',
    patientId: 'p2',
    tenantId: 't1',
  },
  {
    id: 'task-3',
    projectId: 'proj-2',
    title: 'Pesquisar novas técnicas de reabilitação de joelho',
    status: 'in_progress',
    priority: 'medium',
    assigneeId: '3',
    tenantId: 't1',
  },
  {
    id: 'task-4',
    projectId: 'proj-2',
    title: 'Preparar material para sessão de mentoria',
    status: 'in_progress',
    priority: 'low',
    assigneeId: '2',
    tenantId: 't1',
  },
  {
    id: 'task-5',
    projectId: 'proj-1',
    title: 'Revisar progresso do paciente M. Andrade',
    status: 'review',
    priority: 'high',
    assigneeId: '2',
    patientId: 'p3',
    description:
      'Paciente relata melhora na mobilidade, mas ainda sente dor ao subir escadas. Executou 3 séries de 10 de agachamento com bola. Segue plano conforme prescrito.',
    tenantId: 't1',
  },
  {
    id: 'task-6',
    projectId: 'proj-3',
    title: 'Finalizar relatório de conformidade LGPD',
    status: 'done',
    priority: 'urgent',
    tenantId: 't1',
  },
  {
    id: 'task-7',
    projectId: 'proj-3',
    title: 'Calibrar equipamento de ultrassom',
    status: 'done',
    priority: 'low',
    tenantId: 't1',
  },
  {
    id: 'task-8',
    projectId: 'proj-1',
    title: 'Exercícios de fortalecimento para core',
    description: 'Realizar prancha frontal, 3 séries de 30 segundos.',
    status: 'in_progress',
    priority: 'medium',
    assigneeId: '2',
    patientId: 'p1',
    tenantId: 't1',
  },
  {
    id: 'task-9',
    projectId: 'proj-1',
    title: 'Exercícios de mobilidade de quadril',
    description:
      'Realizar rotação externa de quadril com faixa elástica, 3 séries de 15 repetições.',
    status: 'todo',
    priority: 'medium',
    assigneeId: '2',
    patientId: 'p1',
    tenantId: 't1',
  },
];

const today = new Date();
const getFutureDate = (dayOffset: number, hour: number, minute: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const getDateFromISO = (isoString: string) => {
  return isoString.split('T')[0];
};
const getPastDate = (
  dayOffset: number,
  hour: number = 12,
  minute: number = 0
) => {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-1',
    title: 'Sessão de Fisioterapia Ortopédica',
    patientId: 'p1',
    therapistId: '2',
    start: getFutureDate(1, 9, 0),
    end: getFutureDate(1, 9, 50),
    date: getDateFromISO(getFutureDate(1, 9, 0)),
    notes: 'Foco em exercícios para fortalecimento do core.',
    tenantId: 't1',
  },
  {
    id: 'appt-2',
    title: 'Consulta de Acompanhamento',
    patientId: 'p2',
    therapistId: '2',
    start: getFutureDate(1, 10, 0),
    end: getFutureDate(1, 10, 50),
    date: getDateFromISO(getFutureDate(1, 10, 0)),
    tenantId: 't1',
  },
  {
    id: 'appt-3',
    title: 'Avaliação Inicial',
    patientId: 'p3',
    therapistId: '1',
    start: getFutureDate(3, 14, 0),
    end: getFutureDate(3, 14, 50),
    date: getDateFromISO(getFutureDate(3, 14, 0)),
    notes: 'Avaliação do ombro esquerdo.',
    tenantId: 't1',
  },
  {
    id: 'appt-4',
    title: 'Sessão de Fisioterapia',
    patientId: 'p1',
    therapistId: '2',
    start: getFutureDate(8, 9, 0),
    end: getFutureDate(8, 9, 50),
    date: getDateFromISO(getFutureDate(8, 9, 0)),
    tenantId: 't1',
  },
];

export const INITIAL_TIMEBLOCKS: TimeBlock[] = [
  {
    id: 'tb-1',
    title: 'Almoço',
    therapistId: '2',
    start: getFutureDate(1, 12, 0),
    end: getFutureDate(1, 13, 0),
    type: 'lunch',
    description: 'Horário de almoço',
    tenantId: 't1',
  },
  {
    id: 'tb-2',
    title: 'Pausa para Café',
    therapistId: '2',
    start: getFutureDate(2, 15, 0),
    end: getFutureDate(2, 15, 30),
    type: 'break',
    description: 'Pausa para o café',
    tenantId: 't1',
  },
  {
    id: 'tb-3',
    title: 'Reunião Administrativa',
    therapistId: '2',
    start: getFutureDate(3, 16, 0),
    end: getFutureDate(3, 17, 0),
    type: 'unavailable',
    description: 'Reunião com equipe administrativa',
    tenantId: 't1',
  },
];

export const INITIAL_EXERCISES: Exercise[] = [
  {
    id: 'ex-1',
    name: 'Agachamento com Peso Corporal',
    description:
      'Fique em pé com os pés na largura dos ombros. Abaixe os quadris como se fosse sentar em uma cadeira, mantendo o peito erguido e as costas retas. Volte à posição inicial.',
    category: 'Fortalecimento',
    bodyPart: 'Joelho',
    videoUrl: 'https://www.youtube.com/embed/bql6sIU2A7k',
  },
  {
    id: 'ex-2',
    name: 'Prancha Frontal',
    description:
      'Apoie-se nos antebraços e nos dedos dos pés, mantendo o corpo reto da cabeça aos calcanhares. Contrai o abdômen e os glúteos. Mantenha a posição.',
    category: 'Fortalecimento',
    bodyPart: 'Coluna',
    videoUrl: 'https://www.youtube.com/embed/B296mZDhrP4',
  },
  {
    id: 'ex-3',
    name: 'Ponte de Glúteos',
    description:
      'Deite-se de costas com os joelhos dobrados e os pés apoiados no chão. Eleve os quadris em direção ao teto, contraindo os glúteos. Abaixe lentamente.',
    category: 'Fortalecimento',
    bodyPart: 'Quadril',
    videoUrl: 'https://www.youtube.com/embed/N6jDVOi2y1c',
  },
  {
    id: 'ex-4',
    name: 'Alongamento Gato-Camelo',
    description:
      'Fique de quatro. Inspire enquanto arqueia as costas para baixo (camelo). Expire enquanto arredonda as costas para cima (gato). Movimente-se lentamente entre as posições.',
    category: 'Mobilidade',
    bodyPart: 'Coluna',
    videoUrl: 'https://www.youtube.com/embed/K9bK0BwKFjs',
  },
  {
    id: 'ex-5',
    name: 'Elevação de Panturrilha',
    description:
      'Fique em pé e eleve os calcanhares o mais alto que puder, transferindo o peso para a ponta dos pés. Controle a descida.',
    category: 'Fortalecimento',
    bodyPart: 'Tornozelo',
    videoUrl: 'https://www.youtube.com/embed/wm_2_n4_I2E',
  },
  {
    id: 'ex-6',
    name: 'Rotação Externa de Ombro com Faixa',
    description:
      'Segure uma faixa elástica com as duas mãos, cotovelos junto ao corpo a 90 graus. Gire os antebraços para fora, mantendo os cotovelos parados. Retorne lentamente.',
    category: 'Fortalecimento',
    bodyPart: 'Ombro',
    videoUrl: 'https://www.youtube.com/embed/u_2w2_U6G2A',
  },
];

export const INITIAL_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'presc-1',
    patientId: 'p1',
    exerciseId: 'ex-2',
    sets: 3,
    reps: 1,
    frequency: 'Manter por 30s, 3x ao dia',
    notes: 'Manter a contração abdominal.',
    tenantId: 't1',
  },
  {
    id: 'presc-2',
    patientId: 'p1',
    exerciseId: 'ex-4',
    sets: 2,
    reps: 15,
    frequency: '1x ao dia',
    tenantId: 't1',
  },
  {
    id: 'presc-3',
    patientId: 'p2',
    exerciseId: 'ex-1',
    sets: 3,
    reps: 12,
    frequency: '3x por semana',
    notes: 'Focar na amplitude do movimento sem dor.',
    tenantId: 't1',
  },
  {
    id: 'presc-4',
    patientId: 'p2',
    exerciseId: 'ex-3',
    sets: 3,
    reps: 15,
    frequency: '3x por semana',
    tenantId: 't1',
  },
];

export const INITIAL_EXERCISE_LOGS: ExerciseLog[] = [
  {
    id: 'log-1',
    prescriptionId: 'presc-1',
    patientId: 'p1',
    date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    painLevel: 3,
    difficultyLevel: 4,
    notes: 'Consegui manter a posição pelo tempo determinado.',
    tenantId: 't1',
  },
  {
    id: 'log-2',
    prescriptionId: 'presc-1',
    patientId: 'p1',
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    painLevel: 2,
    difficultyLevel: 3,
    notes: 'Senti menos desconforto na lombar hoje.',
    tenantId: 't1',
  },
  {
    id: 'log-3',
    prescriptionId: 'presc-3',
    patientId: 'p2',
    date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    painLevel: 6,
    difficultyLevel: 7,
    notes: 'Joelho estalou um pouco, mas sem dor aguda.',
    tenantId: 't1',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'trans-1',
    patientId: 'p1',
    description: 'Pacote 10 Sessões Fisioterapia',
    amount: 1200,
    status: 'pago',
    type: 'receita',
    date: getPastDate(18),
    dueDate: getPastDate(20),
    paidDate: getPastDate(18),
    tenantId: 't1',
  },
  {
    id: 'trans-2',
    patientId: 'p2',
    description: 'Avaliação Inicial',
    amount: 150,
    status: 'pago',
    type: 'receita',
    date: getPastDate(30),
    dueDate: getPastDate(30),
    paidDate: getPastDate(30),
    tenantId: 't1',
  },
  {
    id: 'trans-3',
    patientId: 'p3',
    description: 'Sessão Avulsa',
    amount: 130,
    status: 'pendente',
    type: 'receita',
    date: getFutureDate(10, 0, 0),
    dueDate: getFutureDate(10, 0, 0),
    tenantId: 't1',
  },
  {
    id: 'trans-4',
    patientId: 'p1',
    description: 'Sessão de Acupuntura',
    amount: 90,
    status: 'pendente',
    dueDate: getPastDate(5),
    tenantId: 't1',
  },
  {
    id: 'trans-5',
    patientId: 'p2',
    description: 'Pacote 5 Sessões Pilates',
    amount: 550,
    status: 'pendente',
    dueDate: getFutureDate(15, 0, 0),
    tenantId: 't1',
  },
];

export const INITIAL_ASSESSMENTS: Assessment[] = [
  {
    id: 'assess-1',
    patientId: 'p1',
    therapistId: '2',
    date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    mainComplaint: 'Dor na região lombar que irradia para a perna esquerda.',
    history:
      'Paciente relata início da dor há 3 meses após levantar peso de forma inadequada. A dor piora ao ficar sentado por longos períodos.',
    painLevel: 7,
    posturalAnalysis: 'Hiperlordose lombar, ombros protusos.',
    rangeOfMotion: [
      {
        id: 'rom-1',
        joint: 'Coluna Lombar',
        movement: 'Flexão',
        active: '40° (limitado por dor)',
        passive: '50°',
      },
      {
        id: 'rom-2',
        joint: 'Coluna Lombar',
        movement: 'Extensão',
        active: '15° (doloroso)',
        passive: '20°',
      },
    ],
    muscleStrength: [
      { id: 'ms-1', muscle: 'Extensores da Coluna', grade: '4' },
      { id: 'ms-2', muscle: 'Glúteo Máximo (E)', grade: '4' },
    ],
    functionalTests: [
      {
        id: 'ft-1',
        testName: 'Teste de Lasègue (SLR)',
        result: 'Positivo a 45° à esquerda.',
      },
    ],
    diagnosticHypothesis:
      'Lombociatalgia de origem discal (provável hérnia L4-L5).',
    treatmentPlan:
      'Foco em centralização da dor com método McKenzie, fortalecimento do core e glúteos, e educação postural.',
    tenantId: 't1',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    patientId: 'p1',
    fileName: 'ressonancia_lombar.pdf',
    fileType: 'application/pdf',
    fileSize: 1234567,
    uploadDate: getPastDate(15),
    uploadedById: '1',
    tenantId: 't1',
  },
  {
    id: 'doc-2',
    patientId: 'p1',
    fileName: 'raio_x_coluna.jpg',
    fileType: 'image/jpeg',
    fileSize: 876543,
    uploadDate: getPastDate(14),
    uploadedById: '2',
    tenantId: 't1',
  },
];

export const INITIAL_CHATS: Chat[] = [
  {
    id: '1-2',
    participants: ['1', '2'],
    lastMessageTimestamp: getPastDate(1, 10, 30),
    tenantId: 't1',
  },
  {
    id: '1-3',
    participants: ['1', '3'],
    lastMessageTimestamp: getPastDate(2, 14, 0),
    tenantId: 't1',
  },
  {
    id: '2-p2',
    participants: ['2', '4'],
    lastMessageTimestamp: getPastDate(0, 9, 15),
    tenantId: 't1',
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    chatId: '1-2',
    senderId: '1',
    text: 'Carlos, por favor, verifique o plano de tratamento do novo paciente, José Silva.',
    timestamp: getPastDate(1, 10, 25),
    tenantId: 't1',
  },
  {
    id: 'msg-2',
    chatId: '1-2',
    senderId: '2',
    text: 'Verificado, Dra. Ana. A avaliação inicial está agendada para amanhã.',
    timestamp: getPastDate(1, 10, 30),
    tenantId: 't1',
  },
  {
    id: 'msg-3',
    chatId: '1-3',
    senderId: '1',
    text: 'Beatriz, como está a pesquisa sobre as novas técnicas de reabilitação de joelho?',
    timestamp: getPastDate(2, 14, 0),
    tenantId: 't1',
  },
  {
    id: 'msg-4',
    chatId: '2-p2',
    senderId: '2',
    text: 'Olá Laura, como você está se sentindo após a última sessão?',
    timestamp: getPastDate(0, 9, 15),
    tenantId: 't1',
  },
];

export const NOTEBOOKS: Notebook[] = [
  {
    id: 'nb-1',
    title: 'Protocolos Clínicos',
    icon: <IconBook />,
    pages: [
      {
        id: 'p-1',
        title: 'Reabilitação Pós-Cirúrgica',
        content:
          '## Protocolo de Reabilitação Pós-Cirúrgica de LCA\n\n**Fase 1 (0-2 semanas):**\n- **Objetivos:** Controle da dor e edema, ADM de 0-90°, ativação do quadríceps.\n- **Exercícios:** Gelo, elevação, bomba de tornozelo, contrações isométricas do quadríceps, flexão passiva do joelho.',
      },
      {
        id: 'p-2',
        title: 'Fisioterapia Neurológica',
        content:
          '## Protocolo para Pacientes Pós-AVC\n\n**Fase Aguda:**\n- **Objetivos:** Prevenção de complicações, manutenção da ADM, mobilização precoce.\n- **Intervenções:** Posicionamento adequado no leito, mobilização passiva, exercícios respiratórios.',
      },
      {
        id: 'p-3',
        title: 'Fisioterapia Ortopédica',
        content:
          '## Tratamento para Hérnia de Disco Lombar\n\n**Fase Aguda:**\n- **Objetivos:** Alívio da dor, centralização dos sintomas.\n- **Exercícios:** Extensão lombar (McKenzie), exercícios de estabilização do core, educação postural.',
      },
    ],
    tenantId: 't1',
  },
  {
    id: 'nb-2',
    title: 'Projetos Ativos',
    icon: <IconClipboardList />,
    pages: [
      {
        id: 'p-4',
        title: 'Pesquisa sobre Eletroterapia',
        content:
          '### Andamento da Pesquisa\n\n- Revisão bibliográfica concluída.\n- Pendente: análise de artigos sobre TENS vs FES.',
      },
      {
        id: 'p-5',
        title: 'Caso Clínico: Sra. Helena',
        content:
          'Paciente com 72 anos, diagnóstico de osteoartrite severa no joelho. Apresenta dificuldade de deambulação e dor noturna.',
      },
    ],
    tenantId: 't1',
  },
  {
    id: 'nb-3',
    title: 'Mentoria e Ensino',
    icon: <IconUsers />,
    pages: [
      { id: 'p-6', title: 'Plano de Estágio 2024' },
      { id: 'p-7', title: 'Avaliações de Progresso' },
    ],
    tenantId: 't1',
  },
  {
    id: 'nb-4',
    title: 'Gestão Operacional',
    icon: <IconChartBar />,
    pages: [{ id: 'p-8', title: 'Métricas de Qualidade' }],
    tenantId: 't1',
  },
];

export const TASK_STATUSES = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Revisão',
  done: 'Concluído',
};

export const TASK_STATUS_COLORS = {
  todo: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  review: 'bg-amber-500',
  done: 'bg-emerald-500',
};

export const TASK_PRIORITY_STYLES: Record<
  string,
  { icon: string; color: string }
> = {
  low: { icon: '↓', color: 'text-gray-400' },
  medium: { icon: '=', color: 'text-blue-400' },
  high: { icon: '↑', color: 'text-amber-400' },
  urgent: { icon: '!!', color: 'text-red-500' },
};

export const INITIAL_COURSES: Course[] = [];

export const INITIAL_STUDENT_PROGRESS: StudentProgress[] = [];

export const INITIAL_MENTORSHIP_SESSIONS: MentorshipSession[] = [];

export const INITIAL_CLINICAL_CASES: ClinicalCase[] = [
  {
    id: 'case-1',
    title: 'Lesão de LCA com Reabilitação Pós-Cirúrgica',
    specialty: 'Ortopedia',
    pathology: 'Ruptura de Ligamento Cruzado Anterior',
    tags: ['LCA', 'Pós-cirúrgico', 'Joelho', 'Reabilitação'],
    difficulty: 'Intermediário',
    anonymizedPatientData: {
      age: 28,
      gender: 'M',
      occupation: 'Jogador de Futebol',
      relevantHistory:
        'Atleta profissional, lesão durante partida. Sem histórico de lesões prévias no joelho.',
    },
    clinicalHistory:
      'Paciente masculino, 28 anos, jogador de futebol profissional, apresentou ruptura completa do LCA durante partida. Realizou cirurgia reconstrutiva com enxerto do tendão patelar há 6 semanas. Refere dor leve (3/10) e limitação na flexão do joelho. Apresenta edema residual e receio de movimentar o joelho.',
    examinations: [
      {
        id: 'exam-1',
        type: 'Imagem',
        name: 'Ressonância Magnética Pós-Operatória',
        findings:
          'Enxerto bem posicionado, sem sinais de complicações. Discreto edema periarticular.',
        date: '2024-01-15',
        attachments: [],
      },
    ],
    treatment: {
      objectives: [
        'Reduzir edema e dor',
        'Recuperar amplitude de movimento',
        'Fortalecer musculatura do quadríceps',
        'Retornar às atividades esportivas',
      ],
      interventions: [
        {
          id: 'int-1',
          type: 'Cinesioterapia',
          description: 'Exercícios de mobilização passiva e ativa-assistida',
          parameters: '3x15 repetições, 2x ao dia',
          progression: 'Aumentar amplitude gradualmente',
        },
      ],
      duration: '16 semanas',
      frequency: '3x por semana',
      precautions: [
        'Evitar rotação externa forçada',
        'Não correr até 12ª semana',
      ],
    },
    evolution: [
      {
        id: 'evo-1',
        date: '2024-01-22',
        sessionNumber: 1,
        findings: 'Flexão ativa limitada a 90°, extensão completa',
        progress: 'Boa colaboração do paciente, sem dor durante exercícios',
        modifications: 'Adicionado fortalecimento isométrico',
        nextSteps: 'Continuar mobilização, iniciar propriocepção',
      },
    ],
    attachments: [],
    discussionQuestions: [
      'Qual a importância da propriocepção na reabilitação do LCA?',
      'Como determinar o momento ideal para retorno ao esporte?',
      'Quais fatores podem influenciar o prognóstico?',
    ],
    learningObjectives: [
      'Compreender as fases da reabilitação pós-cirúrgica do LCA',
      'Identificar sinais de complicações pós-operatórias',
      'Aplicar progressão adequada de exercícios',
    ],
    createdById: '2',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    isPublished: true,
    viewCount: 45,
    rating: 4.5,
    ratingCount: 8,
    tenantId: 't1',
  },
  {
    id: 'case-2',
    title: 'Hérnia de Disco L4-L5 com Dor Radicular',
    specialty: 'Neurologia',
    pathology: 'Hérnia de Disco Lombar',
    tags: ['Coluna', 'Dor radicular', 'L4-L5', 'Conservador'],
    difficulty: 'Iniciante',
    anonymizedPatientData: {
      age: 45,
      gender: 'F',
      occupation: 'Secretária',
      relevantHistory: 'Trabalha 8h/dia sentada. Sedentária. IMC 28.',
    },
    clinicalHistory:
      'Paciente feminina, 45 anos, apresenta dor lombar há 3 meses com irradiação para MI esquerdo. Dor piora ao sentar e tossir. Nega alterações sensitivas ou motoras. Limitação funcional importante para AVDs.',
    examinations: [
      {
        id: 'exam-2',
        type: 'Imagem',
        name: 'Ressonância Magnética de Coluna Lombar',
        findings:
          'Protrusão discal póstero-lateral L4-L5 à esquerda com contato radicular',
        date: '2024-01-10',
        attachments: [],
      },
    ],
    treatment: {
      objectives: [
        'Reduzir dor e inflamação',
        'Melhorar flexibilidade da coluna',
        'Fortalecer musculatura estabilizadora',
        'Educar sobre ergonomia',
      ],
      interventions: [
        {
          id: 'int-2',
          type: 'Terapia Manual',
          description: 'Mobilização vertebral grau I-II',
          parameters: '3-5 repetições por nível',
          progression: 'Aumentar grau conforme tolerância',
        },
      ],
      duration: '8 semanas',
      frequency: '2x por semana',
      precautions: [
        'Evitar flexão anterior de tronco',
        'Não permanecer sentada por >30min',
      ],
    },
    evolution: [],
    attachments: [],
    discussionQuestions: [
      'Quando indicar tratamento cirúrgico vs conservador?',
      'Como diferenciar dor radicular de dor referida?',
    ],
    learningObjectives: [
      'Reconhecer sinais clínicos de herniação discal',
      'Aplicar princípios de educação do paciente',
    ],
    createdById: '1',
    createdAt: '2024-01-18T14:30:00Z',
    updatedAt: '2024-01-18T14:30:00Z',
    isPublished: true,
    viewCount: 32,
    rating: 4.2,
    ratingCount: 5,
    tenantId: 't1',
  },
];

export const INITIAL_CASE_ATTACHMENTS: CaseAttachment[] = [];

export const INITIAL_CASE_COMMENTS: CaseComment[] = [
  {
    id: 'comment-1',
    caseId: 'case-1',
    authorId: '3',
    authorName: 'Beatriz Lima',
    content:
      'Excelente caso! Gostaria de saber mais sobre os critérios específicos para progressão dos exercícios proprioceptivos.',
    createdAt: '2024-01-21T09:30:00Z',
    likes: 3,
    likedBy: ['1', '2', '4'],
    tenantId: 't1',
  },
  {
    id: 'comment-2',
    caseId: 'case-1',
    authorId: '2',
    authorName: 'Carlos Martins',
    content:
      'A progressão deve ser baseada na ausência de dor, estabilidade articular e qualidade do movimento. Geralmente iniciamos com apoio unipodal aos 3 meses.',
    parentCommentId: 'comment-1',
    createdAt: '2024-01-21T10:15:00Z',
    likes: 2,
    likedBy: ['1', '3'],
    tenantId: 't1',
  },
];

export const INITIAL_CASE_VIEWS: CaseView[] = [];

export const INITIAL_CASE_RATINGS: CaseRating[] = [
  {
    id: 'rating-1',
    caseId: 'case-1',
    userId: '1',
    rating: 5,
    review: 'Caso muito bem estruturado, excelente para ensino!',
    createdAt: '2024-01-21T08:00:00Z',
    tenantId: 't1',
  },
  {
    id: 'rating-2',
    caseId: 'case-1',
    userId: '3',
    rating: 4,
    createdAt: '2024-01-21T11:00:00Z',
    tenantId: 't1',
  },
];

export const INITIAL_CASE_FAVORITES: CaseFavorite[] = [
  {
    id: 'fav-1',
    caseId: 'case-1',
    userId: '3',
    createdAt: '2024-01-21T09:00:00Z',
    tenantId: 't1',
  },
];

// Clinical Protocols System Data
export const INITIAL_CLINICAL_PROTOCOLS: ClinicalProtocol[] = [
  {
    id: 'prot-1',
    name: 'Reabilitação Pós-Cirúrgica de LCA',
    description:
      'Protocolo baseado em evidências para reabilitação após reconstrução de ligamento cruzado anterior',
    specialty: 'Ortopedia',
    category: 'Pós-Cirúrgico',
    indication:
      'Pacientes submetidos à reconstrução de LCA com enxerto autólogo ou heterólogo',
    inclusionCriteria: [
      'Reconstrução primária de LCA',
      'Idade entre 16-45 anos',
      'Motivação para retorno ao esporte',
      'Ausência de lesões associadas graves',
    ],
    exclusionCriteria: [
      'Infecção ativa',
      'Lesões ligamentares múltiplas',
      'Artrose avançada',
      'Comorbidades que impeçam a reabilitação',
    ],
    expectedDuration: '24 semanas',
    phases: [],
    evidences: [],
    expectedOutcomes: [
      'Retorno à função normal do joelho',
      'Força muscular ≥90% do membro contralateral',
      'Estabilidade articular restaurada',
      'Retorno às atividades esportivas',
    ],
    contraindications: [
      'Dor intensa persistente',
      'Sinais de infecção',
      'Instabilidade severa',
    ],
    precautions: [
      'Evitar rotação externa forçada nas primeiras 6 semanas',
      'Progressão gradual da carga',
      'Monitoramento constante do edema',
    ],
    createdById: '1',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    isActive: true,
    version: '2.1',
    tenantId: 't1',
  },
  {
    id: 'prot-2',
    name: 'Protocolo de Hérnia de Disco Lombar',
    description:
      'Tratamento conservador para hérnias discais lombares L4-L5 e L5-S1',
    specialty: 'Ortopedia',
    category: 'Conservador',
    indication: 'Hérnias discais lombares com comprometimento radicular',
    inclusionCriteria: [
      'Hérnia discal confirmada por RM',
      'Sintomas radiculares presentes',
      'Falha do tratamento medicamentoso inicial',
      'Ausência de déficit neurológico motor',
    ],
    exclusionCriteria: [
      'Síndrome da cauda equina',
      'Déficit motor progressivo',
      'Indicação cirúrgica urgente',
      'Instabilidade segmentar',
    ],
    expectedDuration: '12 semanas',
    phases: [],
    evidences: [],
    expectedOutcomes: [
      'Redução da dor radicular',
      'Melhora da capacidade funcional',
      'Retorno às atividades de vida diária',
      'Prevenção de recidivas',
    ],
    contraindications: [
      'Aumento dos sintomas neurológicos',
      'Dor irradiada progressiva',
    ],
    precautions: [
      'Evitar flexão de tronco',
      'Carga axial controlada',
      'Posicionamento adequado',
    ],
    createdById: '2',
    createdAt: '2024-01-01T11:00:00Z',
    updatedAt: '2024-01-01T11:00:00Z',
    isActive: true,
    version: '1.5',
    tenantId: 't1',
  },
  {
    id: 'prot-3',
    name: 'Reabilitação Neurológica Pós-AVC',
    description:
      'Protocolo de fisioterapia motora para pacientes em fase subaguda pós-AVC',
    specialty: 'Neurologia',
    category: 'Conservador',
    indication:
      'Pacientes com sequelas motoras de AVC isquêmico ou hemorrágico',
    inclusionCriteria: [
      'AVC confirmado (>2 semanas e <6 meses)',
      'Estabilidade clínica',
      'Capacidade de participar ativamente',
      'Cognição preservada ou levemente comprometida',
    ],
    exclusionCriteria: [
      'Instabilidade hemodinâmica',
      'Comprometimento cognitivo severo',
      'Comorbidades descompensadas',
      'Contraindicações cardiológicas',
    ],
    expectedDuration: '16 semanas',
    phases: [],
    evidences: [],
    expectedOutcomes: [
      'Melhora da função motora',
      'Aumento da independência funcional',
      'Prevenção de complicações secundárias',
      'Melhor qualidade de vida',
    ],
    contraindications: [
      'Alterações da pressão arterial',
      'Sinais de fadiga excessiva',
    ],
    precautions: [
      'Monitoramento dos sinais vitais',
      'Progressão gradual da intensidade',
      'Atenção aos riscos de queda',
    ],
    createdById: '1',
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    isActive: true,
    version: '1.8',
    tenantId: 't1',
  },
  // ===== ORTOPEDIA - PROTOCOLOS ADICIONAIS =====
  {
    id: 'prot-4',
    name: 'Síndrome do Impacto do Ombro',
    description:
      'Protocolo conservador para tratamento da síndrome do impacto subacromial',
    specialty: 'Ortopedia',
    category: 'Conservador',
    indication:
      'Pacientes com síndrome do impacto subacromial primário ou secundário',
    inclusionCriteria: [
      'Diagnóstico clínico confirmado de impacto subacromial',
      'Teste de Neer e Hawkins positivos',
      'Falha no tratamento medicamentoso inicial',
      'Ausência de ruptura completa do manguito rotador',
    ],
    exclusionCriteria: [
      'Ruptura completa do manguito rotador',
      'Capsulite adesiva severa',
      'Artrose glenoumeral avançada',
      'Instabilidade glenoumeral',
    ],
    expectedDuration: '12 semanas',
    phases: [],
    evidences: [],
    expectedOutcomes: [
      'Redução da dor em 70-80%',
      'Melhora da amplitude de movimento',
      'Fortalecimento do manguito rotador',
      'Retorno às atividades funcionais',
    ],
    contraindications: [
      'Dor severa em repouso',
      'Inflamação aguda severa',
      'Sinais neurológicos',
    ],
    precautions: [
      'Evitar movimentos acima de 90° nas primeiras semanas',
      'Progressão gradual dos exercícios',
      'Monitorar sinais de irritação',
    ],
    createdById: '1',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    isActive: true,
    version: '1.3',
    tenantId: 't1',
  },
  {
    id: 'prot-5',
    name: 'Epicondilite Lateral (Cotovelo de Tenista)',
    description:
      'Protocolo baseado em evidências para tratamento da epicondilite lateral',
    specialty: 'Ortopedia',
    category: 'Conservador',
    indication: 'Pacientes com epicondilite lateral crônica ou subaguda',
    inclusionCriteria: [
      'Dor lateral no cotovelo há mais de 6 semanas',
      'Teste de Cozen positivo',
      'Falha no tratamento conservador inicial',
      'Limitação funcional significativa',
    ],
    exclusionCriteria: [
      'Neuropatia do nervo interósseo posterior',
      'Artrite do cotovelo',
      'Instabilidade ligamentar',
      'Lesões associadas do punho',
    ],
    expectedDuration: '8 semanas',
    phases: [],
    evidences: [],
    expectedOutcomes: [
      'Redução da dor em 80%',
      'Melhora da força de preensão',
      'Retorno às atividades laborais',
      'Prevenção de recidivas',
    ],
    contraindications: [
      'Dor intensa ao toque',
      'Sinais inflamatórios agudos',
      'Parestesias',
    ],
    precautions: [
      'Evitar exercícios excêntricos nas primeiras semanas',
      'Uso de contraforca quando necessário',
      'Progressão gradual da resistência',
    ],
    createdById: '2',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    isActive: true,
    version: '1.1',
    tenantId: 't1',
  },
  {
    id: 'prot-6',
    name: 'Artrose de Joelho - Tratamento Conservador',
    description: 'Protocolo multimodal para artrose de joelho graus I-III',
    specialty: 'Ortopedia',
    category: 'Conservador',
    indication: 'Pacientes com artrose de joelho sintomática graus I-III',
    inclusionCriteria: [
      'Artrose radiológica graus I-III (Kellgren-Lawrence)',
      'Dor persistente há mais de 3 meses',
      'Limitação funcional',
      'Idade acima de 45 anos',
    ],
    exclusionCriteria: [
      'Artrose grau IV com indicação cirúrgica',
      'Infecção articular',
      'Fraturas recentes',
      'Doenças reumatológicas ativas',
    ],
    expectedDuration: '16 semanas',
    phases: [],
    evidences: [],
    expectedOutcomes: [
      'Redução da dor em 60-70%',
      'Melhora da função articular',
      'Fortalecimento do quadríceps',
      'Retardo da progressão da doença',
    ],
    contraindications: [
      'Derrame articular severo',
      'Instabilidade ligamentar severa',
      'Deformidades angulares extremas',
    ],
    precautions: [
      'Evitar exercícios de alto impacto',
      'Monitorar sinais inflamatórios',
      'Progressão respeitando a dor',
    ],
    createdById: '1',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    isActive: true,
    version: '2.0',
    tenantId: 't1',
  },
  {
    id: 'prot-7',
    name: 'Fascite Plantar - Protocolo Completo',
    description: 'Tratamento conservador multimodal para fascite plantar',
    specialty: 'Ortopedia',
    category: 'Conservador',
    indication: 'Pacientes com fascite plantar crônica recalcitrante',
    inclusionCriteria: [
      'Dor plantar há mais de 6 semanas',
      'Dor matinal característica',
      'Diagnóstico por ultrassom confirmado',
      'Falha no tratamento conservador inicial',
    ],
    exclusionCriteria: [
      'Síndrome do túnel do tarso',
      'Fraturas por estresse do calcâneo',
      'Artrite reumatóide',
      'Neuropatias periféricas',
    ],
    expectedDuration: '10 semanas',
    phases: [],
    evidences: [],
    expectedOutcomes: [
      'Redução da dor matinal em 80%',
      'Melhora da função do pé',
      'Aumento da flexibilidade da panturrilha',
      'Prevenção de recidivas',
    ],
    contraindications: [
      'Úlceras plantares',
      'Infecções locais',
      'Rupturas da fáscia plantar',
    ],
    precautions: [
      'Evitar exercícios em superfícies duras',
      'Uso de calçados adequados',
      'Progressão gradual dos alongamentos',
    ],
    createdById: '2',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    isActive: true,
    version: '1.4',
    tenantId: 't1',
  },
  // ===== NEUROLOGIA - PROTOCOLOS COMPLETOS =====
  {
    id: 'prot-8',
    name: 'Doença de Parkinson - Reabilitação Motora',
    description:
      'Protocolo de fisioterapia motora para pacientes com Doença de Parkinson',
    specialty: 'Neurologia',
    category: 'Conservador',
    indication:
      'Pacientes com Doença de Parkinson idiopática estágios I-III (Hoehn-Yahr)',
    inclusionCriteria: [
      'Diagnóstico confirmado de Doença de Parkinson',
      'Estágios I-III na escala de Hoehn-Yahr',
      'Capacidade de deambulação independente',
      'Estabilidade medicamentosa',
    ],
    exclusionCriteria: [
      'Parkinsonismo atípico',
      'Demência severa',
      'Instabilidade postural severa',
      'Comorbidades cardiopulmonares limitantes',
    ],
    expectedDuration: '20 semanas',
    phases: [],
    evidences: [],
    expectedOutcomes: [
      'Melhora do equilíbrio e coordenação',
      'Redução do risco de quedas',
      'Melhora da qualidade da marcha',
      'Manutenção da independência funcional',
    ],
    contraindications: [
      'Discinesias severas',
      'Episódios de freezing frequentes',
      'Hipotensão ortostática severa',
    ],
    precautions: [
      'Monitorar flutuações motoras',
      'Adaptar horários aos picos medicamentosos',
      'Progressão respeitando limitações individuais',
    ],
    createdById: '1',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    isActive: true,
    version: '1.5',
    tenantId: 't1',
  },
];

export const INITIAL_PROTOCOL_PHASES: ProtocolPhase[] = [
  // LCA Protocol Phases
  {
    id: 'phase-1',
    protocolId: 'prot-1',
    name: 'Fase I - Proteção e Mobilização Precoce',
    description:
      'Foco na proteção do enxerto, controle da dor e edema, e mobilização precoce',
    phase: 'Aguda',
    order: 1,
    duration: '0-2 semanas',
    objectives: [
      'Controlar dor e edema',
      'Proteger o enxerto cirúrgico',
      'Restaurar extensão completa',
      'Ativar quadríceps',
    ],
    exercises: [],
    progressionCriteria: [
      'Edema controlado',
      'Extensão completa passiva',
      'Flexão ativa de 90°',
      'Marcha com carga parcial',
    ],
    precautions: [
      'Evitar flexão >90°',
      'Não remover imobilização',
      'Carga protegida',
    ],
    frequency: '2x ao dia',
    tenantId: 't1',
  },
  {
    id: 'phase-2',
    protocolId: 'prot-1',
    name: 'Fase II - Mobilidade e Força Inicial',
    description:
      'Progressão da amplitude de movimento e início do fortalecimento',
    phase: 'Subaguda',
    order: 2,
    duration: '3-6 semanas',
    objectives: [
      'Ganhar flexão completa',
      'Fortalecer quadríceps',
      'Melhorar propriocepção',
      'Normalizar marcha',
    ],
    exercises: [],
    progressionCriteria: [
      'Flexão de 120°',
      'Força 4/5 do quadríceps',
      'Marcha normal',
      'Ausência de derrame',
    ],
    precautions: ['Evitar pivoteamento', 'Progressão gradual da carga'],
    frequency: '3x por semana',
    tenantId: 't1',
  },
  // Lombar Protocol Phases
  {
    id: 'phase-3',
    protocolId: 'prot-2',
    name: 'Fase I - Alívio da Dor',
    description: 'Controle da dor aguda e inflamação',
    phase: 'Aguda',
    order: 1,
    duration: '0-2 semanas',
    objectives: [
      'Reduzir dor e inflamação',
      'Melhorar mobilidade básica',
      'Educar sobre postura',
      'Prevenir cronificação',
    ],
    exercises: [],
    progressionCriteria: [
      'Redução da dor >50%',
      'Melhora da mobilidade',
      'Capacidade de caminhar',
      'Ausência de sinais neurológicos',
    ],
    precautions: ['Evitar flexão de tronco', 'Não forçar movimentos dolorosos'],
    frequency: 'Diário',
    tenantId: 't1',
  },
  // Neurological Protocol Phases
  {
    id: 'phase-4',
    protocolId: 'prot-3',
    name: 'Fase I - Estabilização e Mobilização',
    description: 'Estabilização clínica e início da mobilização',
    phase: 'Aguda',
    order: 1,
    duration: '0-4 semanas',
    objectives: [
      'Prevenir complicações',
      'Iniciar mobilização',
      'Estimular neuroplasticidade',
      'Manter amplitude articular',
    ],
    exercises: [],
    progressionCriteria: [
      'Estabilidade postural em sedestação',
      'Controle de tronco básico',
      'Ausência de complicações',
      'Tolerância a 30min de atividade',
    ],
    precautions: [
      'Monitorar pressão arterial',
      'Prevenir quedas',
      'Atenção à fadiga',
    ],
    frequency: '2x ao dia',
    tenantId: 't1',
  },
];

export const INITIAL_PROTOCOL_EXERCISES: ProtocolExercise[] = [
  // LCA Phase I Exercises
  {
    id: 'pex-1',
    phaseId: 'phase-1',
    exerciseId: 'ex-1', // Reference to existing exercise
    sets: 3,
    reps: '10',
    intensity: 'Leve',
    progression: 'Aumentar repetições conforme tolerância',
    modifications: ['Apoio nas mãos se necessário', 'Reduzir amplitude se dor'],
    order: 1,
    tenantId: 't1',
  },
  {
    id: 'pex-2',
    phaseId: 'phase-1',
    exerciseId: 'ex-2',
    sets: 2,
    reps: '30 segundos',
    intensity: 'Leve',
    progression: 'Aumentar tempo de sustentação',
    modifications: ['Usar almofadas para suporte'],
    order: 2,
    tenantId: 't1',
  },
  // LCA Phase II Exercises
  {
    id: 'pex-3',
    phaseId: 'phase-2',
    exerciseId: 'ex-3',
    sets: 3,
    reps: '15',
    intensity: 'Moderada',
    progression: 'Adicionar carga gradualmente',
    modifications: ['Usar faixa elástica', 'Reduzir amplitude inicial'],
    order: 1,
    tenantId: 't1',
  },
];

export const INITIAL_PROTOCOL_EVIDENCES: ProtocolEvidence[] = [
  {
    id: 'ev-1',
    protocolId: 'prot-1',
    title:
      'Rehabilitation after anterior cruciate ligament reconstruction: a systematic review',
    authors: 'van Melick N, van Cingel REH, Brooijmans F, et al.',
    journal: 'Sports Medicine',
    year: 2016,
    doi: '10.1007/s40279-016-0575-z',
    evidenceLevel: 'I',
    description:
      'Revisão sistemática sobre protocolos de reabilitação pós-LCA demonstrando eficácia da progressão por fases',
    link: 'https://pubmed.ncbi.nlm.nih.gov/27406221/',
    tenantId: 't1',
  },
  {
    id: 'ev-2',
    protocolId: 'prot-2',
    title: 'Exercise therapy for chronic low back pain',
    authors: 'Hayden JA, van Tulder MW, Malmivaara A, Koes BW',
    journal: 'Cochrane Database of Systematic Reviews',
    year: 2005,
    evidenceLevel: 'I',
    description:
      'Meta-análise demonstrando eficácia do exercício terapêutico para dor lombar crônica',
    tenantId: 't1',
  },
  {
    id: 'ev-3',
    protocolId: 'prot-3',
    title: 'Physical rehabilitation for recovery after stroke',
    authors: 'Pollock A, Baer G, Campbell P, et al.',
    journal: 'Cochrane Database of Systematic Reviews',
    year: 2014,
    evidenceLevel: 'I',
    description:
      'Revisão sistemática sobre reabilitação física pós-AVC mostrando benefícios significativos',
    tenantId: 't1',
  },
];

export const INITIAL_PATIENT_PROTOCOLS: PatientProtocol[] = [
  {
    id: 'pp-1',
    patientId: 'p2', // Laura Mendes (LCA case)
    protocolId: 'prot-1',
    prescribedById: '2',
    startDate: '2024-01-15T09:00:00Z',
    expectedEndDate: '2024-07-15T09:00:00Z',
    currentPhaseId: 'phase-2',
    status: 'Ativo',
    adherenceRate: 85,
    customizations: [],
    progressNotes: [],
    outcomes: [],
    tenantId: 't1',
  },
  {
    id: 'pp-2',
    patientId: 'p1', // José Silva (lombar case)
    protocolId: 'prot-2',
    prescribedById: '2',
    startDate: '2024-01-20T10:00:00Z',
    expectedEndDate: '2024-04-20T10:00:00Z',
    currentPhaseId: 'phase-3',
    status: 'Ativo',
    adherenceRate: 78,
    customizations: [],
    progressNotes: [],
    outcomes: [],
    tenantId: 't1',
  },
];

export const INITIAL_PROTOCOL_CUSTOMIZATIONS: ProtocolCustomization[] = [];

export const INITIAL_PROTOCOL_PROGRESS_NOTES: ProtocolProgressNote[] = [
  {
    id: 'pn-1',
    patientProtocolId: 'pp-1',
    date: '2024-01-22T10:00:00Z',
    currentPhase: 'Fase II - Mobilidade e Força Inicial',
    adherence: 85,
    painLevel: 3,
    functionalLevel: 6,
    notes:
      'Paciente evoluindo bem. Flexão ativa atingiu 100°. Sem edema. Quadríceps com ativação melhor.',
    therapistId: '2',
    nextSteps: 'Continuar fortalecimento, iniciar propriocepção básica',
    phaseProgression: 'Manter',
    tenantId: 't1',
  },
];

export const INITIAL_PROTOCOL_OUTCOMES: ProtocolOutcome[] = [
  {
    id: 'po-1',
    patientProtocolId: 'pp-1',
    metric: 'Flexão do Joelho',
    initialValue: '30',
    currentValue: '100',
    targetValue: '130',
    unit: 'graus',
    measurementDate: '2024-01-22T10:00:00Z',
    assessedById: '2',
    tenantId: 't1',
  },
  {
    id: 'po-2',
    patientProtocolId: 'pp-1',
    metric: 'Força do Quadríceps',
    initialValue: '2/5',
    currentValue: '3/5',
    targetValue: '5/5',
    unit: 'escala 0-5',
    measurementDate: '2024-01-22T10:00:00Z',
    assessedById: '2',
    tenantId: 't1',
  },
];

export const INITIAL_PROTOCOL_ANALYTICS: ProtocolAnalytics[] = [
  {
    id: 'pa-1',
    protocolId: 'prot-1',
    totalPrescriptions: 15,
    completionRate: 87,
    averageAdherence: 82,
    averageDuration: 168, // 24 weeks in days
    effectivenessScore: 89,
    patientSatisfaction: 8.5,
    lastUpdated: '2024-01-22T10:00:00Z',
    tenantId: 't1',
  },
  {
    id: 'pa-2',
    protocolId: 'prot-2',
    totalPrescriptions: 12,
    completionRate: 75,
    averageAdherence: 78,
    averageDuration: 84, // 12 weeks in days
    effectivenessScore: 85,
    patientSatisfaction: 8.2,
    lastUpdated: '2024-01-22T10:00:00Z',
    tenantId: 't1',
  },
];

// Gestão Operacional - Dados Iniciais

export const INITIAL_QUALITY_INDICATORS: QualityIndicator[] = [
  {
    id: 'qi-1',
    name: 'NPS Geral',
    type: 'nps',
    value: 72,
    target: 70,
    unit: 'score',
    period: 'monthly',
    timestamp: new Date().toISOString(),
    trend: 'up',
    previousValue: 68,
    tenantId: 't1',
  },
  {
    id: 'qi-2',
    name: 'Taxa de Satisfação',
    type: 'satisfaction',
    value: 4.7,
    target: 4.5,
    unit: 'stars',
    period: 'weekly',
    timestamp: new Date().toISOString(),
    trend: 'up',
    previousValue: 4.5,
    tenantId: 't1',
  },
  {
    id: 'qi-3',
    name: 'Taxa de Conclusão de Protocolos',
    type: 'completion_rate',
    value: 85,
    target: 80,
    unit: '%',
    period: 'monthly',
    timestamp: new Date().toISOString(),
    trend: 'stable',
    previousValue: 84,
    tenantId: 't1',
  },
  {
    id: 'qi-4',
    name: 'Efetividade dos Tratamentos',
    type: 'effectiveness',
    value: 82,
    target: 75,
    unit: '%',
    period: 'monthly',
    timestamp: new Date().toISOString(),
    trend: 'up',
    previousValue: 78,
    tenantId: 't1',
  },
];

export const INITIAL_PRODUCTIVITY_METRICS: ProductivityMetric[] = [
  {
    id: 'pm-1',
    therapistId: '2', // Carlos Martins
    date: new Date().toISOString().split('T')[0],
    appointmentsScheduled: 8,
    appointmentsCompleted: 7,
    cancellationRate: 12.5,
    averageSessionDuration: 50,
    patientsPerDay: 7,
    revenueGenerated: 560,
    utilizationRate: 87.5,
    efficiencyScore: 4.2,
    qualityRating: 4.6,
    tenantId: 't1',
  },
  {
    id: 'pm-2',
    therapistId: '3', // Beatriz Lima
    date: new Date().toISOString().split('T')[0],
    appointmentsScheduled: 6,
    appointmentsCompleted: 6,
    cancellationRate: 0,
    averageSessionDuration: 45,
    patientsPerDay: 6,
    revenueGenerated: 480,
    utilizationRate: 100,
    efficiencyScore: 4.5,
    qualityRating: 4.8,
    tenantId: 't1',
  },
];

export const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'eq-1',
    name: 'Ultrassom Terapêutico',
    type: 'therapeutic',
    brand: 'Carci',
    model: 'Sonopulse III',
    serialNumber: 'UST001234',
    purchaseDate: '2023-03-15',
    warrantyExpiry: '2025-03-15',
    status: 'active',
    location: 'Sala 1',
    condition: 'excellent',
    maintenanceSchedule: getFutureDate(30, 9, 0),
    usageHours: 450,
    cost: 12000,
    depreciationRate: 10,
    responsibleId: '2',
    notes: 'Calibrado em Janeiro 2024',
    tenantId: 't1',
  },
  {
    id: 'eq-2',
    name: 'Esteira Ergométrica',
    type: 'therapeutic',
    brand: 'Movement',
    model: 'LX160',
    serialNumber: 'EST001456',
    purchaseDate: '2022-08-10',
    warrantyExpiry: '2024-08-10',
    status: 'maintenance',
    location: 'Sala de Reabilitação',
    condition: 'good',
    maintenanceSchedule: getFutureDate(5, 14, 0),
    usageHours: 1250,
    cost: 15000,
    depreciationRate: 15,
    responsibleId: '2',
    notes: 'Manutenção preventiva agendada',
    tenantId: 't1',
  },
  {
    id: 'eq-3',
    name: 'Sistema TENS',
    type: 'therapeutic',
    brand: 'Quark',
    model: 'Neurodyn Evolution',
    serialNumber: 'TNS002789',
    purchaseDate: '2023-11-20',
    status: 'active',
    location: 'Sala 2',
    condition: 'excellent',
    maintenanceSchedule: getFutureDate(45, 9, 0),
    usageHours: 180,
    cost: 8500,
    responsibleId: '3',
    tenantId: 't1',
  },
];

export const INITIAL_OPERATIONAL_ALERTS: OperationalAlert[] = [
  {
    id: 'oa-1',
    type: 'equipment',
    severity: 'medium',
    title: 'Manutenção Preventiva Agendada',
    message: 'Esteira Ergométrica LX160 requer manutenção preventiva em 5 dias',
    source: 'Sistema de Manutenção',
    triggeredAt: new Date().toISOString(),
    isActive: true,
    autoResolve: false,
    entityId: 'eq-2',
    entityType: 'equipment',
    actionRequired: 'Agendar técnico para manutenção',
    tenantId: 't1',
  },
  {
    id: 'oa-2',
    type: 'productivity',
    severity: 'low',
    title: 'Taxa de Cancelamento Acima da Média',
    message: 'Taxa de cancelamentos de 15% está acima da meta de 10%',
    source: 'Análise de Produtividade',
    triggeredAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    isActive: true,
    autoResolve: true,
    thresholdValue: 10,
    actualValue: 15,
    entityId: '2',
    entityType: 'therapist',
    actionRequired: 'Revisar política de confirmação de consultas',
    tenantId: 't1',
  },
  {
    id: 'oa-3',
    type: 'quality',
    severity: 'high',
    title: 'Queda na Satisfação do Paciente',
    message: 'Paciente p3 avaliou com 2 estrelas após última sessão',
    source: 'Sistema de Feedback',
    triggeredAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    isActive: true,
    autoResolve: false,
    thresholdValue: 3.0,
    actualValue: 2.0,
    entityId: 'p3',
    entityType: 'patient',
    actionRequired: 'Contatar paciente e revisar tratamento',
    tenantId: 't1',
  },
];

export const INITIAL_EXECUTIVE_REPORTS: ExecutiveReport[] = [
  {
    id: 'er-1',
    title: 'Relatório Mensal - Janeiro 2024',
    type: 'monthly',
    period: {
      start: '2024-01-01',
      end: '2024-01-31',
    },
    generatedAt: '2024-02-01T09:00:00Z',
    generatedBy: '1', // Dr. Ana Costa
    status: 'ready',
    sections: [],
    summary: {
      totalRevenue: 45600,
      totalAppointments: 156,
      averageSatisfaction: 4.7,
      utilizationRate: 78,
      topPerformer: 'Beatriz Lima',
      mainConcerns: ['Taxa de cancelamentos acima da meta'],
      recommendations: [
        'Implementar sistema de confirmação automática',
        'Revisar protocolo de atendimento da Sala 1',
      ],
    },
    kpis: [],
    tenantId: 't1',
  },
];

export const SAMPLE_KPIS: KPIData[] = [
  {
    id: 'kpi-1',
    name: 'Taxa de Ocupação',
    value: 78,
    target: 75,
    unit: '%',
    trend: 'up',
    change: 5.2,
    category: 'operational',
    isGood: true,
  },
  {
    id: 'kpi-2',
    name: 'Receita Mensal',
    value: 45600,
    target: 42000,
    unit: 'R$',
    trend: 'up',
    change: 8.6,
    category: 'financial',
    isGood: true,
  },
  {
    id: 'kpi-3',
    name: 'Satisfação NPS',
    value: 72,
    target: 70,
    unit: 'score',
    trend: 'up',
    change: 5.9,
    category: 'quality',
    isGood: true,
  },
  {
    id: 'kpi-4',
    name: 'Taxa de Cancelamentos',
    value: 12,
    target: 10,
    unit: '%',
    trend: 'down',
    change: -1.5,
    category: 'operational',
    isGood: false,
  },
  {
    id: 'kpi-5',
    name: 'Produtividade Média',
    value: 85,
    target: 80,
    unit: '%',
    trend: 'up',
    change: 3.2,
    category: 'productivity',
    isGood: true,
  },
  {
    id: 'kpi-6',
    name: 'Tempo Médio de Tratamento',
    value: 28,
    target: 30,
    unit: 'dias',
    trend: 'down',
    change: -6.7,
    category: 'quality',
    isGood: true,
  },
];
