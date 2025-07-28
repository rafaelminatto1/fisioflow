import {
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  RestartAlt,
  Palette,
  Info,
  Save,
  Share,
  Fullscreen,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
} from '@mui/material';
import React, { useState, useRef, useCallback } from 'react';

interface PainPoint {
  id: string;
  x: number;
  y: number;
  intensity: number;
  description: string;
  date: string;
}

interface AnatomyViewerProps {
  region: 'spine' | 'shoulder' | 'knee' | 'full-body';
  onPainPointAdd?: (point: PainPoint) => void;
  onPainPointUpdate?: (id: string, point: Partial<PainPoint>) => void;
  onPainPointDelete?: (id: string) => void;
  painPoints?: PainPoint[];
  readOnly?: boolean;
  showIntensityControls?: boolean;
}

const ANATOMY_REGIONS = {
  'full-body': {
    name: 'Corpo Inteiro',
    image: '/images/anatomy/full-body.svg',
    description: 'Visão geral do sistema musculoesquelético',
  },
  'spine': {
    name: 'Coluna Vertebral',
    image: '/images/anatomy/spine.svg',
    description: 'Vértebras cervicais, torácicas, lombares e sacro',
  },
  'shoulder': {
    name: 'Ombro',
    image: '/images/anatomy/shoulder.svg',
    description: 'Articulação glenoumeral e cintura escapular',
  },
  'knee': {
    name: 'Joelho',
    image: '/images/anatomy/knee.svg',
    description: 'Articulação femorotibial e estruturas adjacentes',
  },
};

const PAIN_COLORS = {
  1: '#4CAF50', // Verde - dor leve
  2: '#FFC107', // Amarelo - dor leve-moderada
  3: '#FF9800', // Laranja - dor moderada
  4: '#F44336', // Vermelho - dor intensa
  5: '#9C27B0', // Roxo - dor muito intensa
};

