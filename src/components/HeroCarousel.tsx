import React, { useState, useEffect, useRef } from 'react';
import { getYoutubeEmbedUrl } from './LivePlayerModal';

export function getYoutubeThumbnailUrl(urlOrId?: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  
  let videoId = '';
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) videoId = watchMatch[1];
  
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (!videoId && shortMatch && shortMatch[1]) videoId = shortMatch[1];
  
  const liveMatch = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (!videoId && liveMatch && liveMatch[1]) videoId = liveMatch[1];
  
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (!videoId && embedMatch && embedMatch[1]) videoId = embedMatch[1];
  
  if (!videoId && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) videoId = trimmed;
  
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return '';
}

interface HeroCarouselProps {
  branding: any;
  activeBroadcast?: any;
  featuredEvent?: any;
  todayDevotional?: any;
  user?: any;
  currentCampus?: any;
  onOpenEvents: () => void;
  onNavigate: (tab: any) => void;
  onOpenVisitorModal: () => void;
  onOpenBible: () => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  branding,
  activeBroadcast,
  featuredEvent,
  todayDevotional,
  user,
  currentCampus: _currentCampus,
  onOpenEvents,
  onNavigate,
  onOpenVisitorModal,
  onOpenBible
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Configuração do vídeo ativo / YouTube
  const rawVideoUrl = activeBroadcast?.youtube_url || branding?.youtube_url;
  const videoEmbedUrl = rawVideoUrl ? getYoutubeEmbedUrl(rawVideoUrl) : '';
  const videoThumbUrl = rawVideoUrl ? getYoutubeThumbnailUrl(rawVideoUrl) : '';
  const videoTitle = activeBroadcast?.title || `Culto de Celebração • ${branding?.church_name || 'Faith-Hub'}`;

  // Montagem dinâmica da lista de slides disponíveis
  const slides: Array<{
    id: string;
    type: 'video' | 'church' | 'event' | 'devotional';
    badge: string;
    badgeBg: string;
    title: string;
    subtitle?: string;
    bgImage?: string;
  }> = [];

  // 1. Slide de Vídeo / Transmissão (se houver link do YouTube configurado)
  if (rawVideoUrl) {
    slides.push({
      id: 'slide-video',
      type: 'video',
      badge: activeBroadcast?.is_available ? '● AO VIVO' : '📺 CULTO EM VÍDEO',
      badgeBg: activeBroadcast?.is_available ? '#ef4444' : '#0284c7',
      title: videoTitle,
      subtitle: activeBroadcast?.description || 'Toque para assistir à mensagem e celebração da nossa comunidade.',
      bgImage: videoThumbUrl || branding?.banner_url
    });
  }

  // 2. Slide Institucional da Igreja
  slides.push({
    id: 'slide-church',
    type: 'church',
    badge: 'APLICATIVO OFICIAL',
    badgeBg: 'rgba(255, 255, 255, 0.25)',
    title: branding?.church_name || 'Faith-Hub',
    subtitle: branding?.tagline || 'Conectando corações e transformando vidas.',
    bgImage: branding?.banner_url
  });

