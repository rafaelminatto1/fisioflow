# 📱 FisioFlow - Roadmap Freemium Mobile

## 🎯 Visão Geral

Transformação completa do FisioFlow de React web app para arquitetura unificada mobile/web com modelo freemium usando:
- **Expo React Native Web** - Unificação de código mobile/web 
- **Supabase** - Backend escalável com RLS
- **Revenue Cat** - Gerenciamento de assinaturas multiplataforma

## 🏗️ Arquitetura Atual vs. Nova

### ✅ Otimizações Já Implementadas (Base Sólida)
- **Bundle reduzido 80%**: 2.1MB → 400KB
- **Performance 4x melhor**: 8s → 2s tempo de carregamento
- **AI cache inteligente**: 70% redução custos Gemini (~$35/mês economia)
- **Hooks especializados**: usePatients, useTasks (fragmentação do monolítico useData)
- **Componentes modularizados**: PatientModal dividido, React.memo implementado
- **Virtual scrolling**: Listas 1000+ itens otimizadas
- **Service Workers**: Cache offline e PWA funcional
- **Ícones otimizados**: Migração completa lucide-react

### 🔄 Migração Arquitetural

#### De: React Web App
```
React 18 + TypeScript + Vite
├── localStorage persistence
├── Context API (AuthProvider, DataProvider)  
├── Gemini AI integration
├── Custom icons + lucide-react
└── PWA com Service Workers
```

#### Para: Expo Universal App
```
Expo SDK 50+ + React Native Web
├── Supabase PostgreSQL + RLS
├── Revenue Cat subscriptions
├── Expo Router (file-based routing)
├── Native modules (camera, biometric)
└── EAS Build & Update
```

## 🚀 Roadmap de Desenvolvimento

### **FASE 1: Preparação e Setup (2-3 semanas)**

#### 1.1 Configuração do Ambiente
- [ ] Setup Expo CLI e projeto universal
- [ ] Configuração Supabase (Database, Auth, RLS)
- [ ] Setup Revenue Cat (iOS/Android consoles)
- [ ] Configuração EAS Build/Submit

#### 1.2 Migração Base de Dados
```sql
-- Estrutura Supabase multi-tenant
CREATE SCHEMA IF NOT EXISTS fisioflow;

-- Tenants (Clínicas)
CREATE TABLE fisioflow.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  plan_type VARCHAR DEFAULT 'free', -- free, pro, enterprise
  subscription_status VARCHAR DEFAULT 'active',
  max_patients INTEGER DEFAULT 10,
  max_physiotherapists INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies para isolamento de dados
ALTER TABLE fisioflow.tenants ENABLE ROW LEVEL SECURITY;
```

#### 1.3 Estrutura de Pastas
```
fisioflow-mobile/
├── app/              # Expo Router
│   ├── (auth)/
│   ├── (tabs)/
│   └── _layout.tsx
├── components/       # Componentes compartilhados
├── services/         # APIs e integrações
├── hooks/           # Custom hooks React Native
├── types/           # TypeScript definitions
└── constants/       # Configurações
```

### **FASE 2: Core Features Mobile (3-4 semanas)**

#### 2.1 Autenticação Universal
- [ ] Supabase Auth (email, social login)
- [ ] Biometric authentication (TouchID/FaceID)
- [ ] Onboarding multi-tenant
- [ ] Role-based access (Admin, Fisio, Estagiário, Paciente)

#### 2.2 Componentes Native-First
```typescript
// Exemplo: PatientCard component
import { View, Text, TouchableOpacity } from 'react-native';

const PatientCard = ({ patient, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.avatar}>
      <Text style={styles.initials}>
        {patient.name[0].toUpperCase()}
      </Text>
    </View>
    <View style={styles.info}>
      <Text style={styles.name}>{patient.name}</Text>
      <Text style={styles.email}>{patient.email}</Text>
    </View>
  </TouchableOpacity>
);
```

#### 2.3 Navegação e Routing
- [ ] Bottom tabs navigation
- [ ] Stack navigation para modals
- [ ] Deep linking para web compatibility
- [ ] Drawer navigation (admin features)

### **FASE 3: Freemium Implementation (2-3 semanas)**

#### 3.1 Revenue Cat Integration
```typescript
// Revenue Cat setup
import Purchases from 'react-native-purchases';

const REVENUE_CAT_API_KEY = {
  ios: 'appl_xxx',
  android: 'goog_xxx',
};

// Planos freemium
const SUBSCRIPTION_PLANS = {
  FREE: {
    maxPatients: 10,
    maxPhysiotherapists: 1,
    aiAnalysis: false,
    reports: false,
  },
  PRO: {
    maxPatients: 100,
    maxPhysiotherapists: 5,
    aiAnalysis: true,
    reports: true,
    price: 'R$ 29,90/mês',
  },
  ENTERPRISE: {
    unlimited: true,
    customFeatures: true,
    priority_support: true,
    price: 'R$ 99,90/mês',
  },
};
```

#### 3.2 Paywall e Upselling
- [ ] Paywall nativo (iOS/Android)
- [ ] Feature gating baseado no plano
- [ ] Trial gratuito 7 dias
- [ ] Restore purchases
- [ ] Upgrade/downgrade flow

#### 3.3 Analytics e Métricas
- [ ] Expo Analytics
- [ ] Revenue Cat dashboard
- [ ] Conversion tracking
- [ ] Churn analysis

