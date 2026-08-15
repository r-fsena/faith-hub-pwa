import React, { useState } from 'react';
import { useBranding } from '../context/BrandingContext';

interface LivePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LivePlayerModal: React.FC<LivePlayerModalProps> = ({ isOpen, onClose }) => {
  const { branding } = useBranding();
  const [note, setNote] = useState('');
  const [notesList, setNotesList] = useState<string[]>([
    'Versículo pregado: Lucas 1:37 - Pois para Deus nada é impossível.',
    'Palavra profética: O Senhor está abrindo portas de cura nesta semana.'
  ]);

  if (!isOpen) return null;

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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Culto de Celebração • {branding.church_name}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* Video Player Embed */}
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
          <iframe 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            src="https://www.youtube.com/embed/live_stream?channel=UC_x5XG1OV2P6uZZ5FSM9Ttw&autoplay=1"
            title="Transmissão ao Vivo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Anotações do Sermão */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '16px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

        <button type="button" className="btn-pwa-secondary" onClick={onClose}>
          Fechar Player
        </button>

      </div>
    </div>
  );
};
