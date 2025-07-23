# 🍎 Setup iOS + TestFlight para FisioFlow

**Objetivo**: Criar app iOS apenas para sua equipe usar (sem publicar na App Store)

## 📋 **Pré-requisitos**

- ✅ Conta Apple Developer ($99/ano)
- ✅ Mac ou serviço EAS Build (Expo)
- ✅ iPhone/iPad para testes
- ✅ Equipe de fisioterapeutas (até 100 pessoas)

## 🎯 **Timeline Realista**

- **Esta semana**: Setup inicial + primeira build
- **Semana 1-2**: App básico funcionando no TestFlight
- **Semana 3-4**: Funcionalidades completas + pagamentos

---

## 📱 **PASSO 1: Conta Apple Developer (HOJE)**

### 1.1 Inscrição
```bash
# Acesse e faça a inscrição:
https://developer.apple.com/programs/

# Custo: $99/ano
# Tempo de aprovação: 24-48 horas
# Necessário: Apple ID + cartão de crédito
```

### 1.2 Após Aprovação
```bash
# Acessar painel desenvolvedor:
https://developer.apple.com/account/

# Verificar se aparece:
# - Certificates, Identifiers & Profiles
# - App Store Connect access
```

---

## 🚀 **PASSO 2: Setup Expo + EAS (ESTE FINAL DE SEMANA)**

### 2.1 Criar Projeto
```bash
# Instalar Expo CLI globalmente
npm install -g @expo/eas-cli

# Criar projeto React Native
npx create-expo-app@latest FisioFlowMobile --template blank-typescript
cd FisioFlowMobile

# Login na Expo
eas login
# (criar conta gratuita se não tiver)
```

### 2.2 Instalar Dependências iOS
```bash
# Dependências essenciais
npx expo install expo-dev-client expo-constants expo-linking expo-status-bar

# Navegação
npm install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context

# UI Components
npm install react-native-paper react-native-vector-icons
npm install @react-native-async-storage/async-storage
```

### 2.3 Configurar app.json
```json
{
  "expo": {
    "name": "FisioFlow",
    "slug": "fisioflow-mobile",
    "version": "1.0.0",
    "platforms": ["ios"],
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1e293b"
    },
    "ios": {
      "bundleIdentifier": "com.fisioflow.mobile",
      "buildNumber": "1",
      "supportsTablet": true,
      "requireFullScreen": false,
      "infoPlist": {
        "UIBackgroundModes": ["background-fetch"]
      }
    },
    "plugins": [
      "expo-dev-client",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "13.0"
          }
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "SEU_PROJECT_ID_AQUI"
      }
    }
  }
}
```

### 2.4 Configurar EAS Build
```bash
# Configurar build
eas build:configure

# Isso criará o arquivo eas.json automaticamente
```

### 2.5 Arquivo eas.json (TestFlight)
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 🏗️ **PASSO 3: Estrutura do Projeto (SEMANA 1)**

### 3.1 Criar Estrutura de Pastas
```bash
mkdir -p src/components src/screens src/hooks src/services src/types
mkdir -p src/components/ui src/components/admin
mkdir -p assets/icons assets/images
```

### 3.2 Arquivo de Tipos (src/types/index.ts)
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FISIOTERAPEUTA' | 'ESTAGIARIO' | 'PACIENTE';
  tenantId: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  condition: string;
  sessions: number;
  progress: number;
  tenantId: string;
}

export interface SubscriptionMetrics {
  activeSubscribers: number;
  monthlyRevenue: number;
  conversionRate: number;
  churnRate: number;
}
```

### 3.3 Navegação Principal (App.tsx)
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PatientsScreen from './src/screens/PatientsScreen';
import SubscriptionMetricsScreen from './src/screens/SubscriptionMetricsScreen';

const Stack = createStackNavigator();

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#3b82f6',
    background: '#1e293b',
    surface: '#334155',
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1e293b',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
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
            options={{ title: 'FisioFlow' }}
          />
          <Stack.Screen 
            name="Patients" 
            component={PatientsScreen}
            options={{ title: 'Pacientes' }}
          />
          <Stack.Screen 
            name="SubscriptionMetrics" 
            component={SubscriptionMetricsScreen}
            options={{ title: 'Métricas de Assinatura' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
```

### 3.4 Tela de Login (src/screens/LoginScreen.tsx)
```typescript
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, TextInput, Title, useTheme } from 'react-native-paper';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('demo123');
  const theme = useTheme();

  const handleLogin = () => {
    // Simulação de login
    if (email === 'admin@demo.com') {
      navigation.replace('Dashboard');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>FisioFlow</Title>
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
          />
          
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.button}
          >
            Entrar
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 28,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
});
```

---

## 🔨 **PASSO 4: Primeira Build TestFlight (SEMANA 1-2)**

### 4.1 Build iOS
```bash
# Primeira build (demora 20-30 minutos)
eas build --platform ios --profile preview

# Aguardar conclusão e anotar o link do arquivo .ipa
```

