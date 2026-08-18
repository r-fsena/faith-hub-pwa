import React from 'react';
import { BottomSheet } from './BottomSheet';

export interface EventTicketData {
  id?: string;
  ticket_id?: string;
  short_code?: string;
  qrcode_token?: string;
  qr_code_data?: string;
  status: 'PAID' | 'PENDING' | 'USED' | 'CANCELED' | string;
  event_title: string;
  event_date?: string;
  date_formatted?: string;
  event_location?: string;
  location?: string;
  event_image?: string;
  cover_url?: string;
  lot_name?: string;
  batch_name?: string;
  attendee_name: string;
  attendee_whatsapp?: string;
  attendee_cpf?: string;
  dietary_notes?: string;
  price_paid?: number;
  scanned_at?: string;
  scanned_by?: string;
}

interface EventTicketPassModalProps {
  ticket: EventTicketData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventTicketPassModal: React.FC<EventTicketPassModalProps> = ({
  ticket,
  isOpen,
  onClose
}) => {
  if (!ticket) return null;

  const qrData = ticket.qrcode_token || ticket.qr_code_data || ticket.ticket_id || ticket.id || '';
  const shortCode = ticket.short_code || (ticket.ticket_id?.startsWith('FH-') ? ticket.ticket_id : `FH-${(ticket.ticket_id || '').slice(-6).toUpperCase()}`);
  const eventTitle = ticket.event_title || 'Evento Especial';
  const lotName = ticket.lot_name || ticket.batch_name || 'Lote Geral';
  const dateFormatted = ticket.date_formatted || ticket.event_date || 'Data no evento';
  const locationFormatted = ticket.event_location || ticket.location || 'Templo Principal';
  const isUsed = ticket.status === 'USED';
  const isPending = ticket.status === 'PENDING';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ingresso: ${eventTitle}`,
          text: `Meu passaporte para ${eventTitle} (${shortCode}) - Titular: ${ticket.attendee_name}`,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(`Ingresso ${eventTitle} - Código: ${shortCode}`);
      alert("Código do ingresso copiado para a área de transferência!");
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="92vh">
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        
        {/* Badge de Status */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '0.74rem',
          fontWeight: 900,
          background: isUsed ? '#f1f5f9' : (isPending ? '#fef3c7' : '#ecfdf5'),
          color: isUsed ? '#64748b' : (isPending ? '#b45309' : '#059669'),
          border: `1.5px solid ${isUsed ? '#cbd5e1' : (isPending ? '#fde68a' : '#a7f3d0')}`
        }}>
          <span>{isUsed ? '✓ CHECK-IN REALIZADO' : (isPending ? '⏳ PAGAMENTO PENDENTE' : '● VÁLIDO PARA ENTRADA')}</span>
        </div>

        {/* Título do Evento e Participante */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            {eventTitle}
          </h2>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            👤 {ticket.attendee_name}
          </div>
        </div>

        {/* QR Code de Alta Legibilidade */}
        <div style={{
          background: '#ffffff',
          padding: '16px',
          borderRadius: '20px',
          border: '2px solid var(--panel-border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          position: 'relative'
        }}>
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`} 
            alt="QR Code Passaporte"
            style={{ width: '180px', height: '180px', display: 'block', opacity: isUsed ? 0.45 : 1 }}
          />

          {isUsed && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-12deg)',
              background: '#0f172a',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.80rem',
              fontWeight: 900,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap'
            }}>
              ✓ UTILIZADO NA PORTARIA
            </div>
          )}

          {/* Código Curto de Validação Manual */}
          <div style={{
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            padding: '4px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 900,
            letterSpacing: '0.08em'
          }}>
            {shortCode}
          </div>
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
          Apresente este QR Code na portaria ou informe o código acima ao voluntário.
        </p>

        {/* Card com Detalhes do Ingresso */}
        <div style={{
          background: '#f8fafc',
          padding: '14px',
          borderRadius: '16px',
          border: '1px solid var(--panel-border)',
          width: '100%',
          fontSize: '0.80rem',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>🎟️ Lote:</span>
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{lotName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>🗓️ Data / Horário:</span>
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{dateFormatted}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>📍 Local:</span>
            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{locationFormatted}</span>
          </div>
          {ticket.attendee_whatsapp && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>📱 WhatsApp:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ticket.attendee_whatsapp}</span>
            </div>
          )}
          {ticket.dietary_notes && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '4px', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>🥗 Observações:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ticket.dietary_notes}</span>
            </div>
          )}
          {isUsed && ticket.scanned_at && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '4px', marginTop: '2px', color: '#059669' }}>
              <span>✓ Credenciado em:</span>
              <span style={{ fontWeight: 800 }}>
                {new Date(ticket.scanned_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                {ticket.scanned_by ? ` (${ticket.scanned_by})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', width: '100%' }}>
          <button
            type="button"
            className="btn-pwa-secondary"
            onClick={handleShare}
            style={{ fontWeight: 800, fontSize: '0.82rem' }}
          >
            📤 Enviar
          </button>
          <button
            type="button"
            className="btn-pwa-primary"
            onClick={onClose}
            style={{ fontWeight: 800, fontSize: '0.86rem' }}
          >
            Fechar Passaporte
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
