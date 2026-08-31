import React, { useState, useEffect } from 'react';
import { fetchPrayers, createPrayerRequest, prayForRequest, submitPrayerTestimony } from '../services/api';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';

interface PrayerRequest {
  id: string;
  user_id?: string;
  author: string;
  author_name?: string;
  author_phone?: string | null;
  is_anonymous?: boolean;
  category: 'Família' | 'Saúde' | 'Finanças' | 'Espiritual' | 'Gratidão' | 'Outros';
  privacy: 'PUBLIC' | 'CONFIDENTIAL';
  content: string;
  praying_count: number;
  time_ago: string;
  is_praying?: boolean;
  pastoral_response?: string | null;
  pastoral_responded_by?: string | null;
  pastoral_responded_at?: string | null;
  testimony_text?: string | null;
  testimony_at?: string | null;
  organization_id?: string;
  campus_id?: string;
  created_at?: string;
}

export const Prayers: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { branding, selectedCampus } = useBranding();
  const { user } = useAuth();

  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'wall' | 'my_prayers' | 'testimonies'>('wall');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  // Modal Novo Pedido
  const [showModal, setShowModal] = useState(false);
  const [authorName, setAuthorName] = useState(user?.name || '');
  const [authorPhone, setAuthorPhone] = useState(user?.phone || '');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState<PrayerRequest['category']>('Família');
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'CONFIDENTIAL'>('PUBLIC');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal Testemunho
  const [showTestimonyModal, setShowTestimonyModal] = useState(false);
  const [selectedPrayerForTestimony, setSelectedPrayerForTestimony] = useState<PrayerRequest | null>(null);
  const [testimonyText, setTestimonyText] = useState('');
  const [submittingTestimony, setSubmittingTestimony] = useState(false);

  const orgId = branding.organization_id || 'org_default';
  const campusId = selectedCampus?.id || branding.campus_id;

  useEffect(() => {
    loadPrayers();
  }, [selectedCategory, orgId, campusId, activeTab]);

  const loadPrayers = async () => {
    setLoading(true);
    // 1. Carrega do cache
    const cacheKey = `faithhub_prayers_${orgId}_${campusId || 'all'}`;
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      try {
        setPrayers(JSON.parse(saved));
      } catch (e) {}
    }

    // 2. Busca do backend com segregação por tenant e unidade
    try {
      const data = await fetchPrayers(selectedCategory, user?.userId, orgId, campusId);
      if (Array.isArray(data)) {
        setPrayers(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (e) {
      console.log("Offline fallback para orações", e);
    } finally {
      setLoading(false);
    }
  };

  const savePrayers = (updated: PrayerRequest[]) => {
    setPrayers(updated);
    const cacheKey = `faithhub_prayers_${orgId}_${campusId || 'all'}`;
    localStorage.setItem(cacheKey, JSON.stringify(updated));
  };

  const handleTogglePraying = async (id: string) => {
    // Atualização otimista
    const updated = prayers.map(p => {
      if (p.id === id) {
        const isNowPraying = !p.is_praying;
        return {
          ...p,
          is_praying: isNowPraying,
          praying_count: isNowPraying ? p.praying_count + 1 : Math.max(0, p.praying_count - 1)
        };
      }
      return p;
    });
    savePrayers(updated);

    // Envia ao backend com user_id
    try {
      await prayForRequest(id, user?.userId);
    } catch (e) {
      console.log("Erro ao registrar oração em nuvem", e);
    }
  };

  const handleSubmitPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    const authorDisplayName = isAnonymous ? 'Membro Anônimo' : (authorName.trim() || user?.name || 'Membro da Igreja');

    try {
      const res = await createPrayerRequest({
        author_name: authorDisplayName,
        author_phone: authorPhone.trim() || undefined,
        is_anonymous: isAnonymous,
        category,
        privacy,
        content: content.trim(),
        user_id: user?.userId,
        organization_id: orgId,
        campus_id: campusId || undefined
      });

      const newPrayer: PrayerRequest = res?.prayer || {
        id: `pr_${Date.now()}`,
        user_id: user?.userId,
        author: authorDisplayName,
        author_name: authorDisplayName,
        author_phone: authorPhone.trim() || undefined,
        is_anonymous: isAnonymous,
        category,
        privacy,
        content: content.trim(),
        praying_count: 1,
        time_ago: 'Agora mesmo',
        is_praying: true,
        created_at: new Date().toISOString()
      };

      if (privacy === 'CONFIDENTIAL') {
        alert("🔒 Seu pedido confidencial foi enviado com sigilo diretamente ao Corpo Pastoral da igreja.");
      } else {
        savePrayers([newPrayer, ...prayers]);
        alert("✨ Seu pedido de oração foi publicado no mural da comunidade!");
      }

      setShowModal(false);
      setContent('');
      if (!user?.name) setAuthorName('');
    } catch (err) {
      console.error("Erro salvando oração", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenTestimonyModal = (prayer: PrayerRequest) => {
    setSelectedPrayerForTestimony(prayer);
    setTestimonyText(prayer.testimony_text || '');
    setShowTestimonyModal(true);
  };

  const handleSubmitTestimony = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrayerForTestimony || !testimonyText.trim() || submittingTestimony) return;

    setSubmittingTestimony(true);
    try {
      await submitPrayerTestimony(selectedPrayerForTestimony.id, testimonyText.trim());
      
      const updated = prayers.map(p => {
        if (p.id === selectedPrayerForTestimony.id) {
          return {
            ...p,
            testimony_text: testimonyText.trim(),
            testimony_at: new Date().toISOString(),
            category: 'Gratidão' as const
          };
        }
        return p;
      });
      savePrayers(updated);

      alert("🎉 Glória a Deus! Seu testemunho de vitória foi publicado para abençoar a igreja.");
      setShowTestimonyModal(false);
    } catch (err) {
      console.error("Erro salvando testemunho:", err);
    } finally {
      setSubmittingTestimony(false);
    }
  };

  // Filtro de lista
  const myPrayers = prayers.filter(p => user && p.user_id === user.userId);
  const testimonyPrayers = prayers.filter(p => Boolean(p.testimony_text));
  const publicPrayers = prayers.filter(p => {
    if (p.privacy === 'CONFIDENTIAL') return false;
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  const displayedPrayers = 
    activeTab === 'my_prayers' ? myPrayers :
    activeTab === 'testimonies' ? testimonyPrayers :
    publicPrayers;

  const categoryIcons: Record<string, string> = {
    'ALL': '🌟',
    'Família': '👨‍👩‍👧‍👦',
    'Saúde': '🩺',
    'Finanças': '💼',
    'Espiritual': '🕊️',
    'Gratidão': '✨',
    'Outros': '🙏'
  };

  return (
    <div className="pwa-content animate-fade-in" style={{ paddingBottom: '90px' }}>

      {/* Header com Unidade */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          {onBack && (
            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', marginBottom: '4px' }}>
              ← Voltar ao Início
            </button>
          )}
          <h2 className="section-title" style={{ fontSize: '1.30rem', letterSpacing: '-0.3px', margin: 0 }}>
            Mural de Oração
          </h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            {selectedCampus ? `Unidade ${selectedCampus.name}` : branding.church_name || 'Comunidade'} • Intercedendo em amor
          </p>
        </div>

        <button
          type="button"
          className="btn-pwa-primary"
          onClick={() => setShowModal(true)}
          style={{ width: 'auto', padding: '9px 16px', fontSize: '0.78rem', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)' }}
        >
          + Pedir Oração
        </button>
      </div>

      {/* Abas Principais de Navegação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '14px', marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('wall')}
          style={{
            padding: '8px 4px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'wall' ? '#ffffff' : 'transparent',
            color: activeTab === 'wall' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '0.72rem',
            boxShadow: activeTab === 'wall' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          🕊️ Mural ({publicPrayers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my_prayers')}
          style={{
            padding: '8px 4px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'my_prayers' ? '#ffffff' : 'transparent',
            color: activeTab === 'my_prayers' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '0.72rem',
            boxShadow: activeTab === 'my_prayers' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          👤 Meus Pedidos ({myPrayers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('testimonies')}
          style={{
            padding: '8px 4px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'testimonies' ? '#ffffff' : 'transparent',
            color: activeTab === 'testimonies' ? '#059669' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '0.72rem',
            boxShadow: activeTab === 'testimonies' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          ✨ Vitórias ({testimonyPrayers.length})
        </button>
      </div>

      {/* Segmented Filter Categorias (Apenas no Mural) */}
      {activeTab === 'wall' && (
        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
          {['ALL', 'Família', 'Saúde', 'Finanças', 'Espiritual', 'Gratidão', 'Outros'].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: selectedCategory === cat ? '1px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                background: selectedCategory === cat ? 'var(--accent-primary)' : '#ffffff',
                color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>{categoryIcons[cat] || '🙏'}</span>
              <span>{cat === 'ALL' ? 'Todos os Motivos' : cat}</span>
            </button>
          ))}
        </div>
      )}

      {/* Lista de Pedidos */}
      {loading && prayers.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.80rem' }}>
          Carregando pedidos de oração...
        </div>
      ) : displayedPrayers.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>
            {activeTab === 'testimonies' ? '✨' : activeTab === 'my_prayers' ? '🙏' : '🕊️'}
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            {activeTab === 'testimonies' ? 'Nenhum testemunho registrado ainda' :
             activeTab === 'my_prayers' ? 'Você ainda não enviou nenhum pedido' :
             'Nenhum pedido de oração nesta categoria'}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
            {activeTab === 'testimonies' ? 'Quando Deus responder sua oração, clique em "Compartilhar Vitória" no seu pedido para inspirar a igreja.' :
             'Compartilhe suas necessidades com os irmãos para que possamos clamar juntos.'}
          </p>
          <button 
            type="button" 
            className="btn-pwa-primary"
            onClick={() => setShowModal(true)}
            style={{ width: 'auto', margin: '0 auto', padding: '10px 20px', fontSize: '0.82rem' }}
          >
            + Criar Pedido de Oração
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '14px' }}>
          {displayedPrayers.map(item => {
            const isMyPrayer = user && item.user_id === user.userId;

            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '16px',
                  border: item.privacy === 'CONFIDENTIAL' ? '1.5px solid #fecdd3' : '1px solid var(--panel-border)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  position: 'relative'
                }}
              >
                {/* Header do Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: item.privacy === 'CONFIDENTIAL' ? '#ffe4e6' : 'var(--accent-primary-light)', color: item.privacy === 'CONFIDENTIAL' ? '#e11d48' : 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.90rem' }}>
                      {item.privacy === 'CONFIDENTIAL' ? '🔒' : (categoryIcons[item.category] || '🙏')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{item.author}</span>
                        {isMyPrayer && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px' }}>
                            Você
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                        {item.time_ago}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {item.privacy === 'CONFIDENTIAL' && (
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#e11d48', background: '#ffe4e6', padding: '3px 8px', borderRadius: '6px' }}>
                        🔒 Pastoral
                      </span>
                    )}
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'var(--accent-primary-light)', padding: '3px 8px', borderRadius: '6px' }}>
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Pedido */}
                <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                  "{item.content}"
                </p>

                {/* RESPOSTA PASTORAL (SE HOUVER) */}
                {item.pastoral_response && (
                  <div style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderRadius: '12px', padding: '12px', border: '1px solid #ddd6fe', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6d28d9' }}>
                        💬 Resposta Pastoral ({item.pastoral_responded_by || 'Corpo Pastoral'}):
                      </span>
                    </div>
                    <p style={{ fontSize: '0.80rem', color: '#4c1d95', margin: 0, lineHeight: 1.4 }}>
                      {item.pastoral_response}
                    </p>
                  </div>
                )}

                {/* TESTEMUNHO DE VITÓRIA (SE HOUVER) */}
                {item.testimony_text && (
                  <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '12px', border: '1px solid #a7f3d0', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669' }}>
                        ✨ Testemunho de Vitória / Oração Respondida:
                      </span>
                    </div>
                    <p style={{ fontSize: '0.80rem', color: '#065f46', margin: 0, lineHeight: 1.4 }}>
                      {item.testimony_text}
                    </p>
                  </div>
                )}

                {/* Rodapé e Ações */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '10px', marginTop: '2px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    👥 <strong>{item.praying_count}</strong> {item.praying_count === 1 ? 'irmão orando' : 'irmãos intercedendo'}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {/* Botão de Testemunho para o próprio autor */}
                    {isMyPrayer && !item.testimony_text && (
                      <button
                        type="button"
                        onClick={() => handleOpenTestimonyModal(item)}
                        style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✨ Vitória!
                      </button>
                    )}

                    {/* Botão Estou Orando */}
                    {item.privacy !== 'CONFIDENTIAL' && (
                      <button
                        type="button"
                        onClick={() => handleTogglePraying(item.id)}
                        style={{
                          background: item.is_praying ? '#ecfdf5' : '#f1f5f9',
                          color: item.is_praying ? '#059669' : 'var(--text-secondary)',
                          border: item.is_praying ? '1px solid #a7f3d0' : 'none',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {item.is_praying ? '✓ Estou orando' : '🙏 Orar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          MODAL NOVO PEDIDO DE ORAÇÃO
          ======================================================== */}
      {showModal && (
        <div className="drawer-overlay" onClick={() => setShowModal(false)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />

            <h3 style={{ fontSize: '1.20rem', fontWeight: 900, color: 'var(--text-main)', textAlign: 'center', margin: '0 0 4px 0' }}>
              Enviar Pedido de Oração
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 16px 0' }}>
              {selectedCampus ? `Unidade ${selectedCampus.name}` : branding.church_name}
            </p>

            <form onSubmit={handleSubmitPrayer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* NÍVEL DE PRIVACIDADE: PÚBLICO VS CONFIDENCIAL */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  Nível de Privacidade do Pedido *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPrivacy('PUBLIC')}
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      border: privacy === 'PUBLIC' ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                      background: privacy === 'PUBLIC' ? 'var(--accent-primary-light)' : '#ffffff',
                      color: privacy === 'PUBLIC' ? 'var(--accent-primary)' : 'var(--text-main)',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>🌍 Mural Público</span>
                    <span style={{ fontSize: '0.64rem', opacity: 0.8, fontWeight: 500 }}>Toda a igreja ora junto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacy('CONFIDENTIAL')}
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      border: privacy === 'CONFIDENTIAL' ? '2px solid #e11d48' : '1px solid var(--panel-border)',
                      background: privacy === 'CONFIDENTIAL' ? '#ffe4e6' : '#ffffff',
                      color: privacy === 'CONFIDENTIAL' ? '#e11d48' : 'var(--text-main)',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>🔒 Apenas Pastoral</span>
                    <span style={{ fontSize: '0.64rem', opacity: 0.8, fontWeight: 500 }}>Sigilo aos pastores</span>
                  </button>
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Categoria do Motivo
                </label>
                <select
                  className="input-pwa"
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  style={{ background: '#ffffff', cursor: 'pointer' }}
                >
                  <option value="Família">👨‍👩‍👧‍👦 Família</option>
                  <option value="Saúde">🩺 Saúde e Cura</option>
                  <option value="Finanças">💼 Trabalho & Finanças</option>
                  <option value="Espiritual">🕊️ Vida Espiritual & Fé</option>
                  <option value="Gratidão">✨ Gratidão & Louvor</option>
                  <option value="Outros">🙏 Outros Motivos</option>
                </select>
              </div>

              {/* Nome ou Anônimo */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Seu Nome
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={e => setIsAnonymous(e.target.checked)}
                    />
                    Enviar como Anônimo
                  </label>
                </div>
                {!isAnonymous && (
                  <input
                    type="text"
                    className="input-pwa"
                    placeholder="Seu nome completo"
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                  />
                )}
              </div>

              {/* Telefone / WhatsApp Opcional para Acolhimento */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  WhatsApp para Contato Pastoral <span style={{ fontWeight: 400 }}>(Opcional)</span>
                </label>
                <input
                  type="tel"
                  className="input-pwa"
                  placeholder="(DDD) 99999-9999"
                  value={authorPhone}
                  onChange={e => setAuthorPhone(e.target.value)}
                />
              </div>

              {/* Conteúdo do Pedido */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Descreva o seu Motivo de Oração *
                </label>
                <textarea
                  rows={3}
                  className="input-pwa"
                  placeholder="Escreva aqui pelo que devemos clamar ao Senhor..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-pwa-primary" 
                disabled={submitting}
                style={{ marginTop: '6px' }}
              >
                {submitting ? 'Enviando...' : (privacy === 'CONFIDENTIAL' ? '🔒 Enviar com Sigilo aos Pastores' : '✨ Publicar no Mural de Oração')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL COMPARTILHAR TESTEMUNHO DE VITÓRIA
          ======================================================== */}
      {showTestimonyModal && selectedPrayerForTestimony && (
        <div className="drawer-overlay" onClick={() => setShowTestimonyModal(false)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />

            <h3 style={{ fontSize: '1.20rem', fontWeight: 900, color: '#059669', textAlign: 'center', margin: '0 0 4px 0' }}>
              ✨ Compartilhar Testemunho de Vitória
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 16px 0' }}>
              Conte como Deus respondeu à sua oração: <em>"{selectedPrayerForTestimony.content}"</em>
            </p>

            <form onSubmit={handleSubmitTestimony} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Seu Relato de Vitória / Milagre *
                </label>
                <textarea
                  rows={4}
                  className="input-pwa"
                  placeholder="Conte o que o Senhor fez na sua vida para glorificar o nome Dele..."
                  value={testimonyText}
                  onChange={e => setTestimonyText(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-pwa-primary"
                disabled={submittingTestimony}
                style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
              >
                {submittingTestimony ? 'Publicando...' : '🎉 Publicar Testemunho'}
              </button>

              <button
                type="button"
                className="btn-pwa-secondary"
                onClick={() => setShowTestimonyModal(false)}
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