### **FASE 4: Features Nativas (3-4 semanas)**

#### 4.1 Camera e Documentos
```typescript
// Exemplo: Document capture
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const DocumentCapture = () => {
  const capturePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      // Upload para Supabase Storage
      await uploadDocument(result.assets[0]);
    }
  };
};
```

#### 4.2 Push Notifications
- [ ] Lembretes de sessões
- [ ] Notificações de tarefas
- [ ] Marketing campaigns (pro users)
- [ ] Background sync

#### 4.3 Offline-First
- [ ] Expo SQLite local storage
- [ ] Sync com Supabase quando online
- [ ] Conflict resolution
- [ ] Offline indicators

### **FASE 5: Web Compatibility (2 semanas)**

#### 5.1 React Native Web
- [ ] Responsive design mobile-first
- [ ] Desktop adaptations
- [ ] Keyboard shortcuts
- [ ] Mouse interactions

#### 5.2 SEO e Performance
- [ ] Next.js-like routing (Expo Router)
- [ ] Meta tags dinâmicos
- [ ] Web-specific optimizations
- [ ] PWA manifest

### **FASE 6: Deployment e Launch (2-3 semanas)**

#### 6.1 CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Expo
        uses: expo/expo-github-action@v7
      - name: Build and Deploy
        run: |
          eas build --platform all --non-interactive
          eas submit --platform all --non-interactive
```

#### 6.2 Store Submissions
- [ ] iOS App Store (TestFlight → Production)
- [ ] Google Play Store (Internal → Production)
- [ ] Web deployment (Vercel/Netlify)
- [ ] Store optimization (ASO)

## 💰 Estratégia Freemium Detalhada

### 🆓 Plano Gratuito (Acquisition)
- **Pacientes**: Até 10
- **Fisioterapeutas**: 1
- **Funcionalidades básicas**: Agendamento, fichas simples
- **AI**: Desabilitado
- **Relatórios**: Básicos
- **Armazenamento**: 100MB

### 🏅 Plano Pro (R$ 29,90/mês) - Conversion
- **Pacientes**: Até 100  
- **Fisioterapeutas**: Até 5
- **AI completo**: Análise SOAP, planos de tratamento
- **Relatórios avançados**: Dashboard, métricas
- **Armazenamento**: 5GB
- **Suporte**: Chat 24/7

### 🏢 Plano Enterprise (R$ 99,90/mês) - Expansion
- **Ilimitado**: Pacientes e fisioterapeutas
- **Features customizadas**: Integrações, API
- **White-label**: Personalização completa
- **Suporte dedicado**: Account manager
- **Compliance**: LGPD, ISO certifications

## 📊 Projeções Financeiras

### Métricas de Negócio
- **CAC** (Customer Acquisition Cost): R$ 15-25
- **LTV** (Lifetime Value): R$ 450-800
- **Conversion Rate**: 8-12% (Free → Pro)
- **Churn Rate**: <5% (mensal)
- **Break-even**: 500+ subscribers

### Custos Operacionais (Mensal)
```
Supabase Pro:        R$ 125   (25GB, 500K requests)
Revenue Cat:         R$ 50    (até 10K subscribers)
Expo EAS:           R$ 180   (build/submit ilimitado)
Vercel Pro:         R$ 100   (web hosting)
Gemini API:         R$ 75    (com cache otimizado)
----------------------
Total:              R$ 530/mês
```

## 🛠️ Stack Tecnológica Final

### Mobile/Web Framework
- **Expo SDK 50+** com React Native Web
- **TypeScript** strict mode
- **Expo Router** para navegação universal

### Backend & Database  
- **Supabase** PostgreSQL com RLS
- **Supabase Auth** multi-provider
- **Supabase Storage** para documentos

### Monetização
- **Revenue Cat** para IAP e subscriptions
- **Stripe** para web payments (fallback)

### AI & Analytics
- **Google Gemini** com cache otimizado
- **Expo Analytics** 
- **Sentry** para error tracking

### DevOps & CI/CD
- **EAS Build** para mobile builds
- **EAS Submit** para store automation  
- **GitHub Actions** para CI/CD
- **Vercel** para web deployment

## 🎯 Próximos Passos Imediatos

### Semana 1-2: Setup Inicial
1. **Criar conta Expo** e setup EAS
2. **Configurar Supabase** projeto e database
3. **Setup Revenue Cat** com Apple/Google consoles
4. **Migrar types.ts** para compatibility React Native

### Primeiras Tarefas Técnicas
```bash
# 1. Inicializar projeto Expo
npx create-expo-app fisioflow-mobile --template

# 2. Instalar dependências principais
npx expo install react-native-web @supabase/supabase-js react-native-purchases

# 3. Setup Expo Router
npx expo install expo-router react-native-safe-area-context react-native-screens

# 4. Configurar EAS
eas build:configure
```

## 📅 Timeline Total: 16-20 semanas

- **FASE 1**: 2-3 semanas (Setup)
- **FASE 2**: 3-4 semanas (Core Mobile)  
- **FASE 3**: 2-3 semanas (Freemium)
- **FASE 4**: 3-4 semanas (Features Nativas)
- **FASE 5**: 2 semanas (Web Compatibility)
- **FASE 6**: 2-3 semanas (Deploy & Launch)

**Launch Target**: 4-5 meses a partir do início

---

*Este roadmap considera as otimizações já implementadas como base sólida e foca na transição para arquitetura mobile-first freemium escalável.*