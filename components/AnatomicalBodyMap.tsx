import React, { useState } from 'react';

import { PainLocation } from '../types';

interface AnatomicalBodyMapProps {
  selectedLocations: PainLocation[];
  onLocationSelect: (location: PainLocation) => void;
  onLocationRemove: (locationId: string) => void;
  viewType?: 'front' | 'back';
  interactive?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Definições das regiões corporais com coordenadas SVG
const BODY_REGIONS = {
  front: {
    // Cabeça e Pescoço
    head: {
      path: 'M150,20 C160,15 170,15 180,20 C185,25 185,35 180,40 C170,45 160,45 150,40 C145,35 145,25 150,20',
      label: 'Cabeça',
      center: { x: 165, y: 30 },
    },
    neck: {
      path: 'M155,40 C160,42 170,42 175,40 L175,55 L155,55 Z',
      label: 'Pescoço',
      center: { x: 165, y: 47 },
    },

    // Tronco
    chest: {
      path: 'M140,55 C150,55 180,55 190,55 C195,65 195,85 190,95 L140,95 C135,85 135,65 140,55',
      label: 'Tórax',
      center: { x: 165, y: 75 },
    },
    abdomen: {
      path: 'M140,95 L190,95 C188,105 185,115 180,120 L150,120 C145,115 142,105 140,95',
      label: 'Abdômen',
      center: { x: 165, y: 107 },
    },

    // Membros Superiores
    left_shoulder: {
      path: 'M125,55 C135,55 140,60 140,70 C135,75 130,75 125,70 C115,65 115,60 125,55',
      label: 'Ombro Esquerdo',
      center: { x: 130, y: 65 },
    },
    right_shoulder: {
      path: 'M190,55 C200,55 210,60 215,65 C215,70 210,75 205,75 C200,75 195,70 190,70 C190,60 190,55 190,55',
      label: 'Ombro Direito',
      center: { x: 200, y: 65 },
    },
    left_arm: {
      path: 'M115,70 C120,75 125,85 125,95 C125,105 120,115 115,120 C110,115 105,105 105,95 C105,85 110,75 115,70',
      label: 'Braço Esquerdo',
      center: { x: 115, y: 95 },
    },
    right_arm: {
      path: 'M215,70 C220,75 225,85 225,95 C225,105 220,115 215,120 C210,115 205,105 205,95 C205,85 210,75 215,70',
      label: 'Braço Direito',
      center: { x: 215, y: 95 },
    },
    left_forearm: {
      path: 'M105,120 C110,125 115,135 115,145 C115,155 110,165 105,170 C100,165 95,155 95,145 C95,135 100,125 105,120',
      label: 'Antebraço Esquerdo',
      center: { x: 105, y: 145 },
    },
    right_forearm: {
      path: 'M225,120 C230,125 235,135 235,145 C235,155 230,165 225,170 C220,165 215,155 215,145 C215,135 220,125 225,120',
      label: 'Antebraço Direito',
      center: { x: 225, y: 145 },
    },
    left_hand: {
      path: 'M95,170 C100,175 105,180 105,185 C100,190 95,190 90,185 C85,180 85,175 90,170 C92,170 95,170 95,170',
      label: 'Mão Esquerda',
      center: { x: 95, y: 177 },
    },
    right_hand: {
      path: 'M235,170 C240,175 245,180 245,185 C240,190 235,190 230,185 C225,180 225,175 230,170 C232,170 235,170 235,170',
      label: 'Mão Direita',
      center: { x: 235, y: 177 },
    },

    // Membros Inferiores
    left_hip: {
      path: 'M140,120 C145,125 150,130 150,135 C145,140 140,140 135,135 C130,130 130,125 135,120 C137,120 140,120 140,120',
      label: 'Quadril Esquerdo',
      center: { x: 142, y: 130 },
    },
    right_hip: {
      path: 'M180,120 C185,125 190,130 195,135 C200,130 200,125 195,120 C192,120 185,120 180,120',
      label: 'Quadril Direito',
      center: { x: 188, y: 130 },
    },
    left_thigh: {
      path: 'M135,135 C140,140 145,160 145,180 C140,185 135,185 130,180 C125,160 125,140 130,135 C132,135 135,135 135,135',
      label: 'Coxa Esquerda',
      center: { x: 137, y: 160 },
    },
    right_thigh: {
      path: 'M195,135 C200,140 205,160 205,180 C200,185 195,185 190,180 C185,160 185,140 190,135 C192,135 195,135 195,135',
      label: 'Coxa Direita',
      center: { x: 197, y: 160 },
    },
    left_knee: {
      path: 'M130,180 C135,185 145,185 145,190 C140,195 135,195 130,190 C125,185 125,180 130,180',
      label: 'Joelho Esquerdo',
      center: { x: 137, y: 187 },
    },
    right_knee: {
      path: 'M190,180 C195,185 205,185 205,190 C200,195 195,195 190,190 C185,185 185,180 190,180',
      label: 'Joelho Direito',
      center: { x: 197, y: 187 },
    },
    left_shin: {
      path: 'M130,190 C135,195 145,215 145,235 C140,240 135,240 130,235 C125,215 125,195 130,190',
      label: 'Perna Esquerda',
      center: { x: 137, y: 215 },
    },
    right_shin: {
      path: 'M190,190 C195,195 205,215 205,235 C200,240 195,240 190,235 C185,215 185,195 190,190',
      label: 'Perna Direita',
      center: { x: 197, y: 215 },
    },
    left_foot: {
      path: 'M125,235 C130,240 145,245 145,250 C140,255 130,255 125,250 C115,245 115,240 120,235 C122,235 125,235 125,235',
      label: 'Pé Esquerdo',
      center: { x: 132, y: 245 },
    },
    right_foot: {
      path: 'M185,235 C190,240 205,245 205,250 C200,255 190,255 185,250 C175,245 175,240 180,235 C182,235 185,235 185,235',
      label: 'Pé Direito',
      center: { x: 192, y: 245 },
    },
  },

  back: {
    // Cabeça e Pescoço (vista posterior)
    head_back: {
      path: 'M150,20 C160,15 170,15 180,20 C185,25 185,35 180,40 C170,45 160,45 150,40 C145,35 145,25 150,20',
      label: 'Cabeça (posterior)',
      center: { x: 165, y: 30 },
    },
    neck_back: {
      path: 'M155,40 C160,42 170,42 175,40 L175,55 L155,55 Z',
      label: 'Pescoço (posterior)',
      center: { x: 165, y: 47 },
    },

    // Tronco posterior
    upper_back: {
      path: 'M140,55 C150,55 180,55 190,55 C195,65 195,85 190,95 L140,95 C135,85 135,65 140,55',
      label: 'Costas Superior',
      center: { x: 165, y: 75 },
    },
    lower_back: {
      path: 'M140,95 L190,95 C188,105 185,115 180,120 L150,120 C145,115 142,105 140,95',
      label: 'Lombar',
      center: { x: 165, y: 107 },
    },

    // Membros posteriores (espelhados)
    left_shoulder_back: {
      path: 'M190,55 C200,55 210,60 215,65 C215,70 210,75 205,75 C200,75 195,70 190,70 C190,60 190,55 190,55',
      label: 'Ombro Esquerdo (posterior)',
      center: { x: 200, y: 65 },
    },
    right_shoulder_back: {
      path: 'M125,55 C135,55 140,60 140,70 C135,75 130,75 125,70 C115,65 115,60 125,55',
      label: 'Ombro Direito (posterior)',
      center: { x: 130, y: 65 },
    },

    // Glúteos
    left_glute: {
      path: 'M140,120 C145,125 150,135 150,145 C145,150 140,150 135,145 C130,135 130,125 135,120 C137,120 140,120 140,120',
      label: 'Glúteo Esquerdo',
      center: { x: 142, y: 132 },
    },
    right_glute: {
      path: 'M180,120 C185,125 190,135 195,145 C200,135 200,125 195,120 C192,120 185,120 180,120',
      label: 'Glúteo Direito',
      center: { x: 188, y: 132 },
    },
  },
};

export const AnatomicalBodyMap: React.FC<AnatomicalBodyMapProps> = ({
  selectedLocations,
  onLocationSelect,
  onLocationRemove,
  viewType = 'front',
  interactive = true,
  size = 'medium',
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const sizeClasses = {
    small: 'w-48 h-64',
    medium: 'w-64 h-80',
    large: 'w-80 h-96',
  };

  const handleRegionClick = (regionId: string, regionData: any) => {
    if (!interactive) return;

    const existingLocation = selectedLocations.find(
      (loc) => loc.region === regionId
    );

    if (existingLocation) {
      onLocationRemove(existingLocation.id);
    } else {
      const newLocation: PainLocation = {
        id: `pain_${Date.now()}_${regionId}`,
        region: regionId,
        regionLabel: regionData.label,
        side: regionId.includes('left')
          ? 'left'
          : regionId.includes('right')
            ? 'right'
            : 'center',
        intensity: 5,
        quality: [],
        description: '',
      };
      onLocationSelect(newLocation);
    }
  };

  const isRegionSelected = (regionId: string) => {
    return selectedLocations.some((loc) => loc.region === regionId);
  };

  const getRegionColor = (regionId: string) => {
    const selectedLocation = selectedLocations.find(
      (loc) => loc.region === regionId
    );
    if (selectedLocation) {
      // Cor baseada na intensidade da dor (0-10)
      const intensity = selectedLocation.intensity;
      if (intensity <= 3) return '#10B981'; // Verde (dor leve)
      if (intensity <= 6) return '#F59E0B'; // Amarelo (dor moderada)
      if (intensity <= 8) return '#F97316'; // Laranja (dor forte)
      return '#DC2626'; // Vermelho (dor intensa)
    }
    return hoveredRegion === regionId ? '#E5E7EB' : '#F9FAFB';
  };

  const regions = BODY_REGIONS[viewType];

  return (
    <div className={`relative ${sizeClasses[size]} mx-auto`}>
      <svg
        viewBox="0 0 330 270"
        className="h-full w-full rounded-lg border border-gray-200 bg-white"
        style={{ userSelect: 'none' }}
      >
        {/* Corpo base (silhueta) */}
        <defs>
          <pattern
            id="bodyPattern"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
          >
            <rect width="4" height="4" fill="#F8FAFC" />
            <path d="m0,0l4,4m0,-4l-4,4" stroke="#E2E8F0" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Renderizar regiões do corpo */}
        {Object.entries(regions).map(([regionId, regionData]) => (
          <g key={regionId}>
            <path
              d={regionData.path}
              fill={getRegionColor(regionId)}
              stroke={isRegionSelected(regionId) ? '#2563EB' : '#D1D5DB'}
              strokeWidth={isRegionSelected(regionId) ? '2' : '1'}
              className={
                interactive ? 'cursor-pointer transition-all duration-200' : ''
              }
              onMouseEnter={() => interactive && setHoveredRegion(regionId)}
              onMouseLeave={() => interactive && setHoveredRegion(null)}
              onClick={() => handleRegionClick(regionId, regionData)}
            />

            {/* Tooltip no hover */}
            {hoveredRegion === regionId && (
              <g>
                <rect
                  x={regionData.center.x - 25}
                  y={regionData.center.y - 20}
                  width="50"
                  height="16"
                  rx="3"
                  fill="#1F2937"
                  opacity="0.9"
                />
                <text
                  x={regionData.center.x}
                  y={regionData.center.y - 10}
                  textAnchor="middle"
                  className="fill-white text-xs font-medium"
                  style={{ fontSize: '10px' }}
                >
                  {regionData.label}
                </text>
              </g>
            )}

            {/* Indicador de intensidade para regiões selecionadas */}
            {isRegionSelected(regionId) && (
              <circle
                cx={regionData.center.x + 15}
                cy={regionData.center.y - 15}
                r="8"
                fill="#2563EB"
                className="animate-pulse"
              />
            )}
          </g>
        ))}

        {/* Título da vista */}
        <text
          x="165"
          y="15"
          textAnchor="middle"
          className="fill-gray-700 text-sm font-semibold"
          style={{ fontSize: '12px' }}
        >
          Vista {viewType === 'front' ? 'Frontal' : 'Posterior'}
        </text>
      </svg>

      {/* Legenda de intensidade */}
      {selectedLocations.length > 0 && (
        <div className="mt-2 flex items-center justify-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="h-3 w-3 rounded bg-green-500"></div>
            <span>Leve (1-3)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="h-3 w-3 rounded bg-yellow-500"></div>
            <span>Moderada (4-6)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="h-3 w-3 rounded bg-orange-500"></div>
            <span>Forte (7-8)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="h-3 w-3 rounded bg-red-600"></div>
            <span>Intensa (9-10)</span>
          </div>
        </div>
      )}

      {/* Lista de regiões selecionadas */}
      {selectedLocations.length > 0 && (
        <div className="mt-3 space-y-1">
          <h4 className="text-sm font-medium text-gray-700">
            Regiões com Dor ({selectedLocations.length})
          </h4>
          <div className="max-h-24 overflow-y-auto">
            {selectedLocations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs"
              >
                <span className="font-medium">{location.regionLabel}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">
                    Nível: {location.intensity}
                  </span>
                  {interactive && (
                    <button
                      onClick={() => onLocationRemove(location.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnatomicalBodyMap;
