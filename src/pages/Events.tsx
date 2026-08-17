import React, { useState, useEffect } from 'react';
import { fetchEvents, checkoutTicket } from '../services/api';
import { CreditCardForm } from '../components/CreditCardForm';

interface EventBatch {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

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
  batches?: EventBatch[];
}

interface MyTicket {
  ticket_id: string;
  event_title: string;
  attendee_name: string;
  batch_name: string;
  date_formatted: string;
  location: string;
  qr_code_data: string;
}

export const Events: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewTab, setViewTab] = useState<'events' | 'my_tickets'>('events');
  const [myTickets, setMyTickets] = useState<MyTicket[]>([]);

  // Modal de Inscrição
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<EventBatch | null>(null);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeCpf, setAttendeeCpf] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<'details' | 'card'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal do Passaporte Selecionado
  const [viewTicketModal, setViewTicketModal] = useState<MyTicket | null>(null);

  useEffect(() => {
    loadEventsFromBackend();
    loadSavedTickets();
  }, []);

  const loadEventsFromBackend = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      if (Array.isArray(data)) {
        const mapped: ChurchEvent[] = data.map((ev: any) => {
          const startDate = ev.start_date ? new Date(ev.start_date) : null;
          const dateFormatted = ev.date_formatted || (startDate ? startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase() : 'Em breve');
          const timeFormatted = ev.time || (startDate ? startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '19:30');
          const numPrice = Number(ev.price) || 0;
          const coverUrl = ev.cover_url || ev.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800';
          const category = ev.category || (ev.type === 1 ? 'Curso & Capacitação' : 'Conferência / Culto');

          return {
            id: ev.id,
            title: ev.title || 'Evento Especial',
            description: ev.description || '',
            category,
            date_formatted: dateFormatted,
            time: timeFormatted,
            location: ev.location || 'Templo Principal',
            price: numPrice,
            cover_url: coverUrl,
            batches: Array.isArray(ev.batches) && ev.batches.length > 0 ? ev.batches : [
              { id: 'b1', name: 'Lote Geral', price: numPrice, available: true }
            ]
          };
        });
        setEvents(mapped);
      }
    } catch (e) {
      console.error('Erro ao carregar eventos:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedTickets = () => {
    const saved = localStorage.getItem('faithhub_my_tickets');
    if (saved) {
      try {
        setMyTickets(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    // Ticket inicial de exemplo
    setMyTickets([
      {
        ticket_id: 'TCK-882190',
        event_title: 'Conferência de Avivamento 2026',
        attendee_name: 'Membro da Igreja',
        batch_name: 'Lote Geral',
        date_formatted: '24 AGO • 19:30',
        location: 'Templo Principal',
        qr_code_data: 'TICKET_1_MEMBER_PASS_VALID'
      }
    ]);
  };

  const handleOpenSignup = (ev: ChurchEvent) => {
    setSelectedEvent(ev);
    setSelectedBatch(ev.batches ? ev.batches[0] : { id: 'b1', name: 'Geral', price: ev.price, available: true });
  };

  const handleConfirmRegistration = async (e?: React.FormEvent, paymentMethod: 'PIX' | 'CREDIT_CARD' = 'PIX', extraInfo?: string) => {
    if (e) e.preventDefault();
    if (!selectedEvent || !attendeeName.trim() || !attendeePhone.trim()) return;

    setIsSubmitting(true);
    try {
      const checkoutRes = await checkoutTicket({
        event_id: selectedEvent.id,
        batch_id: selectedBatch?.id,
        attendee_name: attendeeName.trim(),
        attendee_cpf: attendeeCpf.trim() || undefined,
        attendee_whatsapp: attendeePhone.trim(),
        dietary_notes: dietaryNotes.trim() || undefined,
        payment_method: paymentMethod
      });

      const newTicket: MyTicket = {
        ticket_id: checkoutRes?.ticket_id || `TCK-${Date.now().toString().slice(-6)}`,
        event_title: selectedEvent.title,
        attendee_name: attendeeName.trim(),
        batch_name: `${selectedBatch?.name || 'Geral'}${extraInfo ? ` (${extraInfo})` : ''}`,
        date_formatted: selectedEvent.date_formatted,
        location: selectedEvent.location,
        qr_code_data: checkoutRes?.qr_code_data || `TICKET_${selectedEvent.id}_${attendeePhone}`
      };

      const updated = [newTicket, ...myTickets];
      setMyTickets(updated);
      localStorage.setItem('faithhub_my_tickets', JSON.stringify(updated));

      alert('✅ Inscrição confirmada com sucesso! Seu passaporte digital foi gerado.');
      setSelectedEvent(null);
      setViewTicketModal(newTicket);
      setPaymentMode('details');
      setAttendeeName('');
      setAttendeeCpf('');
      setAttendeePhone('');
      setDietaryNotes('');
    } catch (err) {
      console.error(err);
      alert('Inscrição salva!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      {/* Header com Switch entre Eventos e Meus Passaportes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {onBack && (
            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', marginBottom: '4px' }}>
              ← Voltar ao Início
            </button>
          )}
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>
            {viewTab === 'events' ? 'Eventos & Cursos' : 'Meus Passaportes'}
          </h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {viewTab === 'events' ? 'Garanta sua presença nas programações' : 'Apresente seu QR Code na portaria'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setViewTab(viewTab === 'events' ? 'my_tickets' : 'events')}
          style={{
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          {viewTab === 'events' ? `🎟️ Meus Ingressos (${myTickets.length})` : '🗓️ Ver Eventos'}
        </button>
      </div>

      {/* ========================================================
          MODO 1: LISTA DE EVENTOS
          ======================================================== */}
      {viewTab === 'events' ? (
        loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '60vh' }}>
            {[1, 2].map(n => (
              <div key={n} style={{ background: '#ffffff', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--panel-border)', padding: '16px' }}>
                <div style={{ height: '120px', background: '#f1f5f9', borderRadius: '14px', marginBottom: '12px' }} />
                <div style={{ height: '16px', background: '#f1f5f9', borderRadius: '6px', width: '40%', marginBottom: '8px' }} />
                <div style={{ height: '22px', background: '#f1f5f9', borderRadius: '6px', width: '80%', marginBottom: '10px' }} />
                <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', width: '60%' }} />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>🗓️</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              Nenhum evento agendado no momento
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0', lineHeight: 1.4 }}>
              As conferências, cultos especiais e cursos cadastrados no Portal Web aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
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
                      {ev.price === 0 ? 'Gratuito' : `A partir de R$ ${ev.price.toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>

                  <button 
                    type="button" 
                    className="btn-pwa-primary" 
                    style={{ width: 'auto', padding: '10px 20px', fontSize: '0.82rem' }}
                    onClick={() => handleOpenSignup(ev)}
                  >
                    Garantir Inscrição →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )
      ) : (
        /* ========================================================
            MODO 2: MEUS PASSAPORTES / INGRESSOS
            ======================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {myTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎟️</div>
              <p style={{ fontSize: '0.85rem' }}>Você ainda não possui nenhum ingresso emitido.</p>
            </div>
          ) : (
            myTickets.map(tck => (
              <div 
                key={tck.ticket_id}
                onClick={() => setViewTicketModal(tck)}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid var(--panel-border)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                    🎟️
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{tck.ticket_id}</span>
                    <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-main)' }}>{tck.event_title}</h4>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Titular: {tck.attendee_name}</div>
                  </div>
                </div>

                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>›</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL DE INSCRIÇÃO COM FORMULÁRIO COMPLETO */}
      {selectedEvent && (
        <div className="drawer-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', textAlign: 'center' }}>
              Inscrição: {selectedEvent.title}
            </h3>

            {paymentMode === 'card' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '55vh', overflowY: 'auto' }}>
                <button 
                  type="button" 
                  onClick={() => setPaymentMode('details')} 
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}
                >
                  ← Voltar aos Dados
                </button>
                <CreditCardForm 
                  totalAmount={selectedBatch?.price || selectedEvent.price}
                  onSubmit={async (cardData) => {
                    await handleConfirmRegistration(undefined, 'CREDIT_CARD', `${cardData.installments}x no cartão`);
                  }}
                  isLoading={isSubmitting}
                />
              </div>
            ) : (
              <form onSubmit={handleConfirmRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Seleção de Lote */}
                {selectedEvent.batches && selectedEvent.batches.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      Selecione o Lote / Categoria
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedEvent.batches.map(b => (
                        <label 
                          key={b.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: selectedBatch?.id === b.id ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                            background: selectedBatch?.id === b.id ? 'var(--accent-primary-light)' : '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="radio" name="batch" checked={selectedBatch?.id === b.id} onChange={() => setSelectedBatch(b)} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>{b.name}</span>
                          </div>
                          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: b.price === 0 ? '#059669' : 'var(--text-main)' }}>
                            {b.price === 0 ? 'Gratuito' : `R$ ${b.price.toFixed(2).replace('.', ',')}`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    Nome Completo do Participante *
                  </label>
                  <input type="text" className="input-pwa" placeholder="Seu nome" value={attendeeName} onChange={e => setAttendeeName(e.target.value)} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      CPF (Para Credenciamento)
                    </label>
                    <input type="text" className="input-pwa" placeholder="000.000.000-00" value={attendeeCpf} onChange={e => setAttendeeCpf(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      WhatsApp *
                    </label>
                    <input type="tel" className="input-pwa" placeholder="(11) 98765-4321" value={attendeePhone} onChange={e => setAttendeePhone(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    Restrições Alimentares / Observações
                  </label>
                  <input type="text" className="input-pwa" placeholder="Ex: Vegetariano, alérgico a glúten..." value={dietaryNotes} onChange={e => setDietaryNotes(e.target.value)} />
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '0.86rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Total a Pagar:</span>
                  <span style={{ color: (selectedBatch?.price || selectedEvent.price) === 0 ? '#059669' : 'var(--text-main)' }}>
                    {(selectedBatch?.price || selectedEvent.price) === 0 ? 'Gratuito' : `R$ ${(selectedBatch?.price || selectedEvent.price).toFixed(2).replace('.', ',')}`}
                  </span>
                </div>

                {(selectedBatch?.price || selectedEvent.price) > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <button type="submit" className="btn-pwa-primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Gerando...' : '⚡ Pagar com Pix'}
                    </button>
                    <button 
                      type="button" 
                      className="btn-pwa-secondary" 
                      disabled={isSubmitting}
                      onClick={() => {
                        if (!attendeeName.trim() || !attendeePhone.trim()) {
                          alert("Preencha nome e WhatsApp antes de continuar para o cartão.");
                          return;
                        }
                        setPaymentMode('card');
                      }}
                      style={{ fontWeight: 800 }}
                    >
                      💳 Pagar no Cartão
                    </button>
                  </div>
                ) : (
                  <button type="submit" className="btn-pwa-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Confirmando...' : 'Confirmar & Gerar Passaporte'}
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL DO PASSAPORTE DIGITAL (QR CODE DA PORTARIA) */}
      {viewTicketModal && (
        <div className="drawer-overlay" onClick={() => setViewTicketModal(null)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'var(--accent-primary-light)', padding: '4px 12px', borderRadius: '8px' }}>
                PASSAPORTE #{viewTicketModal.ticket_id}
              </span>

              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                {viewTicketModal.event_title}
              </h2>

              <div style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(viewTicketModal.qr_code_data)}`} 
                  alt="QR Code Passaporte"
                  style={{ width: '160px', height: '160px', display: 'block' }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', width: '100%', fontSize: '0.80rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>👤 <strong>Titular:</strong> {viewTicketModal.attendee_name}</div>
                <div>🎟️ <strong>Lote:</strong> {viewTicketModal.batch_name}</div>
                <div>🗓️ <strong>Data:</strong> {viewTicketModal.date_formatted}</div>
                <div>📍 <strong>Local:</strong> {viewTicketModal.location}</div>
              </div>

              <button type="button" className="btn-pwa-primary" onClick={() => setViewTicketModal(null)}>
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
