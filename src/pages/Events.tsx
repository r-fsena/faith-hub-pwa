import React, { useState, useEffect } from 'react';
import { fetchEvents, checkoutTicket } from '../services/api';
import { CreditCardForm } from '../components/CreditCardForm';
import { EventTicketPassModal, type EventTicketData } from '../components/EventTicketPassModal';
import { EventQrScannerModal } from '../components/EventQrScannerModal';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

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
  type?: number;
  batches?: EventBatch[];
  campus_id?: string;
}

export const Events: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const { branding, selectedCampus } = useBranding();

  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewTab, setViewTab] = useState<'events' | 'my_tickets'>('events');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [myTickets, setMyTickets] = useState<EventTicketData[]>([]);

  // Modal de Inscrição
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<EventBatch | null>(null);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeCpf, setAttendeeCpf] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<'details' | 'card' | 'pix_confirm'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modais de Passaporte e Scanner
  const [selectedTicketPass, setSelectedTicketPass] = useState<EventTicketData | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const orgId = branding.organization_id || 'org_default';
  const campusId = selectedCampus?.id || branding.campus_id;

  useEffect(() => {
    loadEventsFromBackend();
    loadMyTickets();
  }, [user, orgId, campusId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [viewTab]);

  const loadEventsFromBackend = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents(orgId, campusId);
      if (Array.isArray(data)) {
        const mapped: ChurchEvent[] = data.map((ev: any) => {
          const startDate = ev.start_date ? new Date(ev.start_date) : null;
          const dateFormatted = ev.date_formatted || (startDate ? startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase() : 'Em breve');
          const timeFormatted = ev.time || (startDate ? startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '19:30');
          const numPrice = Number(ev.price) || 0;
          const coverUrl = ev.cover_url || ev.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800';
          const category = ev.category || (Number(ev.type) === 1 ? 'Cursos & Trilhas' : 'Conferência / Culto');

          return {
            id: ev.id,
            title: ev.title || 'Evento Especial',
            description: ev.description || '',
            category,
            type: Number(ev.type) || 0,
            date_formatted: dateFormatted,
            time: timeFormatted,
            location: ev.location || 'Templo Principal',
            price: numPrice,
            cover_url: coverUrl,
            campus_id: ev.campus_id,
            batches: Array.isArray(ev.batches) && ev.batches.length > 0 ? ev.batches : (
              Array.isArray(ev.lots) && ev.lots.length > 0 ? ev.lots.map((l: any) => ({
                id: l.id,
                name: l.name,
                price: Number(l.price) || 0,
                available: (l.available_capacity ?? 1) > 0
              })) : [
                { id: 'b1', name: 'Lote Geral', price: numPrice, available: true }
              ]
            )
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

  const loadMyTickets = async () => {
    // 1. Tenta carregar do cache local primeiro
    const saved = localStorage.getItem('faithhub_my_tickets');
    if (saved) {
      try {
        setMyTickets(JSON.parse(saved));
      } catch (e) {}
    }

    // 2. Se autenticado, busca da API AWS RDS
    const userId = user?.userId || '';
    const phone = localStorage.getItem('faithhub_user_phone') || '';
    const email = user?.email || localStorage.getItem('faithhub_user_email') || '';

    if (userId || phone || email) {
      try {
        const queryParams = new URLSearchParams();
        if (userId) queryParams.set('user_id', userId);
        if (phone) queryParams.set('phone', phone);
        if (email) queryParams.set('email', email);

        const res = await fetch(`${API_URL}/tickets/me?${queryParams.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const apiTickets: EventTicketData[] = (json.data || []).map((t: any) => {
            const startDate = t.event_date ? new Date(t.event_date) : null;
            const dateFormatted = startDate ? startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase() : 'Data no evento';

            return {
              id: t.id,
              ticket_id: t.id,
              short_code: t.short_code || `FH-${(t.id || '').slice(-6).toUpperCase()}`,
              qrcode_token: t.qrcode_token,
              qr_code_data: t.qrcode_token,
              status: t.status || 'PAID',
              event_title: t.event_title || 'Evento Especial',
              event_date: t.event_date,
              date_formatted: dateFormatted,
              event_location: t.event_location || 'Templo Principal',
              location: t.event_location || 'Templo Principal',
              event_image: t.event_image,
              cover_url: t.event_image,
              lot_name: t.lot_name || 'Lote Geral',
              batch_name: t.lot_name || 'Lote Geral',
              attendee_name: t.attendee_name || user?.name || 'Membro da Igreja',
              attendee_whatsapp: t.attendee_whatsapp,
              attendee_cpf: t.attendee_cpf,
              dietary_notes: t.dietary_notes,
              price_paid: Number(t.price_paid) || 0,
              scanned_at: t.scanned_at,
              scanned_by: t.scanned_by
            };
          });

          if (apiTickets.length > 0) {
            setMyTickets(apiTickets);
            localStorage.setItem('faithhub_my_tickets', JSON.stringify(apiTickets));
          }
        }
      } catch (err) {
        console.log("Erro ao buscar ingressos da API:", err);
      }
    }
  };

  const handleOpenSignup = (ev: ChurchEvent) => {
    setSelectedEvent(ev);
    const initialBatch = ev.batches && ev.batches.length > 0 ? ev.batches[0] : { id: 'b1', name: 'Geral', price: ev.price, available: true };
    setSelectedBatch(initialBatch);

    const defaultName = localStorage.getItem('faithhub_user_name') || user?.name || '';
    const defaultPhone = localStorage.getItem('faithhub_user_phone') || '';
    setAttendeeName(defaultName);
    setAttendeePhone(defaultPhone);
    setPaymentMode('details');
  };

  const handleConfirmRegistration = async (e?: React.FormEvent, paymentMethod: 'PIX' | 'CREDIT_CARD' | 'FREE' = 'FREE', extraInfo?: string) => {
    if (e) e.preventDefault();
    if (!selectedEvent || !attendeeName.trim() || !attendeePhone.trim()) {
      alert("Por favor, preencha nome e WhatsApp de contato.");
      return;
    }

    setIsSubmitting(true);
    try {
      const uId = user?.userId || localStorage.getItem('faithhub_user_id') || `anon_${Date.now()}`;
      const uEmail = user?.email || localStorage.getItem('faithhub_user_email') || '';

      const checkoutRes = await checkoutTicket({
        event_id: selectedEvent.id,
        lot_id: selectedBatch?.id,
        batch_id: selectedBatch?.id,
        user_id: uId,
        attendee_name: attendeeName.trim(),
        attendee_cpf: attendeeCpf.trim() || undefined,
        attendee_whatsapp: attendeePhone.trim(),
        attendee_email: uEmail || undefined,
        dietary_notes: dietaryNotes.trim() || undefined,
        payment_method: paymentMethod === 'FREE' ? 'PIX' : paymentMethod
      });

      const newTicket: EventTicketData = {
        id: checkoutRes?.ticket_id || `TCK-${Date.now().toString().slice(-6)}`,
        ticket_id: checkoutRes?.ticket_id || `TCK-${Date.now().toString().slice(-6)}`,
        short_code: checkoutRes?.short_code || `FH-${Math.floor(100000 + Math.random() * 900000)}`,
        qrcode_token: checkoutRes?.qrcode_token || checkoutRes?.qr_code_data || `TICKET_${selectedEvent.id}_${attendeePhone}`,
        qr_code_data: checkoutRes?.qrcode_token || checkoutRes?.qr_code_data || `TICKET_${selectedEvent.id}_${attendeePhone}`,
        status: checkoutRes?.status || 'PAID',
        event_title: selectedEvent.title,
        date_formatted: selectedEvent.date_formatted,
        location: selectedEvent.location,
        lot_name: `${selectedBatch?.name || 'Geral'}${extraInfo ? ` (${extraInfo})` : ''}`,
        batch_name: `${selectedBatch?.name || 'Geral'}${extraInfo ? ` (${extraInfo})` : ''}`,
        attendee_name: attendeeName.trim(),
        attendee_whatsapp: attendeePhone.trim(),
        attendee_cpf: attendeeCpf.trim(),
        dietary_notes: dietaryNotes.trim()
      };

      const updated = [newTicket, ...myTickets.filter(t => t.id !== newTicket.id)];
      setMyTickets(updated);
      localStorage.setItem('faithhub_my_tickets', JSON.stringify(updated));

      setSelectedEvent(null);
      setViewTab('my_tickets');
      setSelectedTicketPass(newTicket);
      setPaymentMode('details');
      setDietaryNotes('');

      alert("🎉 Inscrição confirmada com sucesso! Seu passaporte digital com QR Code já está disponível.");
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar inscrição: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtros
  const filteredEvents = events.filter(ev => {
    if (selectedCategory === 'COURSES') return Number(ev.type) === 1 || ev.category.toLowerCase().includes('curso');
    if (selectedCategory === 'CONFERENCES') return Number(ev.type) === 0 || ev.category.toLowerCase().includes('conferência') || ev.category.toLowerCase().includes('culto');
    if (selectedCategory === 'FREE') return ev.price === 0;
    if (selectedCategory === 'PAID') return ev.price > 0;
    return true;
  });

  return (
    <div className="pwa-content animate-fade-in" style={{ gap: '16px', paddingBottom: '90px' }}>
      
      {/* Header com Switch entre Eventos, Meus Passaportes e Scanner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          {onBack && (
            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', marginBottom: '4px' }}>
              ← Voltar ao Início
            </button>
          )}
          <h2 className="section-title" style={{ fontSize: '1.30rem', margin: 0, letterSpacing: '-0.3px' }}>
            {viewTab === 'events' ? 'Eventos & Cursos' : 'Meus Passaportes & Carteira'}
          </h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            {selectedCampus ? `Unidade ${selectedCampus.name}` : branding.church_name} • {viewTab === 'events' ? 'Garanta sua vaga' : 'Apresente seu QR Code na portaria'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Botão Scanner de Portaria */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.74rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
            }}
            title="Abrir Scanner de Portaria / Check-in"
          >
            <span>📸</span> Portaria
          </button>

          {/* Switch de Visualização */}
          <button
            type="button"
            onClick={() => setViewTab(viewTab === 'events' ? 'my_tickets' : 'events')}
            style={{
              background: 'var(--accent-primary-light)',
              color: 'var(--accent-primary)',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.74rem',
              cursor: 'pointer'
            }}
          >
            {viewTab === 'events' ? `🎟️ Meus Ingressos (${myTickets.length})` : '🗓️ Ver Catálogo'}
          </button>
        </div>
      </div>

      {/* Abas de Filtros de Categoria (Apenas na aba Eventos) */}
      {viewTab === 'events' && (
        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'ALL', label: '🌟 Todos', icon: '🌟' },
            { id: 'CONFERENCES', label: '🏛️ Conferências & Cultos', icon: '🏛️' },
            { id: 'COURSES', label: '🎓 Cursos & Trilhas', icon: '🎓' },
            { id: 'FREE', label: '💚 Gratuitos', icon: '💚' },
            { id: 'PAID', label: '🎟️ Ingressos Pagos', icon: '🎟️' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: selectedCategory === tab.id ? '1px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                background: selectedCategory === tab.id ? 'var(--accent-primary)' : '#ffffff',
                color: selectedCategory === tab.id ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ========================================================
          MODO 1: LISTA DE EVENTOS E CURSOS
          ======================================================== */}
      {viewTab === 'events' ? (
        loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '16px', minHeight: '40vh' }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ background: '#ffffff', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--panel-border)', padding: '16px' }}>
                <div style={{ height: '140px', background: '#f1f5f9', borderRadius: '14px', marginBottom: '12px' }} />
                <div style={{ height: '16px', background: '#f1f5f9', borderRadius: '6px', width: '40%', marginBottom: '8px' }} />
                <div style={{ height: '22px', background: '#f1f5f9', borderRadius: '6px', width: '80%', marginBottom: '10px' }} />
                <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', width: '60%' }} />
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>🗓️</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              Nenhum evento ou curso encontrado nesta categoria
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0', lineHeight: 1.4 }}>
              Fique ligado! Em breve novas conferências e capacitações serão abertas para inscrição.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '18px' }}>
            {filteredEvents.map(ev => (
              <div 
                key={ev.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: '1px solid var(--panel-border)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Imagem de Capa com Badges */}
                <div style={{ height: '150px', background: `url(${ev.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                    <span style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 800 }}>
                      {ev.category}
                    </span>
                  </div>

                  <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                    <span style={{
                      background: ev.price === 0 ? '#059669' : '#ffffff',
                      color: ev.price === 0 ? '#ffffff' : '#0f172a',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                    }}>
                      {ev.price === 0 ? 'GRATUITO' : `R$ ${ev.price.toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Evento */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      🗓️ {ev.date_formatted} • {ev.time}
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: '2px 0 0 0', lineHeight: 1.3 }}>
                      {ev.title}
                    </h3>
                    <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                      {ev.description}
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📍</span> <span>{ev.location}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Vagas</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#059669' }}>
                        Inscrições Abertas
                      </span>
                    </div>

                    <button 
                      type="button" 
                      className="btn-pwa-primary" 
                      style={{ width: 'auto', padding: '10px 18px', fontSize: '0.80rem' }}
                      onClick={() => handleOpenSignup(ev)}
                    >
                      {ev.price === 0 ? 'Inscrever-se Grátis →' : 'Garantir Ingresso →'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ========================================================
            MODO 2: MEUS PASSAPORTES / CARTEIRA DIGITAL
            ======================================================== */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '14px' }}>
          {myTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#ffffff', borderRadius: '20px', border: '1px solid var(--panel-border)', width: '100%' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🎟️</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                Sua carteira de ingressos está vazia
              </h3>
              <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                Inscreva-se em um evento ou curso para gerar seu passaporte com QR Code e adicionar à Carteira Apple / Google.
              </p>
              <button
                type="button"
                className="btn-pwa-primary"
                onClick={() => setViewTab('events')}
                style={{ width: 'auto', padding: '10px 24px', margin: '0 auto', fontSize: '0.84rem' }}
              >
                Explorar Eventos & Cursos
              </button>
            </div>
          ) : (
            myTickets.map(tck => {
              const isUsed = tck.status === 'USED';
              const isPending = tck.status === 'PENDING';
              const shortCode = tck.short_code || `FH-${(tck.id || tck.ticket_id || '').slice(-6).toUpperCase()}`;

              return (
                <div 
                  key={tck.id || tck.ticket_id || shortCode}
                  onClick={() => setSelectedTicketPass(tck)}
                  style={{
                    background: isUsed ? '#f8fafc' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '20px',
                    padding: '16px',
                    border: isUsed ? '1px solid #e2e8f0' : '1.5px solid var(--panel-border)',
                    boxShadow: isUsed ? 'none' : '0 4px 14px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '8px',
                      background: isUsed ? '#e2e8f0' : (isPending ? '#fef3c7' : '#ecfdf5'),
                      color: isUsed ? '#64748b' : (isPending ? '#b45309' : '#059669')
                    }}>
                      {isUsed ? '✓ CHECK-IN REALIZADO' : (isPending ? '⏳ PENDENTE' : '● VÁLIDO')}
                    </span>

                    <span style={{ fontSize: '0.76rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
                      {shortCode}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: isUsed ? '#e2e8f0' : 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
                      color: isUsed ? '#64748b' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem'
                    }}>
                      🎟️
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tck.event_title}
                      </h4>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Titular: <strong>{tck.attendee_name}</strong> • Lote: <strong>{tck.lot_name || 'Geral'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px dashed var(--panel-border)',
                    paddingTop: '8px',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)'
                  }}>
                    <span>🗓️ {tck.date_formatted}</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>Abrir Passaporte ➔</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}


      {/* ========================================================
          MODAL DE INSCRIÇÃO / CHECKOUT
          ======================================================== */}
      {selectedEvent && (
        <div className="drawer-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', textAlign: 'center', margin: '4px 0 12px 0' }}>
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
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
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
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>{b.name}</span>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                    Nome Completo do Participante *
                  </label>
                  <input type="text" className="input-pwa" placeholder="Seu nome completo" value={attendeeName} onChange={e => setAttendeeName(e.target.value)} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                      WhatsApp *
                    </label>
                    <input type="tel" className="input-pwa" placeholder="(11) 98765-4321" value={attendeePhone} onChange={e => setAttendeePhone(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      CPF (Opcional)
                    </label>
                    <input type="text" className="input-pwa" placeholder="000.000.000-00" value={attendeeCpf} onChange={e => setAttendeeCpf(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    Restrições Alimentares / Observações
                  </label>
                  <input type="text" className="input-pwa" placeholder="Ex: Vegetariano, intolerância a lactose..." value={dietaryNotes} onChange={e => setDietaryNotes(e.target.value)} />
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '0.86rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, border: '1px solid var(--panel-border)' }}>
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

      {/* ========================================================
          MODAL DE PASSAPORTE DIGITAL (VOUCHER COM QR CODE)
          ======================================================== */}
      <EventTicketPassModal 
        ticket={selectedTicketPass} 
        isOpen={Boolean(selectedTicketPass)} 
        onClose={() => setSelectedTicketPass(null)} 
      />

      {/* ========================================================
          MODAL DE VALIDAÇÃO DE PORTARIA / SCANNER DE CÂMERA
          ======================================================== */}
      <EventQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          loadMyTickets(); // Recarrega status dos ingressos
        }}
        validatorName={user?.name || 'Portaria'}
        onValidationSuccess={() => {
          loadMyTickets();
        }}
      />

    </div>
  );
};
