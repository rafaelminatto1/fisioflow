import { Patient } from '@/types';
import { Task } from '@/types';

// Função para validar e carregar pacientes do localStorage
export function getValidatedPatientsFromStorage(): Patient[] {
  try {
    const stored = localStorage.getItem('patients');
    if (!stored) return [];
    
    const patients = JSON.parse(stored);
    if (!Array.isArray(patients)) return [];
    
    // Validação básica da estrutura dos pacientes
    return patients.filter((patient: any) => 
      patient && 
      typeof patient.id === 'string' && 
      typeof patient.name === 'string' &&
      typeof patient.tenantId === 'string'
    );
  } catch (error) {
    console.error('Erro ao carregar pacientes do localStorage:', error);
    return [];
  }
}

// Função para validar e carregar tarefas do localStorage
export function getValidatedTasksFromStorage(): Task[] {
  try {
    const stored = localStorage.getItem('tasks');
    if (!stored) return [];
    
    const tasks = JSON.parse(stored);
    if (!Array.isArray(tasks)) return [];
    
    // Validação básica da estrutura das tarefas
    return tasks.filter((task: any) => 
      task && 
      typeof task.id === 'string' && 
      typeof task.title === 'string' &&
      typeof task.tenantId === 'string'
    );
  } catch (error) {
    console.error('Erro ao carregar tarefas do localStorage:', error);
    return [];
  }
}

// Função para salvar pacientes no localStorage
export function savePatientsToStorage(patients: Patient[]): void {
  try {
    localStorage.setItem('patients', JSON.stringify(patients));
  } catch (error) {
    console.error('Erro ao salvar pacientes no localStorage:', error);
  }
}

// Função para salvar tarefas no localStorage
export function saveTasksToStorage(tasks: Task[]): void {
  try {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  } catch (error) {
    console.error('Erro ao salvar tarefas no localStorage:', error);
  }
}