### 4.2 Configurar App Store Connect
```bash
# 1. Acessar App Store Connect
https://appstoreconnect.apple.com

# 2. Criar novo app:
# - Nome: FisioFlow
# - Bundle ID: com.fisioflow.mobile
# - Plataforma: iOS

# 3. Ir em TestFlight → Builds
# Aguardar o upload automático da build
```

### 4.3 Adicionar Testadores Internos
```bash
# No App Store Connect → TestFlight:

# 1. Testadores Internos → Adicionar
# 2. Inserir emails da equipe (até 100 pessoas)
# 3. Selecionar build e enviar convites
# 4. Equipe receberá email com link TestFlight
```

### 4.4 Submit Automático
```bash
# Para uploads automáticos futuros:
eas submit --platform ios --latest

# Isso fará upload direto para TestFlight
```

---

## 📊 **PASSO 5: Migrar Painel Admin (SEMANA 2-3)**

### 5.1 Tela de Métricas (src/screens/SubscriptionMetricsScreen.tsx)
```typescript
import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button, SegmentedButtons } from 'react-native-paper';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

export default function SubscriptionMetricsScreen() {
  const [period, setPeriod] = useState('30d');
  const [metrics, setMetrics] = useState<MetricCard[]>([]);

  useEffect(() => {
    // Carregar métricas demo
    setMetrics([
      {
        title: 'Assinantes Ativos',
        value: '25',
        change: '+5',
        trend: 'up'
      },
      {
        title: 'Receita Mensal (MRR)',
        value: 'R$ 1.250',
        change: '+15.3%',
        trend: 'up'
      },
      {
        title: 'Taxa de Conversão',
        value: '8.5%',
        change: '+2.1%',
        trend: 'up'
      },
      {
        title: 'Taxa de Churn',
        value: '3.2%',
        change: '-0.8%',
        trend: 'down'
      }
    ]);
  }, [period]);

  return (
    <ScrollView style={styles.container}>
      <SegmentedButtons
        value={period}
        onValueChange={setPeriod}
        buttons={[
          { value: '7d', label: '7 dias' },
          { value: '30d', label: '30 dias' },
          { value: '90d', label: '90 dias' },
        ]}
        style={styles.periodSelector}
      />

      {metrics.map((metric, index) => (
        <Card key={index} style={styles.metricCard}>
          <Card.Content>
            <Title>{metric.value}</Title>
            <Paragraph>{metric.title}</Paragraph>
            <Paragraph style={[
              styles.change,
              { color: metric.trend === 'up' ? '#22c55e' : '#ef4444' }
            ]}>
              {metric.change}
            </Paragraph>
          </Card.Content>
        </Card>
      ))}

      <Button
        mode="contained"
        style={styles.exportButton}
        onPress={() => {
          // Implementar export
          console.log('Exportar dados');
        }}
      >
        Exportar Dados
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  periodSelector: {
    marginBottom: 20,
  },
  metricCard: {
    marginBottom: 12,
  },
  change: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  exportButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});
```

---

## 🚀 **PASSO 6: Updates e Deploy (SEMANA 3-4)**

### 6.1 Nova Build
```bash
# Incrementar buildNumber no app.json
# "buildNumber": "2"

# Nova build
eas build --platform ios --profile preview --auto-submit

# TestFlight notificará automaticamente os testadores
```

### 6.2 Implementar StoreKit 2 (Pagamentos)
```bash
# Instalar Revenue Cat para pagamentos
npm install react-native-purchases

# Configurar produtos no App Store Connect:
# - Silver: R$ 29,90/mês
# - Gold: R$ 49,90/mês  
# - Platinum: R$ 99,90/mês
```

---

## 📋 **Checklist de Entrega**

### Esta Semana
- [ ] ✅ Fazer conta Apple Developer
- [ ] ✅ Setup Expo + EAS configurado
- [ ] ✅ Primeiro build no TestFlight

### Semana 1-2  
- [ ] ✅ App básico funcionando (login + navegação)
- [ ] ✅ Equipe usando no iPhone diariamente
- [ ] ✅ Feedback coletado e bugs corrigidos

### Semana 3-4
- [ ] ✅ Painel admin completo
- [ ] ✅ Sistema de pagamentos StoreKit 2
- [ ] ✅ Versão estável para uso produtivo

---

## 🎯 **Vantagens do TestFlight**

✅ **Deploy imediato** - Sem revisão da Apple  
✅ **Até 100 testadores** - Perfeito para sua equipe  
✅ **Updates automáticos** - Push de novas versões  
✅ **Feedback integrado** - Capturas de tela e comentários  
✅ **Analytics detalhado** - Uso, crashes e performance  
✅ **Notificações push** - Aviso de novas builds  

---

## 📞 **Próxima Ação**

**HOJE**: Fazer conta Apple Developer  
**AMANHÃ**: Assim que for aprovado, seguir PASSO 2  
**FIM DE SEMANA**: Primeira build no TestFlight  

**Dúvidas?** Me avise quando a conta Apple for aprovada que eu ajudo com qualquer erro no setup!