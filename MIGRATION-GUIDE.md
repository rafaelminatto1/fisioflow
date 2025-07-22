# 🔄 Guia de Migração: React Web → Expo React Native Web

## 🎯 Overview da Migração

Transição do FisioFlow atual (React web puro) para arquitetura universal Expo que roda nativamente em iOS, Android e Web.

## 📋 Checklist de Migração

### ✅ Assets Já Otimizados (Mantidos)
- [x] **Bundle otimizado**: 400KB (80% redução) 
- [x] **Hooks especializados**: usePatients, useTasks, useAuth
- [x] **Componentes modularizados**: PatientModal dividido, React.memo
- [x] **Virtual scrolling**: VirtualList para 1000+ itens
- [x] **Service Workers**: Cache offline e PWA
- [x] **AI cache**: 70% redução custos Gemini
- [x] **Ícones**: lucide-react (compatibility)

### 🔄 Componentes que Precisam Migração

#### 1. Componentes de Layout
```typescript
// ❌ Antes: HTML/CSS
<div className="flex items-center">
  <button onClick={handleClick}>Submit</button>
</div>

// ✅ Depois: React Native
<View style={styles.container}>
  <TouchableOpacity onPress={handlePress}>
    <Text>Submit</Text>
  </TouchableOpacity>
</View>
```

#### 2. Formulários e Inputs
```typescript
// ❌ Antes: HTML forms
<input 
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="border rounded"
/>

// ✅ Depois: TextInput
<TextInput
  value={value}
  onChangeText={setValue}
  style={styles.input}
  placeholder="Enter text"
/>
```

#### 3. Navegação
```typescript
// ❌ Antes: React Router
<BrowserRouter>
  <Route path="/patients" component={Patients} />
</BrowserRouter>

// ✅ Depois: Expo Router
// app/_layout.tsx
<Stack>
  <Stack.Screen name="patients" />
</Stack>
```

## 🗂️ Estrutura de Pastas - Migração

### Estrutura Atual
```
src/
├── components/
│   ├── ui/              ✅ Mantido (com adaptações)
│   ├── patient/         ✅ Mantido (migrar para RN)
│   └── ...
├── hooks/               ✅ Mantido (usePatients, etc.)
├── services/            ✅ Mantido (aiCache, gemini)
├── types.ts             ✅ Mantido
└── constants.tsx        ✅ Mantido
```

### Nova Estrutura Expo
```
fisioflow-mobile/
├── app/                 🆕 Expo Router
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── patients.tsx
│   │   ├── tasks.tsx
│   │   └── settings.tsx
│   └── _layout.tsx
├── components/          🔄 Migrado do atual
│   ├── ui/
│   │   ├── Button.native.tsx    # React Native version
│   │   ├── Button.web.tsx       # Web-specific
│   │   └── Modal.tsx
│   └── patient/
├── hooks/               ✅ Mantido
├── services/            ✅ Mantido (adaptar fetch → axios)
├── styles/              🆕 StyleSheet definitions
└── types.ts             ✅ Mantido
```

## 🔧 Mapeamento de Dependências

### Substituições Necessárias
| Atual (React Web) | Novo (React Native) | Motivo |
|------------------|-------------------|---------|
| `react-router-dom` | `expo-router` | Navegação universal |
| HTML elements | React Native components | Mobile compatibility |
| CSS classes | StyleSheet | Performance nativa |
| `localStorage` | `AsyncStorage` + Supabase | Persistência multiplataforma |
| `fetch` | `@react-native-async-storage/async-storage` | Async storage padrão |
| PWA Service Workers | Expo Updates | OTA updates |

### Dependências Mantidas ✅
```json
{
  "react": "18.2.0",           // ✅ Compatível
  "typescript": "^5.0.0",      // ✅ Mantido
  "lucide-react-native": "*",  // 🔄 Versão RN do lucide
  "@react-native-async-storage/async-storage": "*"
}
```

### Novas Dependências 🆕
```json
{
  "expo": "~50.0.0",
  "expo-router": "~3.4.0",
  "react-native": "0.73.0",
  "react-native-web": "~0.19.0",
  "@supabase/supabase-js": "^2.38.0",
  "react-native-purchases": "^7.0.0"
}
```

## 🎨 Migração de Estilos

### CSS → StyleSheet
```typescript
// ❌ Antes: Tailwind/CSS
const PatientCard = () => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
    <h3 className="text-lg font-semibold text-slate-200">
      {patient.name}
    </h3>
  </div>
);

// ✅ Depois: StyleSheet
const PatientCard = () => (
  <View style={styles.card}>
    <Text style={styles.title}>
      {patient.name}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
});
```

