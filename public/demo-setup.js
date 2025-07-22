// Script para carregar dados de demo automaticamente
(function() {
  // Verificar se deve carregar demo
  const urlParams = new URLSearchParams(window.location.search);
  const isDemoMode = urlParams.get('demo') === 'true';
  
  if (isDemoMode) {
    console.log('🚀 Carregando dados de demo...');
    
    // Dados de demo
    const demoData = {
      patients: [
        {
          id: 'demo-1',
          name: 'João Silva (DEMO)',
          email: 'joao@demo.com',
          phone: '(11) 99999-1234',
          cpf: '123.456.789-00',
          birth_date: '1985-05-15',
          diagnosis: 'Dor lombar crônica',
          status: 'active',
          created_at: new Date().toISOString(),
          medical_history: 'Histórico de dor lombar há 2 anos',
          current_complaints: 'Dor ao levantar e sentar'
        },
        {
          id: 'demo-2',
          name: 'Maria Santos (DEMO)',
          email: 'maria@demo.com',
          phone: '(11) 99999-5678',
          cpf: '987.654.321-00', 
          birth_date: '1990-08-22',
          diagnosis: 'Tendinite no ombro direito',
          status: 'active',
          created_at: new Date().toISOString(),
          medical_history: 'Movimentos repetitivos no trabalho',
          current_complaints: 'Dor ao elevar o braço'
        },
        {
          id: 'demo-3',
          name: 'Carlos Oliveira (DEMO)',
          email: 'carlos@demo.com',
          phone: '(11) 99999-9999',
          cpf: '456.789.123-00',
          birth_date: '1978-12-10',
          diagnosis: 'Artrose no joelho',
          status: 'active',
          created_at: new Date().toISOString(),
          medical_history: 'Ex-atleta, desgaste articular',
          current_complaints: 'Rigidez matinal e dor ao caminhar'
        }
      ],
      
      tasks: [
        {
          id: 'task-1',
          title: 'Avaliar João Silva',
          description: 'Primeira consulta - avaliação postural completa',
          status: 'todo',
          priority: 'high',
          patientId: 'demo-1',
          assigneeId: 'user-1',
          dueDate: new Date(Date.now() + 86400000).toISOString(), // amanhã
          created_at: new Date().toISOString()
        },
        {
          id: 'task-2',
          title: 'Relatório Maria Santos',
          description: 'Elaborar relatório de evolução do tratamento',
          status: 'doing',
          priority: 'medium', 
          patientId: 'demo-2',
          assigneeId: 'user-1',
          dueDate: new Date(Date.now() + 172800000).toISOString(), // 2 dias
          created_at: new Date().toISOString()
        },
        {
          id: 'task-3',
          title: 'Plano Carlos Oliveira',
          description: 'Desenvolver plano de exercícios para artrose',
          status: 'done',
          priority: 'medium',
          patientId: 'demo-3', 
          assigneeId: 'user-1',
          completedAt: new Date().toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString() // ontem
        }
      ],
      
      appointments: [
        {
          id: 'apt-1',
          patientId: 'demo-1',
          date: new Date(Date.now() + 86400000).toISOString(),
          time: '09:00',
          duration: 60,
          type: 'Primeira consulta',
          status: 'scheduled',
          notes: 'Avaliação postural completa'
        },
        {
          id: 'apt-2', 
          patientId: 'demo-2',
          date: new Date(Date.now() + 172800000).toISOString(),
          time: '14:30',
          duration: 45,
          type: 'Retorno',
          status: 'scheduled',
          notes: 'Reavaliação do ombro'
        }
      ]
    };
    
    // Salvar dados no localStorage
    try {
      localStorage.setItem('patients', JSON.stringify(demoData.patients));
      localStorage.setItem('tasks', JSON.stringify(demoData.tasks));
      localStorage.setItem('appointments', JSON.stringify(demoData.appointments));
      localStorage.setItem('demo-mode', 'true');
      
      console.log('✅ Dados de demo carregados com sucesso!');
      console.log(`📊 ${demoData.patients.length} pacientes`);
      console.log(`📋 ${demoData.tasks.length} tarefas`);
      console.log(`📅 ${demoData.appointments.length} consultas`);
      
      // Remover parâmetro demo da URL
      const url = new URL(window.location);
      url.searchParams.delete('demo');
      window.history.replaceState({}, '', url);
      
      // Mostrar notificação
      if (window.location.pathname === '/') {
        setTimeout(() => {
          alert('🎉 Dados de demonstração carregados!\n\n' +
                '✅ 3 pacientes de exemplo\n' +
                '✅ Tarefas no Kanban\n' + 
                '✅ Consultas agendadas\n\n' +
                'Explore as funcionalidades!');
        }, 2000);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados de demo:', error);
    }
  }
  
  // Verificar se já está em modo demo
  const isDemoLoaded = localStorage.getItem('demo-mode') === 'true';
  if (isDemoLoaded) {
    console.log('📱 Modo demonstração ativo');
  }
})();