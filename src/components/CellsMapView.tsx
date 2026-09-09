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

      // Camada de mapas CartoDB Voyager / OpenStreetMap (Limpo, moderno e com boa legibilidade)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
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

    // Filtra células que possuem coordenadas válidas
    const validCells = cells.filter(c => {
      const lat = Number(c.latitude);
      const lng = Number(c.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

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
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
            transition: all 0.2s ease;
          ">
            <span style="transform: rotate(45deg); font-size: ${isSelected ? '14px' : '12px'}; font-weight: 900;">
              ${isMyCell ? '★' : '👥'}
            </span>
          </div>
          <div style="
            background: rgba(15, 23, 42, 0.85);
            color: #ffffff;
            padding: 2px 7px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
            margin-top: 4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            border: 1px solid rgba(255,255,255,0.15);
          ">
            ${cell.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-cell-pin',
        html: pinHtml,
        iconSize: [32, 48],
        iconAnchor: [16, 48]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedCell(cell);
        map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
      });

      markersLayer.addLayer(marker);
    });

    // Ajusta o enquadramento inicial para cobrir todas as células cadastradas
    if (validCells.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [cells, primaryColor, secondaryColor, selectedCell?.id, myGroupId, currentMemberCellId]);

  // Função para centralizar no GPS do usuário
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        if (!map) return;

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          const marker = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#3b82f6',
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map);
          marker.bindTooltip('Você está aqui', { permanent: false, direction: 'top' });
          userMarkerRef.current = marker;
        }

        map.setView([latitude, longitude], 15, { animate: true });
      },
      err => {
        setIsLocating(false);
        console.warn('Erro ao obter localização:', err);
        alert('Não foi possível obter sua localização atual. Verifique a permissão de GPS no navegador.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const openInNavigationApp = (cell: CellGroupMapItem) => {
    const lat = cell.latitude;
    const lng = cell.longitude;
    if (!lat || !lng) {
      // Fallback para busca por endereço textual
      const query = encodeURIComponent(`${cell.address || ''} ${cell.neighborhood || ''}`.trim());
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
      return;
    }
    // Rota direta para a coordenada
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 240px)', minHeight: '480px', borderRadius: '22px', overflow: 'hidden', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-md)' }}>
      
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Botão Flutuante: Minha Localização (GPS) */}
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={isLocating}
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: '12px',
          padding: '8px 14px',
          fontSize: '0.78rem',
          fontWeight: 800,
          color: 'var(--text-main)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.15s ease'
        }}
      >
        <span>{isLocating ? '⏳' : '📍'}</span>
        <span>{isLocating ? 'Localizando...' : 'Células Perto de Mim'}</span>
      </button>

      {/* Contador de Células Mapeadas */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          right: '54px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(6px)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '6px 12px',
          fontSize: '0.72rem',
          fontWeight: 800,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        🗺️ {cells.length} Célula(s)
      </div>

      {/* Card Flutuante de Detalhes da Célula Selecionada (Bottom Sheet no Mapa) */}
      {selectedCell && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            zIndex: 1001,
            background: '#ffffff',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
            border: '1.5px solid var(--accent-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'fadeInUp 0.25s ease'
          }}
        >
          {/* Header do Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', background: 'var(--accent-primary-light)', padding: '2px 8px', borderRadius: '6px' }}>
                {selectedCell.network || selectedCell.focus || 'Geral'}
              </span>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                {selectedCell.name}
              </h4>
            </div>
            
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontWeight: 900,
                fontSize: '0.85rem'
              }}
            >
              ✕
            </button>
          </div>

          {/* Dados de Endereço e Horário */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {selectedCell.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📍</span>
                <span>{selectedCell.address} {selectedCell.neighborhood ? `(${selectedCell.neighborhood})` : ''}</span>
              </div>
            )}
            {selectedCell.meeting_day && selectedCell.meeting_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-main)' }}>
                <span>🗓️</span>
                <span>{selectedCell.meeting_day} às {selectedCell.meeting_time}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>👤</span>
              <span>Líder: {selectedCell.leader || selectedCell.leader_name || 'Pastoral'}</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            {/* Botão Como Chegar (Google Maps / Waze / Apple Maps) */}
            <button
              type="button"
              onClick={() => openInNavigationApp(selectedCell)}
              style={{
                background: '#f1f5f9',
                border: '1px solid var(--panel-border)',
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

            {/* Botão de Ação: Acessar Célula (se já for membro/líder) ou Participar / WhatsApp */}
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
      )}

    </div>
  );
};