### Design System Unificado
```typescript
// constants/theme.ts
export const theme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#64748b',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
};
```

## 🔄 Migração dos Hooks Existentes

### usePatients (✅ Mantido com adaptações)
```typescript
// hooks/usePatients.native.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export const usePatients = () => {
  // Mantém mesma API, mas adapta storage
  const saveToStorage = async (patients: Patient[]) => {
    await AsyncStorage.setItem('patients', JSON.stringify(patients));
    // + Sync com Supabase
    await supabase.from('patients').upsert(patients);
  };
  
  // Resto da lógica mantida
};
```

### useAuth (🔄 Adaptado para Supabase)
```typescript
// hooks/useAuth.native.ts
import { supabase } from '../services/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  
  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      setUser(data.user);
      // Biometric setup para próximas vezes
      await setupBiometrics();
    }
  };
  
  // Rest of auth logic...
};
```

## 📱 Componentes Platform-Specific

### Padrão de Componentes Universais
```typescript
// components/ui/Button.tsx
import { Platform } from 'react-native';
import ButtonNative from './Button.native';
import ButtonWeb from './Button.web';

const Button = Platform.select({
  native: ButtonNative,
  default: ButtonWeb,
});

export default Button;
```

### Modal Cross-Platform
```typescript
// components/ui/BaseModal.tsx
import { Modal, Platform } from 'react-native';

const BaseModal = ({ isOpen, children, onClose }) => {
  if (Platform.OS === 'web') {
    // Web-specific modal implementation
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
        {children}
      </div>
    );
  }
  
  // Native modal
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {children}
    </Modal>
  );
};
```

## 🔄 Migração Step-by-Step

### Fase 1: Setup Base
```bash
# 1. Criar projeto Expo
npx create-expo-app fisioflow-mobile --template

# 2. Instalar dependências principais
npx expo install expo-router react-native-web

# 3. Copiar services/ e hooks/ existentes
cp -r src/services fisioflow-mobile/
cp -r src/hooks fisioflow-mobile/
cp src/types.ts fisioflow-mobile/
```

### Fase 2: Migrar Componentes UI
```bash
# 4. Migrar componentes base
mkdir -p components/ui
# Adaptar Button.tsx, FormField.tsx, etc.

# 5. Migrar componentes específicos
mkdir -p components/patient
# Adaptar PatientModal, PatientCard, etc.
```

### Fase 3: Configurar Navegação
```typescript
// app/_layout.tsx
import { Slot } from 'expo-router';
import { AuthProvider } from '../hooks/useAuth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
```

### Fase 4: Testar Plataformas
```bash
# Web
npx expo start --web

# iOS Simulator  
npx expo start --ios

# Android Emulator
npx expo start --android
```

## 📊 Compatibilidade de Features

| Feature | Web | iOS | Android | Status |
|---------|-----|-----|---------|---------|
| Autenticação | ✅ | ✅ | ✅ | Supabase Auth |
| CRUD Pacientes | ✅ | ✅ | ✅ | Universal |
| AI Gemini | ✅ | ✅ | ✅ | API mantida |
| Camera/Docs | ⚠️ | ✅ | ✅ | Native only |
| Push Notifications | ❌ | ✅ | ✅ | Native only |
| Biometrics | ❌ | ✅ | ✅ | Native only |
| Offline Sync | ✅ | ✅ | ✅ | AsyncStorage |

## 🚨 Pontos de Atenção

### Limitações Web
- **Sem câmera nativa**: Usar `<input type="file" />` como fallback
- **Sem biometrics**: Login tradicional no web
- **Sem push notifications**: Web push notifications limitadas

### Performance
- **Bundle splitting**: Automático no Expo Router
- **Native modules**: Carregamento condicional por platform
- **Images**: Usar `expo-image` para otimização automática

### Storage Migration
```typescript
// services/storageAdapter.ts
export const storageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
};
```

## ✅ Checklist Final de Migração

### Antes de Começar
- [ ] Backup completo do projeto atual
- [ ] Setup contas Apple Developer + Google Play Console
- [ ] Configuração Supabase projeto
- [ ] Setup Revenue Cat

### Durante Migração
- [ ] Migrar hooks primeiro (menor risco)
- [ ] Componentes UI universais
- [ ] Telas principais (patients, tasks)
- [ ] Navegação e routing
- [ ] Integração com backend

### Após Migração
- [ ] Testes em todas plataformas
- [ ] Performance audit
- [ ] Store submissions (TestFlight/Internal Testing)
- [ ] Documentação atualizada

---

**Tempo estimado**: 8-12 semanas para migração completa
**Benefícios**: Apps nativos + web unificados, freemium monetization, escalabilidade Supabase