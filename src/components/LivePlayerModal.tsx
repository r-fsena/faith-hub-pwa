import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { fetchActiveBroadcast } from '../services/api';

interface LivePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  broadcast?: any;
}

export function getYoutubeEmbedUrl(urlOrId?: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  
  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed.includes('autoplay=') ? trimmed : `${trimmed}${trimmed.includes('?') ? '&' : '?'}autoplay=1`;
  }
  
  let videoId = '';
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) {
    videoId = watchMatch[1];
  }
  
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (!videoId && shortMatch && shortMatch[1]) {
    videoId = shortMatch[1];
  }
  
  const liveMatch = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (!videoId && liveMatch && liveMatch[1]) {
    videoId = liveMatch[1];
  }
  
  if (!videoId && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    videoId = trimmed;
  }
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  }
  
  const channelMatch = trimmed.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch && channelMatch[1]) {
    return `https://www.youtube.com/embed/live_stream?channel=${channelMatch[1]}&autoplay=1`;
  }

  return trimmed;
}

export const LivePlayerModal: React.FC<LivePlayerModalProps> = ({ isOpen, onClose, broadcast: propBroadcast }) => {
  const { branding, selectedCampus } = useBranding();
  const [broadcast, setBroadcast] = useState<any>(propBroadcast || null);
  const [, setLoading] = useState<boolean>(!propBroadcast);
  const [note, setNote] = useState('');
  const [notesList, setNotesList] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (propBroadcast) {
        setBroadcast(propBroadcast);
        setLoading(false);
      } else {
        loadBroadcast();
      }
    }
  }, [isOpen, propBroadcast, branding.organization_id, selectedCampus]);

  const loadBroadcast = async () => {
    setLoading(true);
    try {
      const data = await fetchActiveBroadcast(branding.organization_id, selectedCampus?.id);
      if (data && data.youtube_url) {
        setBroadcast(data);
      } else if (branding.youtube_url) {
        setBroadcast({
          title: `Culto Oficial • ${branding.church_name}`,
          youtube_url: branding.youtube_url
        });
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const rawUrl = broadcast?.youtube_url || branding.youtube_url || 'https://www.youtube.com/watch?v=MeX0yHMs9Nk';
  const embedUrl = getYoutubeEmbedUrl(rawUrl);
  const videoTitle = broadcast?.title || `Culto de Celebração • ${branding.church_name}`;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setNotesList([...notesList, note.trim()]);
    setNote('');
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="drawer-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444', letterSpacing: '0.04em' }}>
              🔴 TRANSMISSÃO AO VIVO
            </span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
              {videoTitle}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* Video Player Embed */}
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: '16px', overflow: 'hidden', background: '#000', marginTop: '12px' }}>
          {embedUrl ? (
            <iframe 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              src={embedUrl}
              title={videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '0.85rem' }}>
              Nenhum vídeo disponível no momento
            </div>
          )}
        </div>

        {broadcast?.description && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
            {broadcast.description}
          </p>
        )}

        {/* Anotações do Sermão */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '16px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)' }}>
            📝 Meu Caderno de Anotações do Culto
          </span>

          <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '6px' }}>
            <input 
              type="text" 
              className="input-pwa" 
              placeholder="Escreva uma reflexão da mensagem..."
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ fontSize: '0.80rem', padding: '8px 12px' }}
            />
            <button type="submit" className="btn-pwa-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: '0.78rem' }}>
              Salvar
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
            {notesList.map((n, i) => (
              <div key={i} style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', fontSize: '0.76rem', color: 'var(--text-secondary)', border: '1px solid var(--panel-border)' }}>
                {n}
              </div>
            ))}
          </div>
        </div>

        <button type="button" className="btn-pwa-secondary" onClick={onClose} style={{ marginTop: '12px' }}>
          Fechar Player
        </button>

      </div>
    </div>
  );
};
