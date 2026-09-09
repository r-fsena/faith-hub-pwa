import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface CellGroupMapItem {
  id: string;
  name: string;
  network?: string;
  focus?: string;
  leader?: string;
  leader_name?: string;
  neighborhood?: string;
  meeting_day?: string;
  meeting_time?: string;
  whatsapp?: string;
  whatsapp_contact?: string;
  address?: string;
  description?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

interface CellsMapViewProps {
  cells: CellGroupMapItem[];
  primaryColor?: string;
  secondaryColor?: string;
  myGroupId?: string | null;
  currentMemberCellId?: string | null;
  onRequestJoin?: (cell: CellGroupMapItem) => void;
  isPendingJoin?: (cellId: string) => boolean;
  onOpenWhatsApp?: (cell: CellGroupMapItem) => void;
  onEnterCell?: (cell: CellGroupMapItem) => void;
}

export const CellsMapView: React.FC<CellsMapViewProps> = ({
  cells,
  primaryColor = '#0f766e',
  secondaryColor = '#14b8a6',
  myGroupId,
  currentMemberCellId,
  onRequestJoin,
  isPendingJoin,
  onOpenWhatsApp,
  onEnterCell
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);

  const [selectedCell, setSelectedCell] = useState<CellGroupMapItem | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Células válidas com coordenadas numéricas
  const validCells = cells.filter(c => {
    const lat = Number(c.latitude);
    const lng = Number(c.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  // Inicializa o mapa Leaflet uma única vez
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centro padrão inicial (Palhoça / Grande Florianópolis)
      const map = L.map(mapContainerRef.current, {
        center: [-27.635, -48.670],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // Camada Google Maps Roadmap (Rápida, super nítida e sem marca d'água Carto)
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3']
      }).addTo(map);

      // Controle de zoom no topo direito
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Camada para os marcadores de células
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Atualiza marcadores quando a lista de células ou as cores mudarem
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (validCells.length === 0) return;

    const bounds = L.latLngBounds([]);

    validCells.forEach(cell => {
      const lat = Number(cell.latitude);
      const lng = Number(cell.longitude);
      const latLng = L.latLng(lat, lng);
      bounds.extend(latLng);

      const isSelected = selectedCell?.id === cell.id;
      const isMyCell = cell.id === myGroupId || cell.id === currentMemberCellId;

      // Pin HTML Customizado e Responsivo
      const pinHtml = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translate(-50%, -100%);
          cursor: pointer;
        ">
          <div style="
            background: ${isMyCell ? 'linear-gradient(135deg, #059669, #10b981)' : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`};
            color: #ffffff;
            width: ${isSelected ? '38px' : '32px'};
            height: ${isSelected ? '38px' : '32px'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, ${isSelected ? '0.45' : '0.25'});
            border: 2px solid #ffffff;
            transition: all 0.2s ease;
          ">
            <span style="
              transform: rotate(45deg);
              font-size: ${isSelected ? '1rem' : '0.85rem'};
              line-height: 1;
            ">${isMyCell ? '🏠' : '👥'}</span>
          </div>
          <div style="
            background: rgba(15, 23, 42, 0.88);
            color: #ffffff;
            font-size: 0.68rem;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 6px;
            margin-top: 4px;
            white-space: nowrap;
            max-width: 130px;
            overflow: hidden;
            text-overflow: ellipsis;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            border: ${isSelected ? '1.5px solid #ffffff' : 'none'};
          ">
            ${cell.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-cell-pin',
        html: pinHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });

      const marker = L.marker(latLng, { icon: customIcon });

      marker.on('click', () => {
        setSelectedCell(cell);
        map.flyTo(latLng, 15, { animate: true, duration: 0.6 });
      });

      markersLayer.addLayer(marker);
    });

    // Ajusta o zoom para enquadrar todos os pins
    if (bounds.isValid() && validCells.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [cells, primaryColor, secondaryColor, selectedCell, myGroupId, currentMemberCellId]);

  // Função para centralizar no usuário (GPS / Células Perto de Mim)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const userLatLng = L.latLng(latitude, longitude);

        // Remove marcador anterior do usuário se existir
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        // Adiciona um ponto pulsante azul para o usuário
        const userMarker = L.circleMarker(userLatLng, {
          radius: 8,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          color: '#ffffff',
          weight: 3
        }).addTo(map);
        userMarkerRef.current = userMarker;

        // Anima e foca na localização
        map.flyTo(userLatLng, 14, { animate: true, duration: 1.0 });

        // Encontra a célula mais próxima
        let nearestCell: CellGroupMapItem | null = null;
        let minDistance = Infinity;

        validCells.forEach(cell => {
          const cLat = Number(cell.latitude);
          const cLng = Number(cell.longitude);
          const dist = userLatLng.distanceTo([cLat, cLng]);
          if (dist < minDistance) {
            minDistance = dist;
            nearestCell = cell;
          }
        });

        if (nearestCell) {
          setSelectedCell(nearestCell);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn('Erro ao obter GPS:', error);
        alert('Não foi possível obter sua localização atual. Verifique a permissão de GPS no navegador.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const openInNavigationApp = (cell: CellGroupMapItem) => {
    const lat = cell.latitude;
    const lng = cell.longitude;
    if (!lat || !lng) {
      const query = encodeURIComponent(`${cell.address || ''} ${cell.neighborhood || ''}`.trim());
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 'calc(100vh - 210px)',
      minHeight: '520px',
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#f1f5f9'
    }}>
      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
        .cells-horizontal-slider::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Botão Flutuante: Minha Localização (GPS) */}
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={isLocating}
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '12px',
          padding: '8px 14px',
          fontSize: '0.78rem',
          fontWeight: 800,
          color: 'var(--text-main)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.15s ease'
        }}
      >
        <span>{isLocating ? '⏳' : '📍'}</span>
        <span>{isLocating ? 'Localizando...' : 'Perto de Mim'}</span>
      </button>

      {/* Contador de Células */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '54px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '6px 12px',
          fontSize: '0.72rem',
          fontWeight: 800,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        🗺️ {cells.length} Célula(s)
      </div>

      {/* Bottom Sheet Embutido da Célula Selecionada (Design Nativo Docked) */}
      {selectedCell ? (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1001,
            background: '#ffffff',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '12px 16px 16px 16px',
            boxShadow: '0 -6px 20px rgba(0,0,0,0.12)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'slideUpSheet 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Handle Indicador de Gaveta Nativa */}
          <div style={{ width: '38px', height: '4px', background: '#cbd5e1', borderRadius: '2px', margin: '0 auto 4px auto' }} />

          {/* Header com Nome e Minimizar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, paddingRight: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', background: 'var(--accent-primary-light)', padding: '2px 8px', borderRadius: '6px' }}>
                  {selectedCell.network || selectedCell.focus || 'Geral'}
                </span>
                {selectedCell.neighborhood && (
                  <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    📍 {selectedCell.neighborhood}
                  </span>
                )}
              </div>
              <h4 style={{ fontSize: '1.08rem', fontWeight: 900, color: 'var(--text-main)', margin: '3px 0 0 0', lineHeight: 1.2 }}>
                {selectedCell.name}
              </h4>
            </div>
            
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              title="Ocultar detalhes"
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '0.76rem',
                flexShrink: 0
              }}
            >
              ✕
            </button>
          </div>

          {/* Dados de Endereço e Horário */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', background: '#f8fafc', padding: '8px 10px', borderRadius: '10px' }}>
            {selectedCell.meeting_day && selectedCell.meeting_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--text-main)' }}>
                <span>🗓️</span>
                <span>{selectedCell.meeting_day} às {selectedCell.meeting_time}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>👤</span>
              <span>Líder: {selectedCell.leader || selectedCell.leader_name || 'Pastoral'}</span>
            </div>
            {selectedCell.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <span>📍</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCell.address}</span>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
            {/* Botão Como Chegar (Google Maps / Waze / Apple Maps) */}
            <button
              type="button"
              onClick={() => openInNavigationApp(selectedCell)}
              style={{
                background: '#f1f5f9',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🧭</span>
              <span>Como Chegar</span>
            </button>

            {/* Botão de Ação: Acessar Célula ou Participar / WhatsApp */}
            {(selectedCell.id === myGroupId || selectedCell.id === currentMemberCellId) && onEnterCell ? (
              <button
                type="button"
                onClick={() => onEnterCell(selectedCell)}
                style={{
                  background: 'var(--accent-primary-gradient)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>🚀</span>
                <span>Acessar Célula</span>
              </button>
            ) : (selectedCell.whatsapp || selectedCell.whatsapp_contact) && onOpenWhatsApp ? (
              <button
                type="button"
                onClick={() => onOpenWhatsApp(selectedCell)}
                style={{
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </button>
            ) : onRequestJoin ? (
              <button
                type="button"
                onClick={() => onRequestJoin(selectedCell)}
                disabled={isPendingJoin ? isPendingJoin(selectedCell.id) : false}
                style={{
                  background: (isPendingJoin && isPendingJoin(selectedCell.id)) ? '#f1f5f9' : 'var(--accent-primary-gradient)',
                  color: (isPendingJoin && isPendingJoin(selectedCell.id)) ? 'var(--text-muted)' : '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: (isPendingJoin && isPendingJoin(selectedCell.id)) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>{(isPendingJoin && isPendingJoin(selectedCell.id)) ? '⏳' : '🙋'}</span>
                <span>{(isPendingJoin && isPendingJoin(selectedCell.id)) ? 'Pendente' : 'Participar'}</span>
              </button>
            ) : null}
          </div>

        </div>
      ) : (
        /* Slider Horizontal de Células no Rodapé do Mapa (estilo Airbnb/Maps) */
        validCells.length > 0 && (
          <div
            className="cells-horizontal-slider"
            style={{
              position: 'absolute',
              bottom: '10px',
              left: 0,
              right: 0,
              zIndex: 1000,
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              padding: '0 12px',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {validCells.map(cell => (
              <div
                key={cell.id}
                onClick={() => {
                  setSelectedCell(cell);
                  const lat = Number(cell.latitude);
                  const lng = Number(cell.longitude);
                  if (mapInstanceRef.current && !isNaN(lat) && !isNaN(lng)) {
                    mapInstanceRef.current.flyTo([lat, lng], 15, { animate: true, duration: 0.6 });
                  }
                }}
                style={{
                  flexShrink: 0,
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '12px',
                  padding: '7px 11px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  maxWidth: '190px'
                }}
              >
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  {cell.network || cell.focus || 'Célula'}
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cell.name}
                </span>
                {cell.neighborhood && (
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                    📍 {cell.neighborhood}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      )}

    </div>
  );
};
