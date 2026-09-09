import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  isOpen: boolean;
  onClose: () => void;
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
  isOpen,
  onClose,
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
  const [mapSearch, setMapSearch] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Bloqueia o scroll da página enquanto o modal de mapa estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSelectedCell(null);
      setMapSearch('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Células válidas com coordenadas numéricas
  const validCells = cells.filter(c => {
    const lat = Number(c.latitude);
    const lng = Number(c.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  // Filtro de busca dentro do próprio mapa (por bairro ou nome)
  const displayedCells = validCells.filter(c => {
    if (!mapSearch.trim()) return true;
    const query = mapSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.neighborhood?.toLowerCase().includes(query) ||
      c.network?.toLowerCase().includes(query) ||
      c.leader?.toLowerCase().includes(query) ||
      c.leader_name?.toLowerCase().includes(query)
    );
  });

  // Inicializa o mapa Leaflet quando o modal abrir
  useEffect(() => {
    let timer: any;

    if (isOpen) {
      timer = setTimeout(() => {
        if (!mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
          // Centro inicial
          const map = L.map(mapContainerRef.current, {
            center: [-27.635, -48.670],
            zoom: 13,
            zoomControl: false,
            attributionControl: false
          });

          // Camada Google Maps Roadmap
          L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['0', '1', '2', '3']
          }).addTo(map);

          // Controle de zoom no canto superior direito
          L.control.zoom({ position: 'topright' }).addTo(map);

          const markersLayer = L.layerGroup().addTo(map);
          markersLayerRef.current = markersLayer;
          mapInstanceRef.current = map;
          setMapReady(true);
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    } else {
      setMapReady(false);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    }

    return () => {
      clearTimeout(timer);
      setMapReady(false);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, [isOpen]);

  // Atualiza marcadores quando a lista de células ou o filtro mudar
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || !isOpen) return;

    markersLayer.clearLayers();

    if (displayedCells.length === 0) return;

    const bounds = L.latLngBounds([]);

    displayedCells.forEach(cell => {
      const lat = Number(cell.latitude);
      const lng = Number(cell.longitude);
      const latLng: [number, number] = [lat, lng];
      bounds.extend(latLng);

      const isMyCell = cell.id === myGroupId || cell.id === currentMemberCellId;
      const markerColor = isMyCell ? '#f59e0b' : primaryColor;
      const markerIcon = isMyCell ? '⭐' : '👥';

      const customIcon = L.divIcon({
        className: 'custom-cell-pin',
        html: `
          <div style="
            position: relative;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            filter: drop-shadow(0 6px 12px rgba(0,0,0,0.3));
            transition: transform 0.2s ease;
          ">
            <div style="
              width: 38px;
              height: 38px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              background: ${markerColor};
              border: 2.5px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            ">
              <span style="
                transform: rotate(45deg);
                font-size: 17px;
                line-height: 1;
              ">${markerIcon}</span>
            </div>
            ${isMyCell ? `
              <div style="
                position: absolute;
                top: -3px;
                right: -3px;
                background: #f59e0b;
                color: #ffffff;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 900;
                border: 1.5px solid #ffffff;
              ">✓</div>
            ` : ''}
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 40],
        popupAnchor: [0, -40]
      });

      const marker = L.marker(latLng, { icon: customIcon });

      marker.on('click', () => {
        setSelectedCell(cell);
        map.flyTo(latLng, 16, { animate: true, duration: 0.5 });
      });

      marker.addTo(markersLayer);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
    map.invalidateSize();
  }, [displayedCells, primaryColor, myGroupId, currentMemberCellId, isOpen, mapReady]);

  // Geolocalização GPS do Usuário
  const handleLocateMe = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!('geolocation' in navigator)) {
      alert('Geolocalização não é suportada neste navegador.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const userLatLng: [number, number] = [pos.coords.latitude, pos.coords.longitude];

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(userLatLng);
        } else {
          userMarkerRef.current = L.circleMarker(userLatLng, {
            radius: 10,
            fillColor: '#3b82f6',
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map);
        }

        map.flyTo(userLatLng, 14, { animate: true, duration: 0.8 });
      },
      err => {
        setIsLocating(false);
        console.warn('Erro ao obter geolocalização:', err);
        alert('Não foi possível obter sua localização. Verifique as permissões de GPS.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const openInNavigationApp = (cell: CellGroupMapItem) => {
    const lat = Number(cell.latitude);
    const lng = Number(cell.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      const query = encodeURIComponent(`${cell.address || cell.neighborhood || cell.name}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
      return;
    }

    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (!isOpen) return null;

  const modalContent = (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      width: '100vw',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#090d16',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes slideUpCard {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .cells-horizontal-slider::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Container Principal do Leaflet (Tela Cheia) */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

      {/* ========================================================
          BARRA SUPERIOR FLUTUANTE (HEADER GLASSMORPHISM)
          ======================================================== */}
      <div style={{
        position: 'absolute',
        top: 'calc(var(--safe-top, 0px) + 12px)',
        left: '12px',
        right: '12px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          {/* Botão Fechar Modal */}
          <button
            type="button"
            onClick={onClose}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '10px 16px',
              fontSize: '0.84rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>✕</span>
            <span>Fechar</span>
          </button>

          {/* Badge Central: Contador de Células Mapeadas */}
          <div style={{
            pointerEvents: 'auto',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            padding: '10px 14px',
            fontSize: '0.78rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
          }}>
            <span>🗺️</span>
            <span>{displayedCells.length} Célula{displayedCells.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Botão GPS: Perto de Mim */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '10px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
            }}
          >
            <span>{isLocating ? '⏳' : '📍'}</span>
            <span>{isLocating ? '...' : 'GPS'}</span>
          </button>
        </div>

        {/* Input de Busca Rápida no Mapa */}
        <div style={{ pointerEvents: 'auto', width: '100%' }}>
          <input
            type="text"
            value={mapSearch}
            onChange={e => setMapSearch(e.target.value)}
            placeholder="🔍 Filtrar por bairro, rede ou líder..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0,0,0,0.08)',
              fontSize: '0.86rem',
              fontWeight: 700,
              color: '#0f172a',
              boxSizing: 'border-box',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* ========================================================
          CARD FLUTUANTE DA CÉLULA SELECIONADA (BOTTOM SHEET NATIVO)
          ======================================================== */}
      {selectedCell ? (
        <div style={{
          position: 'absolute',
          bottom: 'calc(var(--safe-bottom, 0px) + 14px)',
          left: '12px',
          right: '12px',
          zIndex: 10001,
          background: '#ffffff',
          borderRadius: '24px',
          padding: '16px 18px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.28)',
          border: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          animation: 'slideUpCard 0.24s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Topo do Card com Tag e Fechar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  color: primaryColor,
                  textTransform: 'uppercase',
                  background: '#f0fdfa',
                  padding: '3px 8px',
                  borderRadius: '8px',
                  border: '1px solid #ccfbf1'
                }}>
                  {selectedCell.network || selectedCell.focus || 'Geral'}
                </span>
                {selectedCell.neighborhood && (
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b' }}>
                    📍 {selectedCell.neighborhood}
                  </span>
                )}
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0', lineHeight: 1.2 }}>
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
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '0.85rem',
                fontWeight: 900
              }}
            >
              ✕
            </button>
          </div>

          {/* Dados de Encontro */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 14px',
            fontSize: '0.76rem',
            color: '#475569',
            background: '#f8fafc',
            padding: '10px 12px',
            borderRadius: '12px'
          }}>
            {selectedCell.meeting_day && selectedCell.meeting_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: '#0f172a' }}>
                <span>🗓️</span>
                <span>{selectedCell.meeting_day} às {selectedCell.meeting_time}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>👤</span>
              <span>Líder: <b>{selectedCell.leader || selectedCell.leader_name || 'Pastoral'}</b></span>
            </div>
            {selectedCell.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '100%' }}>
                <span>🏠</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCell.address}</span>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '2px' }}>
            <button
              type="button"
              onClick={() => openInNavigationApp(selectedCell)}
              style={{
                background: '#f1f5f9',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#0f172a',
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

            {(selectedCell.id === myGroupId || selectedCell.id === currentMemberCellId) && onEnterCell ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEnterCell(selectedCell);
                }}
                style={{
                  background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)'
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
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
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
                  background: (isPendingJoin && isPendingJoin(selectedCell.id)) ? '#f1f5f9' : 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                  color: (isPendingJoin && isPendingJoin(selectedCell.id)) ? '#94a3b8' : '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
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
        /* Slider Horizontal de Células no Rodapé */
        displayedCells.length > 0 && (
          <div
            className="cells-horizontal-slider"
            style={{
              position: 'absolute',
              bottom: 'calc(var(--safe-bottom, 0px) + 14px)',
              left: 0,
              right: 0,
              zIndex: 10001,
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              padding: '0 16px',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {displayedCells.map(cell => (
              <div
                key={cell.id}
                onClick={() => {
                  setSelectedCell(cell);
                  const lat = Number(cell.latitude);
                  const lng = Number(cell.longitude);
                  if (mapInstanceRef.current && !isNaN(lat) && !isNaN(lng)) {
                    mapInstanceRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.5 });
                  }
                }}
                style={{
                  flexShrink: 0,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '16px',
                  padding: '10px 14px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  maxWidth: '210px'
                }}
              >
                <span style={{ fontSize: '0.64rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase' }}>
                  {cell.network || cell.focus || 'Célula'}
                </span>
                <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cell.name}
                </span>
                {cell.neighborhood && (
                  <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>
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

  return createPortal(modalContent, document.body);
};
