import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  List, 
  Switch, 
  useTheme, 
  Text,
  Avatar,
  Divider,
  Surface
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

export default function ProfileScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    loadUserData();
    loadSettings();
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

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('userSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setNotificationsEnabled(parsedSettings.notifications ?? true);
        setDarkModeEnabled(parsedSettings.darkMode ?? false);
        setAutoBackupEnabled(parsedSettings.autoBackup ?? true);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const saveSettings = async (key: string, value: boolean) => {
    try {
      const currentSettings = await AsyncStorage.getItem('userSettings');
      const settings = currentSettings ? JSON.parse(currentSettings) : {};
      settings[key] = value;
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.log('Error saving settings:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('currentUser');
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao fazer logout');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Conta',
      'Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Demo', 'Funcionalidade disponível apenas na versão completa');
          }
        }
      ]
    );
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'FISIOTERAPEUTA': return 'Fisioterapeuta';
      case 'ESTAGIARIO': return 'Estagiário';
      default: return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.onBackground }}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <Card style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text
              size={80}
              label={getInitials(user.name)}
              style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
              labelStyle={{ color: theme.colors.onPrimary }}
            />
            
            <View style={styles.profileInfo}>
              <Title style={[styles.userName, { color: theme.colors.onSurface }]}>
                {user.name}
              </Title>
              <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
                {user.email}
              </Text>
              <Surface style={[styles.roleContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text style={[styles.userRole, { color: theme.colors.onPrimaryContainer }]}>
                  👤 {getRoleLabel(user.role)}
                </Text>
              </Surface>
              {user.specialization && (
                <Text style={[styles.specialization, { color: theme.colors.onSurfaceVariant }]}>
                  🎓 {user.specialization}
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Contact Information */}
        <Card style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              📞 Informações de Contato
            </Title>
            
            <List.Item
              title="Telefone"
              description={user.phone || 'Não informado'}
              left={props => <List.Icon {...props} icon="phone" />}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
            
            <List.Item
              title="Email"
              description={user.email}
              left={props => <List.Icon {...props} icon="email" />}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
          </Card.Content>
        </Card>

        {/* Settings */}
        <Card style={[styles.settingsCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              ⚙️ Configurações
            </Title>
            
            <List.Item
              title="Notificações Push"
              description="Receber alertas de agendamentos"
              left={props => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(value) => {
                    setNotificationsEnabled(value);
                    saveSettings('notifications', value);
                  }}
                />
              )}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Modo Escuro"
              description="Interface com tema escuro"
              left={props => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={darkModeEnabled}
                  onValueChange={(value) => {
                    setDarkModeEnabled(value);
                    saveSettings('darkMode', value);
                    Alert.alert('Demo', 'Tema será aplicado na próxima inicialização');
                  }}
                />
              )}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Backup Automático"
              description="Sincronizar dados automaticamente"
              left={props => <List.Icon {...props} icon="backup-restore" />}
              right={() => (
                <Switch
                  value={autoBackupEnabled}
                  onValueChange={(value) => {
                    setAutoBackupEnabled(value);
                    saveSettings('autoBackup', value);
                  }}
                />
              )}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
          </Card.Content>
        </Card>

        {/* Actions */}
        <Card style={[styles.actionsCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              🔧 Ações
            </Title>
            
            <Button
              mode="contained"
              icon="pencil"
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
              onPress={() => Alert.alert('Demo', 'Edição de perfil disponível na versão completa')}
            >
              Editar Perfil
            </Button>
            
            <Button
              mode="outlined"
              icon="key-change"
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
              onPress={() => Alert.alert('Demo', 'Alteração de senha disponível na versão completa')}
            >
              Alterar Senha
            </Button>
            
            <Button
              mode="outlined"
              icon="download"
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
              onPress={() => Alert.alert('Demo', 'Export de dados disponível na versão completa')}
            >
              Exportar Dados
            </Button>
          </Card.Content>
        </Card>

        {/* App Information */}
        <Card style={[styles.appInfoCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              📱 Sobre o App
            </Title>
            
            <List.Item
              title="Versão"
              description="1.0.0 (Beta)"
              left={props => <List.Icon {...props} icon="information" />}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
            
            <List.Item
              title="Suporte"
              description="contato@fisioflow.com"
              left={props => <List.Icon {...props} icon="help-circle" />}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              onPress={() => Alert.alert('Demo', 'Link de suporte disponível na versão completa')}
            />
            
            <List.Item
              title="Política de Privacidade"
              description="Toque para visualizar"
              left={props => <List.Icon {...props} icon="shield-check" />}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              onPress={() => Alert.alert('Demo', 'Política de privacidade disponível na versão completa')}
            />
          </Card.Content>
        </Card>

        {/* Danger Zone */}
        <Card style={[styles.dangerCard, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content>
            <Title style={[styles.dangerTitle, { color: theme.colors.onErrorContainer }]}>
              ⚠️ Zona de Perigo
            </Title>
            
            <Button
              mode="contained"
              icon="logout"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              style={styles.dangerButton}
              contentStyle={styles.actionButtonContent}
              onPress={handleLogout}
            >
              Fazer Logout
            </Button>
            
            <Button
              mode="outlined"
              icon="delete-forever"
              textColor={theme.colors.error}
              style={[styles.dangerButton, { borderColor: theme.colors.error }]}
              contentStyle={styles.actionButtonContent}
              onPress={handleDeleteAccount}
            >
              Excluir Conta
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
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
  profileCard: {
    marginBottom: 16,
    elevation: 3,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 8,
  },
  roleContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '500',
  },
  specialization: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  settingsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  appInfoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  dangerCard: {
    marginBottom: 32,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  divider: {
    marginVertical: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  dangerButton: {
    marginBottom: 12,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
});