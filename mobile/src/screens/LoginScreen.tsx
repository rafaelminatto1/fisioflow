import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Card, TextInput, Title, useTheme, Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { DEMO_USERS } from '../services/demoData';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('admin@fisioflow.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Find user in demo data
      const user = DEMO_USERS.find(u => u.email === email);

      if (user && password) {
        // Save user data
        await AsyncStorage.setItem('currentUser', JSON.stringify(user));
        
        // Navigate to dashboard
        navigation.replace('Dashboard');
      } else {
        Alert.alert('Erro', 'Email ou senha incorretos');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('demo123');
    // Auto login after a short delay
    setTimeout(() => handleLogin(), 300);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.logoText, { color: theme.colors.onPrimary }]}>
                💚
              </Text>
            </Surface>
            <Title style={[styles.title, { color: theme.colors.onBackground }]}>
              FisioFlow
            </Title>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Gestão Clínica para Fisioterapeutas
            </Text>
          </View>

          {/* Login Form */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                left={<TextInput.Icon icon="email" />}
              />
              
              <TextInput
                label="Senha"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                style={styles.input}
                secureTextEntry
                autoComplete="password"
                left={<TextInput.Icon icon="lock" />}
              />
              
              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.loginButton}
                contentStyle={styles.buttonContent}
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </Card.Content>
          </Card>

          {/* Quick Login Options */}
          <Card style={[styles.demoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text style={[styles.demoTitle, { color: theme.colors.onSurfaceVariant }]}>
                🚀 Login Rápido - Demo
              </Text>
              
              <Button
                mode="outlined"
                onPress={() => quickLogin('admin@fisioflow.com')}
                style={styles.demoButton}
                contentStyle={styles.buttonContent}
                icon="shield-crown"
              >
                Admin - Métricas Completas
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => quickLogin('maria@fisioflow.com')}
                style={styles.demoButton}
                contentStyle={styles.buttonContent}
                icon="stethoscope"
              >
                Fisioterapeuta - Pacientes
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => quickLogin('joao@fisioflow.com')}
                style={styles.demoButton}
                contentStyle={styles.buttonContent}
                icon="school"
              >
                Estagiário - Básico
              </Button>
            </Card.Content>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 20,
    elevation: 4,
  },
  input: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  demoCard: {
    elevation: 2,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  demoButton: {
    marginBottom: 8,
  },
});