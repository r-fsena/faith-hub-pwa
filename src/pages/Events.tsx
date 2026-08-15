import React, { useState } from 'react';

interface ChurchEvent {
  id: string;
  title: string;
  category: string;
  date_formatted: string;
  time: string;
  location: string;
  price: number;
  description: string;
  cover_url: string;
  is_registered?: boolean;
}

const SAMPLE_EVENTS: ChurchEvent[] = [
  {
    id: '1',
    title: 'Conferência de Avivamento 2026',
    category: 'Conferência Anual',
    date_formatted: '24 e 25 de Agosto',
    time: '19:30 às 22:00',
    location: 'Templo Principal',
    price: 0,
    description: 'Dois dias intensos de louvor, ministração da Palavra e manifestação do poder de Deus com preletores convidados.',
    cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '2',
    title: 'Encontro de Casais: Aliança & Amor',
    category: 'Família',
    date_formatted: '07 de Setembro',
    time: '09:00 às 18:00',
    location: 'Auditório B & Jantar',
    price: 120.00,
    description: 'Um sábado especial de oficinas práticas, dinâmicas de comunicação no casamento e jantar romântico.',
    cover_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '3',
    title: 'Seminário de Liderança e Discipulado',
    category: 'Ensino & Escola',
    date_formatted: '15 de Setembro',
    time: '19:30',
    location: 'Sala Multiuso 01',
    price: 0,
    description: 'Capacitação bíblica e prática para líderes e anfitriões de células.',
    cover_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80'
  }
];

export const Events: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [events, setEvents] = useState<ChurchEvent[]>(SAMPLE_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !participantName.trim()) return;

    setEvents(prev => prev.map(ev => {
      if (ev.id === selectedEvent.id) {
        return { ...ev, is_registered: true };
      }
      return ev;
    }));

    alert(`✅ Inscrição confirmada para ${participantName} no evento "${selectedEvent.title}"!`);
    setSelectedEvent(null);
    setParticipantName('');
    setParticipantPhone('');
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      <div className="section-header-row">
        <div>
          {onBack && (
            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', marginBottom: '4px' }}>
              ← Voltar ao Início
            </button>
          )}
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Eventos & Cursos</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Garanta sua presença nas programações da igreja</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {events.map(ev => (
          <div 
            key={ev.id}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ height: '140px', background: `url(${ev.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                <span style={{ background: 'rgba(15, 23, 42, 0.85)', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 800 }}>
                  {ev.category}
                </span>
              </div>

              {ev.is_registered && (
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <span style={{ background: '#059669', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 800 }}>
                    ✓ INSCRITO
                  </span>
                </div>
              )}
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  🗓️ {ev.date_formatted} • {ev.time}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  {ev.title}
                </h3>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {ev.description}
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                📍 {ev.location}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Entrada</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: ev.price === 0 ? '#059669' : 'var(--text-main)' }}>
                    {ev.price === 0 ? 'Gratuito' : `R$ ${ev.price.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>

                <button 
                  type="button" 
                  className="btn-pwa-primary" 
                  style={{ width: 'auto', padding: '10px 20px', fontSize: '0.82rem', background: ev.is_registered ? '#059669' : undefined }}
                  onClick={() => setSelectedEvent(ev)}
                >
                  {ev.is_registered ? 'Ver Minha Inscrição' : 'Garantir Inscrição'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Inscrição */}
      {selectedEvent && (
        <div className="drawer-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', textAlign: 'center' }}>
              Inscrição: {selectedEvent.title}
            </h3>

            {selectedEvent.is_registered ? (
              <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                  🎟️
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Passaporte Confirmado</div>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
                  Apresente seu nome ou o app no credenciamento do evento em <strong>{selectedEvent.date_formatted}</strong>.
                </p>
                <button type="button" className="btn-pwa-primary" onClick={() => setSelectedEvent(null)}>
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    Nome do Participante *
                  </label>
                  <input 
                    type="text" 
                    className="input-pwa" 
                    placeholder="Seu nome completo"
                    value={participantName} 
                    onChange={e => setParticipantName(e.target.value)} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    WhatsApp para Confirmação *
                  </label>
                  <input 
                    type="tel" 
                    className="input-pwa" 
                    placeholder="(11) 98765-4321"
                    value={participantPhone} 
                    onChange={e => setParticipantPhone(e.target.value)} 
                    required 
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Total:</span>
                  <span style={{ color: selectedEvent.price === 0 ? '#059669' : 'var(--text-main)' }}>
                    {selectedEvent.price === 0 ? 'Gratuito' : `R$ ${selectedEvent.price.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>

                <button type="submit" className="btn-pwa-primary">
                  Confirmar Inscrição
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
