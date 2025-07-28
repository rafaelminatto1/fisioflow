import {
  WhatsApp,
  QrCode,
  CheckCircle,
  Error,
  Refresh,
  Send,
  Settings,
  Info,
  ConnectedTv,
  PhoneAndroid,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useNotification } from '../../hooks/useNotification';
import { useEvolutionWhatsApp } from '../../services/evolutionWhatsAppService';

interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  message: string;
  qrcode?: string;
}

export const WhatsAppManager: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    message: 'Não conectado',
  });
  const [loading, setLoading] = useState(false);
  const [qrCodeDialog, setQrCodeDialog] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('🤖 Teste de conexão FisioFlow!\n\nSe você recebeu esta mensagem, o WhatsApp está funcionando perfeitamente.\n\nAtt, Equipe FisioFlow 💙');
  
  const whatsapp = useEvolutionWhatsApp();
  const { showNotification } = useNotification();

  // Verificar status na inicialização
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    setLoading(true);
    try {
      const status = await whatsapp.getInstanceStatus();
      
      if (status?.status === 'open') {
        setConnectionStatus({
          status: 'connected',
          message: 'WhatsApp conectado e funcionando',
        });
      } else if (status?.status === 'connecting') {
        setConnectionStatus({
          status: 'connecting',
          message: 'Conectando ao WhatsApp...',
        });
      } else {
        setConnectionStatus({
          status: 'disconnected',
          message: 'WhatsApp desconectado',
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        message: 'Erro ao verificar conexão',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const result = await whatsapp.connectInstance();
      
      if (result.success && result.qrcode) {
        setConnectionStatus({
          status: 'connecting',
          message: 'Escaneie o QR Code com seu WhatsApp',
          qrcode: result.qrcode,
        });
        setQrCodeDialog(true);
        
        // Verificar conexão a cada 5 segundos
        const interval = setInterval(async () => {
          const isConnected = await whatsapp.isConnected();
          if (isConnected) {
            clearInterval(interval);
            setConnectionStatus({
              status: 'connected',
              message: 'WhatsApp conectado com sucesso!',
            });
            setQrCodeDialog(false);
            showNotification('WhatsApp conectado com sucesso!', 'success');
          }
        }, 5000);
        
        // Parar verificação após 2 minutos
        setTimeout(() => clearInterval(interval), 120000);
      } else {
        throw new Error(result.error || 'Erro ao gerar QR Code');
      }
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro ao conectar',
      });
      showNotification('Erro ao conectar WhatsApp', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      showNotification('Preencha telefone e mensagem', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Usar o serviço diretamente para teste
      const response = await fetch('http://localhost:8080/message/sendText/fisioflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'fisioflow-2024-secret-key',
        },
        body: JSON.stringify({
          number: testPhone.replace(/\D/g, ''),
          text: testMessage,
        }),
      });

      if (response.ok) {
        showNotification('Mensagem de teste enviada!', 'success');
        setTestDialog(false);
        setTestPhone('');
      } else {
        throw new Error('Falha ao enviar mensagem');
      }
    } catch (error) {
      showNotification('Erro ao enviar mensagem de teste', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle color="success" />;
      case 'connecting': return <CircularProgress size={20} />;
      case 'error': return <Error color="error" />;
      default: return <PhoneAndroid />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <WhatsApp sx={{ fontSize: 32, color: '#25d366' }} />
            <Box>
              <Typography variant="h6">
                WhatsApp Business Integration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie a conexão do WhatsApp para automações
              </Typography>
            </Box>
          </Box>
          
          <Chip
            icon={getStatusIcon(connectionStatus.status)}
            label={connectionStatus.message}
            color={getStatusColor(connectionStatus.status) as any}
            variant="outlined"
          />
        </Box>

        <Grid container spacing={3}>
          {/* Status Card */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Box mb={2}>
                {getStatusIcon(connectionStatus.status)}
              </Box>
              <Typography variant="h6" gutterBottom>
                Status da Conexão
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {connectionStatus.message}
              </Typography>
              
              <Box display="flex" gap={1} justifyContent="center">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={checkConnectionStatus}
                  disabled={loading}
                  startIcon={<Refresh />}
                >
                  Verificar
                </Button>
                
                {connectionStatus.status !== 'connected' && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleConnect}
                    disabled={loading}
                    startIcon={<ConnectedTv />}
                  >
                    Conectar
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Actions Card */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ações Disponíveis
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Send fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Teste de Mensagem"
                    secondary="Enviar mensagem de teste"
                  />
                  <Button
                    size="small"
                    onClick={() => setTestDialog(true)}
                    disabled={connectionStatus.status !== 'connected'}
                  >
                    Testar
                  </Button>
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <QrCode fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="QR Code"
                    secondary={connectionStatus.qrcode ? 'Disponível' : 'Não disponível'}
                  />
                  <Button
                    size="small"
                    onClick={() => setQrCodeDialog(true)}
                    disabled={!connectionStatus.qrcode}
                  >
                    Ver QR
                  </Button>
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="API Docs"
                    secondary="Documentação da API"
                  />
                  <Button
                    size="small"
                    onClick={() => window.open('http://localhost:8080/docs', '_blank')}
                  >
                    Abrir
                  </Button>
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* Configuration Info */}
          <Grid item xs={12}>
            <Alert severity="info" icon={<Info />}>
              <Typography variant="subtitle2" gutterBottom>
                Configuração da Evolution API:
              </Typography>
              <Typography variant="body2">
                • <strong>URL:</strong> http://localhost:8080<br />
                • <strong>Instância:</strong> fisioflow<br />
                • <strong>Documentação:</strong> http://localhost:8080/docs<br />
                • <strong>Status:</strong> Evolution API deve estar rodando (execute start-whatsapp.bat)
              </Typography>
            </Alert>
          </Grid>
        </Grid>

        {/* QR Code Dialog */}
        <Dialog
          open={qrCodeDialog}
          onClose={() => setQrCodeDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <QrCode />
              Conectar WhatsApp
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                1. Abra o WhatsApp no seu celular<br />
                2. Vá em Menu → Dispositivos conectados<br />
                3. Toque em "Conectar um dispositivo"<br />
                4. Escaneie o código QR abaixo
              </Typography>
            </Alert>
            
            {connectionStatus.qrcode && (
              <Box textAlign="center">
                <img
                  src={connectionStatus.qrcode}
                  alt="QR Code WhatsApp"
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    border: '1px solid #ddd',
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQrCodeDialog(false)}>
              Fechar
            </Button>
            <Button onClick={checkConnectionStatus} variant="outlined">
              Verificar Conexão
            </Button>
          </DialogActions>
        </Dialog>

        {/* Test Message Dialog */}
        <Dialog
          open={testDialog}
          onClose={() => setTestDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Enviar Mensagem de Teste</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Número de Telefone"
              placeholder="Ex: 11999999999"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Digite apenas números (DDD + telefone)"
            />
            
            <TextField
              fullWidth
              label="Mensagem"
              multiline
              rows={4}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              helperText="Mensagem que será enviada para teste"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTestDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleTestMessage}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Enviar'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};