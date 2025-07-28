import { 
  Bell, 
  Shield, 
  CreditCard, 
  FileText, 
  Settings, 
  Trash2, 
  Download,
  Upload,
  AlertTriangle,
  Check
} from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Patient } from '@/types/patient';

interface PatientSettingsTabProps {
  patient: Patient;
  onUpdate: (updates: Partial<Patient>) => void;
}

interface NotificationSettings {
  appointments: boolean;
  exercises: boolean;
  medications: boolean;
  results: boolean;
  marketing: boolean;
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

interface PrivacySettings {
  shareDataWithPartners: boolean;
  allowResearchParticipation: boolean;
  receiveHealthTips: boolean;
  profileVisibility: 'private' | 'limited' | 'public';
}

interface PaymentMethod {
  id: string;
  type: 'credit' | 'debit' | 'pix' | 'boleto';
  last4?: string;
  brand?: string;
  isDefault: boolean;
  expiryDate?: string;
}

const mockNotificationSettings: NotificationSettings = {
  appointments: true,
  exercises: true,
  medications: false,
  results: true,
  marketing: false,
  whatsapp: true,
  sms: false,
  email: true
};

const mockPrivacySettings: PrivacySettings = {
  shareDataWithPartners: false,
  allowResearchParticipation: true,
  receiveHealthTips: true,
  profileVisibility: 'limited'
};

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'credit',
    last4: '4532',
    brand: 'Visa',
    isDefault: true,
    expiryDate: '12/26'
  },
  {
    id: '2',
    type: 'pix',
    isDefault: false
  }
];

