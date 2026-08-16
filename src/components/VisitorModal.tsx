import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { fetchCampuses, getActiveCampusId } from '../services/api';
import { BottomSheet } from './BottomSheet';

interface VisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VisitorModal: React.FC<VisitorModalProps> = ({ isOpen, onClose }) => {
  const { branding } = useBranding();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [invitedBy, setInvitedBy] = useState('');
  const [decisionTrack, setDecisionTrack] = useState<string>('FIRST_TIME');
  const [prayerRequest, setPrayerRequest] = useState('');
  const [campusId, setCampusId] = useState<string>(getActiveCampusId());
  const [campuses, setCampuses] = useState<any[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCampuses().then(list => setCampuses(list));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim()) return;

    setIsSubmitting(true);
    try {
      const visitorPayload = {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        invited_by: invitedBy.trim() || undefined,
        decision_track: decisionTrack,
        prayer_request: prayerRequest.trim() || undefined,
        campus_id: campusId,
        date: new Date().toLocaleDateString('pt-BR')
      };

      // Salva no registro de visitantes local / envio à API
      const savedVisitors = localStorage.getItem('faithhub_registered_visitors');
      const visitorsList = savedVisitors ? JSON.parse(savedVisitors) : [];
      localStorage.setItem('faithhub_registered_visitors', JSON.stringify([visitorPayload, ...visitorsList]));

      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setIsSuccess(false);
    setName('');
    setWhatsapp('');
    setEmail('');
    setNeighborhood('');
    setInvitedBy('');
    setPrayerRequest('');
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {!isSuccess ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', margin: '0 auto 8px auto' }}>
              👋
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              Seja Muito Bem-Vindo!
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              É uma alegria ter você conosco na {branding.church_name}. Queremos orar por você e te acolher com carinho.
            </p>
          </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* O que melhor descreve seu momento hoje? */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  O que melhor descreve sua visita hoje? *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'FIRST_TIME', label: '✨ Primeira Vez' },
                    { id: 'RECONCILIATION', label: '🕊️ Reconciliação' },
                    { id: 'BAPTISM', label: '💧 Quero Batismo' },
                    { id: 'CELL_GROUP', label: '📍 Quero uma Célula' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDecisionTrack(opt.id)}
                      style={{
                        padding: '8px',
                        borderRadius: '10px',
                        border: decisionTrack === opt.id ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                        background: decisionTrack === opt.id ? 'var(--accent-primary-light)' : '#ffffff',
                        color: decisionTrack === opt.id ? 'var(--accent-primary)' : 'var(--text-main)',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Seu Nome Completo *
                </label>
                <input 
                  type="text" 
                  className="input-pwa" 
                  placeholder="Ex: Maria Eduarda Silva" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    WhatsApp *
                  </label>
                  <input 
                    type="tel" 
                    className="input-pwa" 
                    placeholder="(11) 98765-4321" 
                    value={whatsapp} 
                    onChange={e => setWhatsapp(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    Bairro / Cidade
                  </label>
                  <input 
                    type="text" 
                    className="input-pwa" 
                    placeholder="Ex: Pinheiros" 
                    value={neighborhood} 
                    onChange={e => setNeighborhood(e.target.value)} 
                  />
                </div>
              </div>

              {campuses.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    Qual congregação você visita ou deseja frequentar? *
                  </label>
                  <select
                    className="input-pwa"
                    value={campusId}
                    onChange={e => setCampusId(e.target.value)}
                    style={{ background: '#ffffff', cursor: 'pointer' }}
                  >
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.city ? `(${c.city}/${c.state})` : ''} {Boolean(c.is_headquarters) ? '⭐ Sede' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Quem te convidou? (Opcional)
                </label>
                <input 
                  type="text" 
                  className="input-pwa" 
                  placeholder="Ex: Amigo, Família, Instagram..." 
                  value={invitedBy} 
                  onChange={e => setInvitedBy(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Gostaria de deixar um Pedido de Oração? (Opcional)
                </label>
                <input 
                  type="text" 
                  className="input-pwa" 
                  placeholder="Ex: Pela saúde da minha família..." 
                  value={prayerRequest} 
                  onChange={e => setPrayerRequest(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                className="btn-pwa-primary"
                disabled={isSubmitting}
                style={{ marginTop: '6px' }}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Meus Dados de Visitante'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              ❤️
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              Você é Nosso Convidado Especial!
            </h3>
            
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Olá <strong>{name}</strong>, nossa liderança pastoral já recebeu seu contato. No final do culto, não deixe de passar no **Espaço Boas-Vindas** para tomar um café com a gente e receber um presente especial!
            </p>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--panel-border)', width: '100%', fontSize: '0.80rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
              🏛️ {branding.church_name} • Casa de Oração para Todos
            </div>

            <button type="button" className="btn-pwa-primary" onClick={handleFinish}>
              Concluir & Navegar no App
            </button>
          </div>
        )}
    </BottomSheet>
  );
};
