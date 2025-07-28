import React from 'react';

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
  ExerciseFavorite,
  ExerciseRating,
  ExerciseVideo,
  ExerciseImage,
} from './types';

// === CONSTANTES DE TASKS ===
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;

export const TASK_STATUS_LABELS = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Revisão',
  done: 'Concluído',
} as const;

export const TASK_STATUS_COLORS = {
  todo: '#f1f5f9',
  in_progress: '#dbeafe',
  review: '#fef3c7',
  done: '#dcfce7',
};

export const TASK_PRIORITY_STYLES = {
  low: {
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    icon: '⬇️'
  },
  medium: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    icon: '➡️'
  },
  high: {
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: '⬆️'
  },
  urgent: {
    color: 'text-red-800',
    bg: 'bg-red-200',
    icon: '🔥'
  },
};

// === DADOS ESSENCIAIS (otimizados) ===
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
};

// === NOTEBOOKS ===
export const NOTEBOOKS: Notebook[] = [
  {
    id: 'nb1',
    title: 'Fisioterapia Geral',
    description: 'Conceitos básicos de fisioterapia',
    tenantId: 't1',
    isShared: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// === DADOS LAZY (arrays vazios para carregamento otimizado) ===
export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Avaliação inicial - João Silva',
    description: 'Realizar avaliação postural completa e análise de movimento para paciente com dor lombar crônica.',
    status: 'todo',
    priority: 'high',
    assigneeId: '2',
    patientId: 'pat-1',
    tenantId: 't1',
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Protocolo de fortalecimento - Maria Santos',
    description: 'Implementar exercícios de fortalecimento para quadríceps após cirurgia de joelho.',
    status: 'in_progress',
    priority: 'medium',
    assigneeId: '2',
    patientId: 'pat-2',
    tenantId: 't1',
  },
  {
    id: 'task-3',
    projectId: 'proj-1',
    title: 'Reavaliação - Carlos Oliveira',
    description: 'Verificar progresso do tratamento de ombro congelado após 4 semanas de fisioterapia.',
    status: 'review',
    priority: 'medium',
    assigneeId: '3',
    patientId: 'pat-3',
    tenantId: 't1',
  },
  {
    id: 'task-4',
    projectId: 'proj-1',
    title: 'Alta fisioterapêutica - Ana Costa',
    description: 'Paciente completou tratamento para tendinite de Aquiles com sucesso. Preparar relatório de alta.',
    status: 'done',
    priority: 'low',
    assigneeId: '2',
    patientId: 'pat-4',
    tenantId: 't1',
  },
  {
    id: 'task-5',
    projectId: 'proj-1',
    title: 'Plano de exercícios domiciliares',
    description: 'Elaborar programa de exercícios para paciente realizar em casa durante o período de férias.',
    status: 'todo',
    priority: 'medium',
    assigneeId: '2',
    tenantId: 't1',
  },
];
export const INITIAL_PATIENTS: Patient[] = [];
export const INITIAL_EXERCISES: Exercise[] = [
  // === MOBILIZAÇÃO NEURAL (8 exercícios) ===
  {
    id: 'ex-neural-001',
    name: 'Deslizamento do Nervo Mediano',
    description: 'Técnica de mobilização neural específica para o nervo mediano. Posicione o braço em abdução a 90°, estenda o punho e os dedos, mantenha o ombro deprimido. Realize movimentos suaves de flexão e extensão cervical lateral.',
    category: 'Mobilização Neural',
    bodyPart: 'Membros Superiores',
    subcategory: 'Nervo Mediano',
    videoUrl: 'https://www.youtube.com/embed/kUHXIo9e4LI',
    indications: [
      'Síndrome do túnel do carpo',
      'Compressão do nervo mediano',
      'Dor neuropática em território mediano',
      'Pós-cirúrgico de descompressão mediana'
    ],
    contraindications: [
      'Neurite aguda',
      'Instabilidade cervical',
      'Irritabilidade neural alta',
      'Fraturas recentes no membro superior'
    ],
    difficultyLevel: 3,
    equipment: [],
    targetMuscles: ['Nervo mediano'],
    duration: '2-3 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-neural-002',
    name: 'Mobilização do Nervo Ulnar',
    description: 'Mobilização neural específica para o nervo ulnar. Com o braço abduzido a 90°, flexione o cotovelo e punho, realizando movimentos de depressão e elevação escapular combinados com inclinação cervical.',
    category: 'Mobilização Neural',
    bodyPart: 'Membros Superiores',
    subcategory: 'Nervo Ulnar',
    videoUrl: 'https://www.youtube.com/embed/O8UoF5TE9dA',
    indications: [
      'Síndrome do canal de Guyon',
      'Compressão cubital',
      'Epicondilite medial',
      'Neuropatia ulnar'
    ],
    contraindications: [
      'Luxação de cotovelo recente',
      'Neurite ulnar aguda',
      'Instabilidade articular do cotovelo',
      'Hipermobilidade articular'
    ],
    difficultyLevel: 3,
    equipment: [],
    targetMuscles: ['Nervo ulnar'],
    duration: '2-3 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-neural-003',
    name: 'Tensão Neural Ciático',
    description: 'Teste e mobilização do nervo ciático. Em decúbito dorsal, realize flexão de quadril mantendo joelho estendido. Combine com dorsiflexão de tornozelo e flexão cervical para aumentar a tensão neural.',
    category: 'Mobilização Neural',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Nervo Ciático',
    videoUrl: 'https://www.youtube.com/embed/lNKKMKs8t4Y',
    indications: [
      'Ciatalgia',
      'Hérnia de disco lombar',
      'Síndrome do piriforme',
      'Radiculopatia L4-S1'
    ],
    contraindications: [
      'Hérnia discal aguda com déficit neurológico',
      'Cauda equina',
      'Instabilidade lombar severa',
      'Dor severa (>8/10)'
    ],
    difficultyLevel: 2,
    equipment: ['Maca'],
    targetMuscles: ['Nervo ciático'],
    duration: '3-5 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-neural-004',
    name: 'Deslizamento Femoral',
    description: 'Mobilização do nervo femoral. Em decúbito lateral, realize extensão de quadril com flexão de joelho. Combine com extensão cervical para aumentar a tensão sobre o nervo femoral.',
    category: 'Mobilização Neural',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Nervo Femoral',
    videoUrl: 'https://www.youtube.com/embed/vF-oGmK6x3s',
    indications: [
      'Neuropatia femoral',
      'Dor anterior da coxa',
      'Pós-cirúrgico de quadril',
      'Meralgia parestésica'
    ],
    contraindications: [
      'Lesão muscular do quadríceps',
      'Fratura de fêmur',
      'Instabilidade de quadril',
      'Trombose venosa profunda'
    ],
    difficultyLevel: 2,
    equipment: ['Maca'],
    targetMuscles: ['Nervo femoral'],
    duration: '2-3 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-neural-005',
    name: 'Mobilização Nervo Radial',
    description: 'Técnica específica para mobilização do nervo radial. Com o braço em extensão, realize pronação/supinação do antebraço combinada com flexão/extensão do punho e movimentos cervicais.',
    category: 'Mobilização Neural',
    bodyPart: 'Membros Superiores',
    subcategory: 'Nervo Radial',
    videoUrl: 'https://www.youtube.com/embed/XrKqWEL6w1Y',
    indications: [
      'Síndrome do túnel radial',
      'Epicondilite lateral',
      'Paralisia do nervo radial',
      'Compressão do nervo interósseo posterior'
    ],
    contraindications: [
      'Fratura do úmero',
      'Luxação de cotovelo',
      'Neurite radial aguda',
      'Instabilidade articular'
    ],
    difficultyLevel: 3,
    equipment: [],
    targetMuscles: ['Nervo radial'],
    duration: '2-3 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-neural-006',
    name: 'Teste e Mobilização Slump',
    description: 'Teste neurológico e mobilização global do sistema nervoso. Sentado, realize flexão de tronco, cervical e extensão de joelho simultaneamente. Importante para avaliar tensão neural global.',
    category: 'Mobilização Neural',
    bodyPart: 'Geral',
    subcategory: 'Sistema Neural Global',
    videoUrl: 'https://www.youtube.com/embed/qxF_oqfVogI',
    indications: [
      'Avaliação neural global',
      'Dor lombar com irradiação',
      'Cefaleia tensional',
      'Restrições durais'
    ],
    contraindications: [
      'Déficit neurológico severo',
      'Instabilidade vertebral',
      'Vertebrobasilar insuficiência',
      'Osteoporose severa'
    ],
    difficultyLevel: 4,
    equipment: ['Cadeira'],
    targetMuscles: ['Sistema nervoso central'],
    duration: '3-5 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-neural-007',
    name: 'Neurodynamic Upper Limb',
    description: 'Sequência de mobilização neural para membro superior. Combines posicionamentos específicos de ombro, cotovelo e punho para mobilizar todo o plexo braquial de forma segura.',
    category: 'Mobilização Neural',
    bodyPart: 'Membros Superiores',
    subcategory: 'Plexo Braquial',
    videoUrl: 'https://www.youtube.com/embed/J3sH7vFJ5BQ',
    indications: [
      'Síndrome do desfiladeiro torácico',
      'Cervicobracialgia',
      'Lesões do plexo braquial',
      'Aderências neurais pós-trauma'
    ],
    contraindications: [
      'Lesão vascular associada',
      'Instabilidade cervical',
      'Avulsão radicular',
      'Irritabilidade neural alta'
    ],
    difficultyLevel: 4,
    equipment: [],
    targetMuscles: ['Plexo braquial'],
    duration: '5-8 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-neural-008',
    name: 'Mobilização Plexo Braquial',
    description: 'Técnica específica para mobilização do plexo braquial. Utilize posicionamentos progressivos de abdução de ombro, extensão de cotovelo e extensão de punho, combinados com inclinação cervical contralateral.',
    category: 'Mobilização Neural',
    bodyPart: 'Membros Superiores',
    subcategory: 'Plexo Braquial',
    videoUrl: 'https://www.youtube.com/embed/Lf7zWyDMW5g',
    indications: [
      'Plexopatia braquial',
      'Síndrome do desfiladeiro',
      'Cervicalgia com irradiação',
      'Parestesias em membro superior'
    ],
    contraindications: [
      'Tumor no plexo braquial',
      'Aneurisma subclávia',
      'Fratura de clavícula',
      'Luxação glenoumeral'
    ],
    difficultyLevel: 4,
    equipment: [],
    targetMuscles: ['Plexo braquial completo'],
    duration: '4-6 minutos',
    frequency: '1-2x ao dia'
  },

  // === MEMBROS SUPERIORES (15 exercícios) ===
  {
    id: 'ex-membros-sup-001',
    name: 'Flexão de Ombro Ativa',
    description: 'Movimento ativo de flexão do ombro. Em pé ou sentado, eleve o braço à frente até 180° respeitando os limites de conforto. Exercício fundamental para restaurar amplitude de movimento anterior.',
    category: 'Mobilidade',
    bodyPart: 'Membros Superiores',
    subcategory: 'Ombro',
    videoUrl: 'https://www.youtube.com/embed/2NOQKHtTghg',
    indications: [
      'Capsulite adesiva',
      'Limitação da flexão de ombro',
      'Pós-cirúrgico de ombro',
      'Síndrome do impacto'
    ],
    contraindications: [
      'Luxação aguda de ombro',
      'Fratura de úmero não consolidada',
      'Bursite aguda severa',
      'Instabilidade glenoumeral anterior'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Deltóide anterior', 'Coracobraquial', 'Bíceps braquial'],
    duration: '2-3 minutos',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-membros-sup-002',
    name: 'Abdução de Ombro com Assistência',
    description: 'Exercício de abdução assistida do ombro. Utilize o braço contralateral ou uma polia para auxiliar o movimento de abdução, progredindo gradualmente para movimento ativo livre.',
    category: 'Mobilidade',
    bodyPart: 'Membros Superiores',
    subcategory: 'Ombro',
    videoUrl: 'https://www.youtube.com/embed/3Zx9p9gxPK4',
    indications: [
      'Ombro congelado',
      'Pós-operatório de ombro',
      'Fraqueza do deltóide',
      'Síndrome do impacto subacromial'
    ],
    contraindications: [
      'Instabilidade multidirecional',
      'Lesão do plexo braquial',
      'Fratura de clavícula',
      'Tendinite calcária aguda'
    ],
    difficultyLevel: 2,
    equipment: ['Polia (opcional)'],
    targetMuscles: ['Deltóide médio', 'Supraespinal'],
    duration: '3-5 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-membros-sup-003',
    name: 'Rotação Externa de Ombro',
    description: 'Exercício de rotação externa com cotovelo flexionado a 90°. Posicione o cotovelo junto ao corpo e realize rotação externa contra resistência ou livre, fortalecendo os rotadores externos.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Superiores',
    subcategory: 'Ombro',
    videoUrl: 'https://www.youtube.com/embed/HSoHeSjvIdY',
    indications: [
      'Instabilidade anterior de ombro',
      'Síndrome do impacto',
      'Fortalecimento dos rotadores',
      'Prevenção de lesões'
    ],
    contraindications: [
      'Instabilidade posterior severa',
      'Lesão do nervo axilar',
      'Bursite subdeltoidea aguda',
      'Capsulite em fase irritativa'
    ],
    difficultyLevel: 2,
    equipment: ['Faixa elástica', 'Halteres (opcional)'],
    targetMuscles: ['Infraespinal', 'Redondo menor', 'Deltóide posterior'],
    duration: '10-15 repetições',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-membros-sup-004',
    name: 'Flexão e Extensão de Punho',
    description: 'Movimento alternado de flexão e extensão do punho. Mantenha o antebraço apoiado e realize movimentos completos de flexão e extensão, importante para tendinopatias e rigidez articular.',
    category: 'Mobilidade',
    bodyPart: 'Membros Superiores',
    subcategory: 'Punho',
    videoUrl: 'https://www.youtube.com/embed/wFlvG1_6yH0',
    indications: [
      'Síndrome do túnel do carpo',
      'Tendinite de De Quervain',
      'Rigidez articular do punho',
      'Pós-imobilização'
    ],
    contraindications: [
      'Fratura de punho não consolidada',
      'Inflamação aguda severa',
      'Instabilidade carpal',
      'TFCC lesado agudo'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Flexores do punho', 'Extensores do punho'],
    duration: '2-3 minutos',
    frequency: '4-5x ao dia'
  },
  {
    id: 'ex-membros-sup-005',
    name: 'Fortalecimento do Manguito Rotador',
    description: 'Sequência específica para fortalecimento do manguito rotador. Inclui rotação externa, interna, abdução em decúbito lateral e extensão posterior. Exercício fundamental para estabilidade glenoumeral.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Superiores',
    subcategory: 'Ombro',
    videoUrl: 'https://www.youtube.com/embed/qIBTOQMCrW8',
    indications: [
      'Síndrome do impacto',
      'Instabilidade de ombro',
      'Lesão do manguito rotador',
      'Prevenção em atletas overhead'
    ],
    contraindications: [
      'Ruptura completa não tratada',
      'Artrose glenoumeral severa',
      'Capsulite em fase aguda',
      'Neuropatia do supraescapular'
    ],
    difficultyLevel: 3,
    equipment: ['Faixa elástica', 'Halteres leves'],
    targetMuscles: ['Supraespinal', 'Infraespinal', 'Redondo menor', 'Subescapular'],
    duration: '15-20 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-membros-sup-006',
    name: 'Alongamento dos Flexores do Punho',
    description: 'Alongamento específico dos músculos flexores do antebraço. Estenda o cotovelo, estenda o punho e use a mão contralateral para intensificar o alongamento dos flexores.',
    category: 'Alongamento',
    bodyPart: 'Membros Superiores',
    subcategory: 'Antebraço',
    videoUrl: 'https://www.youtube.com/embed/g91dOz0R8Cw',
    indications: [
      'Epicondilite medial',
      'Síndrome do túnel do carpo',
      'Tensão muscular do antebraço',
      'LER/DORT'
    ],
    contraindications: [
      'Neuropatia ulnar severa',
      'Instabilidade do cotovelo',
      'Fratura de antebraço',
      'Síndrome compartimental'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Flexor radial do carpo', 'Flexor ulnar do carpo', 'Palmares'],
    duration: '30 segundos cada braço',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-membros-sup-007',
    name: 'Mobilização Glenoumeral',
    description: 'Técnica de mobilização passiva da articulação glenoumeral. Utilize movimentos oscilatórios em diferentes direções para melhorar a amplitude articular e reduzir rigidez.',
    category: 'Mobilidade',
    bodyPart: 'Membros Superiores',
    subcategory: 'Ombro',
    videoUrl: 'https://www.youtube.com/embed/X8VPcNh0LqE',
    indications: [
      'Capsulite adesiva',
      'Rigidez pós-cirúrgica',
      'Limitação articular',
      'Síndrome da dor complexa regional'
    ],
    contraindications: [
      'Instabilidade multidirecional',
      'Fratura glenoidal',
      'Osteomielite',
      'Neoplasia óssea'
    ],
    difficultyLevel: 3,
    equipment: [],
    targetMuscles: ['Cápsula articular'],
    duration: '5-10 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-membros-sup-008',
    name: 'Fortalecimento do Tríceps',
    description: 'Exercício específico para fortalecimento do músculo tríceps braquial. Pode ser realizado em diferentes posições: sentado, em pé ou deitado, com resistência variável.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Superiores',
    subcategory: 'Braço',
    videoUrl: 'https://www.youtube.com/embed/nRiJVZDpdL0',
    indications: [
      'Fraqueza do tríceps',
      'Reabilitação pós-fratura de úmero',
      'Lesão do nervo radial',
      'Fortalecimento funcional'
    ],
    contraindications: [
      'Epicondilite lateral aguda',
      'Instabilidade de cotovelo',
      'Bursite olecraniana',
      'Síndrome do túnel cubital severo'
    ],
    difficultyLevel: 2,
    equipment: ['Halteres', 'Faixa elástica'],
    targetMuscles: ['Tríceps braquial'],
    duration: '10-15 repetições',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-membros-sup-009',
    name: 'Mobilização Escapular',
    description: 'Exercícios específicos para mobilidade da escápula. Inclui elevação, depressão, protração, retração e movimentos circulares para melhorar a biomecânica do complexo do ombro.',
    category: 'Mobilidade',
    bodyPart: 'Membros Superiores',
    subcategory: 'Escápula',
    videoUrl: 'https://www.youtube.com/embed/VCPp1DUypo0',
    indications: [
      'Discinesia escapular',
      'Síndrome do impacto',
      'Síndrome cruzada superior',
      'Rigidez escapulotorácica'
    ],
    contraindications: [
      'Fratura de escápula',
      'Paralisia do nervo torácico longo',
      'Lesão do nervo acessório',
      'Instabilidade cervical'
    ],
    difficultyLevel: 2,
    equipment: [],
    targetMuscles: ['Trapézio', 'Rombóides', 'Serrátil anterior', 'Levantador da escápula'],
    duration: '5-8 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-membros-sup-010',
    name: 'Alongamento do Bíceps',
    description: 'Alongamento específico do músculo bíceps braquial. Posicione o braço em extensão posterior com supinação do antebraço, sentindo o alongamento na face anterior do braço.',
    category: 'Alongamento',
    bodyPart: 'Membros Superiores',
    subcategory: 'Braço',
    videoUrl: 'https://www.youtube.com/embed/YL4b8KmGi8E',
    indications: [
      'Tensão do bíceps',
      'Síndrome do impacto',
      'Rigidez anterior do ombro',
      'Tendinite do bíceps'
    ],
    contraindications: [
      'Luxação anterior recente',
      'Ruptura do bíceps',
      'Instabilidade glenoumeral',
      'Síndrome do desfiladeiro torácico'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Bíceps braquial', 'Coracobraquial'],
    duration: '30 segundos cada braço',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-membros-sup-011',
    name: 'Exercício de Codman',
    description: 'Exercício pendular passivo para mobilização suave do ombro. Permita que o braço balance livremente usando a gravidade, reduzindo a tensão e melhorando a circulação.',
    category: 'Mobilidade',
    bodyPart: 'Membros Superiores',
    subcategory: 'Ombro',
    videoUrl: 'https://www.youtube.com/embed/4XQ1gL4QixE',
    indications: [
      'Fase aguda pós-cirúrgica',
      'Capsulite inicial',
      'Dor severa de ombro',
      'Síndrome do impacto agudo'
    ],
    contraindications: [
      'Fratura não consolidada',
      'Instabilidade severa',
      'Vertigem posicional',
      'Problemas cardíacos graves'
    ],
    difficultyLevel: 1,
    equipment: ['Peso leve (opcional)'],
    targetMuscles: ['Mobilização articular passiva'],
    duration: '3-5 minutos',
    frequency: '4-6x ao dia'
  },
  {
    id: 'ex-membros-sup-012',
    name: 'Fortalecimento dos Extensores do Punho',
    description: 'Exercício específico para fortalecer os músculos extensores do punho. Mantenha o antebraço apoiado e realize extensão contra resistência ou com peso.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Superiores',
    subcategory: 'Punho',
    videoUrl: 'https://www.youtube.com/embed/CLfPOtIzZ6o',
    indications: [
      'Epicondilite lateral',
      'Fraqueza dos extensores',
      'Instabilidade do punho',
      'Prevenção de LER/DORT'
    ],
    contraindications: [
      'Tenosinovite aguda',
      'Síndrome do túnel radial',
      'Fratura de rádio distal',
      'Artrite reumatoide ativa'
    ],
    difficultyLevel: 2,
    equipment: ['Halteres leves', 'Faixa elástica'],
    targetMuscles: ['Extensor radial longo do carpo', 'Extensor radial curto do carpo', 'Extensor ulnar do carpo'],
    duration: '10-15 repetições',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-membros-sup-013',
    name: 'Mobilização Neural para Membro Superior',
    description: 'Técnica integrada de mobilização neural para todo o membro superior. Combine posicionamentos específicos para mobilizar múltiplos nervos simultaneamente.',
    category: 'Mobilização Neural',
    bodyPart: 'Membros Superiores',
    subcategory: 'Sistema Neural',
    videoUrl: 'https://www.youtube.com/embed/WQ5aVLw8llE',
    indications: [
      'Síndrome do desfiladeiro torácico',
      'Múltiplas neuropatias',
      'Aderências neurais',
      'Cervicobracialgia'
    ],
    contraindications: [
      'Neuropatia severa progressiva',
      'Lesão vascular associada',
      'Instabilidade cervical',
      'Hiperirritabilidade neural'
    ],
    difficultyLevel: 4,
    equipment: [],
    targetMuscles: ['Sistema nervoso periférico'],
    duration: '5-10 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-membros-sup-014',
    name: 'Propriocepção de Ombro',
    description: 'Exercícios proprioceptivos para melhorar o controle neuromuscular do ombro. Utilize superfícies instáveis, olhos fechados e perturbações controladas.',
    category: 'Propriocepção',
    bodyPart: 'Membros Superiores',
    subcategory: 'Ombro',
    videoUrl: 'https://www.youtube.com/embed/8Dc25CnLmI4',
    indications: [
      'Instabilidade funcional',
      'Retorno ao esporte',
      'Reabilitação tardia',
      'Prevenção de re-lesão'
    ],
    contraindications: [
      'Dor severa persistente',
      'Instabilidade estrutural não tratada',
      'Déficit neurológico central',
      'Vertigem severa'
    ],
    difficultyLevel: 3,
    equipment: ['Bosu', 'Disco proprioceptivo', 'Bola terapêutica'],
    targetMuscles: ['Músculos estabilizadores globais'],
    duration: '10-15 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-membros-sup-015',
    name: 'Cadeia Cinética Fechada para MS',
    description: 'Exercícios em cadeia cinética fechada para membros superiores. Inclui apoios, pranchas modificadas e exercícios funcionais para fortalecimento integrado.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Superiores',
    subcategory: 'Funcional',
    videoUrl: 'https://www.youtube.com/embed/IODxDxX7oi4',
    indications: [
      'Fortalecimento funcional',
      'Reabilitação avançada',
      'Condicionamento geral',
      'Retorno ao trabalho/esporte'
    ],
    contraindications: [
      'Síndrome do túnel do carpo severo',
      'Instabilidade de punho',
      'Lesão aguda não consolidada',
      'Dor severa ao apoio'
    ],
    difficultyLevel: 4,
    equipment: ['Colchonete', 'Parede'],
    targetMuscles: ['Musculatura global dos membros superiores'],
    duration: '8-12 minutos',
    frequency: '1-2x ao dia'
  },

  // === TRONCO (10 exercícios) ===
  {
    id: 'ex-tronco-001',
    name: 'Flexão Lombar Controlada',
    description: 'Exercício de flexão controlada da coluna lombar. Em pé, realize flexão anterior do tronco de forma gradual, mantendo o controle durante todo o movimento. Importante para mobilidade lombar.',
    category: 'Mobilidade',
    bodyPart: 'Tronco',
    subcategory: 'Coluna Lombar',
    videoUrl: 'https://www.youtube.com/embed/4BOTvaRaDjI',
    indications: [
      'Rigidez lombar em extensão',
      'Espondilose lombar',
      'Síndrome facetária',
      'Melhoria da flexibilidade'
    ],
    contraindications: [
      'Hérnia discal lombar aguda',
      'Espondilolistese instável',
      'Síndrome da cauda equina',
      'Dor radicular severa'
    ],
    difficultyLevel: 2,
    equipment: [],
    targetMuscles: ['Músculos paravertebrais', 'Multífidos', 'Extensores lombares'],
    duration: '2-3 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-tronco-002',
    name: 'Fortalecimento do Core',
    description: 'Exercício isométrico para fortalecimento da musculatura estabilizadora do core. Mantenha a posição de prancha ventral, ativando transverso do abdome, multífidos e diafragma.',
    category: 'Fortalecimento',
    bodyPart: 'Tronco',
    subcategory: 'Core',
    videoUrl: 'https://www.youtube.com/embed/ASdvN_XEl_c',
    indications: [
      'Instabilidade lombar',
      'Dor lombar crônica',
      'Prevenção de lesões',
      'Fortalecimento postural'
    ],
    contraindications: [
      'Síndrome do túnel do carpo severo',
      'Instabilidade de punho',
      'Hérnia inguinal',
      'Hipertensão não controlada'
    ],
    difficultyLevel: 3,
    equipment: ['Colchonete'],
    targetMuscles: ['Transverso do abdome', 'Multífidos', 'Diafragma', 'Oblíquos'],
    duration: '30-60 segundos, 3-5 repetições',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-tronco-003',
    name: 'Extensão Torácica Ativa',
    description: 'Exercício para mobilização da coluna torácica em extensão. Sentado ou em pé, realize extensão torácica com apoio das mãos atrás da cabeça, melhorando a mobilidade da região dorsal.',
    category: 'Mobilidade',
    bodyPart: 'Tronco',
    subcategory: 'Coluna Torácica',
    videoUrl: 'https://www.youtube.com/embed/4XQ1gL4QixE',
    indications: [
      'Cifose torácica',
      'Rigidez torácica',
      'Síndrome do texto',
      'Postura anteriorizada'
    ],
    contraindications: [
      'Osteoporose severa',
      'Fraturas vertebrais',
      'Instabilidade torácica',
      'Escoliose severa'
    ],
    difficultyLevel: 2,
    equipment: ['Cadeira (opcional)'],
    targetMuscles: ['Extensores torácicos', 'Eretores da espinha', 'Rombóides'],
    duration: '2-3 minutos',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-tronco-004',
    name: 'Rotação de Tronco Sentado',
    description: 'Exercício de rotação da coluna vertebral. Sentado com a coluna ereta, realize rotações para ambos os lados mantendo a pelve estável. Exercício importante para mobilidade rotacional.',
    category: 'Mobilidade',
    bodyPart: 'Tronco',
    subcategory: 'Rotação',
    videoUrl: 'https://www.youtube.com/embed/Kee8TJjCu8o',
    indications: [
      'Limitação da rotação vertebral',
      'Rigidez torácica',
      'Melhoria da mobilidade funcional',
      'Síndrome facetária'
    ],
    contraindications: [
      'Instabilidade vertebral',
      'Espondilolistese ativa',
      'Escoliose severa com rotação',
      'Dor radicular aguda'
    ],
    difficultyLevel: 1,
    equipment: ['Cadeira'],
    targetMuscles: ['Oblíquos', 'Rotadores', 'Multífidos'],
    duration: '2-3 minutos',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-tronco-005',
    name: 'Alongamento dos Paravertebrais',
    description: 'Alongamento específico da musculatura paravertebral. Em decúbito dorsal, traga os joelhos ao peito abraçando as pernas, promovendo alongamento da musculatura posterior do tronco.',
    category: 'Alongamento',
    bodyPart: 'Tronco',
    subcategory: 'Coluna Lombar',
    videoUrl: 'https://www.youtube.com/embed/YQmpO9VT2X4',
    indications: [
      'Tensão muscular lombar',
      'Espasmo dos paravertebrais',
      'Dor lombar mecânica',
      'Síndrome facetária'
    ],
    contraindications: [
      'Hérnia discal lombar aguda',
      'Estenose do canal vertebral',
      'Instabilidade lombar',
      'Osteoporose severa'
    ],
    difficultyLevel: 1,
    equipment: ['Colchonete'],
    targetMuscles: ['Paravertebrais', 'Multífidos', 'Quadrado lombar'],
    duration: '30-60 segundos',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-tronco-006',
    name: 'Fortalecimento dos Oblíquos',
    description: 'Exercício específico para fortalecimento dos músculos oblíquos. Em decúbito lateral, realize elevação lateral do tronco, fortalecendo a musculatura lateral do abdome.',
    category: 'Fortalecimento',
    bodyPart: 'Tronco',
    subcategory: 'Abdome',
    videoUrl: 'https://www.youtube.com/embed/eVo5Te8T4AA',
    indications: [
      'Fraqueza dos oblíquos',
      'Instabilidade lateral',
      'Desequilíbrios musculares',
      'Prevenção de lesões'
    ],
    contraindications: [
      'Hérnia inguinal',
      'Diástase abdominal severa',
      'Lombalgia aguda',
      'Osteoporose com fraturas'
    ],
    difficultyLevel: 3,
    equipment: ['Colchonete'],
    targetMuscles: ['Oblíquos interno e externo', 'Quadrado lombar'],
    duration: '10-15 repetições cada lado',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-tronco-007',
    name: 'Mobilização Torácica com Foam Roller',
    description: 'Exercício de auto-mobilização da coluna torácica utilizando foam roller. Posicione o rolo na região torácica e realize movimentos de extensão, melhorando a mobilidade segmentar.',
    category: 'Mobilidade',
    bodyPart: 'Tronco',
    subcategory: 'Coluna Torácica',
    videoUrl: 'https://www.youtube.com/embed/6p8uWfyhhqs',
    indications: [
      'Rigidez torácica',
      'Cifose postural',
      'Síndrome do escritório',
      'Mobilidade pré-exercício'
    ],
    contraindications: [
      'Osteoporose severa',
      'Fraturas costais',
      'Hipermobilidade torácica',
      'Inflamação aguda'
    ],
    difficultyLevel: 2,
    equipment: ['Foam roller'],
    targetMuscles: ['Mobilização articular torácica'],
    duration: '3-5 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-tronco-008',
    name: 'Exercício de Respiração Diafragmática',
    description: 'Técnica de respiração específica para ativação do diafragma e estabilização central. Deite-se com joelhos flexionados e pratique respiração abdominal profunda.',
    category: 'Relaxamento',
    bodyPart: 'Tronco',
    subcategory: 'Respiração',
    videoUrl: 'https://www.youtube.com/embed/dP5RZybgNHo',
    indications: [
      'Disfunção diafragmática',
      'Instabilidade do core',
      'Estresse e ansiedade',
      'Reeducação respiratória'
    ],
    contraindications: [
      'Pneumotórax recente',
      'Insuficiência respiratória severa',
      'Hipertensão intracraniana',
      'Cirurgia abdominal recente'
    ],
    difficultyLevel: 1,
    equipment: ['Colchonete'],
    targetMuscles: ['Diafragma', 'Transverso do abdome', 'Músculos respiratórios'],
    duration: '5-10 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-tronco-009',
    name: 'Estabilização Lombo-Pélvica',
    description: 'Exercício de estabilização da região lombo-pélvica. Em decúbito dorsal com joelhos flexionados, ative o core e mantenha a pelve em posição neutra durante movimentos dos membros.',
    category: 'Propriocepção',
    bodyPart: 'Tronco',
    subcategory: 'Estabilização',
    videoUrl: 'https://www.youtube.com/embed/IODxDxX7oi4',
    indications: [
      'Instabilidade lombo-pélvica',
      'Dor lombar crônica',
      'Disfunção do controle motor',
      'Reabilitação funcional'
    ],
    contraindications: [
      'Dor aguda severa',
      'Instabilidade estrutural',
      'Hérnia discal com déficit',
      'Espondilolistese de alto grau'
    ],
    difficultyLevel: 3,
    equipment: ['Colchonete'],
    targetMuscles: ['Multífidos', 'Transverso do abdome', 'Psoas', 'Glúteos'],
    duration: '10-15 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-tronco-010',
    name: 'Mobilização da Coluna em Flexão Lateral',
    description: 'Exercício de mobilização em flexão lateral da coluna vertebral. Em pé ou sentado, incline o tronco lateralmente, promovendo alongamento e mobilidade das estruturas laterais.',
    category: 'Mobilidade',
    bodyPart: 'Tronco',
    subcategory: 'Flexão Lateral',
    videoUrl: 'https://www.youtube.com/embed/WY3BI8vz1V4',
    indications: [
      'Rigidez lateral da coluna',
      'Contratura do quadrado lombar',
      'Escoliose funcional',
      'Melhoria da mobilidade'
    ],
    contraindications: [
      'Escoliose estrutural severa',
      'Instabilidade lateral',
      'Hérnia discal posterolateral',
      'Síndrome radicular'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Quadrado lombar', 'Oblíquos', 'Intercostais'],
    duration: '2-3 minutos',
    frequency: '3-4x ao dia'
  },

  // === MEMBROS INFERIORES (12 exercícios) ===
  {
    id: 'ex-membros-inf-001',
    name: 'Flexão e Extensão de Joelho',
    description: 'Movimento ativo de flexão e extensão do joelho. Sentado ou em decúbito dorsal, realize movimentos completos de flexão e extensão, fundamentais para restaurar amplitude articular.',
    category: 'Mobilidade',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Joelho',
    videoUrl: 'https://www.youtube.com/embed/2pLT9ZhsQo0',
    indications: [
      'Rigidez articular do joelho',
      'Pós-cirúrgico de joelho',
      'Artrose de joelho',
      'Pós-imobilização'
    ],
    contraindications: [
      'Fratura não consolidada',
      'Instabilidade ligamentar severa',
      'Artrite séptica',
      'Derrame articular agudo'
    ],
    difficultyLevel: 1,
    equipment: ['Cadeira ou maca'],
    targetMuscles: ['Quadríceps', 'Isquiotibiais'],
    duration: '2-3 minutos',
    frequency: '4-5x ao dia'
  },
  {
    id: 'ex-membros-inf-002',
    name: 'Fortalecimento do Quadríceps',
    description: 'Exercício isométrico e dinâmico para fortalecimento do músculo quadríceps. Sentado, realize extensão do joelho contra resistência ou contraia isometricamente.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Coxa',
    videoUrl: 'https://www.youtube.com/embed/E9O0Je7s_0w',
    indications: [
      'Fraqueza do quadríceps',
      'Instabilidade do joelho',
      'Condromalácia patelar',
      'Pós-cirúrgico de LCA'
    ],
    contraindications: [
      'Dor femoropatelar severa',
      'Derrame articular agudo',
      'Lesão aguda do quadríceps',
      'Subluxação patelar'
    ],
    difficultyLevel: 2,
    equipment: ['Caneleira', 'Faixa elástica'],
    targetMuscles: ['Quadríceps femoral', 'Reto femoral', 'Vastos'],
    duration: '10-15 repetições',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-membros-inf-003',
    name: 'Alongamento dos Isquiotibiais',
    description: 'Alongamento específico da musculatura posterior da coxa. Em decúbito dorsal, eleve a perna mantendo o joelho estendido, intensificando o alongamento dos isquiotibiais.',
    category: 'Alongamento',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Coxa',
    videoUrl: 'https://www.youtube.com/embed/UGEpQ1BRx-4',
    indications: [
      'Tensão dos isquiotibiais',
      'Lombalgia de origem muscular',
      'Síndrome do piriforme',
      'Melhoria da flexibilidade'
    ],
    contraindications: [
      'Lesão aguda dos isquiotibiais',
      'Ciática aguda',
      'Instabilidade lombar',
      'Hérnia discal com irradiação'
    ],
    difficultyLevel: 1,
    equipment: ['Colchonete', 'Faixa elástica (opcional)'],
    targetMuscles: ['Bíceps femoral', 'Semitendinoso', 'Semimembranoso'],
    duration: '30-60 segundos cada perna',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-membros-inf-004',
    name: 'Fortalecimento dos Glúteos',
    description: 'Exercício específico para fortalecimento da musculatura glútea. Em decúbito lateral ou em pé, realize abdução do quadril e extensão posterior para ativar os glúteos.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Quadril',
    videoUrl: 'https://www.youtube.com/embed/SedyKzd6wKM',
    indications: [
      'Síndrome da banda iliotibial',
      'Instabilidade do quadril',
      'Dor lombar de origem mecânica',
      'Síndrome do piriforme'
    ],
    contraindications: [
      'Bursite trocantérica aguda',
      'Instabilidade do quadril',
      'Fratura de fêmur',
      'Artrose coxofemoral severa'
    ],
    difficultyLevel: 2,
    equipment: ['Colchonete', 'Faixa elástica'],
    targetMuscles: ['Glúteo máximo', 'Glúteo médio', 'Glúteo mínimo'],
    duration: '10-15 repetições',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-membros-inf-005',
    name: 'Mobilização do Tornozelo',
    description: 'Exercícios de mobilização articular do tornozelo. Realize movimentos de dorsiflexão, flexão plantar, eversão e inversão para restaurar amplitude articular completa.',
    category: 'Mobilidade',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Tornozelo',
    videoUrl: 'https://www.youtube.com/embed/OUgsJ8-Vi0E',
    indications: [
      'Rigidez do tornozelo',
      'Pós-imobilização',
      'Entorse de tornozelo',
      'Tendinite de Aquiles'
    ],
    contraindications: [
      'Fratura não consolidada',
      'Instabilidade ligamentar severa',
      'Trombose venosa profunda',
      'Inflamação aguda severa'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Músculos do tornozelo e pé'],
    duration: '3-5 minutos',
    frequency: '4-5x ao dia'
  },
  {
    id: 'ex-membros-inf-006',
    name: 'Alongamento da Panturrilha',
    description: 'Alongamento específico dos músculos da panturrilha. Apoie-se na parede e estenda a perna posterior, mantendo o calcanhar no chão para alongar gastrocnêmio e sóleo.',
    category: 'Alongamento',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Panturrilha',
    videoUrl: 'https://www.youtube.com/embed/lKzYwrVgKSw',
    indications: [
      'Tensão da panturrilha',
      'Fascite plantar',
      'Tendinite de Aquiles',
      'Síndrome compartimental crônica'
    ],
    contraindications: [
      'Ruptura do tendão de Aquiles',
      'Trombose venosa profunda',
      'Lesão aguda da panturrilha',
      'Síndrome compartimental agudo'
    ],
    difficultyLevel: 1,
    equipment: ['Parede'],
    targetMuscles: ['Gastrocnêmio', 'Sóleo', 'Plantar'],
    duration: '30-60 segundos cada perna',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-membros-inf-007',
    name: 'Propriocepção de Tornozelo',
    description: 'Exercícios proprioceptivos para melhoria do controle neuromuscular do tornozelo. Utilize apoio unipodal, superfícies instáveis e perturbações controladas.',
    category: 'Propriocepção',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Tornozelo',
    videoUrl: 'https://www.youtube.com/embed/4J3DaVJgYP4',
    indications: [
      'Instabilidade crônica de tornozelo',
      'Prevenção de entorses',
      'Retorno ao esporte',
      'Déficit proprioceptivo'
    ],
    contraindications: [
      'Dor severa',
      'Instabilidade aguda',
      'Fratura recente',
      'Vertigem severa'
    ],
    difficultyLevel: 3,
    equipment: ['Disco proprioceptivo', 'Bosu', 'Prancha de equilíbrio'],
    targetMuscles: ['Músculos estabilizadores do tornozelo'],
    duration: '10-15 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-membros-inf-008',
    name: 'Fortalecimento dos Músculos do Quadril',
    description: 'Exercício integrado para fortalecimento de toda musculatura do quadril. Inclui flexores, extensores, abdutores e adutores em diferentes posições e planos de movimento.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Quadril',
    videoUrl: 'https://www.youtube.com/embed/2GLrKr54yA0',
    indications: [
      'Fraqueza global do quadril',
      'Instabilidade lombo-pélvica',
      'Síndrome da dor trocantérica',
      'Prevenção de lesões'
    ],
    contraindications: [
      'Artrose coxofemoral severa',
      'Bursite trocantérica aguda',
      'Impacto femoroacetabular',
      'Pubalgia aguda'
    ],
    difficultyLevel: 3,
    equipment: ['Faixa elástica', 'Caneleiras'],
    targetMuscles: ['Musculatura global do quadril'],
    duration: '15-20 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-membros-inf-009',
    name: 'Mobilização da Articulação Coxofemoral',
    description: 'Técnica de mobilização específica da articulação do quadril. Realize movimentos passivos e ativos assistidos em todos os planos para melhorar amplitude articular.',
    category: 'Mobilidade',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Quadril',
    videoUrl: 'https://www.youtube.com/embed/gsV6TXWj3p0',
    indications: [
      'Rigidez coxofemoral',
      'Artrose inicial',
      'Pós-cirúrgico de quadril',
      'Capsulite do quadril'
    ],
    contraindications: [
      'Prótese de quadril recente',
      'Fratura não consolidada',
      'Instabilidade severa',
      'Ossificação heterotópica'
    ],
    difficultyLevel: 2,
    equipment: ['Maca'],
    targetMuscles: ['Cápsula articular do quadril'],
    duration: '5-10 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-membros-inf-010',
    name: 'Exercícios Funcionais para Membros Inferiores',
    description: 'Sequência de exercícios funcionais integrando toda cadeia cinética dos membros inferiores. Inclui agachamentos, afundos e atividades de transferência.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Funcional',
    videoUrl: 'https://www.youtube.com/embed/R2zWJqRt7JM',
    indications: [
      'Retorno às atividades funcionais',
      'Fortalecimento global',
      'Reabilitação avançada',
      'Condicionamento geral'
    ],
    contraindications: [
      'Instabilidade articular múltipla',
      'Dor severa persistente',
      'Déficit neurológico severo',
      'Cardiopatia não controlada'
    ],
    difficultyLevel: 4,
    equipment: ['Colchonete', 'Degrau'],
    targetMuscles: ['Musculatura global dos membros inferiores'],
    duration: '15-20 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-membros-inf-011',
    name: 'Alongamento do Piriforme',
    description: 'Alongamento específico do músculo piriforme. Em decúbito dorsal, cruze a perna e puxe o joelho em direção ao ombro contralateral, aliviando tensão no piriforme.',
    category: 'Alongamento',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Quadril',
    videoUrl: 'https://www.youtube.com/embed/1-dDnQGqOmk',
    indications: [
      'Síndrome do piriforme',
      'Dor glútea profunda',
      'Pseudo-ciática',
      'Tensão dos rotadores externos'
    ],
    contraindications: [
      'Instabilidade do quadril',
      'Prótese de quadril',
      'Bursite isquiática',
      'Lesão do nervo ciático'
    ],
    difficultyLevel: 2,
    equipment: ['Colchonete'],
    targetMuscles: ['Piriforme', 'Rotadores externos do quadril'],
    duration: '30-60 segundos cada lado',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-membros-inf-012',
    name: 'Fortalecimento dos Músculos Intrínsecos do Pé',
    description: 'Exercícios específicos para fortalecimento da musculatura intrínseca do pé. Realize movimentos de flexão dos dedos, formação de arco e exercícios com toalha.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Pé',
    videoUrl: 'https://www.youtube.com/embed/XA7PQSgBgmI',
    indications: [
      'Fascite plantar',
      'Pé plano funcional',
      'Metatarsalgia',
      'Dedos em garra'
    ],
    contraindications: [
      'Fratura de metatarsos',
      'Inflamação aguda severa',
      'Neuropatia diabética severa',
      'Úlceras plantares'
    ],
    difficultyLevel: 2,
    equipment: ['Toalha', 'Bolinhas'],
    targetMuscles: ['Músculos intrínsecos do pé', 'Flexores dos dedos'],
    duration: '5-10 minutos',
    frequency: '2-3x ao dia'
  },

  // === CATEGORIAS ESPECIALIZADAS EXTRAS (8 exercícios) ===
  {
    id: 'ex-hidroter-001',
    name: 'Caminhada em Piscina Terapêutica',
    description: 'Exercício de caminhada em água aquecida para redução do impacto articular. Utilize diferentes direções e velocidades para trabalhar força, equilíbrio e coordenação com benefícios da hidroterapia.',
    category: 'Cardio',
    bodyPart: 'Geral',
    subcategory: 'Hidroterapia',
    videoUrl: 'https://www.youtube.com/embed/3tXfMwgJGns',
    indications: [
      'Artrose generalizada',
      'Fibromialgia',
      'Reabilitação pós-cirúrgica',
      'Condicionamento de baixo impacto'
    ],
    contraindications: [
      'Infecções cutâneas',
      'Feridas abertas',
      'Incontinência urinária/fecal',
      'Medo da água'
    ],
    difficultyLevel: 2,
    equipment: ['Piscina terapêutica'],
    targetMuscles: ['Musculatura global'],
    duration: '15-30 minutos',
    frequency: '2-3x por semana'
  },
  {
    id: 'ex-geriatrico-001',
    name: 'Exercício de Equilíbrio para Idosos',
    description: 'Sequência específica de exercícios de equilíbrio adaptados para população geriátrica. Inclui apoio unipodal, transferências de peso e movimentos funcionais seguros.',
    category: 'Equilíbrio',
    bodyPart: 'Geral',
    subcategory: 'Geriatria',
    videoUrl: 'https://www.youtube.com/embed/kLAeKUC0XvE',
    indications: [
      'Prevenção de quedas',
      'Instabilidade postural',
      'Sarcopenia',
      'Declínio funcional'
    ],
    contraindications: [
      'Déficit cognitivo severo',
      'Hipotensão postural severa',
      'Vertigem não controlada',
      'Instabilidade articular severa'
    ],
    difficultyLevel: 2,
    equipment: ['Cadeira', 'Barra de apoio'],
    targetMuscles: ['Músculos estabilizadores globais'],
    duration: '10-15 minutos',
    frequency: '3-4x por semana'
  },
  {
    id: 'ex-pediatrico-001',
    name: 'Atividade Lúdica de Coordenação',
    description: 'Exercício lúdico para desenvolvimento da coordenação motora em crianças. Utiliza jogos, brinquedos e atividades divertidas para estimular o desenvolvimento motor.',
    category: 'Propriocepção',
    bodyPart: 'Geral',
    subcategory: 'Pediatria',
    videoUrl: 'https://www.youtube.com/embed/aG3Lx4Cc7u0',
    indications: [
      'Atraso do desenvolvimento motor',
      'Hipotonia muscular',
      'Déficit de coordenação',
      'Paralisia cerebral leve'
    ],
    contraindications: [
      'Epilepsia não controlada',
      'Déficit cognitivo severo',
      'Instabilidade médica',
      'Fraturas recentes'
    ],
    difficultyLevel: 2,
    equipment: ['Brinquedos educativos', 'Bolas coloridas', 'Tapete sensorial'],
    targetMuscles: ['Desenvolvimento motor global'],
    duration: '20-30 minutos',
    frequency: '2-3x por semana'
  },
  {
    id: 'ex-respiratorio-001',
    name: 'Exercício Respiratório com Incentivador',
    description: 'Técnica respiratória específica utilizando incentivador inspiratório para melhorar capacidade pulmonar e força dos músculos respiratórios.',
    category: 'Cardio',
    bodyPart: 'Tronco',
    subcategory: 'Fisioterapia Respiratória',
    videoUrl: 'https://www.youtube.com/embed/sH8ufhx4IcE',
    indications: [
      'DPOC',
      'Pós-operatório torácico',
      'Fraqueza da musculatura respiratória',
      'Atelectasia'
    ],
    contraindications: [
      'Pneumotórax não tratado',
      'Hemoptise ativa',
      'Instabilidade cardiovascular',
      'Confusão mental severa'
    ],
    difficultyLevel: 2,
    equipment: ['Incentivador inspiratório'],
    targetMuscles: ['Diafragma', 'Músculos respiratórios'],
    duration: '10-15 minutos',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-pelvico-001',
    name: 'Fortalecimento do Assoalho Pélvico',
    description: 'Exercício específico para fortalecimento da musculatura do assoalho pélvico. Técnica de contração e relaxamento controlados dos músculos pélvicos.',
    category: 'Fortalecimento',
    bodyPart: 'Tronco',
    subcategory: 'Assoalho Pélvico',
    videoUrl: 'https://www.youtube.com/embed/QaHUghhzUBY',
    indications: [
      'Incontinência urinária',
      'Prolapso pélvico',
      'Pós-parto',
      'Disfunção sexual'
    ],
    contraindications: [
      'Infecção urinária ativa',
      'Vaginismo severo',
      'Dor pélvica crônica agudizada',
      'Retenção urinária'
    ],
    difficultyLevel: 2,
    equipment: ['Biofeedback (opcional)'],
    targetMuscles: ['Músculos do assoalho pélvico'],
    duration: '5-10 minutos',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-esportivo-001',
    name: 'Exercício Pliométrico para Retorno ao Esporte',
    description: 'Exercício pliométrico específico para atletas em fase de retorno ao esporte. Inclui saltos, aterrissagens controladas e mudanças de direção.',
    category: 'Fortalecimento',
    bodyPart: 'Membros Inferiores',
    subcategory: 'Fisioterapia Esportiva',
    videoUrl: 'https://www.youtube.com/embed/6Gd6xkgX8S0',
    indications: [
      'Retorno ao esporte pós-lesão',
      'Fortalecimento funcional avançado',
      'Prevenção de lesões',
      'Condicionamento específico'
    ],
    contraindications: [
      'Lesão aguda não resolvida',
      'Instabilidade articular não tratada',
      'Dor persistente',
      'Déficit proprioceptivo severo'
    ],
    difficultyLevel: 5,
    equipment: ['Cones', 'Barreiras', 'Superfícies variadas'],
    targetMuscles: ['Musculatura global dos membros inferiores'],
    duration: '20-30 minutos',
    frequency: '2-3x por semana'
  },
  {
    id: 'ex-relaxamento-001',
    name: 'Técnica de Relaxamento Progressivo',
    description: 'Técnica de relaxamento muscular progressivo de Jacobson. Sequência de contração e relaxamento de diferentes grupos musculares para redução do estresse e tensão.',
    category: 'Relaxamento',
    bodyPart: 'Geral',
    subcategory: 'Técnicas de Relaxamento',
    videoUrl: 'https://www.youtube.com/embed/86HUcX8ZtAk',
    indications: [
      'Estresse e ansiedade',
      'Tensão muscular generalizada',
      'Insônia',
      'Síndrome da fibromialgia'
    ],
    contraindications: [
      'Psicose ativa',
      'Depressão severa',
      'Hipotensão severa',
      'Distúrbios dissociativos'
    ],
    difficultyLevel: 1,
    equipment: ['Colchonete', 'Ambiente silencioso'],
    targetMuscles: ['Relaxamento muscular global'],
    duration: '15-20 minutos',
    frequency: '1-2x ao dia'
  },
  {
    id: 'ex-dor-cronica-001',
    name: 'Exercício de Graduação da Atividade',
    description: 'Programa de exercícios graduados especificamente desenvolvido para pacientes com dor crônica. Progressão lenta e controlada respeitando limites de dor.',
    category: 'Mobilidade',
    bodyPart: 'Geral',
    subcategory: 'Dor Crônica',
    videoUrl: 'https://www.youtube.com/embed/kBCl-oqNT8I',
    indications: [
      'Dor lombar crônica',
      'Fibromialgia',
      'Síndrome da dor complexa regional',
      'Descondicionamento por dor'
    ],
    contraindications: [
      'Dor aguda não diagnosticada',
      'Sinais de alerta (red flags)',
      'Depressão severa não tratada',
      'Catastrofização extrema'
    ],
    difficultyLevel: 2,
    equipment: ['Variável conforme necessidade'],
    targetMuscles: ['Conforme objetivo específico'],
    duration: '10-15 minutos iniciais',
    frequency: 'Progressão gradual'
  },

  // === CERVICAL (12 exercícios) ===
  {
    id: 'ex-cervical-001',
    name: 'Rotação Cervical Ativa',
    description: 'Movimento ativo de rotação da coluna cervical. Sentado ou em pé, gire suavemente a cabeça para direita e esquerda, respeitando os limites de conforto. Mantenha os ombros relaxados.',
    category: 'Mobilidade',
    bodyPart: 'Cervical',
    subcategory: 'Mobilidade Ativa',
    videoUrl: 'https://www.youtube.com/embed/zkYnK1q1pNs',
    indications: [
      'Rigidez cervical',
      'Cervicalgia mecânica',
      'Torcicolo',
      'Manutenção da amplitude articular'
    ],
    contraindications: [
      'Instabilidade cervical',
      'Artrite reumatoide ativa',
      'Vertigem severa',
      'Insuficiência vertebrobasilar'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Músculos cervicais profundos', 'Suboccipitais'],
    duration: '1-2 minutos',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-cervical-002',
    name: 'Retração Cervical',
    description: 'Exercício fundamental para reeducação postural cervical. Realize movimento de "queixo para dentro" como se fosse fazer um "duplo queixo", mantendo o olhar no horizonte.',
    category: 'Fortalecimento',
    bodyPart: 'Cervical',
    subcategory: 'Estabilização',
    videoUrl: 'https://www.youtube.com/embed/LT_dFRnmdGs',
    indications: [
      'Postura anteriorizada da cabeça',
      'Cervicalgia postural',
      'Cefaleia tensional',
      'Síndrome cruzada superior'
    ],
    contraindications: [
      'Fratura cervical',
      'Espondilite anquilosante ativa',
      'Hipermobilidade cervical',
      'Tontura com movimentos cervicais'
    ],
    difficultyLevel: 2,
    equipment: [],
    targetMuscles: ['Flexores profundos do pescoço', 'Longus colli'],
    duration: '30 segundos por repetição',
    frequency: '3-4x ao dia, 10 repetições'
  },
  {
    id: 'ex-cervical-003',
    name: 'Flexão Lateral Cervical',
    description: 'Alongamento ativo da musculatura lateral do pescoço. Incline suavemente a cabeça em direção ao ombro, mantendo o ombro contralateral relaxado e baixo.',
    category: 'Alongamento',
    bodyPart: 'Cervical',
    subcategory: 'Alongamento Ativo',
    videoUrl: 'https://www.youtube.com/embed/PvmQqLq4Qnc',
    indications: [
      'Tensão muscular cervical lateral',
      'Contratura do trapézio superior',
      'Torcicolo espasmódico',
      'Reabilitação pós-whiplash'
    ],
    contraindications: [
      'Hérnia discal cervical aguda',
      'Radiculopatia cervical',
      'Instabilidade articular',
      'Hipermobilidade generalizada'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Trapézio superior', 'Levantador da escápula', 'Escalenos'],
    duration: '20-30 segundos cada lado',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-cervical-004',
    name: 'Extensão Cervical Controlada',
    description: 'Movimento controlado de extensão cervical para restaurar amplitude de movimento posterior. Realize o movimento lentamente, evitando hiperextensão excessiva.',
    category: 'Mobilidade',
    bodyPart: 'Cervical',
    subcategory: 'Mobilidade Ativa',
    videoUrl: 'https://www.youtube.com/embed/6q0rWxcKpnE',
    indications: [
      'Limitação da extensão cervical',
      'Cifose cervical',
      'Trabalho prolongado em flexão',
      'Síndrome do texto'
    ],
    contraindications: [
      'Estenose do canal vertebral',
      'Espondilose cervical severa',
      'Vertigem de origem cervical',
      'Mielopatia cervical'
    ],
    difficultyLevel: 2,
    equipment: [],
    targetMuscles: ['Extensores cervicais', 'Suboccipitais'],
    duration: '1-2 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-cervical-005',
    name: 'Mobilização C1-C2',
    description: 'Técnica específica para mobilização da articulação atlantoaxial. Com a cabeça em posição neutra, realize pequenos movimentos de rotação focando nas vértebras altas.',
    category: 'Mobilidade',
    bodyPart: 'Cervical',
    subcategory: 'Mobilização Específica',
    videoUrl: 'https://www.youtube.com/embed/hOL30oDxF_s',
    indications: [
      'Rigidez occipito-atlanto-axial',
      'Cefaleia cervicogênica',
      'Disfunção da articulação C1-C2',
      'Limitação rotacional alta'
    ],
    contraindications: [
      'Instabilidade atlanto-axial',
      'Malformação de Arnold-Chiari',
      'Artrite reumatoide cervical',
      'Síndrome de Down'
    ],
    difficultyLevel: 3,
    equipment: [],
    targetMuscles: ['Músculos suboccipitais'],
    duration: '2-3 minutos',
    frequency: '2x ao dia'
  },
  {
    id: 'ex-cervical-006',
    name: 'Fortalecimento Flexores Profundos',
    description: 'Exercício isométrico para fortalecimento dos flexores cervicais profundos. Em decúbito dorsal, pressione a cabeça contra a superfície como se quisesse fazer uma retração cervical.',
    category: 'Fortalecimento',
    bodyPart: 'Cervical',
    subcategory: 'Fortalecimento Isométrico',
    videoUrl: 'https://www.youtube.com/embed/7pZQ4-f7h7Q',
    indications: [
      'Fraqueza dos flexores cervicais',
      'Instabilidade cervical funcional',
      'Reabilitação pós-whiplash',
      'Cervicalgia crônica'
    ],
    contraindications: [
      'Compressão arterial vertebral',
      'Hipotensão postural',
      'Cefaleia vascular',
      'Fragilidade óssea cervical'
    ],
    difficultyLevel: 2,
    equipment: ['Maca ou colchonete'],
    targetMuscles: ['Longus colli', 'Longus capitis', 'Flexores profundos'],
    duration: '5-10 seconds hold, 10 repetições',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-cervical-007',
    name: 'Alongamento Trapézio Superior',
    description: 'Alongamento específico do trapézio superior. Incline a cabeça para um lado enquanto puxa o braço contralateral para baixo, intensificando o alongamento da musculatura lateral do pescoço.',
    category: 'Alongamento',
    bodyPart: 'Cervical',
    subcategory: 'Alongamento Passivo',
    videoUrl: 'https://www.youtube.com/embed/JV0pHR-DFy4',
    indications: [
      'Contratura do trapézio superior',
      'Cefaleia tensional',
      'Síndrome cruzada superior',
      'Tensão muscular pós-estresse'
    ],
    contraindications: [
      'Lesão aguda do trapézio',
      'Radiculopatia cervical',
      'Instabilidade cervical',
      'Síndrome do desfiladeiro torácico'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Trapézio superior', 'Levantador da escápula'],
    duration: '30 segundos cada lado',
    frequency: '3-4x ao dia'
  },
  {
    id: 'ex-cervical-008',
    name: 'Mobilização Occipital',
    description: 'Técnica de mobilização da região suboccipital. Com os dedos posicionados na base do crânio, realize pressão suave e movimento de tração para relaxar os músculos suboccipitais.',
    category: 'Mobilidade',
    bodyPart: 'Cervical',
    subcategory: 'Técnica Manual',
    videoUrl: 'https://www.youtube.com/embed/qvuV3g0bSg0',
    indications: [
      'Cefaleia tensional',
      'Tensão suboccipital',
      'Rigidez da junção cranio-cervical',
      'Dor occipital'
    ],
    contraindications: [
      'Malformação cranio-cervical',
      'Instabilidade occipito-atlantal',
      'Hipertensão intracraniana',
      'Enxaqueca aguda'
    ],
    difficultyLevel: 2,
    equipment: [],
    targetMuscles: ['Músculos suboccipitais'],
    duration: '3-5 minutos',
    frequency: '2x ao dia'
  },
  {
    id: 'ex-cervical-009',
    name: 'Exercício Cranio-Cervical',
    description: 'Exercício de coordenação entre movimento craniano e cervical. Realize flexão da cabeça sobre C1 mantendo o pescoço neutro, como um movimento de "sim" sutil.',
    category: 'Propriocepção',
    bodyPart: 'Cervical',
    subcategory: 'Controle Motor',
    videoUrl: 'https://www.youtube.com/embed/rVzEfk1uNr4',
    indications: [
      'Disfunção do controle motor cervical',
      'Reabilitação neurológica',
      'Cefaleia cervicogênica',
      'Tontura cervical'
    ],
    contraindications: [
      'Instabilidade cranio-cervical',
      'Déficit neurológico central',
      'Vertigem posicional',
      'Hipertensão intracraniana'
    ],
    difficultyLevel: 3,
    equipment: [],
    targetMuscles: ['Flexores cervicais profundos', 'Suboccipitais'],
    duration: '2-3 minutos',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-cervical-010',
    name: 'Estabilização Cervical Isométrica',
    description: 'Exercícios isométricos em todas as direções para fortalecer a musculatura estabilizadora cervical. Aplicar resistência manual em flexão, extensão, flexões laterais e rotações.',
    category: 'Fortalecimento',
    bodyPart: 'Cervical',
    subcategory: 'Fortalecimento Isométrico',
    videoUrl: 'https://www.youtube.com/embed/SF30mP7OTNI',
    indications: [
      'Instabilidade cervical funcional',
      'Fortalecimento global cervical',
      'Reabilitação pós-trauma',
      'Prevenção de lesões'
    ],
    contraindications: [
      'Instabilidade estrutural',
      'Compressão vascular',
      'Dor irradiada severa',
      'Déficit neurológico progressivo'
    ],
    difficultyLevel: 3,
    equipment: [],
    targetMuscles: ['Musculatura cervical global'],
    duration: '5 segundos cada direção, 5 repetições',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-cervical-011',
    name: 'Rotação com Resistência',
    description: 'Fortalecimento dos rotadores cervicais com resistência manual ou elástica. Mantenha a cabeça em posição neutra e realize rotação contra resistência progressiva.',
    category: 'Fortalecimento',
    bodyPart: 'Cervical',
    subcategory: 'Fortalecimento Resistido',
    videoUrl: 'https://www.youtube.com/embed/ixR3HA9K4nY',
    indications: [
      'Fraqueza dos rotadores cervicais',
      'Assimetria muscular',
      'Reabilitação esportiva',
      'Fortalecimento funcional'
    ],
    contraindications: [
      'Compressão radicular',
      'Instabilidade rotatória',
      'Vertigem com movimento',
      'Estenose foraminal'
    ],
    difficultyLevel: 3,
    equipment: ['Faixa elástica (opcional)'],
    targetMuscles: ['Rotadores cervicais', 'Esplênio', 'Semiespinal'],
    duration: '10 repetições cada lado',
    frequency: '2-3x ao dia'
  },
  {
    id: 'ex-cervical-012',
    name: 'Flexão Cervical Ativa',
    description: 'Movimento ativo de flexão cervical para restaurar amplitude anterior. Abaixe o queixo em direção ao peito de forma controlada, sentindo o alongamento posterior do pescoço.',
    category: 'Mobilidade',
    bodyPart: 'Cervical',
    subcategory: 'Mobilidade Ativa',
    videoUrl: 'https://www.youtube.com/embed/UdYnCVLzIFg',
    indications: [
      'Limitação da flexão cervical',
      'Rigidez dos extensores',
      'Reabilitação pós-cirúrgica',
      'Manutenção da amplitude'
    ],
    contraindications: [
      'Hérnia discal cervical anterior',
      'Instabilidade em flexão',
      'Mielopatia cervical',
      'Espondilose anterior severa'
    ],
    difficultyLevel: 1,
    equipment: [],
    targetMuscles: ['Extensores cervicais (alongamento)'],
    duration: '1-2 minutos',
    frequency: '3-4x ao dia'
  }
];
export const INITIAL_APPOINTMENTS: Appointment[] = [];
export const INITIAL_TIMEBLOCKS: TimeBlock[] = [];
export const INITIAL_PRESCRIPTIONS: Prescription[] = [];
export const INITIAL_EXERCISE_LOGS: ExerciseLog[] = [];
export const INITIAL_ASSESSMENTS: Assessment[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_DOCUMENTS: Document[] = [];
export const INITIAL_CHATS: Chat[] = [];
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];
export const INITIAL_COURSES: Course[] = [];
export const INITIAL_STUDENT_PROGRESS: StudentProgress[] = [];
export const INITIAL_MENTORSHIP_SESSIONS: MentorshipSession[] = [];
export const INITIAL_CLINICAL_CASES: ClinicalCase[] = [];
export const INITIAL_CASE_ATTACHMENTS: CaseAttachment[] = [];
export const INITIAL_CASE_COMMENTS: CaseComment[] = [];
export const INITIAL_CASE_VIEWS: CaseView[] = [];
export const INITIAL_CASE_RATINGS: CaseRating[] = [];
export const INITIAL_CASE_FAVORITES: CaseFavorite[] = [];
export const INITIAL_CLINICAL_PROTOCOLS: ClinicalProtocol[] = [];
export const INITIAL_PROTOCOL_PHASES: ProtocolPhase[] = [];
export const INITIAL_PROTOCOL_EXERCISES: ProtocolExercise[] = [];
export const INITIAL_PROTOCOL_EVIDENCES: ProtocolEvidence[] = [];
export const INITIAL_PATIENT_PROTOCOLS: PatientProtocol[] = [];
export const INITIAL_PROTOCOL_CUSTOMIZATIONS: ProtocolCustomization[] = [];
export const INITIAL_PROTOCOL_PROGRESS_NOTES: ProtocolProgressNote[] = [];
export const INITIAL_PROTOCOL_OUTCOMES: ProtocolOutcome[] = [];
export const INITIAL_PROTOCOL_ANALYTICS: ProtocolAnalytics[] = [];
export const INITIAL_QUALITY_INDICATORS: QualityIndicator[] = [];
export const INITIAL_PRODUCTIVITY_METRICS: ProductivityMetric[] = [];
export const INITIAL_EQUIPMENT: Equipment[] = [];
export const INITIAL_OPERATIONAL_ALERTS: OperationalAlert[] = [];
export const INITIAL_EXECUTIVE_REPORTS: ExecutiveReport[] = [];

// === SISTEMA DE FAVORITOS E AVALIAÇÕES ===
export const INITIAL_EXERCISE_FAVORITES: ExerciseFavorite[] = [];
export const INITIAL_EXERCISE_RATINGS: ExerciseRating[] = [];

// === SISTEMA DE VÍDEOS E IMAGENS ===
export const INITIAL_EXERCISE_VIDEOS: ExerciseVideo[] = [];
export const INITIAL_EXERCISE_IMAGES: ExerciseImage[] = [];

// === CONSTANTES DE CONFIGURAÇÃO ===
export const APP_CONFIG = {
  maxCacheSize: 1000,
  defaultPageSize: 20,
  debounceMs: 300,
  maxUploadSize: 10 * 1024 * 1024, // 10MB
  supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
  supportedDocFormats: ['pdf', 'doc', 'docx', 'txt'],
};

export const UI_CONSTANTS = {
  sidebar: {
    width: 280,
    collapsedWidth: 64,
  },
  header: {
    height: 64,
  },
  colors: {
    primary: '#3B82F6',
    secondary: '#64748B', 
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
};