  // 3. Slide de Evento em Destaque (se houver)
  if (featuredEvent) {
    const eventDateFormatted = featuredEvent.start_time
      ? new Date(featuredEvent.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      : undefined;

    slides.push({
      id: 'slide-event',
      type: 'event',
      badge: `📅 PRÓXIMO EVENTO ${eventDateFormatted ? `• ${eventDateFormatted.toUpperCase()}` : ''}`,
      badgeBg: '#ea580c',
      title: featuredEvent.title,
      subtitle: featuredEvent.location ? `${featuredEvent.location} • Inscrições Abertas` : 'Confira os detalhes e participe conosco.',
      bgImage: featuredEvent.cover_url || featuredEvent.image_url || branding?.banner_url
    });
  }

  // 4. Slide de Palavra & Devocional
  if (todayDevotional) {
    slides.push({
      id: 'slide-devotional',
      type: 'devotional',
      badge: '📖 PALAVRA DO DIA',
      badgeBg: '#0f766e',
      title: todayDevotional.title || 'Devocional Diário',
      subtitle: todayDevotional.verse_reference || 'Edifique a sua fé com a Palavra de Deus para hoje.',
      bgImage: todayDevotional.cover_url || branding?.banner_url
    });
  }

  // Autoplay do carrossel (pausado se o usuário estiver assistindo ao vídeo)
  useEffect(() => {
    if (isPlayingVideo || slides.length <= 1) return;

    autoplayTimerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5500);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [isPlayingVideo, slides.length, currentSlide]);

  const handleNext = () => {
    setIsPlayingVideo(false);
    setCurrentSlide(prev => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setIsPlayingVideo(false);
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  };

  const handleSelectSlide = (idx: number) => {
    setIsPlayingVideo(false);
    setCurrentSlide(idx);
  };

  // Suporte a gestos Swipe Touch no Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  if (slides.length === 0) return null;

  const current = slides[currentSlide] || slides[0];

  return (
    <div
      className="hero-carousel-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 16px 36px -10px rgba(0,0,0,0.22)',
        background: '#0f172a',
        userSelect: 'none'
      }}
    >
      {/* Visualização de Vídeo Inline com Autoplay */}
      {current.type === 'video' && isPlayingVideo ? (
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000000' }}>
          <iframe
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            src={videoEmbedUrl}
            title={videoTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button
            type="button"
            onClick={() => setIsPlayingVideo(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0,0,0,0.65)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '999px',
              padding: '6px 12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              zIndex: 10
            }}
          >
            ✕ Fechar Player
          </button>
        </div>
      ) : (
        /* Card Normal do Slide Atual */
        <div
          className="pwa-hero-card"
          style={{
            position: 'relative',
            minHeight: '215px',
            margin: 0,
            cursor: current.type === 'video' ? 'pointer' : 'default'
          }}
          onClick={() => {
            if (current.type === 'video') {
              setIsPlayingVideo(true);
            }
          }}
        >
          {/* Background Image / Gradient */}
          {current.bgImage ? (
            <img
              src={current.bgImage}
              alt={current.title}
              className="pwa-hero-bg"
              style={{
                filter: current.type === 'video' ? 'brightness(0.68)' : 'brightness(0.85)'
              }}
            />
          ) : (
            <div className="pwa-hero-bg" style={{ background: 'var(--accent-primary-gradient)' }} />
          )}

          <div className="pwa-hero-overlay" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.20) 0%, rgba(15,23,42,0.85) 100%)' }} />

          {/* Botão de Play Centralizado para Vídeo */}
          {current.type === 'video' && (
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.28)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255, 255, 255, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, background 0.2s ease',
                zIndex: 3
              }}
            >
              <span style={{ fontSize: '1.4rem', color: '#ffffff', marginLeft: '3px' }}>▶</span>
            </div>
          )}

          {/* Conteúdo do Slide */}
          <div className="pwa-hero-content" style={{ zIndex: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: current.badgeBg,
                  color: '#ffffff',
                  padding: '3px 9px',
                  borderRadius: '8px',
                  backdropFilter: 'blur(6px)',
                  animation: current.type === 'video' && activeBroadcast?.is_available ? 'pulse 2s infinite' : 'none'
                }}
              >
                {current.badge}
              </span>

              {/* Indicador Numérico discreto */}
              {slides.length > 1 && (
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>
                  {currentSlide + 1}/{slides.length}
                </span>
              )}
            </div>

            <h2 style={{ fontSize: 'clamp(1.10rem, 4vw, 1.30rem)', fontWeight: 900, marginTop: '6px', lineHeight: 1.25, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {current.title}
            </h2>

            {current.subtitle && (
              <p
                style={{
                  fontSize: '0.74rem',
                  opacity: 0.92,
                  marginTop: '3px',
                  lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textShadow: '0 1px 4px rgba(0,0,0,0.4)'
                }}
              >
                {current.subtitle}
              </p>
            )}

            {/* Ações Específicas por tipo de Slide */}
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {current.type === 'video' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlayingVideo(true);
                  }}
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minHeight: '34px'
                  }}
                >
                  <span>▶</span>
                  <span>Assistir Agora (Inline)</span>
                </button>
              )}

              {current.type === 'church' && (
                <>
                  {!user ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVisitorModal();
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.25)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.5)',
                        backdropFilter: 'blur(8px)',
                        padding: '7px 13px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        minHeight: '34px'
                      }}
                    >
                      👋 Sou Visitante
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBible();
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.25)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.5)',
                        backdropFilter: 'blur(8px)',
                        padding: '7px 13px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        minHeight: '34px'
                      }}
                    >
                      📖 Bíblia Sagrada
                    </button>
                  )}
                </>
              )}

              {current.type === 'event' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEvents();
                  }}
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minHeight: '34px'
                  }}
                >
                  <span>🎟️</span>
                  <span>Ver Eventos & Inscrições</span>
                </button>
              )}

              {current.type === 'devotional' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('devotionals');
                  }}
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minHeight: '34px'
                  }}
                >
                  <span>📖</span>
                  <span>Ler Mensagem Completa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Indicadores de Paginação (Dots) */}
      {slides.length > 1 && !isPlayingVideo && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '16px',
            display: 'flex',
            gap: '6px',
            zIndex: 10,
            alignItems: 'center'
          }}
        >
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectSlide(idx);
              }}
              aria-label={`Ir para o slide ${idx + 1}`}
              style={{
                width: currentSlide === idx ? '20px' : '7px',
                height: '7px',
                borderRadius: '999px',
                background: currentSlide === idx ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
