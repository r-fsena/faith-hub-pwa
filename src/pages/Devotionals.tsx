import React, { useState, useEffect, useMemo } from 'react';
import { fetchDevotionals, fetchTodayDevotional } from '../services/api';

export interface DevotionalItem {
  id: string;
  raw_date?: string;
  formatted_date?: string;
  date_badge?: string;
  is_today?: boolean;
  is_tomorrow?: boolean;
  title: string;
  passage?: string;
  verse_text?: string;
  content: string;
  author?: string;
  author_role?: string;
  prayer_indication?: string;
  suggested_song_title?: string;
  suggested_song_youtube_id?: string;
  pastoral_comment?: string;
  created_at?: string;
}

export const Devotionals: React.FC = () => {
  const [allDevotionals, setAllDevotionals] = useState<DevotionalItem[]>(() => {
    try {
      const saved = localStorage.getItem('faithhub_cached_devotionals_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('faithhub_cached_devotionals_v3');
      return !saved || JSON.parse(saved).length === 0;
    } catch {
      return true;
    }
  });

  // Modal de Leitura / Estudo Completo da Palavra
  const [readingDevotional, setReadingDevotional] = useState<DevotionalItem | null>(null);

  // Modal / Gaveta de Dias Anteriores
  const [showPastModal, setShowPastModal] = useState<boolean>(false);
  const [pastSearchTerm, setPastSearchTerm] = useState<string>('');

  // Persistência de Estudos Concluídos / Lidos
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('faithhub_completed_devotionals_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistência de Reações / Curtidas ("❤️ Abençoado!")
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('faithhub_liked_devotionals_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [shareFeedback, setShareFeedback] = useState<boolean>(false);

  // Estado do Player de Louvor & Meditação
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [currentSongTitle, setCurrentSongTitle] = useState<string>('');
  const [currentSongEmbedUrl, setCurrentSongEmbedUrl] = useState<string>('');
  const [showVideoEmbed, setShowVideoEmbed] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  // Para o player de música se o usuário fechar o leitor do estudo
  useEffect(() => {
    if (!readingDevotional) {
      setIsPlayingMusic(false);
      setCurrentSongTitle('');
      setCurrentSongEmbedUrl('');
      setShowVideoEmbed(false);
    }
  }, [readingDevotional]);

  const getTodayDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper para mapear ou buscar o embed URL do YouTube para os louvores
  const getWorshipEmbedUrl = (songTitle?: string, songYoutubeId?: string): string => {
    if (songYoutubeId && songYoutubeId.trim().length > 3) {
      return `https://www.youtube-nocookie.com/embed/${songYoutubeId.trim()}?autoplay=1&enablejsapi=1&rel=0`;
    }
    if (!songTitle) return '';

    // Mapeamento direto de louvores conhecidos
    const knownMap: Record<string, string> = {
      'bondade de deus': 'X87z5W3qR3c',
      'lugar secreto': '7_QeC4kK7e8',
      'a casa é sua': 'w8jT8k_iZJ4',
      'todas as coisas': 'P9H2B7b4k3c',
      'todavia me alegrarei': 'sWqf0r4v3z4',
      'escudo': 'Ea9Wd2Xm8b0',
      'águia': 's8d6G4m1p2k',
      'fidelidade': 'u2M7N9v4x1a',
      'a paz que eu preciso': 'k9L8M7n6p5q',
      'grandes coisas': 'm8K7J6h5g4f',
      'deus dos deuses': 'p3Q4R5s6t7u',
      'que amor é esse': 'v1W2X3y4z5a',
      'vem me buscar': 'b9C8D7e6f5g',
      'a palavra': 'h4J5K6l7m8n',
      'em fervente oração': 'q1W2E3r4t5y',
      'cicatrizes': 'u8I9O0p1a2s',
      'armadura de deus': 'd3F4G5h6j7k',
      'oferta agradável a ti': 'l9K8J7h6g5f',
      'porque ele vive': 'z1X2C3v4b5n',
      'renova-me': 'm9N8B7v6c5x',
      'consolador': 'a1S2D3f4g5h',
      'em espírito, em verdade': 'j6K7L8m9n0p',
      'humildade': 'q9W8E7r6t5y',
      'a colheita': 'u1I2O3p4a5s',
      'mais que vencedor': 'd9F8G7h6j5k',
      'luz do mundo': 'l1K2J3h4g5f',
      'a bênção': 'z9X8C7v6b5n'
    };

    const titleLower = songTitle.toLowerCase();
    for (const [key, id] of Object.entries(knownMap)) {
      if (titleLower.includes(key)) {
        return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1&rel=0`;
      }
    }

    // Busca embed universal por palavra-chave
    return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(songTitle + ' louvor adoração')}&autoplay=1&enablejsapi=1`;
  };

  const handlePlayMusic = (songTitle?: string, songYoutubeId?: string) => {
    if (!songTitle) return;

    if (isPlayingMusic && currentSongTitle === songTitle) {
      // Se já está tocando o mesmo, pausa
      setIsPlayingMusic(false);
    } else {
      // Inicia novo louvor
      const embedUrl = getWorshipEmbedUrl(songTitle, songYoutubeId);
      setCurrentSongEmbedUrl(embedUrl);
      setCurrentSongTitle(songTitle);
      setIsPlayingMusic(true);
    }
  };

  const parseItem = (item: any, todayStr: string): DevotionalItem => {
    const rawDate = (item.available_date || item.scheduled_date || item.date || '').split('T')[0];
    let formattedDate = 'Mensagem';
    let dateBadge = 'Estudo';
    let isToday = false;
    let isTomorrow = false;

    if (rawDate) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        formattedDate = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      }
      isToday = rawDate === todayStr;

      const tParts = todayStr.split('-');
      if (tParts.length === 3) {
        const todayObj = new Date(Number(tParts[0]), Number(tParts[1]) - 1, Number(tParts[2]));
        const tomorrowObj = new Date(todayObj);
        tomorrowObj.setDate(tomorrowObj.getDate() + 1);
        const tomorrowStr = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;
        isTomorrow = rawDate === tomorrowStr;
      }

      dateBadge = isToday ? 'Hoje' : (isTomorrow ? 'Amanhã' : formattedDate);
    }

    return {
      id: item.id || `dev_${rawDate}`,
      raw_date: rawDate,
      formatted_date: formattedDate,
      date_badge: dateBadge,
      is_today: isToday,
      is_tomorrow: isTomorrow,
      title: item.title || 'Palavra de Fé',
      passage: item.source_name || item.verse_reference || item.passage || '',
      verse_text: item.central_text || item.verse_text || '',
      content: item.context_text || item.content || '',
      author: item.pastoral_author_name || item.author_name || item.author || 'Pr. Rafael Sena',
      author_role: item.pastoral_author_role || 'Pastor Titular',
      prayer_indication: item.prayer_indication || '',
      suggested_song_title: item.suggested_song_title || '',
      suggested_song_youtube_id: item.suggested_song_youtube_id || '',
      pastoral_comment: item.pastoral_comment || '',
      created_at: item.created_at
    };
  };

  const loadData = async () => {
    try {
      const todayStr = getTodayDateString();
      const [todayRes, listRes] = await Promise.all([
        fetchTodayDevotional(),
        fetchDevotionals()
      ]);

      const itemsMap = new Map<string, DevotionalItem>();

      if (todayRes && todayRes.title) {
        const parsedToday = parseItem(todayRes, todayStr);
        itemsMap.set(parsedToday.id, parsedToday);
      }

      if (Array.isArray(listRes) && listRes.length > 0) {
        listRes.forEach((item: any) => {
          const parsed = parseItem(item, todayStr);
          if (!itemsMap.has(parsed.id)) {
            itemsMap.set(parsed.id, parsed);
          }
        });
      }

      const list = Array.from(itemsMap.values()).sort((a, b) => {
        return (a.raw_date || '').localeCompare(b.raw_date || '');
      });

      if (list.length > 0) {
        setAllDevotionals(list);
        localStorage.setItem('faithhub_cached_devotionals_v3', JSON.stringify(list));
      }
    } catch (e) {
      console.error('Erro ao carregar devocionais:', e);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = getTodayDateString();

  // 1. Devocional de Hoje (Fixo no topo da tela)
  const todayDevotional = useMemo(() => {
    const exactToday = allDevotionals.find(d => d.raw_date === todayStr);
    if (exactToday) return exactToday;

    const pastOrToday = allDevotionals.filter(d => (d.raw_date || '') <= todayStr);
    if (pastOrToday.length > 0) {
      return pastOrToday[pastOrToday.length - 1];
    }

    return allDevotionals[0] || null;
  }, [allDevotionals, todayStr]);

  // 2. Próximas Mensagens (Limitado estritamente aos próximos 7 dias à frente / semana seguinte)
  const upcomingDevotionals = useMemo(() => {
    if (!todayDevotional) return [];
    const thresholdDate = todayDevotional.raw_date || todayStr;
    return allDevotionals
      .filter(d => (d.raw_date || '') > thresholdDate && d.id !== todayDevotional.id)
      .sort((a, b) => (a.raw_date || '').localeCompare(b.raw_date || ''))
      .slice(0, 7); // Apenas os próximos 7 dias!
  }, [allDevotionals, todayDevotional, todayStr]);

  // 3. Dias Anteriores (Datas passadas < todayStr)
  const pastDevotionals = useMemo(() => {
    if (!todayDevotional) return [];
    const thresholdDate = todayDevotional.raw_date || todayStr;
    return allDevotionals
      .filter(d => (d.raw_date || '') < thresholdDate && d.id !== todayDevotional.id)
      .sort((a, b) => (b.raw_date || '').localeCompare(a.raw_date || ''));
  }, [allDevotionals, todayDevotional, todayStr]);

  // Filtro de Dias Anteriores no Modal
  const filteredPastDevotionals = useMemo(() => {
    if (!pastSearchTerm.trim()) return pastDevotionals;
    const term = pastSearchTerm.toLowerCase();
    return pastDevotionals.filter(d => 
      d.title.toLowerCase().includes(term) ||
      (d.passage && d.passage.toLowerCase().includes(term)) ||
      (d.formatted_date && d.formatted_date.toLowerCase().includes(term))
    );
  }, [pastDevotionals, pastSearchTerm]);

  // Toggle de Reação / Curtida Persistida
  const toggleLike = (id: string) => {
    setLikedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      localStorage.setItem('faithhub_liked_devotionals_v1', JSON.stringify(next));
      return next;
    });
  };

  // Toggle de Estudo Concluído Persistido
  const toggleCompleted = (id: string) => {
    setCompletedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      localStorage.setItem('faithhub_completed_devotionals_v1', JSON.stringify(next));
      return next;
    });
  };

  const handleShare = async (devotional: DevotionalItem) => {
    const text = `📖 *${devotional.title}*\n"${devotional.verse_text}" (${devotional.passage})\n\nLeia o estudo completo no App da Igreja Viva!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: devotional.title,
          text: text,
          url: window.location.href
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(text);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2500);
    }
  };

  return (
    <div className="pwa-content animate-fade-in" style={{ minHeight: '80vh', paddingBottom: '40px' }}>
      
      {/* Injeção de Estilo CSS para Animação do Equalizador */}
      <style>{`
        @keyframes eqBounce {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .eq-bar {
          width: 3px;
          border-radius: 2px;
          display: inline-block;
          animation: eqBounce 0.8s ease-in-out infinite;
        }
        .eq-bar:nth-child(2) { animation-delay: 0.2s; }
        .eq-bar:nth-child(3) { animation-delay: 0.4s; }
        .eq-bar:nth-child(4) { animation-delay: 0.1s; }
      `}</style>

      {/* Header Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.30rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            Palavra & Ensino
          </h2>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '3px', margin: 0 }}>
            Estudos bíblicos e devocionais diários
          </p>
        </div>

        {/* Botão Dias Anteriores no Canto Superior Direito */}
        <button
          type="button"
          onClick={() => setShowPastModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid var(--panel-border)',
            borderRadius: '24px',
            padding: '8px 14px',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontSize: '0.90rem' }}>🕒</span>
          <span>Dias Anteriores</span>
          {pastDevotionals.length > 0 && (
            <span style={{
              background: 'var(--accent-primary-light)',
              color: 'var(--accent-primary)',
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '2px 6px',
              borderRadius: '10px'
            }}>
              {pastDevotionals.length}
            </span>
          )}
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && allDevotionals.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ height: '16px', background: '#f1f5f9', borderRadius: '6px', width: '35%', marginBottom: '14px' }} />
            <div style={{ height: '26px', background: '#f1f5f9', borderRadius: '8px', width: '80%', marginBottom: '16px' }} />
            <div style={{ height: '80px', background: '#f8fafc', borderRadius: '14px', marginBottom: '16px' }} />
            <div style={{ height: '48px', background: '#f1f5f9', borderRadius: '12px', width: '100%' }} />
          </div>
        </div>
      ) : (
        <>
          {/* ======================================================= */}
          {/* 1. CARD DE HOJE (SEMPRE FIXO NO TOPO DA TELA)          */}
          {/* ======================================================= */}
          {todayDevotional && (
            <section style={{ marginBottom: '28px' }}>
              <div 
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
                  borderRadius: '24px',
                  padding: 'clamp(18px, 4vw, 26px)',
                  border: completedIds.includes(todayDevotional.id)
                    ? '2px solid #10b981'
                    : '1.5px solid rgba(15, 118, 110, 0.20)',
                  boxShadow: '0 10px 28px rgba(15, 118, 110, 0.08)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Badge de Hoje, Passagem e Status de Concluído */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'var(--accent-primary-gradient)',
                      color: '#ffffff',
                      fontSize: '0.70rem',
                      fontWeight: 900,
                      padding: '4px 10px',
                      borderRadius: '16px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(15, 118, 110, 0.25)'
                    }}>
                      <span>☀️</span> Mensagem de Hoje • {todayDevotional.formatted_date}
                    </span>

                    {completedIds.includes(todayDevotional.id) && (
                      <span style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <span>✅</span> Concluído
                      </span>
                    )}
                  </div>

                  {todayDevotional.passage && (
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: 'var(--accent-primary)',
                      background: 'rgba(15, 118, 110, 0.08)',
                      padding: '4px 10px',
                      borderRadius: '12px'
                    }}>
                      📖 {todayDevotional.passage}
                    </span>
                  )}
                </div>

                {/* Título Principal */}
                <h1 style={{
                  fontSize: 'clamp(1.20rem, 3.5vw, 1.45rem)',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  lineHeight: 1.25,
                  letterSpacing: '-0.02em',
                  margin: '0 0 14px 0'
                }}>
                  {todayDevotional.title}
                </h1>

                {/* Versículo Bíblico em Destaque */}
                {todayDevotional.verse_text && (
                  <div style={{
                    background: '#ffffff',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    borderLeft: '4px solid var(--accent-primary)',
                    marginBottom: '16px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <p style={{
                      fontSize: '0.88rem',
                      fontStyle: 'italic',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                      margin: 0
                    }}>
                      "{todayDevotional.verse_text}"
                    </p>
                  </div>
                )}

                {/* Trecho / Prévia do Conteúdo */}
                <p style={{
                  fontSize: '0.86rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.55,
                  margin: '0 0 18px 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {todayDevotional.content}
                </p>

                {/* Tags de Louvor e Reação */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
                  {todayDevotional.suggested_song_title ? (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)',
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: '1px solid #e2e8f0',
                      padding: '6px 12px',
                      borderRadius: '20px'
                    }}>
                      <span>🎵</span>
                      <span style={{ fontWeight: 600 }}>Louvor:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{todayDevotional.suggested_song_title}</strong>
                    </div>
                  ) : <div />}

                  {likedIds.includes(todayDevotional.id) && (
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ef4444' }}>
                      ❤️ Abençoado por você
                    </span>
                  )}
                </div>

                {/* Botão de Ação: Abrir Estudo Completo da Palavra */}
                <button
                  type="button"
                  onClick={() => setReadingDevotional(todayDevotional)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: completedIds.includes(todayDevotional.id)
                      ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                      : 'var(--accent-primary-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '16px',
                    fontWeight: 900,
                    fontSize: '0.90rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 18px rgba(15, 118, 110, 0.28)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <span>📖</span>
                  <span>{completedIds.includes(todayDevotional.id) ? 'Rever Estudo da Palavra' : 'Abrir Estudo Completo da Palavra'}</span>
                </button>
              </div>
            </section>
          )}

          {/* ======================================================= */}
          {/* 2. SEÇÃO PRÓXIMAS MENSAGENS (SEMANA SEGUINTE - 7 DIAS)  */}
          {/* ======================================================= */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
                  Próximas Mensagens
                </h3>
                <span style={{
                  background: '#f1f5f9',
                  color: 'var(--text-secondary)',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  Próximos 7 dias
                </span>
              </div>
            </div>

            {upcomingDevotionals.length === 0 ? (
              <div style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '24px 16px',
                textAlign: 'center',
                border: '1px solid var(--panel-border)'
              }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Nenhuma mensagem agendada para os próximos 7 dias.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {upcomingDevotionals.map((dev) => {
                  const isDone = completedIds.includes(dev.id);
                  return (
                    <div
                      key={dev.id}
                      onClick={() => setReadingDevotional(dev)}
                      style={{
                        background: '#ffffff',
                        borderRadius: '18px',
                        padding: '14px 18px',
                        border: isDone ? '1.5px solid #10b981' : '1px solid var(--panel-border)',
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Badge da Data e Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            color: dev.is_tomorrow ? 'var(--accent-primary)' : 'var(--text-muted)',
                            background: dev.is_tomorrow ? 'var(--accent-primary-light)' : '#f8fafc',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            textTransform: 'uppercase'
                          }}>
                            📅 {dev.date_badge}
                          </span>

                          {isDone && (
                            <span style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              padding: '2px 6px',
                              borderRadius: '8px'
                            }}>
                              ✅ Concluído
                            </span>
                          )}

                          {dev.passage && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              • {dev.passage}
                            </span>
                          )}
                        </div>

                        {/* Título */}
                        <div style={{
                          fontSize: '0.90rem',
                          fontWeight: 800,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {dev.title}
                        </div>
                      </div>

                      {/* Botão Ler Estudo */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: isDone ? '#059669' : 'var(--accent-primary)',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        <span>{isDone ? 'Concluído' : 'Ler Estudo'}</span>
                        <span style={{ fontSize: '1rem', lineHeight: 1 }}>›</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* ======================================================= */}
      {/* 3. MODAL / TELA DE ESTUDO COMPLETO DA PALAVRA          */}
      {/* ======================================================= */}
      {readingDevotional && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Top Bar Ergonômica do Leitor */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--panel-border)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={() => setReadingDevotional(null)}
              style={{
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '12px',
                padding: '0 14px',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>‹</span>
              <span>Voltar</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 900,
                color: 'var(--accent-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap'
              }}>
                ☀️ {readingDevotional.formatted_date}
              </span>
              {completedIds.includes(readingDevotional.id) && (
                <span style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.66rem',
                  fontWeight: 900,
                  padding: '3px 7px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap'
                }}>
                  ✅ Lido
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleShare(readingDevotional)}
              style={{
                height: '38px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '12px',
                padding: '0 12px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0
              }}
            >
              <span>🔗</span>
              <span>{shareFeedback ? 'Copiado!' : 'Compartilhar'}</span>
            </button>
          </div>

          {/* Conteúdo do Estudo */}
          <div style={{
            maxWidth: '680px',
            width: '100%',
            margin: '0 auto',
            padding: '24px 20px 90px 20px'
          }}>
            {/* Passagem Bíblica */}
            {readingDevotional.passage && (
              <div style={{
                display: 'inline-block',
                background: 'var(--accent-primary-light)',
                color: 'var(--accent-primary)',
                fontWeight: 800,
                fontSize: '0.78rem',
                padding: '4px 12px',
                borderRadius: '16px',
                marginBottom: '10px'
              }}>
                📖 {readingDevotional.passage}
              </div>
            )}

            {/* Título */}
            <h1 style={{
              fontSize: 'clamp(1.40rem, 4vw, 1.85rem)',
              fontWeight: 900,
              color: 'var(--text-main)',
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
              marginBottom: '20px'
            }}>
              {readingDevotional.title}
            </h1>

            {/* ======================================================= */}
            {/* CARD DE LOUVOR SUGERIDO COM PLAYER ERGONÔMICO           */}
            {/* ======================================================= */}
            {readingDevotional.suggested_song_title && (
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
                padding: '18px 20px',
                borderRadius: '22px',
                border: '1.5px solid rgba(15, 118, 110, 0.22)',
                marginBottom: '26px',
                boxShadow: '0 6px 20px rgba(15, 118, 110, 0.07)',
                position: 'relative'
              }}>
                {/* Header do Card com Ícone, Título e Equalizador */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      background: 'var(--accent-primary-gradient)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(15, 118, 110, 0.28)'
                    }}>
                      🎵
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.68rem',
                        color: 'var(--accent-primary)',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Louvor para Meditação
                      </div>
                      <div style={{
                        fontSize: '0.94rem',
                        fontWeight: 900,
                        color: 'var(--text-main)',
                        lineHeight: 1.3,
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {readingDevotional.suggested_song_title}
                      </div>
                    </div>
                  </div>

                  {/* Badge Ativa com Equalizador Animado */}
                  {isPlayingMusic && currentSongTitle === readingDevotional.suggested_song_title && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(15, 118, 110, 0.12)',
                      border: '1px solid rgba(15, 118, 110, 0.25)',
                      padding: '4px 10px',
                      borderRadius: '14px',
                      flexShrink: 0
                    }}>
                      <span className="eq-bar" style={{ height: '12px', background: 'var(--accent-primary)' }} />
                      <span className="eq-bar" style={{ height: '8px', background: 'var(--accent-primary)' }} />
                      <span className="eq-bar" style={{ height: '14px', background: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 900, marginLeft: '2px' }}>
                        Tocando
                      </span>
                    </div>
                  )}
                </div>

                {/* Grupo de Botões Ergonômicos (Grid Estruturado) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* Botão Principal de Ação (100% Largura - Touch Target Confortável) */}
                  <button
                    type="button"
                    onClick={() => handlePlayMusic(readingDevotional.suggested_song_title, readingDevotional.suggested_song_youtube_id)}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 20px',
                      background: isPlayingMusic && currentSongTitle === readingDevotional.suggested_song_title
                        ? '#fee2e2'
                        : 'var(--accent-primary-gradient)',
                      color: isPlayingMusic && currentSongTitle === readingDevotional.suggested_song_title
                        ? '#dc2626'
                        : '#ffffff',
                      border: isPlayingMusic && currentSongTitle === readingDevotional.suggested_song_title
                        ? '1.5px solid #fca5a5'
                        : 'none',
                      borderRadius: '14px',
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: isPlayingMusic && currentSongTitle === readingDevotional.suggested_song_title
                        ? 'none'
                        : '0 4px 14px rgba(15, 118, 110, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>
                      {isPlayingMusic && currentSongTitle === readingDevotional.suggested_song_title ? '⏸' : '▶'}
                    </span>
                    <span>
                      {isPlayingMusic && currentSongTitle === readingDevotional.suggested_song_title ? 'Pausar Música de Fundo' : 'Tocar Louvor Enquanto Lê'}
                    </span>
                  </button>

                  {/* Linha de Ações Secundárias (2 Colunas 50%/50% Balanceadas) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowVideoEmbed(!showVideoEmbed)}
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        background: showVideoEmbed ? '#f1f5f9' : '#ffffff',
                        color: 'var(--text-main)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{showVideoEmbed ? '🙈' : '🎬'}</span>
                      <span>{showVideoEmbed ? 'Ocultar Vídeo' : 'Ver Clipe'}</span>
                    </button>

                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(readingDevotional.suggested_song_title + ' louvor')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        background: '#ffffff',
                        color: 'var(--text-main)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>↗</span>
                      <span>Abrir no YouTube</span>
                    </a>
                  </div>
                </div>

                {/* Player de Vídeo Expansível com Aspect Ratio Perfeito */}
                {isPlayingMusic && currentSongEmbedUrl && showVideoEmbed && (
                  <div style={{
                    marginTop: '14px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
                    background: '#000000',
                    aspectRatio: '16 / 9',
                    width: '100%'
                  }}>
                    <iframe
                      width="100%"
                      height="100%"
                      src={currentSongEmbedUrl}
                      title="Player de Louvor e Adoração"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
                    />
                  </div>
                )}

                {/* Iframe em segundo plano quando o vídeo está oculto */}
                {isPlayingMusic && currentSongEmbedUrl && !showVideoEmbed && (
                  <iframe
                    width="1"
                    height="1"
                    src={currentSongEmbedUrl}
                    title="Audio Player Background"
                    allow="autoplay"
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
                  />
                )}
              </div>
            )}

            {/* Versículo Central */}
            {readingDevotional.verse_text && (
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdfa 100%)',
                padding: '18px 20px',
                borderRadius: '18px',
                borderLeft: '5px solid var(--accent-primary)',
                marginBottom: '24px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <p style={{
                  fontSize: '0.96rem',
                  fontStyle: 'italic',
                  color: 'var(--text-main)',
                  lineHeight: 1.5,
                  margin: 0
                }}>
                  "{readingDevotional.verse_text}"
                </p>
                {readingDevotional.passage && (
                  <span style={{
                    display: 'block',
                    textAlign: 'right',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    color: 'var(--accent-primary)',
                    marginTop: '8px'
                  }}>
                    — {readingDevotional.passage}
                  </span>
                )}
              </div>
            )}

            {/* Texto Completo de Estudo da Palavra */}
            <div style={{
              fontSize: '0.98rem',
              color: 'var(--text-main)',
              lineHeight: 1.8,
              marginBottom: '24px',
              whiteSpace: 'pre-line'
            }}>
              {readingDevotional.content}
            </div>

            {/* Botão de Marcar / Concluir Leitura do Estudo */}
            <button
              type="button"
              onClick={() => toggleCompleted(readingDevotional.id)}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '16px',
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '26px',
                background: completedIds.includes(readingDevotional.id) ? '#ecfdf5' : 'var(--accent-primary-gradient)',
                color: completedIds.includes(readingDevotional.id) ? '#059669' : '#ffffff',
                border: completedIds.includes(readingDevotional.id) ? '2px solid #a7f3d0' : 'none',
                boxShadow: completedIds.includes(readingDevotional.id) ? 'none' : '0 4px 16px rgba(15, 118, 110, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{completedIds.includes(readingDevotional.id) ? '✅ Estudo Concluído (Toque para desmarcar)' : '✓ Marcar Estudo como Concluído'}</span>
            </button>

            {/* Oração Guiada do Dia */}
            {readingDevotional.prayer_indication && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.06) 0%, rgba(20, 184, 166, 0.10) 100%)',
                padding: '18px 20px',
                borderRadius: '18px',
                border: '1.5px solid rgba(15, 118, 110, 0.20)',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  color: 'var(--accent-primary)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <span>🙏</span> Oração do Dia
                </div>
                <p style={{
                  fontSize: '0.90rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: 0,
                  fontStyle: 'italic'
                }}>
                  "{readingDevotional.prayer_indication}"
                </p>
              </div>
            )}

            {/* Comentário Pastoral Profético */}
            {readingDevotional.pastoral_comment && (
              <div style={{
                background: '#fffbeb',
                padding: '16px 18px',
                borderRadius: '16px',
                border: '1px solid #fde68a',
                marginBottom: '28px'
              }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#b45309', marginBottom: '4px' }}>
                  💬 Palavra Pastoral
                </div>
                <p style={{ fontSize: '0.86rem', color: '#78350f', margin: 0, lineHeight: 1.5 }}>
                  "{readingDevotional.pastoral_comment}"
                </p>
              </div>
            )}

            {/* Rodapé do Estudo: Autor & Botão de Edificante (Persistido) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--panel-border)',
              paddingTop: '18px',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary-gradient)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.85rem'
                }}>
                  ✍️
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {readingDevotional.author || 'Pr. Rafael Sena'}
                  </div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                    {readingDevotional.author_role || 'Pastor Titular'}
                  </div>
                </div>
              </div>

              {/* Botão de Reação Persistido */}
              <button
                type="button"
                onClick={() => toggleLike(readingDevotional.id)}
                style={{
                  background: likedIds.includes(readingDevotional.id) ? '#fee2e2' : '#f1f5f9',
                  color: likedIds.includes(readingDevotional.id) ? '#ef4444' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{likedIds.includes(readingDevotional.id) ? '❤️' : '🤍'}</span>
                <span>{likedIds.includes(readingDevotional.id) ? 'Abençoado!' : 'Foi edificante'}</span>
              </button>
            </div>
          </div>

          {/* ======================================================= */}
          {/* BARRA FLUTUANTE DE MEDITAÇÃO MUSICAL (STICKY FOOTER)    */}
          {/* ======================================================= */}
          {isPlayingMusic && (
            <div style={{
              position: 'fixed',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 32px)',
              maxWidth: '540px',
              zIndex: 10000,
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              animation: 'slideUp 0.3s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {/* Equalizador Animado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <span className="eq-bar" style={{ height: '14px', background: '#ffffff' }} />
                  <span className="eq-bar" style={{ height: '8px', background: '#ffffff' }} />
                  <span className="eq-bar" style={{ height: '18px', background: '#ffffff' }} />
                  <span className="eq-bar" style={{ height: '10px', background: '#ffffff' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentSongTitle}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                    Tocando em segundo plano • Meditação
                  </div>
                </div>
              </div>

              {/* Controles de Play/Pause e Fechar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setIsPlayingMusic(!isPlayingMusic)}
                  style={{
                    background: 'var(--accent-primary-gradient)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '6px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>{isPlayingMusic ? '⏸ Pausar' : '▶ Retomar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlayingMusic(false);
                    setCurrentSongTitle('');
                    setCurrentSongEmbedUrl('');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                  title="Parar música"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* 4. MODAL / GAVETA DE DIAS ANTERIORES                    */}
      {/* ======================================================= */}
      {showPastModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={() => setShowPastModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '85vh',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideUp 0.25s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div style={{ padding: '20px 20px 14px 20px', borderBottom: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🕒</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                    Dias Anteriores
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPastModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Campo de Busca Rápida */}
              <input
                type="text"
                value={pastSearchTerm}
                onChange={e => setPastSearchTerm(e.target.value)}
                placeholder="Buscar por título, data ou versículo..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--panel-border)',
                  background: '#f8fafc',
                  fontSize: '0.84rem',
                  color: 'var(--text-main)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Lista dos Dias Anteriores */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredPastDevotionals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>📜</div>
                  <p style={{ fontSize: '0.84rem', margin: 0 }}>
                    {pastSearchTerm ? 'Nenhum devocional anterior encontrado com esses termos.' : 'Ainda não há mensagens de dias anteriores registradas.'}
                  </p>
                </div>
              ) : (
                filteredPastDevotionals.map(dev => {
                  const isDone = completedIds.includes(dev.id);
                  return (
                    <div
                      key={dev.id}
                      onClick={() => {
                        setShowPastModal(false);
                        setReadingDevotional(dev);
                      }}
                      style={{
                        background: '#ffffff',
                        border: isDone ? '1.5px solid #10b981' : '1px solid var(--panel-border)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            📅 {dev.formatted_date}
                          </span>
                          {isDone && (
                            <span style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              fontSize: '0.64rem',
                              fontWeight: 900,
                              padding: '2px 5px',
                              borderRadius: '6px'
                            }}>
                              ✅ Concluído
                            </span>
                          )}
                          {dev.passage && (
                            <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                              • {dev.passage}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {dev.title}
                        </div>
                      </div>

                      <span style={{ color: isDone ? '#059669' : 'var(--accent-primary)', fontSize: '1.2rem', fontWeight: 800 }}>
                        ›
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
