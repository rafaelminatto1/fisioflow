import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, History, Edit, FileText, Plus } from 'lucide-react';
import { Patient } from '@/types/patient';

interface PatientExercisesTabProps {
  patient: Patient;
  onUpdate: (updates: Partial<Patient>) => void;
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  videoUrl?: string;
  sets: number;
  reps: number;
  duration?: number;
  frequency: string;
  status: 'active' | 'completed' | 'paused';
  prescribedDate: string;
  lastPerformed?: string;
  adherence: number;
}

interface ExerciseHistory {
  id: string;
  exerciseId: string;
  performedDate: string;
  sets: number;
  reps: number;
  duration?: number;
  notes?: string;
  painLevel?: number;
}

const mockExercises: Exercise[] = [
  {
    id: '1',
    name: 'Alongamento Cervical',
    description: 'Exercício para alívio da tensão cervical',
    sets: 3,
    reps: 10,
    frequency: '2x ao dia',
    status: 'active',
    prescribedDate: '2024-01-15',
    lastPerformed: '2024-01-20',
    adherence: 85
  },
  {
    id: '2',
    name: 'Fortalecimento Lombar',
    description: 'Exercícios para fortalecimento da musculatura lombar',
    sets: 2,
    reps: 15,
    duration: 30,
    frequency: '3x por semana',
    status: 'active',
    prescribedDate: '2024-01-10',
    lastPerformed: '2024-01-19',
    adherence: 70
  },
  {
    id: '3',
    name: 'Mobilidade de Ombro',
    description: 'Exercícios para melhora da amplitude de movimento',
    sets: 2,
    reps: 12,
    frequency: 'Diário',
    status: 'completed',
    prescribedDate: '2024-01-05',
    lastPerformed: '2024-01-18',
    adherence: 95
  }
];

const mockHistory: ExerciseHistory[] = [
  {
    id: '1',
    exerciseId: '1',
    performedDate: '2024-01-20',
    sets: 3,
    reps: 10,
    notes: 'Executado sem dor',
    painLevel: 2
  },
  {
    id: '2',
    exerciseId: '2',
    performedDate: '2024-01-19',
    sets: 2,
    reps: 15,
    duration: 30,
    notes: 'Leve desconforto no final',
    painLevel: 4
  }
];

export function PatientExercisesTab({ patient, onUpdate }: PatientExercisesTabProps) {
  const [exercises] = useState<Exercise[]>(mockExercises);
  const [history] = useState<ExerciseHistory[]>(mockHistory);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const getStatusColor = (status: Exercise['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAdherenceColor = (adherence: number) => {
    if (adherence >= 80) return 'text-green-600';
    if (adherence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Exercícios Prescritos</h3>
          <p className="text-sm text-gray-600">
            {exercises.filter(e => e.status === 'active').length} exercícios ativos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Gerar Ficha
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Prescrever
          </Button>
        </div>
      </div>

      <Tabs defaultValue="exercises" className="w-full">
        <TabsList>
          <TabsTrigger value="exercises">Exercícios</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="exercises" className="space-y-4">
          <div className="grid gap-4">
            {exercises.map((exercise) => (
              <Card key={exercise.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{exercise.name}</h4>
                        <Badge className={getStatusColor(exercise.status)}>
                          {exercise.status === 'active' ? 'Ativo' : 
                           exercise.status === 'completed' ? 'Concluído' : 'Pausado'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{exercise.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{exercise.sets} séries × {exercise.reps} repetições</span>
                        {exercise.duration && <span>{exercise.duration} min</span>}
                        <span>{exercise.frequency}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1">
                        {exercise.videoUrl && (
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedExercise(exercise)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getAdherenceColor(exercise.adherence)}`}>
                          {exercise.adherence}% aderência
                        </div>
                        {exercise.lastPerformed && (
                          <div className="text-xs text-gray-500">
                            Último: {new Date(exercise.lastPerformed).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((record) => {
                  const exercise = exercises.find(e => e.id === record.exerciseId);
                  return (
                    <div key={record.id} className="border-l-2 border-blue-200 pl-4 py-2">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium">{exercise?.name}</h5>
                          <p className="text-sm text-gray-600">
                            {record.sets} séries × {record.reps} repetições
                            {record.duration && ` × ${record.duration} min`}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {new Date(record.performedDate).toLocaleDateString('pt-BR')}
                          </div>
                          {record.painLevel && (
                            <div className="text-xs text-gray-500">
                              Dor: {record.painLevel}/10
                            </div>
                          )}
                        </div>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-gray-600 italic">"{record.notes}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}