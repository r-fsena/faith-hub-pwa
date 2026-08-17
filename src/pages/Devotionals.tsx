import React, { useState, useEffect } from 'react';
import { fetchDevotionals, fetchTodayDevotional } from '../services/api';

interface DevotionalItem {
  id: string;
  day_number?: number;
  title: string;
  date?: string;
  passage?: string;
  verse_text?: string;
  content: string;
  author?: string;
  verse_reference?: string;
  created_at?: string;
}

export const Devotionals: React.FC = () => {
  const [devotionals, setDevotionals] = useState<DevotionalItem[]>(() => {
    try {
      const saved = localStorage.getItem('faithhub_cached_devotionals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedDevotional, setSelectedDevotional] = useState<DevotionalItem | null>(() => {
    try {
      const saved = localStorage.getItem('faithhub_cached_devotionals');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed[0] || null;
    } catch {
      return null;
    }
  });
  const [liked, setLiked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('faithhub_cached_devotionals');
      return !saved || JSON.parse(saved).length === 0;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const today = await fetchTodayDevotional();
      const list = await fetchDevotionals();
      
      const allDevs: DevotionalItem[] = [];
      if (today && today.title) {
        allDevs.push({
          id: today.id || 'today',
          title: today.title,
          content: today.content || '',
          verse_text: today.verse_text || '',
          passage: today.verse_reference || '',
          author: today.author_name || 'Pastoral',
          date: 'Hoje'
        });
      }

      if (Array.isArray(list) && list.length > 0) {
        list.forEach((item: any) => {
          if (!allDevs.some(d => d.id === item.id)) {
            allDevs.push({
              id: item.id,
              title: item.title,
              content: item.content || '',
              verse_text: item.verse_text || '',
              passage: item.verse_reference || '',
              author: item.author_name || 'Pastoral',
              date: item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : 'Mensagem'
            });
          }
        });
      }

      if (allDevs.length > 0) {
        setDevotionals(allDevs);
        localStorage.setItem('faithhub_cached_devotionals', JSON.stringify(allDevs));
        setSelectedDevotional(prev => prev ? (allDevs.find(d => d.id === prev.id) || allDevs[0]) : allDevs[0]);
      }
    } catch (e) {
      console.log('Erro carregando devocionais', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pwa-content animate-fade-in" style={{ minHeight: '80vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Palavra & Ensino</h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Mensagens para edificar sua caminhada diária</p>
        </div>
      </div>

      {loading && devotionals.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '65vh' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', width: '30%', marginBottom: '14px' }} />
            <div style={{ height: '24px', background: '#f1f5f9', borderRadius: '8px', width: '85%', marginBottom: '16px' }} />
            <div style={{ height: '70px', background: '#f8fafc', borderRadius: '12px', marginBottom: '16px' }} />
            <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', width: '100%', marginBottom: '8px' }} />
            <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', width: '90%', marginBottom: '8px' }} />
            <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', width: '75%' }} />
          </div>
        </div>
      ) : devotionals.length === 0 ? (
        /* Empty State */
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>📖</div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            Nenhum devocional publicado hoje
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
            As mensagens diárias e estudos bíblicos cadastrados no Portal Web aparecerão aqui automaticamente.
          </p>
        </div>
      ) : selectedDevotional ? (
        /* Modo Leitura */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ☀️ {selectedDevotional.date || 'Hoje'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {selectedDevotional.passage}
              </span>
            </div>

            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '12px' }}>
              {selectedDevotional.title}
            </h1>

            {selectedDevotional.verse_text && (
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', borderLeft: '4px solid var(--accent-primary)', marginBottom: '16px' }}>
                <p style={{ fontSize: '0.86rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                  "{selectedDevotional.verse_text}"
                </p>
                {selectedDevotional.passage && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '4px', display: 'block' }}>
                    {selectedDevotional.passage}
                  </span>
                )}
              </div>
            )}

            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px', whiteSpace: 'pre-line' }}>
              {selectedDevotional.content}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--panel-border)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                  ✍️
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedDevotional.author || 'Pastoral'}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Autor</div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setLiked(!liked)}
                style={{ background: liked ? '#fee2e2' : '#f1f5f9', color: liked ? '#ef4444' : 'var(--text-secondary)', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {liked ? '❤️ Abençoado!' : '🤍 Foi edificante'}
              </button>
            </div>
          </div>

          {/* Histórico / Outras Edições */}
          {devotionals.length > 1 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
                Outras Mensagens
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {devotionals.filter(d => d.id !== selectedDevotional.id).map(dev => (
                  <div 
                    key={dev.id}
                    onClick={() => setSelectedDevotional(dev)}
                    style={{ 
                      background: '#ffffff', 
                      border: '1px solid var(--panel-border)',
                      borderRadius: '14px', 
                      padding: '12px 14px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{dev.date}</div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>{dev.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dev.passage}</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

    </div>
  );
};
