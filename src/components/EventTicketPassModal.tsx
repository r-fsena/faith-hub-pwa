import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
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
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [localQrDataUrl, setLocalQrDataUrl] = useState<string>('');
  const [savedCardPreviewUrl, setSavedCardPreviewUrl] = useState<string | null>(null);

  const qrData = ticket?.qrcode_token || ticket?.qr_code_data || ticket?.ticket_id || ticket?.id || '';

  // Gerar QR Code localmente e offline com alta resolução
  useEffect(() => {
    if (qrData) {
      QRCode.toDataURL(qrData, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setLocalQrDataUrl(url))
      .catch(err => {
        console.error('Erro ao gerar QR code local:', err);
        setLocalQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData)}`);
      });
    }
  }, [qrData]);

  if (!ticket) return null;

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

  // Salvar Passaporte na Galeria / Carteira (Gera imagem nativa em alta resolução)
  const handleSaveToGallery = async () => {
    setDownloadingImage(true);
    try {
      // 1. Criar canvas em alta definição (600x940)
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 940;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setDownloadingImage(false);
        return;
      }

      // 2. Fundo e gradiente estilo Apple Wallet
      const grad = ctx.createLinearGradient(0, 0, 0, 940);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.45, '#312e81');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 940);

      // Efeito de iluminação suave no topo
      const glowGrad = ctx.createRadialGradient(300, 40, 20, 300, 40, 280);
      glowGrad.addColorStop(0, 'rgba(129, 140, 248, 0.35)');
      glowGrad.addColorStop(1, 'rgba(129, 140, 248, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 600, 250);

      // Header: Logo / Nome do App
      ctx.fillStyle = '#a5b4fc';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('✨ FAITH-HUB PASS', 40, 56);

      // Badge de Status
      ctx.fillStyle = isUsed ? '#ef4444' : '#10b981';
      ctx.beginPath();
      ctx.roundRect(420, 36, 140, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isUsed ? 'UTILIZADO' : 'CONFIRMADO', 490, 56);

      // Título do Evento
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 30px Inter, sans-serif';
      const titleShort = eventTitle.length > 28 ? eventTitle.substring(0, 26) + '...' : eventTitle;
      ctx.fillText(titleShort, 40, 115);

      // Titular
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText('PARTICIPANTE / TITULAR', 40, 168);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Inter, sans-serif';
      const attendeeShort = ticket.attendee_name.length > 26 ? ticket.attendee_name.substring(0, 24) + '...' : ticket.attendee_name;
      ctx.fillText(attendeeShort, 40, 202);

      // Data & Local
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText('DATA & LOCAL', 40, 248);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 20px Inter, sans-serif';
      const locShort = `${dateFormatted} • ${locationFormatted}`;
      ctx.fillText(locShort.length > 36 ? locShort.substring(0, 34) + '...' : locShort, 40, 280);

      // Linha picotada divisória
      ctx.strokeStyle = '#4338ca';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 325);
      ctx.lineTo(570, 325);
      ctx.stroke();

      // Card Branco para QR Code
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(80, 360, 440, 480, 24);
      ctx.fill();

      // Renderiza QR Code diretamente no Canvas sem dependência de rede externa
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, qrData, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      ctx.drawImage(qrCanvas, 140, 400, 320, 320);

      // Código de validação curto
      ctx.fillStyle = '#4f46e5';
      ctx.font = '900 30px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shortCode, 300, 765);

      // Lote e subtítulo
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(`Lote: ${lotName}`, 300, 800);

      // Rodapé do cartão
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px Inter, sans-serif';
      ctx.fillText('Apresente este passaporte no credenciamento da portaria', 300, 885);

      // 3. Converter canvas para Blob e acionar compartilhamento/salvamento nativo
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setDownloadingImage(false);
          return;
        }

        const fileName = `passaporte-${shortCode}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        // Se suportar Web Share API com arquivos (iOS Safari e Android Chrome)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Passaporte: ${eventTitle}`,
              text: `Passaporte de ${ticket.attendee_name} para ${eventTitle}`,
              files: [file]
            });
            setDownloadingImage(false);
            return;
          } catch (shareErr: any) {
            // Se o usuário apenas cancelou o share sheet, não exibe erro
            if (shareErr.name === 'AbortError') {
              setDownloadingImage(false);
              return;
            }
            console.warn('Erro ao compartilhar arquivo via Web Share:', shareErr);
          }
        }

        // Fallback: Gerar Object URL para download direto e preview
        const objectUrl = URL.createObjectURL(blob);
        setSavedCardPreviewUrl(objectUrl);

        // Tenta download direto via tag <a>
        const link = document.createElement('a');
        link.download = fileName;
        link.href = objectUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadingImage(false);
      }, 'image/png');

    } catch (e) {
      setDownloadingImage(false);
      console.error('Erro ao gerar passaporte:', e);
      alert('Não foi possível gerar a imagem automaticamente. Você pode tirar um print desta tela com o QR Code.');
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
              src={localQrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`} 
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

        {/* ========================================================
            MODAL DE PREVIEW DO CARTÃO SALVO (iOS & Android Fallback)
            ======================================================== */}
        {savedCardPreviewUrl && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: '#0f172a',
              borderRadius: '20px',
              padding: '16px',
              maxWidth: '360px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.92rem', textAlign: 'center' }}>
                🎉 Passaporte Gerado!
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.72rem', margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
                No celular, você pode <strong>tocar e segurar</strong> na imagem abaixo para <strong>Salvar no Fotos / Galeria</strong>.
              </p>
              
              <div style={{ maxHeight: '380px', overflowY: 'auto', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <img 
                  src={savedCardPreviewUrl} 
                  alt="Passaporte do Evento" 
                  style={{ width: '100%', display: 'block', borderRadius: '14px' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '6px' }}>
                <a
                  href={savedCardPreviewUrl}
                  download={`passaporte-${shortCode}.png`}
                  className="btn-pwa-primary"
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '0.78rem',
                    textDecoration: 'none',
                    textAlign: 'center',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  📥 Baixar
                </a>
                <button
                  type="button"
                  onClick={() => setSavedCardPreviewUrl(null)}
                  className="btn-pwa-secondary"
                  style={{
                    padding: '10px 16px',
                    fontSize: '0.78rem',
                    borderRadius: '10px'
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </BottomSheet>
  );
};

