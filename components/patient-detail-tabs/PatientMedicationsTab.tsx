import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Patient } from '@/types/patient';

interface PatientMedicationsTabProps {
  patient: Patient;
  onUpdate: (updates: Partial<Patient>) => void;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string; // oral, tópico, injetável
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'suspended';
  prescribedBy: string;
  notes?: string;
  sideEffects?: string[];
  interactions?: string[];
}

interface MedicationHistory {
  id: string;
  medicationId: string;
  takenDate: string;
  takenTime: string;
  dosageTaken: string;
  notes?: string;
  sideEffectsReported?: string[];
}

const mockMedications: Medication[] = [
  {
    id: '1',
    name: 'Ibuprofeno 600mg',
    dosage: '600mg',
    frequency: '8/8h',
    route: 'oral',
    startDate: '2024-01-15',
    endDate: '2024-01-25',
    status: 'active',
    prescribedBy: 'Dr. Silva',
    notes: 'Tomar após as refeições',
    sideEffects: ['Náusea', 'Tontura'],
    interactions: ['Anticoagulantes']
  },
  {
    id: '2',
    name: 'Diclofenaco Gel 1%',
    dosage: '2-3 aplicações',
    frequency: '12/12h',
    route: 'tópico',
    startDate: '2024-01-10',
    status: 'active',
    prescribedBy: 'Dr. Silva',
    notes: 'Aplicar na região lombar'
  },
  {
    id: '3',
    name: 'Paracetamol 750mg',
    dosage: '750mg',
    frequency: '6/6h',
    route: 'oral',
    startDate: '2024-01-05',
    endDate: '2024-01-15',
    status: 'completed',
    prescribedBy: 'Dr. Silva',
    notes: 'Para dor de cabeça'
  }
];

const mockHistory: MedicationHistory[] = [
  {
    id: '1',
    medicationId: '1',
    takenDate: '2024-01-20',
    takenTime: '08:00',
    dosageTaken: '600mg',
    notes: 'Tomado com café da manhã'
  },
  {
    id: '2',
    medicationId: '2',
    takenDate: '2024-01-20',
    takenTime: '09:00',
    dosageTaken: '2 aplicações',
    notes: 'Aplicado na lombar'
  }
];

export function PatientMedicationsTab({ patient, onUpdate }: PatientMedicationsTabProps) {
  const [medications] = useState<Medication[]>(mockMedications);
  const [history] = useState<MedicationHistory[]>(mockHistory);
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [newMedication, setNewMedication] = useState<Partial<Medication>>({});

  const getStatusColor = (status: Medication['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRouteIcon = (route: string) => {
    switch (route) {
      case 'oral':
        return '💊';
      case 'tópico':
        return '🧴';
      case 'injetável':
        return '💉';
      default:
        return '💊';
    }
  };

  const handleAddMedication = () => {
    // Implementar lógica para adicionar medicação
    setIsAddingMedication(false);
    setNewMedication({});
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Medicações</h3>
          <p className="text-sm text-gray-600">
            {medications.filter(m => m.status === 'active').length} medicações ativas
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={() => setIsAddingMedication(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Medicação
        </Button>
      </div>

      {/* Alertas importantes */}
      <div className="grid gap-3">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">Atenção: Interações Medicamentosas</h4>
                <p className="text-sm text-yellow-700">
                  Ibuprofeno pode interagir com anticoagulantes. Monitorar sinais de sangramento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">Medicações Atuais</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="interactions">Interações</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {/* Formulário para nova medicação */}
          {isAddingMedication && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova Medicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="medication-name">Nome da Medicação</Label>
                    <Input 
                      id="medication-name"
                      placeholder="Ex: Ibuprofeno 600mg"
                      value={newMedication.name || ''}
                      onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dosage">Dosagem</Label>
                    <Input 
                      id="dosage"
                      placeholder="Ex: 600mg"
                      value={newMedication.dosage || ''}
                      onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequência</Label>
                    <Input 
                      id="frequency"
                      placeholder="Ex: 8/8h"
                      value={newMedication.frequency || ''}
                      onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="route">Via de Administração</Label>
                    <select 
                      id="route"
                      className="w-full p-2 border rounded-md"
                      value={newMedication.route || ''}
                      onChange={(e) => setNewMedication({...newMedication, route: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      <option value="oral">Oral</option>
                      <option value="tópico">Tópico</option>
                      <option value="injetável">Injetável</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea 
                    id="notes"
                    placeholder="Instruções especiais, horários, etc."
                    value={newMedication.notes || ''}
                    onChange={(e) => setNewMedication({...newMedication, notes: e.target.value})}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddMedication}>Adicionar</Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingMedication(false);
                      setNewMedication({});
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de medicações */}
          <div className="grid gap-4">
            {medications.map((medication) => (
              <Card key={medication.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getRouteIcon(medication.route)}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{medication.name}</h4>
                          <Badge className={getStatusColor(medication.status)}>
                            {medication.status === 'active' ? 'Ativo' : 
                             medication.status === 'completed' ? 'Concluído' : 'Suspenso'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{medication.dosage}</span>
                          <span>{medication.frequency}</span>
                          <span className="capitalize">{medication.route}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Prescrito por: {medication.prescribedBy}</span>
                      <span className="text-gray-600">
                        {new Date(medication.startDate).toLocaleDateString('pt-BR')}
                        {medication.endDate && ` - ${new Date(medication.endDate).toLocaleDateString('pt-BR')}`}
                      </span>
                    </div>
                    
                    {medication.notes && (
                      <p className="text-sm text-gray-700 italic">"{medication.notes}"</p>
                    )}

                    {medication.sideEffects && medication.sideEffects.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600">Efeitos colaterais: </span>
                        <span className="text-orange-600">{medication.sideEffects.join(', ')}</span>
                      </div>
                    )}

                    {medication.interactions && medication.interactions.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600">Interações: </span>
                        <span className="text-red-600">{medication.interactions.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Administração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((record) => {
                  const medication = medications.find(m => m.id === record.medicationId);
                  return (
                    <div key={record.id} className="border-l-2 border-green-200 pl-4 py-2">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium">{medication?.name}</h5>
                          <p className="text-sm text-gray-600">
                            {record.dosageTaken} - {record.takenTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {new Date(record.takenDate).toLocaleDateString('pt-BR')}
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                        </div>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-gray-600 italic">"{record.notes}"</p>
                      )}
                      {record.sideEffectsReported && record.sideEffectsReported.length > 0 && (
                        <p className="text-sm text-orange-600">
                          Efeitos relatados: {record.sideEffectsReported.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verificação de Interações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Interação Moderada</h4>
                  </div>
                  <p className="text-sm text-yellow-700 mb-2">
                    <strong>Ibuprofeno + Anticoagulantes:</strong> Risco aumentado de sangramento.
                  </p>
                  <p className="text-xs text-yellow-600">
                    Recomendação: Monitorar sinais de sangramento e considerar ajuste de dose.
                  </p>
                </div>
                
                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-green-800">Sem Interações Conhecidas</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    Diclofenaco Gel não apresenta interações significativas com as demais medicações.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}