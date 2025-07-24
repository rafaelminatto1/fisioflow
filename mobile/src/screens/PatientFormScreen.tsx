import React, { useState } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Chip,
  useTheme,
  Text,
  Surface,
  IconButton,
  Divider
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Patient } from '../types';
import { createPatient, updatePatient } from '../services/database';

interface PatientFormScreenProps {
  navigation: any;
  route: {
    params?: {
      patient?: Patient;
      mode: 'create' | 'edit';
    };
  };
}

export default function PatientFormScreen({ navigation, route }: PatientFormScreenProps) {
  const theme = useTheme();
  const isEditing = route.params?.mode === 'edit';
  const existingPatient = route.params?.patient;

  // Personal Information
  const [name, setName] = useState(existingPatient?.name || '');
  const [email, setEmail] = useState(existingPatient?.email || '');
  const [phone, setPhone] = useState(existingPatient?.phone || '');
  const [cpf, setCpf] = useState(existingPatient?.cpf || '');
  const [birthDate, setBirthDate] = useState(existingPatient?.birthDate || '');

  // Address
  const [street, setStreet] = useState(existingPatient?.address.street || '');
  const [number, setNumber] = useState(existingPatient?.address.number || '');
  const [complement, setComplement] = useState(existingPatient?.address.complement || '');
  const [district, setDistrict] = useState(existingPatient?.address.district || '');
  const [city, setCity] = useState(existingPatient?.address.city || '');
  const [state, setState] = useState(existingPatient?.address.state || '');
  const [zipCode, setZipCode] = useState(existingPatient?.address.zipCode || '');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState(existingPatient?.emergencyContact.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(existingPatient?.emergencyContact.phone || '');
  const [emergencyRelationship, setEmergencyRelationship] = useState(existingPatient?.emergencyContact.relationship || '');

  // Medical Information
  const [conditions, setConditions] = useState<string[]>(existingPatient?.medicalInfo.conditions || []);
  const [medications, setMedications] = useState<string[]>(existingPatient?.medicalInfo.medications || []);
  const [allergies, setAllergies] = useState<string[]>(existingPatient?.medicalInfo.allergies || []);
  const [surgeries, setSurgeries] = useState<string[]>(existingPatient?.medicalInfo.surgeries || []);
  const [familyHistory, setFamilyHistory] = useState(existingPatient?.medicalInfo.familyHistory || '');

  // Input states for adding items
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newSurgery, setNewSurgery] = useState('');

  const [loading, setLoading] = useState(false);

  const addItem = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, currentList: string[], clearInput: () => void) => {
    if (value.trim() && !currentList.includes(value.trim())) {
      setter([...currentList, value.trim()]);
      clearInput();
    }
  };

  const removeItem = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>, currentList: string[]) => {
    const newList = currentList.filter((_, i) => i !== index);
    setter(newList);
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Erro', 'Email é obrigatório');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Erro', 'Telefone é obrigatório');
      return false;
    }
    if (!cpf.trim()) {
      Alert.alert('Erro', 'CPF é obrigatório');
      return false;
    }
    if (!birthDate.trim()) {
      Alert.alert('Erro', 'Data de nascimento é obrigatória');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const patientData: Patient = {
        id: existingPatient?.id || `patient_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cpf: cpf.trim(),
        birthDate: birthDate.trim(),
        address: {
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim(),
          district: district.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
        },
        emergencyContact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
          relationship: emergencyRelationship.trim(),
        },
        medicalInfo: {
          conditions,
          medications,
          allergies,
          surgeries,
          familyHistory: familyHistory.trim(),
        },
        sessions: existingPatient?.sessions || 0,
        progress: existingPatient?.progress || 0,
        status: existingPatient?.status || 'active',
        tenantId: existingPatient?.tenantId || 'default_tenant',
        assignedPhysiotherapist: existingPatient?.assignedPhysiotherapist || 'default_physio',
        createdAt: existingPatient?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditing) {
        await updatePatient(patientData);
        Alert.alert('Sucesso', 'Paciente atualizado com sucesso!');
      } else {
        await createPatient(patientData);
        Alert.alert('Sucesso', 'Paciente cadastrado com sucesso!');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving patient:', error);
      Alert.alert('Erro', 'Erro ao salvar paciente');
    } finally {
      setLoading(false);
    }
  };

  const renderMedicalSection = (
    title: string,
    items: string[],
    inputValue: string,
    setInputValue: (value: string) => void,
    setItems: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string
  ) => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Title>
        
        <View style={styles.inputRow}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={placeholder}
            style={[styles.medicalInput, { backgroundColor: theme.colors.background }]}
            mode="outlined"
          />
          <IconButton
            icon="plus"
            mode="contained"
            onPress={() => addItem(inputValue, setItems, items, () => setInputValue(''))}
            style={styles.addButton}
          />
        </View>

        <View style={styles.chipsContainer}>
          {items.map((item, index) => (
            <Chip
              key={index}
              onClose={() => removeItem(index, setItems, items)}
              style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant }]}
              textStyle={{ color: theme.colors.onSurfaceVariant }}
            >
              {item}
            </Chip>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.headerContent}>
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={() => navigation.goBack()}
              />
              <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
              </Title>
              <View style={styles.headerSpacer} />
            </View>
          </Surface>

          {/* Personal Information */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Informações Pessoais
              </Title>
              
              <TextInput
                label="Nome Completo *"
                value={name}
                onChangeText={setName}
                style={styles.input}
                mode="outlined"
              />
              
              <TextInput
                label="Email *"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
              />
              
              <View style={styles.row}>
                <TextInput
                  label="Telefone *"
                  value={phone}
                  onChangeText={setPhone}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  keyboardType="phone-pad"
                />
                
                <TextInput
                  label="CPF *"
                  value={cpf}
                  onChangeText={setCpf}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  keyboardType="numeric"
                />
              </View>
              
              <TextInput
                label="Data de Nascimento *"
                value={birthDate}
                onChangeText={setBirthDate}
                style={styles.input}
                mode="outlined"
                placeholder="DD/MM/AAAA"
              />
            </Card.Content>
          </Card>

          {/* Address */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Endereço
              </Title>
              
              <View style={styles.row}>
                <TextInput
                  label="Rua"
                  value={street}
                  onChangeText={setStreet}
                  style={[styles.input, { flex: 3 }]}
                  mode="outlined"
                />
                
                <TextInput
                  label="Número"
                  value={number}
                  onChangeText={setNumber}
                  style={[styles.input, { flex: 1, marginLeft: 8 }]}
                  mode="outlined"
                />
              </View>
              
              <TextInput
                label="Complemento"
                value={complement}
                onChangeText={setComplement}
                style={styles.input}
                mode="outlined"
              />
              
              <View style={styles.row}>
                <TextInput
                  label="Bairro"
                  value={district}
                  onChangeText={setDistrict}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                />
                
                <TextInput
                  label="CEP"
                  value={zipCode}
                  onChangeText={setZipCode}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.row}>
                <TextInput
                  label="Cidade"
                  value={city}
                  onChangeText={setCity}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                />
                
                <TextInput
                  label="Estado"
                  value={state}
                  onChangeText={setState}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                />
              </View>
            </Card.Content>
          </Card>

          {/* Emergency Contact */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Contato de Emergência
              </Title>
              
              <TextInput
                label="Nome"
                value={emergencyName}
                onChangeText={setEmergencyName}
                style={styles.input}
                mode="outlined"
              />
              
              <View style={styles.row}>
                <TextInput
                  label="Telefone"
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                  keyboardType="phone-pad"
                />
                
                <TextInput
                  label="Parentesco"
                  value={emergencyRelationship}
                  onChangeText={setEmergencyRelationship}
                  style={[styles.input, styles.halfInput]}
                  mode="outlined"
                />
              </View>
            </Card.Content>
          </Card>

          {/* Medical Information */}
          {renderMedicalSection(
            'Condições Médicas',
            conditions,
            newCondition,
            setNewCondition,
            setConditions,
            'Ex: Lombalgia, Artrose...'
          )}

          {renderMedicalSection(
            'Medicamentos',
            medications,
            newMedication,
            setNewMedication,
            setMedications,
            'Ex: Dipirona, Ibuprofeno...'
          )}

          {renderMedicalSection(
            'Alergias',
            allergies,
            newAllergy,
            setNewAllergy,
            setAllergies,
            'Ex: Dipirona, Látex...'
          )}

          {renderMedicalSection(
            'Cirurgias Anteriores',
            surgeries,
            newSurgery,
            setNewSurgery,
            setSurgeries,
            'Ex: Apendicectomia, Artroscopia...'
          )}

          {/* Family History */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Histórico Familiar
              </Title>
              
              <TextInput
                label="Histórico Familiar"
                value={familyHistory}
                onChangeText={setFamilyHistory}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Descreva doenças ou condições relevantes na família..."
              />
            </Card.Content>
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.button}
              disabled={loading}
            >
              Cancelar
            </Button>
            
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              {isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    elevation: 2,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halfInput: {
    flex: 1,
    marginRight: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicalInput: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    margin: 0,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    paddingBottom: 32,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});