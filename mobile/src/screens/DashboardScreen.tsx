import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, useTheme, Text, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { User, Patient, Appointment } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllPatients, getAllAppointments } from '../services/database';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

interface QuickStat {
  title: string;
  value: string;
  icon: string;
  color: string;
}

export default function DashboardScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const theme = useTheme();

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [patientsData, appointmentsData] = await Promise.all([
        getAllPatients(),
        getAllAppointments()
      ]);
      
      setPatients(patientsData);
      setAppointments(appointmentsData);
      
      // Calcular estatísticas reais
      const activePatients = patientsData.filter(p => p.status === 'active').length;
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = appointmentsData.filter(a => 
        new Date(a.startTime).toISOString().split('T')[0] === today
      ).length;
      const completedToday = appointmentsData.filter(a => 
        new Date(a.startTime).toISOString().split('T')[0] === today && 
        a.status === 'completed'
      ).length;
      const avgProgress = patientsData.length > 0 
        ? Math.round(patientsData.reduce((sum, p) => sum + p.progress, 0) / patientsData.length)
        : 0;

      const realStats: QuickStat[] = [
        {
          title: 'Pacientes Ativos',
          value: activePatients.toString(),
          icon: 'account-group',
          color: '#10b981'
        },
        {
          title: 'Consultas Hoje',
          value: todayAppointments.toString(),
          icon: 'calendar-today',
          color: '#3b82f6'
        },
        {
          title: 'Concluídas Hoje',
          value: completedToday.toString(),
          icon: 'check-circle',
          color: '#10b981'
        },
        {
          title: 'Progresso Médio',
          value: `${avgProgress}%`,
          icon: 'trending-up',
          color: '#8b5cf6'
        }
      ];

      setStats(realStats);
    } catch (error) {
      console.log('Error loading dashboard data:', error);
      // Fallback para estatísticas vazias
      setStats([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const isAdmin = user?.role === 'ADMIN';
  const isFisioterapeuta = user?.role === 'FISIOTERAPEUTA';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Header */}
        <Card style={[styles.welcomeCard, { backgroundColor: theme.colors.primary }]}>
          <Card.Content>
            <View style={styles.welcomeContent}>
              <Text style={[styles.greeting, { color: theme.colors.onPrimary }]}>
                {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
              </Text>
              <Paragraph style={[styles.welcomeText, { color: theme.colors.onPrimary }]}>
                {user?.role === 'ADMIN' && 'Gerencie sua clínica com visão completa'}
                {user?.role === 'FISIOTERAPEUTA' && 'Seus pacientes estão esperando por você'}
                {user?.role === 'ESTAGIARIO' && 'Continue aprendendo e evoluindo'}
              </Paragraph>
              <Chip 
                icon="account-circle" 
                style={[styles.roleChip, { backgroundColor: theme.colors.primaryContainer }]}
                textStyle={{ color: theme.colors.onPrimaryContainer }}
              >
                {user?.role}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <Card key={index} style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={styles.statContent}>
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                  <Text style={[styles.statIconText, { color: stat.color }]}>
                    📊
                  </Text>
                </View>
                <Title style={[styles.statValue, { color: theme.colors.onSurface }]}>
                  {stat.value}
                </Title>
                <Paragraph style={[styles.statTitle, { color: theme.colors.onSurfaceVariant }]}>
                  {stat.title}
                </Paragraph>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <Card style={[styles.actionsCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Ações Rápidas
            </Title>
            
            <View style={styles.actionsGrid}>
              <Button
                mode="outlined"
                icon="account-group"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                onPress={() => navigation.navigate('Patients')}
              >
                Pacientes
              </Button>
              
              <Button
                mode="outlined"
                icon="calendar"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                onPress={() => navigation.navigate('Calendar')}
              >
                Agenda
              </Button>
              
              {isAdmin && (
                <Button
                  mode="outlined"
                  icon="chart-line"
                  style={styles.actionButton}
                  contentStyle={styles.actionButtonContent}
                  onPress={() => navigation.navigate('SubscriptionMetrics')}
                >
                  Métricas
                </Button>
              )}
              
              <Button
                mode="outlined"
                icon="account"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                onPress={() => navigation.navigate('Profile')}
              >
                Perfil
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Activities */}
        <Card style={[styles.activitiesCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Atividades Recentes
            </Title>
            
            <View style={styles.activityItem}>
              <Text style={[styles.activityText, { color: theme.colors.onSurface }]}>
                📅 Consulta com Ana Silva às 14:00
              </Text>
              <Text style={[styles.activityTime, { color: theme.colors.onSurfaceVariant }]}>
                Hoje
              </Text>
            </View>
            
            <View style={styles.activityItem}>
              <Text style={[styles.activityText, { color: theme.colors.onSurface }]}>
                ✅ Evolução de Carlos Oliveira atualizada
              </Text>
              <Text style={[styles.activityTime, { color: theme.colors.onSurfaceVariant }]}>
                2h atrás
              </Text>
            </View>
            
            <View style={styles.activityItem}>
              <Text style={[styles.activityText, { color: theme.colors.onSurface }]}>
                🎯 Meta mensal: 85% concluída
              </Text>
              <Text style={[styles.activityTime, { color: theme.colors.onSurfaceVariant }]}>
                Ontem
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          // Quick action menu
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
  welcomeCard: {
    marginBottom: 20,
    elevation: 4,
  },
  welcomeContent: {
    paddingVertical: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    marginBottom: 12,
    opacity: 0.9,
  },
  roleChip: {
    alignSelf: 'flex-start',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconText: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionsCard: {
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    marginBottom: 12,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  activitiesCard: {
    marginBottom: 20,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  activityText: {
    flex: 1,
    fontSize: 14,
  },
  activityTime: {
    fontSize: 12,
    marginLeft: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});