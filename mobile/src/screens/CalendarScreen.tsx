import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip, 
  FAB, 
  useTheme, 
  Text,
  Surface,
  IconButton
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appointment, Patient } from '../types';
import { getAllAppointments, getAllPatients, updateAppointment } from '../services/database';

interface CalendarScreenProps {
  navigation: any;
}

export default function CalendarScreen({ navigation }: CalendarScreenProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadAppointments(), loadPatients()]);
    } catch (error) {
      console.log('Error loading data:', error);
      Alert.alert('Erro', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const allAppointments = await getAllAppointments();
      
      // Filter appointments for selected date
      const selectedDateAppointments = allAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.startTime).toISOString().split('T')[0];
        return appointmentDate === selectedDate;
      });
      
      setAppointments(selectedDateAppointments);
    } catch (error) {
      console.log('Error loading appointments:', error);
      throw error;
    }
  };

  const loadPatients = async () => {
    try {
      const patientsData = await getAllPatients();
      setPatients(patientsData);
    } catch (error) {
      console.log('Error loading patients:', error);
      throw error;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getPatientName = (patientId: string): string => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name : 'Paciente não encontrado';
  };

  const formatAppointmentTime = (startTime: string): string => {
    const date = new Date(startTime);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateDuration = (startTime: string, endTime: string): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    return `${durationMinutes}min`;
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: 'scheduled' | 'in-progress' | 'completed' | 'cancelled') => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      const updatedAppointment: Appointment = {
        ...appointment,
        status: newStatus
      };

      await updateAppointment(updatedAppointment);
      await loadAppointments();
      
      Alert.alert('Sucesso', 'Status do agendamento atualizado');
    } catch (error) {
      console.error('Error updating appointment:', error);
      Alert.alert('Erro', 'Erro ao atualizar agendamento');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#10b981';
      case 'in-progress': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Agendado';
      case 'in-progress': return 'Em Andamento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return '📅';
      case 'in-progress': return '⏰';
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      default: return '📅';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'evaluation': return 'Avaliação';
      case 'treatment': return 'Tratamento';
      case 'reevaluation': return 'Reavaliação';
      case 'discharge': return 'Alta';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const getTodayStats = () => {
    const total = appointments.length;
    const scheduled = appointments.filter(a => a.status === 'scheduled').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const inProgress = appointments.filter(a => a.status === 'in-progress').length;
    
    return { total, scheduled, completed, inProgress };
  };

  const stats = getTodayStats();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.onBackground }}>Carregando agenda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Date Header */}
        <Card style={[styles.dateCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.dateNavigation}>
              <IconButton
                icon="chevron-left"
                size={24}
                onPress={() => navigateDate('prev')}
                iconColor={theme.colors.primary}
              />
              
              <View style={styles.dateInfo}>
                <Title style={[styles.dateTitle, { color: theme.colors.onSurface }]}>
                  📅 {formatDate(selectedDate)}
                </Title>
              </View>
              
              <IconButton
                icon="chevron-right"
                size={24}
                onPress={() => navigateDate('next')}
                iconColor={theme.colors.primary}
              />
            </View>
            
            <Button
              mode="outlined"
              onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              style={styles.todayButton}
              compact
            >
              Hoje
            </Button>
          </Card.Content>
        </Card>

        {/* Day Statistics */}
        <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.statsTitle, { color: theme.colors.onSurface }]}>
              📊 Resumo do Dia
            </Title>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {stats.total}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Total
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#10b981' }]}>
                  {stats.scheduled}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Agendados
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#3b82f6' }]}>
                  {stats.completed}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Concluídos
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                  {stats.inProgress}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Em Andamento
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Appointments List */}
        <Title style={[styles.sectionTitle, { color: theme.colors.onBackground, marginLeft: 16, marginTop: 8, marginBottom: 12 }]}>
          Agendamentos
        </Title>

        {appointments.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.emptyContent}>
              <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
                📅 Nenhum agendamento
              </Text>
              <Paragraph style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                Não há consultas marcadas para esta data
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment.id} style={[styles.appointmentCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <View style={styles.appointmentHeader}>
                  <View style={styles.timeContainer}>
                    <Text style={[styles.appointmentTime, { color: theme.colors.primary }]}>
                      {formatAppointmentTime(appointment.startTime)}
                    </Text>
                    <Text style={[styles.appointmentDuration, { color: theme.colors.onSurfaceVariant }]}>
                      {calculateDuration(appointment.startTime, appointment.endTime)}
                    </Text>
                  </View>
                  
                  <Chip
                    icon={() => <Text>{getStatusIcon(appointment.status)}</Text>}
                    style={[styles.statusChip, { backgroundColor: `${getStatusColor(appointment.status)}20` }]}
                    textStyle={{ color: getStatusColor(appointment.status) }}
                  >
                    {getStatusLabel(appointment.status)}
                  </Chip>
                </View>
                
                <View style={styles.appointmentBody}>
                  <Title style={[styles.patientName, { color: theme.colors.onSurface }]}>
                    👤 {getPatientName(appointment.patientId)}
                  </Title>
                  
                  <Surface style={[styles.typeContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.appointmentType, { color: theme.colors.onSurfaceVariant }]}>
                      🔍 {getTypeLabel(appointment.type)}
                    </Text>
                  </Surface>
                  
                  {appointment.notes && (
                    <Text style={[styles.appointmentNotes, { color: theme.colors.onSurfaceVariant }]}>
                      📝 {appointment.notes}
                    </Text>
                  )}
                </View>
                
                <View style={styles.appointmentActions}>
                  {appointment.status === 'scheduled' && (
                    <>
                      <Button
                        mode="contained"
                        style={styles.actionButton}
                        contentStyle={styles.actionButtonContent}
                        onPress={() => handleUpdateAppointmentStatus(appointment.id, 'in-progress')}
                      >
                        Iniciar
                      </Button>
                      <Button
                        mode="outlined"
                        style={styles.actionButton}
                        contentStyle={styles.actionButtonContent}
                        onPress={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  
                  {appointment.status === 'in-progress' && (
                    <>
                      <Button
                        mode="contained"
                        style={styles.actionButton}
                        contentStyle={styles.actionButtonContent}
                        onPress={() => handleUpdateAppointmentStatus(appointment.id, 'completed')}
                      >
                        Finalizar
                      </Button>
                      <Button
                        mode="outlined"
                        style={styles.actionButton}
                        contentStyle={styles.actionButtonContent}
                        onPress={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  
                  {appointment.status === 'completed' && (
                    <Button
                      mode="outlined"
                      style={styles.actionButton}
                      contentStyle={styles.actionButtonContent}
                      onPress={() => {
                        // Navigate to patient details
                        const patient = patients.find(p => p.id === appointment.patientId);
                        if (patient) {
                          navigation.navigate('PatientForm', { patient, mode: 'edit' });
                        }
                      }}
                    >
                      Ver Paciente
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add Appointment FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          // For now, show an alert. Later can implement appointment form
          Alert.alert(
            'Novo Agendamento',
            'Funcionalidade em desenvolvimento.\nUse a versão web para criar novos agendamentos.',
            [{ text: 'OK' }]
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCard: {
    marginBottom: 16,
    elevation: 2,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateInfo: {
    flex: 1,
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  todayButton: {
    alignSelf: 'center',
  },
  statsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyCard: {
    marginBottom: 16,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  appointmentCard: {
    marginBottom: 16,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  appointmentTime: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  appointmentDuration: {
    fontSize: 12,
    marginTop: 2,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  appointmentBody: {
    marginBottom: 16,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  typeContainer: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  appointmentType: {
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentNotes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    minWidth: 80,
  },
  actionButtonContent: {
    paddingVertical: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});