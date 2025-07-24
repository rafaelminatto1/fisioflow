import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PatientsScreen from './src/screens/PatientsScreen';
import PatientFormScreen from './src/screens/PatientFormScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SubscriptionMetricsScreen from './src/screens/SubscriptionMetricsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Services
import { initializeDatabase } from './src/services/database';
import { seedDemoData, hasDemoData } from './src/services/demoDataSeeder';

// Types
export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Patients: undefined;
  PatientForm: {
    patient?: any;
    mode: 'create' | 'edit';
  };
  Calendar: undefined;
  SubscriptionMetrics: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Custom theme based on web version
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#3b82f6',
    primaryContainer: '#1d4ed8',
    secondary: '#10b981',
    secondaryContainer: '#065f46',
    tertiary: '#f59e0b',
    background: '#1e293b',
    surface: '#334155',
    surfaceVariant: '#475569',
    outline: '#64748b',
    outlineVariant: '#94a3b8',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onTertiary: '#ffffff',
    onBackground: '#f8fafc',
    onSurface: '#f1f5f9',
    onSurfaceVariant: '#cbd5e1',
  },
};

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Inicializando FisioFlow...');
      
      // Inicializar banco de dados
      await initializeDatabase();
      console.log('✅ Banco de dados inicializado');
      
      // Verificar se já existem dados de demonstração
      const hasData = await hasDemoData();
      
      if (!hasData) {
        console.log('🌱 Populando dados de demonstração...');
        await seedDemoData();
        console.log('✅ Dados de demonstração carregados');
      } else {
        console.log('📊 Dados existentes encontrados');
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      // Em caso de erro, ainda permite o uso do app
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background
        }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{
            marginTop: 16,
            color: theme.colors.onBackground,
            fontSize: 16
          }}>
            Inicializando FisioFlow...
          </Text>
          <Text style={{
            marginTop: 8,
            color: theme.colors.onSurfaceVariant,
            fontSize: 14
          }}>
            Carregando dados de demonstração
          </Text>
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.surface,
              shadowColor: 'transparent',
              elevation: 0,
            },
            headerTintColor: theme.colors.onSurface,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18,
            },
            cardStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={{ 
              title: 'FisioFlow Dashboard',
              headerLeft: () => null, // Remove back button
            }}
          />
          <Stack.Screen 
            name="Patients" 
            component={PatientsScreen}
            options={{ title: 'Pacientes' }}
          />
          <Stack.Screen 
            name="PatientForm" 
            component={PatientFormScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Calendar" 
            component={CalendarScreen}
            options={{ title: 'Agenda' }}
          />
          <Stack.Screen 
            name="SubscriptionMetrics" 
            component={SubscriptionMetricsScreen}
            options={{ title: 'Métricas de Assinatura' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ title: 'Perfil' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}