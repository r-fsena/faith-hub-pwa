import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { BottomSheet } from './BottomSheet';
import { authFetch } from '../services/api';

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

const API_URL = import.meta.env.VITE_API_URL || 'https://566n5qz7te.execute-api.us-east-2.amazonaws.com';

export const EventTicketPassModal: React.FC<EventTicketPassModalProps> = ({
  ticket,
  isOpen,
  onClose
}) => {
  const [activeTicket, setActiveTicket] = useState<EventTicketData | null>(ticket);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [localQrDataUrl, setLocalQrDataUrl] = useState<string>('');
  const [savedCardPreviewUrl, setSavedCardPreviewUrl] = useState<string | null>(null);

  // Sincroniza estado com prop ticket e consulta status atualizado da API
  useEffect(() => {
    setActiveTicket(ticket);
    if (ticket && isOpen) {
      const ticketId = ticket.id || ticket.ticket_id;
      if (ticketId) {
        authFetch(`${API_URL}/tickets/${ticketId}/pass`)
          .then(res => res.json())
          .then(json => {
            if (json.data) {
              setActiveTicket(prev => prev ? ({
                ...prev,
                ...json.data,
                status: json.data.status || prev.status,
                scanned_at: json.data.scanned_at || prev.scanned_at,
                scanned_by: json.data.scanned_by || prev.scanned_by
              }) : json.data);
            }
          })
          .catch(() => {});
      }
    }
  }, [ticket, isOpen]);

  const current = activeTicket || ticket;
  const qrData = current?.qrcode_token || current?.qr_code_data || current?.ticket_id || current?.id || '';

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
        setLocalQrDataUrl('');
      });
    }
  }, [qrData]);

  if (!current) return null;

  const shortCode = current.short_code || (current.ticket_id?.startsWith('FH-') ? current.ticket_id : `FH-${(current.ticket_id || '').slice(-6).toUpperCase()}`);
  const eventTitle = current.event_title || 'Evento Especial';
  const lotName = current.lot_name || current.batch_name || 'Lote Geral';
  const dateFormatted = current.date_formatted || current.event_date || 'Data no evento';
  const locationFormatted = current.event_location || current.location || 'Templo Principal';
  const isUsed = current.status === 'USED' || current.status === 'VALIDATED' || current.status === 'CHECKED_IN' || !!current.scanned_at;
  const isPending = current.status === 'PENDING';

  const validationDetails = (() => {
    if (!current.scanned_at) {
      return {
        dateStr: 'Ingresso conferido na portaria',
        timeStr: 'Check-in Realizado'
      };
    }
    try {
      const d = new Date(current.scanned_at);
      return {
        dateStr: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        timeStr: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    } catch (e) {
      return {
        dateStr: 'Ingresso conferido na portaria',
        timeStr: 'Check-in Realizado'
      };
    }
  })();

  // Gerador de Calendário Google
  const handleAddToGoogleCalendar = () => {
    const startDate = current.event_date ? new Date(current.event_date) : new Date();
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    const formatDateForCal = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formatDateForCal(startDate)}/${formatDateForCal(endDate)}&details=${encodeURIComponent(`Ingresso: ${shortCode}\nTitular: ${current.attendee_name}\nLote: ${lotName}\nLocal: ${locationFormatted}`)}&location=${encodeURIComponent(locationFormatted)}`;
    window.open(url, '_blank');
  };

  // Gerador de Arquivo iCalendar (.ics) para Apple Calendar e Outlook
  const handleDownloadIcs = () => {
    const startDate = current.event_date ? new Date(current.event_date) : new Date();
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    const formatDateForCal = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Faith-Hub//Event Tickets//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${current.id || shortCode}@faithhub.app`,
      `DTSTAMP:${formatDateForCal(new Date())}`,
      `DTSTART:${formatDateForCal(startDate)}`,
      `DTEND:${formatDateForCal(endDate)}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:Ingresso ${shortCode} - Titular: ${current.attendee_name} - Lote: ${lotName}`,
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
      const attendeeName = ticket?.attendee_name || 'Participante';
      const attendeeShort = attendeeName.length > 26 ? attendeeName.substring(0, 24) + '...' : attendeeName;
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

      // Card Branco para QR Code ou Comprovante de Validação
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(80, 360, 440, 480, 24);
      ctx.fill();

      if (isUsed) {
        // Círculo Verde com Checkmark
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(300, 470, 48, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 48px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', 300, 486);

        // Título Validado
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 28px Inter, sans-serif';
        ctx.fillText('INGRESSO VALIDADO', 300, 560);

        ctx.fillStyle = '#059669';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillText('CHECK-IN CONCLUÍDO NA PORTARIA', 300, 592);

        // Caixa com data/hora de validação
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.roundRect(110, 625, 380, 105, 16);
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillText(`Data: ${validationDetails.dateStr}`, 300, 660);
        ctx.fillText(`Horário: ${validationDetails.timeStr}`, 300, 690);
        if (current.scanned_by) {
          ctx.fillText(`Credenciamento: ${current.scanned_by}`, 300, 718);
        }

        // Código curto de conferência
        ctx.fillStyle = '#4f46e5';
        ctx.font = '900 26px Inter, sans-serif';
        ctx.fillText(shortCode, 300, 780);

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillText(`Lote: ${lotName}`, 300, 815);

        ctx.fillStyle = '#dc2626';
        ctx.font = '600 13px Inter, sans-serif';
        ctx.fillText('Ingresso já utilizado. Não reutilizável.', 300, 885);
      } else {
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
      }

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
              text: `Passaporte de ${current.attendee_name} para ${eventTitle}`,
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
      alert('Não foi possível gerar a imagem automaticamente. Você pode tirar um print desta tela.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ingresso: ${eventTitle}`,
          text: `Meu passaporte para ${eventTitle} (${shortCode}) - Titular: ${current.attendee_name}`,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(`Ingresso ${eventTitle} - Código: ${shortCode} - Titular: ${current.attendee_name}`);
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
              color: isUsed ? '#cbd5e1' : (isPending ? '#b45309' : '#059669')
            }}>
              {isUsed ? '✓ VALIDADO' : (isPending ? '⏳ PENDENTE' : '● VÁLIDO')}
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
                {current.attendee_name}
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

          {/* Card Central: Se VALIDADO não mostra o QR Code, mostra a mensagem de validação */}
          {isUsed ? (
            <div style={{
              background: '#ffffff',
              padding: '24px 18px 20px 18px',
              borderRadius: '20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              position: 'relative',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {/* Ícone de Sucesso */}
              <div style={{
                width: '62px',
                height: '62px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.9rem',
                boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)'
              }}>
                ✓
              </div>

              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 2px 0', letterSpacing: '-0.01em' }}>
                  INGRESSO VALIDADO
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Check-in Realizado na Portaria
                </span>
              </div>

              {/* Box com detalhes da validação */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '12px 14px',
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Data da Validação:</span>
                  <strong style={{ color: '#0f172a', fontWeight: 800 }}>{validationDetails.dateStr}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Horário:</span>
                  <strong style={{ color: '#0f172a', fontWeight: 800 }}>{validationDetails.timeStr}</strong>
                </div>
                {current.scanned_by && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Credenciamento:</span>
                    <strong style={{ color: '#4338ca', fontWeight: 800 }}>{current.scanned_by}</strong>
                  </div>
                )}
              </div>

              {/* Código Curto de Validação Manual */}
              <div style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '4px 14px',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 900,
                letterSpacing: '0.08em'
              }}>
                {shortCode}
              </div>

              {/* Mensagem de alerta de não reaproveitamento */}
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '0.72rem',
                color: '#991b1b',
                fontWeight: 600,
                lineHeight: 1.35
              }}>
                🔒 O QR Code foi desativado porque este ingresso já foi utilizado para entrada no evento. Não é possível reaproveitá-lo.
              </div>
            </div>
          ) : (
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
              {localQrDataUrl ? (
                <img
                  src={localQrDataUrl}
                  alt="QR Code Passaporte"
                  style={{ width: '175px', height: '175px', display: 'block' }}
                />
              ) : (
                <div style={{ width: 175, height: 175, display: 'grid', placeItems: 'center', color: '#64748b', fontSize: '0.75rem', textAlign: 'center' }}>
                  QR Code indisponível. Utilize o código manual abaixo.
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
          )}

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
            <span>
              {isUsed 
                ? (downloadingImage ? 'Gerando Comprovante...' : '📥 Salvar Comprovante de Entrada')
                : (downloadingImage ? 'Gerando Cartão...' : 'Adicionar à Carteira / Salvar Cartão')}
            </span>
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