export const AnatomyViewer: React.FC<AnatomyViewerProps> = ({
  region,
  onPainPointAdd,
  onPainPointUpdate,
  onPainPointDelete,
  painPoints = [],
  readOnly = false,
  showIntensityControls = true,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedIntensity, setSelectedIntensity] = useState(3);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<PainPoint | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const regionData = ANATOMY_REGIONS[region];

  const handleImageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !onPainPointAdd) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newPainPoint: PainPoint = {
      id: `pain_${Date.now()}`,
      x,
      y,
      intensity: selectedIntensity,
      description: `Dor nível ${selectedIntensity}`,
      date: new Date().toISOString(),
    };

    onPainPointAdd(newPainPoint);
  }, [readOnly, onPainPointAdd, selectedIntensity]);

  const handlePainPointClick = useCallback((point: PainPoint, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedPoint(point);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleRotateLeft = () => setRotation(prev => prev - 90);
  const handleRotateRight = () => setRotation(prev => prev + 90);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSaveAnnotations = () => {
    // Lógica para salvar anotações
    console.log('Salvando anotações:', painPoints);
  };

  const handleShareView = () => {
    // Lógica para compartilhar vista
    const shareData = {
      region,
      painPoints,
      zoom,
      rotation,
    };
    console.log('Compartilhando:', shareData);
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {regionData.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {regionData.description}
            </Typography>
          </Box>
          <Chip
            label={`${painPoints.length} pontos`}
            color={painPoints.length > 0 ? 'primary' : 'default'}
            size="small"
          />
        </Box>

        {/* Controls */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          {/* Zoom and Rotation Controls */}
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Diminuir zoom">
              <IconButton onClick={handleZoomOut} disabled={zoom <= 0.5}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Aumentar zoom">
              <IconButton onClick={handleZoomIn} disabled={zoom >= 3}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Girar à esquerda">
              <IconButton onClick={handleRotateLeft}>
                <RotateLeft />
              </IconButton>
            </Tooltip>
            <Tooltip title="Girar à direita">
              <IconButton onClick={handleRotateRight}>
                <RotateRight />
              </IconButton>
            </Tooltip>
            <Tooltip title="Resetar visualização">
              <IconButton onClick={handleReset}>
                <RestartAlt />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          {/* Action Controls */}
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Informações">
              <IconButton onClick={() => setShowInfoDialog(true)}>
                <Info />
              </IconButton>
            </Tooltip>
            <Tooltip title="Tela cheia">
              <IconButton onClick={handleFullscreen}>
                <Fullscreen />
              </IconButton>
            </Tooltip>
            {!readOnly && (
              <>
                <Tooltip title="Salvar anotações">
                  <IconButton onClick={handleSaveAnnotations}>
                    <Save />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Compartilhar">
                  <IconButton onClick={handleShareView}>
                    <Share />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </ButtonGroup>
        </Box>

        {/* Intensity Selector */}
        {showIntensityControls && !readOnly && (
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Intensidade da Dor (1-5):
            </Typography>
            <Slider
              value={selectedIntensity}
              onChange={(_, value) => setSelectedIntensity(value as number)}
              min={1}
              max={5}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
                { value: 4, label: '4' },
                { value: 5, label: '5' },
              ]}
              sx={{ mt: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              Clique na imagem para marcar um ponto de dor
            </Typography>
          </Box>
        )}

        {/* Anatomy Image Container */}
        <Box
          ref={containerRef}
          sx={{
            position: 'relative',
            width: '100%',
            height: 400,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            cursor: readOnly ? 'default' : 'crosshair',
            backgroundColor: '#f5f5f5',
          }}
        >
          <Box
            ref={imageRef}
            onClick={handleImageClick}
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease',
              backgroundImage: `url(${regionData.image})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            {/* Pain Points */}
            {painPoints.map((point) => (
              <Box
                key={point.id}
                onClick={(e) => handlePainPointClick(point, e)}
                sx={{
                  position: 'absolute',
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: PAIN_COLORS[point.intensity as keyof typeof PAIN_COLORS],
                  border: '2px solid white',
                  cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  boxShadow: 2,
                  '&:hover': {
                    transform: 'translate(-50%, -50%) scale(1.2)',
                  },
                }}
              />
            ))}

            {/* Placeholder when no anatomy image */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Modelo Anatômico
              </Typography>
              <Typography variant="body2">
                {regionData.name}
              </Typography>
              <Typography variant="caption" display="block" mt={1}>
                Imagem será carregada aqui
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Pain Points Legend */}
        {painPoints.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Legenda de Intensidade:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {Object.entries(PAIN_COLORS).map(([intensity, color]) => (
                <Chip
                  key={intensity}
                  label={`Nível ${intensity}`}
                  size="small"
                  sx={{
                    backgroundColor: color,
                    color: 'white',
                    '& .MuiChip-label': { fontWeight: 'bold' },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>

      {/* Info Dialog */}
      <Dialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Informações do Modelo Anatômico</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            {regionData.name}
          </Typography>
          <Typography variant="body2" paragraph>
            {regionData.description}
          </Typography>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Como usar:</strong><br />
              • Use os controles de zoom e rotação para visualizar detalhes<br />
              • Clique na imagem para marcar pontos de dor (se habilitado)<br />
              • Ajuste a intensidade da dor com o controle deslizante<br />
              • Clique nos pontos existentes para ver detalhes
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInfoDialog(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Point Details Dialog */}
      <Dialog 
        open={!!selectedPoint} 
        onClose={() => setSelectedPoint(null)}
        maxWidth="xs" 
        fullWidth
      >
        <DialogTitle>Detalhes do Ponto de Dor</DialogTitle>
        <DialogContent>
          {selectedPoint && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Intensidade:</strong> {selectedPoint.intensity}/5
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Descrição:</strong> {selectedPoint.description}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Data:</strong> {new Date(selectedPoint.date).toLocaleDateString('pt-BR')}
              </Typography>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: PAIN_COLORS[selectedPoint.intensity as keyof typeof PAIN_COLORS],
                  mt: 1,
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!readOnly && onPainPointDelete && (
            <Button 
              color="error" 
              onClick={() => {
                if (selectedPoint) {
                  onPainPointDelete(selectedPoint.id);
                  setSelectedPoint(null);
                }
              }}
            >
              Remover
            </Button>
          )}
          <Button onClick={() => setSelectedPoint(null)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};