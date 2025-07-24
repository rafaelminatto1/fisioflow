import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Chip, 
  Searchbar, 
  FAB, 
  useTheme, 
  Text,
  Avatar,
  Surface,
  IconButton,
  Menu,
  Divider
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Patient } from '../types';
import { initializeDatabase, getAllPatients, deletePatient } from '../services/database';

interface PatientsScreenProps {
  navigation: any;
}

export default function PatientsScreen({ navigation }: PatientsScreenProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState<{[key: string]: boolean}>({});
  const theme = useTheme();

  useEffect(() => {
    initializeAndLoadPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchQuery, patients]);

  const initializeAndLoadPatients = async () => {
    try {
      setLoading(true);
      await initializeDatabase();
      await loadPatients();
    } catch (error) {
      console.log('Error initializing database:', error);
      Alert.alert('Erro', 'Erro ao inicializar banco de dados');
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const patientsData = await getAllPatients();
      setPatients(patientsData);
    } catch (error) {
      console.log('Error loading patients:', error);
      Alert.alert('Erro', 'Erro ao carregar pacientes');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const filterPatients = () => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.medicalInfo.conditions.some(condition =>
        condition.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    setFilteredPatients(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#f59e0b';
      case 'discharged': return '#6b7280';
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'discharged': return 'Alta';
      default: return status;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#10b981';
    if (progress >= 60) return '#f59e0b';
    if (progress >= 40) return '#ef4444';
    return '#6b7280';
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleEditPatient = (patient: Patient) => {
    navigation.navigate('PatientForm', {
      patient,
      mode: 'edit'
    });
  };

  const handleDeletePatient = (patient: Patient) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir o paciente ${patient.name}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePatient(patient.id);
              await loadPatients();
              Alert.alert('Sucesso', 'Paciente excluído com sucesso');
            } catch (error) {
              console.error('Error deleting patient:', error);
              Alert.alert('Erro', 'Erro ao excluir paciente');
            }
          },
        },
      ]
    );
  };

  const toggleMenu = (patientId: string) => {
    setMenuVisible(prev => ({
      ...prev,
      [patientId]: !prev[patientId]
    }));
  };

  const renderPatientCard = ({ item: patient }: { item: Patient }) => (
    <Card style={[styles.patientCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.patientHeader}>
          <Avatar.Text
            size={50}
            label={getInitials(patient.name)}
            style={{ backgroundColor: theme.colors.primary }}
          />
          
          <View style={styles.patientInfo}>
            <Title style={[styles.patientName, { color: theme.colors.onSurface }]}>
              {patient.name}
            </Title>
            <Text style={[styles.patientDetails, { color: theme.colors.onSurfaceVariant }]}>
              {calculateAge(patient.birthDate)} anos • {patient.phone}
            </Text>
          </View>
          
          <View style={styles.patientActions}>
            <Chip
              icon="circle"
              style={[styles.statusChip, { backgroundColor: `${getStatusColor(patient.status)}20` }]}
              textStyle={{ color: getStatusColor(patient.status) }}
            >
              {getStatusLabel(patient.status)}
            </Chip>
            
            <Menu
              visible={menuVisible[patient.id] || false}
              onDismiss={() => toggleMenu(patient.id)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => toggleMenu(patient.id)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  toggleMenu(patient.id);
                  handleEditPatient(patient);
                }}
                title="Editar"
                leadingIcon="pencil"
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  toggleMenu(patient.id);
                  handleDeletePatient(patient);
                }}
                title="Excluir"
                leadingIcon="delete"
                titleStyle={{ color: theme.colors.error }}
              />
            </Menu>
          </View>
        </View>

        <View style={styles.conditionsContainer}>
          <Text style={[styles.conditionsLabel, { color: theme.colors.onSurfaceVariant }]}>
            Condições:
          </Text>
          <View style={styles.conditionsChips}>
            {patient.medicalInfo.conditions.slice(0, 2).map((condition, index) => (
              <Chip
                key={index}
                style={[styles.conditionChip, { backgroundColor: theme.colors.surfaceVariant }]}
                textStyle={{ color: theme.colors.onSurfaceVariant }}
              >
                {condition}
              </Chip>
            ))}
            {patient.medicalInfo.conditions.length > 2 && (
              <Chip
                style={[styles.conditionChip, { backgroundColor: theme.colors.surfaceVariant }]}
                textStyle={{ color: theme.colors.onSurfaceVariant }}
              >
                +{patient.medicalInfo.conditions.length - 2}
              </Chip>
            )}
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.colors.onSurfaceVariant }]}>
              Progresso do Tratamento
            </Text>
            <Text style={[styles.progressValue, { color: getProgressColor(patient.progress) }]}>
              {patient.progress}%
            </Text>
          </View>
          
          <Surface style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Surface
              style={[
                styles.progressFill,
                {
                  backgroundColor: getProgressColor(patient.progress),
                  width: `${patient.progress}%`,
                }
              ]}
            />
          </Surface>
          
          <Text style={[styles.sessionsText, { color: theme.colors.onSurfaceVariant }]}>
            {patient.sessions} sessões realizadas
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
        {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
      </Text>
      <Paragraph style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
        {searchQuery 
          ? 'Tente ajustar os termos de busca'
          : 'Adicione seu primeiro paciente tocando no botão +'
        }
      </Paragraph>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.onBackground }}>Carregando pacientes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Search Header */}
        <Surface style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
          <Searchbar
            placeholder="Buscar pacientes..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            inputStyle={{ color: theme.colors.onSurface }}
          />
          
          <View style={styles.statsRow}>
            <Text style={[styles.totalCount, { color: theme.colors.onSurface }]}>
              📊 {filteredPatients.length} de {patients.length} pacientes
            </Text>
          </View>
        </Surface>

        {/* Patients List */}
        <FlatList
          data={filteredPatients}
          renderItem={renderPatientCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />

        {/* Add Patient FAB */}
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('PatientForm', { mode: 'create' })}
        />
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    elevation: 2,
  },
  searchbar: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  patientCard: {
    marginBottom: 16,
    elevation: 2,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  patientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  conditionsContainer: {
    marginBottom: 16,
  },
  conditionsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  conditionsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  sessionsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});