export function PatientSettingsTab({ patient, onUpdate }: PatientSettingsTabProps) {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(mockNotificationSettings);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(mockPrivacySettings);
  const [paymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [emergencyContact, setEmergencyContact] = useState({
    name: 'João Silva',
    relationship: 'Esposo',
    phone: '(11) 99999-9999',
    email: 'joao@email.com'
  });

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: boolean | string) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
  };

  const getPaymentIcon = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'credit':
      case 'debit':
        return '💳';
      case 'pix':
        return '🔄';
      case 'boleto':
        return '📄';
      default:
        return '💳';
    }
  };

  const handleExportData = () => {
    // Implementar exportação de dados
    console.log('Exportando dados do paciente...');
  };

  const handleDeleteAccount = () => {
    // Implementar exclusão de conta
    console.log('Solicitando exclusão de conta...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Configurações</h3>
        <p className="text-sm text-gray-600">
          Gerencie preferências, privacidade e configurações da conta
        </p>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
          <TabsTrigger value="payment">Pagamento</TabsTrigger>
          <TabsTrigger value="emergency">Emergência</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferências de Notificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipos de notificação */}
              <div>
                <h4 className="font-medium mb-3">Tipos de Notificação</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="appointments">Lembretes de Consulta</Label>
                      <p className="text-sm text-gray-600">Receber lembretes antes das consultas</p>
                    </div>
                    <Switch
                      id="appointments"
                      checked={notificationSettings.appointments}
                      onCheckedChange={(checked) => handleNotificationChange('appointments', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="exercises">Exercícios</Label>
                      <p className="text-sm text-gray-600">Lembretes para realizar exercícios</p>
                    </div>
                    <Switch
                      id="exercises"
                      checked={notificationSettings.exercises}
                      onCheckedChange={(checked) => handleNotificationChange('exercises', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="medications">Medicações</Label>
                      <p className="text-sm text-gray-600">Lembretes para tomar medicamentos</p>
                    </div>
                    <Switch
                      id="medications"
                      checked={notificationSettings.medications}
                      onCheckedChange={(checked) => handleNotificationChange('medications', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="results">Resultados de Exames</Label>
                      <p className="text-sm text-gray-600">Notificações sobre novos resultados</p>
                    </div>
                    <Switch
                      id="results"
                      checked={notificationSettings.results}
                      onCheckedChange={(checked) => handleNotificationChange('results', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="marketing">Comunicações de Marketing</Label>
                      <p className="text-sm text-gray-600">Promoções e novidades</p>
                    </div>
                    <Switch
                      id="marketing"
                      checked={notificationSettings.marketing}
                      onCheckedChange={(checked) => handleNotificationChange('marketing', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Canais de comunicação */}
              <div>
                <h4 className="font-medium mb-3">Canais de Comunicação</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>💬</span>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                    </div>
                    <Switch
                      id="whatsapp"
                      checked={notificationSettings.whatsapp}
                      onCheckedChange={(checked) => handleNotificationChange('whatsapp', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>📱</span>
                      <Label htmlFor="sms">SMS</Label>
                    </div>
                    <Switch
                      id="sms"
                      checked={notificationSettings.sms}
                      onCheckedChange={(checked) => handleNotificationChange('sms', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>📧</span>
                      <Label htmlFor="email">Email</Label>
                    </div>
                    <Switch
                      id="email"
                      checked={notificationSettings.email}
                      onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Privacidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="shareData">Compartilhar dados com parceiros</Label>
                  <p className="text-sm text-gray-600">Permitir compartilhamento para melhorar serviços</p>
                </div>
                <Switch
                  id="shareData"
                  checked={privacySettings.shareDataWithPartners}
                  onCheckedChange={(checked) => handlePrivacyChange('shareDataWithPartners', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="research">Participar de pesquisas</Label>
                  <p className="text-sm text-gray-600">Contribuir com estudos científicos anônimos</p>
                </div>
                <Switch
                  id="research"
                  checked={privacySettings.allowResearchParticipation}
                  onCheckedChange={(checked) => handlePrivacyChange('allowResearchParticipation', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="healthTips">Receber dicas de saúde</Label>
                  <p className="text-sm text-gray-600">Conteúdo educativo personalizado</p>
                </div>
                <Switch
                  id="healthTips"
                  checked={privacySettings.receiveHealthTips}
                  onCheckedChange={(checked) => handlePrivacyChange('receiveHealthTips', checked)}
                />
              </div>
              
              <div>
                <Label htmlFor="visibility">Visibilidade do Perfil</Label>
                <select
                  id="visibility"
                  value={privacySettings.profileVisibility}
                  onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="private">Privado</option>
                  <option value="limited">Limitado</option>
                  <option value="public">Público</option>
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  Controla quem pode ver suas informações básicas
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Métodos de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getPaymentIcon(method.type)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {method.type === 'credit' ? 'Cartão de Crédito' :
                           method.type === 'debit' ? 'Cartão de Débito' :
                           method.type === 'pix' ? 'PIX' : 'Boleto'}
                        </span>
                        {method.isDefault && (
                          <Badge variant="secondary">Padrão</Badge>
                        )}
                      </div>
                      {method.last4 && (
                        <p className="text-sm text-gray-600">
                          {method.brand} •••• {method.last4}
                          {method.expiryDate && ` • ${method.expiryDate}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!method.isDefault && (
                      <Button variant="outline" size="sm">
                        Definir como padrão
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Adicionar Método de Pagamento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Contato de Emergência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency-name">Nome Completo</Label>
                  <Input
                    id="emergency-name"
                    value={emergencyContact.name}
                    onChange={(e) => setEmergencyContact({...emergencyContact, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency-relationship">Parentesco</Label>
                  <Input
                    id="emergency-relationship"
                    value={emergencyContact.relationship}
                    onChange={(e) => setEmergencyContact({...emergencyContact, relationship: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency-phone">Telefone</Label>
                  <Input
                    id="emergency-phone"
                    value={emergencyContact.phone}
                    onChange={(e) => setEmergencyContact({...emergencyContact, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency-email">Email</Label>
                  <Input
                    id="emergency-email"
                    type="email"
                    value={emergencyContact.email}
                    onChange={(e) => setEmergencyContact({...emergencyContact, email: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar Contato
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exportar dados */}
              <div>
                <h4 className="font-medium mb-2">Exportar Dados</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Baixe uma cópia de todos os seus dados em formato JSON
                </p>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Dados
                </Button>
              </div>

              {/* Importar dados */}
              <div>
                <h4 className="font-medium mb-2">Importar Dados</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Importe dados de outro sistema ou backup
                </p>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Dados
                </Button>
              </div>

              {/* Zona de perigo */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-2 text-red-600">Zona de Perigo</h4>
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h5 className="font-medium text-red-800 mb-2">Excluir Conta</h5>
                  <p className="text-sm text-red-700 mb-3">
                    Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.
                  </p>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Conta
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}