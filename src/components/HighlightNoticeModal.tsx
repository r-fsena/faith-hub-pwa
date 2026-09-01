import React, { useState, useEffect } from 'react';

interface HighlightNoticeModalProps {
  activeBroadcast?: any;
  featuredEvent?: any;
  branding?: any;
  onOpenLive: () => void;
  onOpenEvents: () => void;
}

export const HighlightNoticeModal: React.FC<HighlightNoticeModalProps> = ({
  activeBroadcast,
  featuredEvent,
  branding,
  onOpenLive,
  onOpenEvents
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [noticeData, setNoticeData] = useState<{
    type: 'broadcast' | 'event' | 'church';
    badge: string;
    badgeBg: string;
    title: string;
    message: string;
    imageUrl?: string;
    actionText: string;
    onAction: () => void;
  } | null>(null);

  useEffect(() => {
    // Verifica se já foi dispensado nesta sessão do navegador
    const isDismissed = sessionStorage.getItem('faithhub_popup_notice_dismissed');
    if (isDismissed) return;

    // 1. Prioridade 1: Transmissão com flag show_as_popup ativa
    if (activeBroadcast && (activeBroadcast.show_as_popup === 1 || activeBroadcast.show_as_popup === true)) {
      setNoticeData({
        type: 'broadcast',
        badge: activeBroadcast.is_available ? '🔴 AO VIVO AGORA' : '📺 TRANSMISSÃO EM DESTAQUE',
        badgeBg: activeBroadcast.is_available ? '#ef4444' : '#0284c7',
        title: activeBroadcast.title || 'Culto de Celebração Online',
        message: activeBroadcast.description || 'Estamos transmitindo ao vivo a nossa celebração. Junte-se a nós em adoração!',
        imageUrl: branding?.banner_url,
        actionText: '▶ Assistir Agora',
        onAction: () => {
          setIsOpen(false);
          onOpenLive();
        }
      });
      setIsOpen(true);
      return;
    }

    // 2. Prioridade 2: Evento com flag show_as_popup ativa
    if (featuredEvent && (featuredEvent.show_as_popup === 1 || featuredEvent.show_as_popup === true)) {
      setNoticeData({
        type: 'event',
        badge: '📅 COMUNICADO & EVENTO ESPECIAL',
        badgeBg: '#ea580c',
        title: featuredEvent.title,
        message: featuredEvent.description || 'As inscrições para este grande encontro estão abertas. Garanta a sua participação!',
        imageUrl: featuredEvent.cover_url || featuredEvent.image_url || branding?.banner_url,
        actionText: '🎟️ Ver Detalhes & Inscrição',
        onAction: () => {
          setIsOpen(false);
          onOpenEvents();
        }
      });
      setIsOpen(true);
      return;
    }

    // 3. Prioridade 3: Comunicado Geral da Igreja configurado no Studio
    if (branding?.popup_notice && branding.popup_notice.enabled) {
      setNoticeData({
        type: 'church',
        badge: branding.popup_notice.badge || '🔔 COMUNICADO DA IGREJA',
        badgeBg: branding.popup_notice.badge_bg || 'var(--accent-primary)',
        title: branding.popup_notice.title || branding.church_name,
        message: branding.popup_notice.message || '',
        imageUrl: branding.popup_notice.image_url || branding?.banner_url,
        actionText: branding.popup_notice.action_text || 'Entendi',
        onAction: () => {
          setIsOpen(false);
          if (branding.popup_notice.action_link) {
            window.open(branding.popup_notice.action_link, '_blank');
          }
        }
      });
      setIsOpen(true);
      return;
    }
  }, [activeBroadcast, featuredEvent, branding]);

  const handleClose = () => {
    sessionStorage.setItem('faithhub_popup_notice_dismissed', 'true');
    setIsOpen(false);
  };

  if (!isOpen || !noticeData) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '400px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          border: '1px solid var(--panel-border)',
          position: 'relative',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Imagem de Capa do Pop-up (se houver) */}
        {noticeData.imageUrl ? (
          <div style={{ position: 'relative', width: '100%', height: '160px', overflow: 'hidden', background: '#0f172a' }}>
            <img
              src={noticeData.imageUrl}
              alt={noticeData.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
            
            {/* Botão Fechar no Topo */}
            <button
              type="button"
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.1rem',
                backdropFilter: 'blur(6px)'
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#64748b',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.1rem',
              zIndex: 10
            }}
          >
            ✕
          </button>
        )}

        {/* Conteúdo do Pop-up */}
        <div style={{ padding: '20px 22px 22px 22px', textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.66rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: noticeData.badgeBg,
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '999px',
              marginBottom: '10px'
            }}
          >
            {noticeData.badge}
          </span>

          <h3
            style={{
              fontSize: '1.20rem',
              fontWeight: 900,
              color: 'var(--text-main)',
              margin: '0 0 8px 0',
              lineHeight: 1.3
            }}
          >
            {noticeData.title}
          </h3>

          <p
            style={{
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: '0 0 20px 0'
            }}
          >
            {noticeData.message}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn-pwa-primary"
              onClick={noticeData.onAction}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.88rem',
                fontWeight: 800,
                borderRadius: '14px'
              }}
            >
              {noticeData.actionText}
            </button>

            <button
              type="button"
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '8px',
                cursor: 'pointer'
              }}
            >
              Agora não, fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
