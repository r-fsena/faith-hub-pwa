import React, { useState } from 'react';
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

  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);

  const qrData = ticket.qrcode_token || ticket.qr_code_data || ticket.ticket_id || ticket.id || '';
  const shortCode = ticket.short_code || (ticket.ticket_id?.startsWith('FH-') ? ticket.ticket_id : `FH-${(ticket.ticket_id || '').slice(-6).toUpperCase()}`);
  const eventTitle = ticket.event_title || 'Evento Especial';
  const lotName = ticket.lot_name || ticket.batch_name || 'Lote Geral';
  const dateFormatted = ticket.date_formatted || ticket.event_date || 'Data no evento';
  const locationFormatted = ticket.event_location || ticket.location || 'Templo Principal';
  const isUsed = ticket.status === 'USED';
  const isPending = ticket.status === 'PENDING';

  // Gerador de Calendário Google
  const handleAddToGoogleCalendar = () => {
    const startDate = ticket.event_date ? new Date(ticket.event_date) : new Date();
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    const formatDateForCal = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatDateForCal(startDate)}/${formatDateForCal(endDate)}&details=${encodeURIComponent(`Ingresso: ${shortCode}\nTitular: ${ticket.attendee_name}\nLote: ${lotName}\nLocal: ${locationFormatted}`)}&location=${encodeURIComponent(locationFormatted)}`;
    window.open(url, '_blank');
  };

  // Gerador de Arquivo iCalendar (.ics) para Apple Calendar e Outlook
  const handleDownloadIcs = () => {
    const startDate = ticket.event_date ? new Date(ticket.event_date) : new Date();
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    const formatDateForCal = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Faith-Hub//Event Tickets//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${ticket.id || shortCode}@faithhub.app`,
      `DTSTAMP:${formatDateForCal(new Date())}`,
      `DTSTART:${formatDateForCal(startDate)}`,
      `DTEND:${formatDateForCal(endDate)}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:Ingresso ${shortCode} - Titular: ${ticket.attendee_name} - Lote: ${lotName}`,
      `LOCATION:${locationFormatted}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `ingresso-${shortCode}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Salvar Passaporte na Galeria (Gera imagem do ticket)
  const handleSaveToGallery = async () => {
    setDownloadingImage(true);
    try {
      // Cria um canvas dinâmico com o layout do cartão
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 900;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fundo e gradiente estilo Apple Wallet
      const grad = ctx.createLinearGradient(0, 0, 0, 900);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#312e81');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 900);

      // Header
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillText('FAITH-HUB PASS', 40, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px Inter, sans-serif';
      // Quebra título se for muito longo
      const titleShort = eventTitle.length > 28 ? eventTitle.substring(0, 25) + '...' : eventTitle;
      ctx.fillText(titleShort, 40, 110);

      // Titular e Data
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 18px Inter, sans-serif';
      ctx.fillText('PARTICIPANTE', 40, 160);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText(ticket.attendee_name, 40, 195);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 18px Inter, sans-serif';
      ctx.fillText('DATA & LOCAL', 40, 245);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillText(`${dateFormatted} • ${locationFormatted}`, 40, 275);

      // Linha tracejada picotada
      ctx.strokeStyle = '#4338ca';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 320);
      ctx.lineTo(570, 320);
      ctx.stroke();

      // Card Branco para QR Code
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(100, 360, 400, 440, 24);
      ctx.fill();

      // Desenha QR Code no Canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      img.onload = () => {
        ctx.drawImage(img, 150, 390, 300, 300);

        // Código curto
        ctx.fillStyle = '#4f46e5';
        ctx.font = '900 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(shortCode, 300, 740);

        ctx.fillStyle = '#64748b';
        ctx.font = '600 16px Inter, sans-serif';
        ctx.fillText(`Lote: ${lotName}`, 300, 775);

        // Download
        const link = document.createElement('a');
        link.download = `passaporte-${shortCode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setDownloadingImage(false);
      };
      img.onerror = () => {
        setDownloadingImage(false);
        alert("Imagem gerada. Caso não baixe automaticamente, tire um print desta tela.");
      };
    } catch (e) {
      setDownloadingImage(false);
      console.error(e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ingresso: ${eventTitle}`,
          text: `Meu passaporte para ${eventTitle} (${shortCode}) - Titular: ${ticket.attendee_name}`,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(`Ingresso ${eventTitle} - Código: ${shortCode} - Titular: ${ticket.attendee_name}`);
      alert("Código do ingresso copiado para a área de transferência!");
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="94vh">
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', paddingBottom: '20px' }}>
        
        {/* ========================================================
            CARD DO PASSAPORTE DIGITAL (ESTILO APPLE WALLET)
            ======================================================== */}
        <div style={{
          width: '100%',
          background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)',
          borderRadius: '24px',
          padding: '20px 18px',
          color: '#ffffff',
          boxShadow: '0 12px 32px rgba(49, 46, 129, 0.35)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Brilho de Fundo */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Header do Passe */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.08em' }}>
              <span>🎟️ FAITH-HUB PASS</span>
            </div>

            <span style={{
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '4px 10px',
              borderRadius: '999px',
              background: isUsed ? '#334155' : (isPending ? '#fef3c7' : '#ecfdf5'),
              color: isUsed ? '#94a3b8' : (isPending ? '#b45309' : '#059669')
            }}>
              {isUsed ? '✓ CHECK-IN REALIZADO' : (isPending ? '⏳ PENDENTE' : '● VÁLIDO')}
            </span>
          </div>

          {/* Título do Evento */}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 10px 0', letterSpacing: '-0.3px', textAlign: 'left', lineHeight: 1.3 }}>
            {eventTitle}
          </h2>

          {/* Grid com Titular, Lote e Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'left', background: 'rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: '14px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '0.64rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase' }}>Titular</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ticket.attendee_name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.64rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase' }}>Lote / Entrada</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#38bdf8' }}>
                {lotName}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '0.64rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase' }}>Data & Local</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
                🗓️ {dateFormatted} • 📍 {locationFormatted}
              </div>
            </div>
          </div>

          {/* Card Central do QR Code */}
          <div style={{
            background: '#ffffff',
            padding: '16px 12px 14px 12px',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            position: 'relative'
          }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`} 
              alt="QR Code Passaporte"
              style={{ width: '175px', height: '175px', display: 'block', opacity: isUsed ? 0.40 : 1 }}
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
              background: '#e0e7ff',
              color: '#4338ca',
              padding: '4px 14px',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 900,
              letterSpacing: '0.08em'
            }}>
              {shortCode}
            </div>
            <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
              Apresente este QR Code no credenciamento
            </span>
          </div>

        </div>

        {/* ========================================================
            AÇÕES DA CARTEIRA DIGITAL & CALENDÁRIO
            ======================================================== */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Botão Carteira Apple & Google Wallet */}
          <button
            type="button"
            onClick={handleSaveToGallery}
            disabled={downloadingImage}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '14px',
              border: 'none',
              background: '#000000',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
            }}
          >
            <span></span>
            <span>{downloadingImage ? 'Gerando Cartão...' : 'Adicionar à Carteira / Salvar Cartão'}</span>
          </button>

          {/* Botão Adicionar ao Calendário */}
          <div style={{ position: 'relative', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowCalendarOptions(!showCalendarOptions)}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '14px',
                border: '1.5px solid var(--panel-border)',
                background: '#ffffff',
                color: 'var(--text-main)',
                fontWeight: 800,
                fontSize: '0.80rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🗓️</span>
              <span>Adicionar à Minha Agenda</span>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>▾</span>
            </button>

            {showCalendarOptions && (
              <div style={{
                position: 'absolute',
                bottom: '110%',
                left: 0,
                right: 0,
                background: '#ffffff',
                borderRadius: '14px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                border: '1px solid var(--panel-border)',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 10
              }}>
                <button
                  type="button"
                  onClick={() => { handleAddToGoogleCalendar(); setShowCalendarOptions(false); }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>🌐</span> Google Calendar
                </button>

                <button
                  type="button"
                  onClick={() => { handleDownloadIcs(); setShowCalendarOptions(false); }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span></span> Apple Calendar / Outlook (.ics)
                </button>
              </div>
            )}
          </div>

          {/* Botões Secundários: Compartilhar & Fechar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginTop: '4px' }}>
            <button
              type="button"
              className="btn-pwa-secondary"
              onClick={handleShare}
              style={{ fontWeight: 800, fontSize: '0.80rem', padding: '10px' }}
            >
              📤 Compartilhar
            </button>
            <button
              type="button"
              className="btn-pwa-secondary"
              onClick={onClose}
              style={{ fontWeight: 800, fontSize: '0.80rem', padding: '10px' }}
            >
              Fechar
            </button>
          </div>

        </div>

      </div>
    </BottomSheet>
  );
};

