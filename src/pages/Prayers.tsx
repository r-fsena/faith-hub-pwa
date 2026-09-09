import React, { useState, useEffect } from 'react';
import { fetchPrayers, createPrayerRequest, prayForRequest, submitPrayerTestimony } from '../services/api';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { BottomSheet } from '../components/BottomSheet';

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
  const [selectedPrayerModal, setSelectedPrayerModal] = useState<PrayerRequest | null>(null);

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

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
        praying_count: 0,
        time_ago: 'Agora mesmo',
        is_praying: false,
        created_at: new Date().toISOString()
      };

      // Salva na lista local para exibição imediata
      savePrayers([newPrayer, ...prayers]);

      setShowModal(false);
      setContent('');
      if (!user?.name) setAuthorName('');

      // Redireciona para a aba "Meus Pedidos" e rola suavemente para o topo
      setActiveTab('my_prayers');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      if (privacy === 'CONFIDENTIAL') {
        alert("🔒 Seu pedido confidencial foi enviado com sigilo diretamente ao Corpo Pastoral da igreja.");
      } else {
        alert("✨ Seu pedido de oração foi publicado com sucesso!");
      }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayedPrayers.map(item => {
            const isMyPrayer = user && item.user_id === user.userId;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedPrayerModal(item)}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: item.privacy === 'CONFIDENTIAL' ? '1.5px solid #fecdd3' : '1px solid var(--panel-border)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Ícone / Avatar à esquerda */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: item.privacy === 'CONFIDENTIAL' ? '#ffe4e6' : 'var(--accent-primary-light)',
                  color: item.privacy === 'CONFIDENTIAL' ? '#e11d48' : 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  flexShrink: 0
                }}>
                  {item.privacy === 'CONFIDENTIAL' ? '🔒' : (categoryIcons[item.category] || '🙏')}
                </div>

                {/* Conteúdo resumido no centro */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.author}
                    </span>
                    {isMyPrayer && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#eff6ff', color: '#2563eb', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                        Você
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: item.privacy === 'CONFIDENTIAL' ? '#e11d48' : 'var(--accent-primary)',
                      background: item.privacy === 'CONFIDENTIAL' ? '#ffe4e6' : 'var(--accent-primary-light)',
                      padding: '1px 6px',
                      borderRadius: '6px',
                      flexShrink: 0
                    }}>
                      {item.privacy === 'CONFIDENTIAL' ? '🔒 Pastoral' : item.category}
                    </span>
                  </div>

                  {/* Resumo do pedido */}
                  <div style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.3
                  }}>
                    {item.content}
                  </div>

                  {/* Metadados: orando, tempo e badges de resposta/testemunho */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px', flexWrap: 'wrap' }}>
                    <span>👥 {item.praying_count} {item.praying_count === 1 ? 'orando' : 'orando'}</span>
                    <span>• {item.time_ago}</span>
                    {item.pastoral_response && (
                      <span style={{ color: '#6d28d9', fontWeight: 700 }}>💬 Com resposta pastoral</span>
                    )}
                    {item.testimony_text && (
                      <span style={{ color: '#059669', fontWeight: 700 }}>✨ Testemunho</span>
                    )}
                  </div>
                </div>

                {/* Ações e Seta à direita */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {item.privacy !== 'CONFIDENTIAL' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePraying(item.id);
                      }}
                      style={{
                        background: item.is_praying ? '#ecfdf5' : '#f8fafc',
                        color: item.is_praying ? '#059669' : 'var(--text-secondary)',
                        border: item.is_praying ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{item.is_praying ? '✓' : '🙏'}</span>
                      <span>{item.is_praying ? 'Orando' : 'Orar'}</span>
                    </button>
                  )}

                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.92rem',
                    fontWeight: 700
                  }}>
                    ›
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

      {/* ========================================================
          MODAL DETALHES DO PEDIDO DE ORAÇÃO (PADRÃO DEVOCIONAIS)
          ======================================================== */}
      {selectedPrayerModal && (
        <BottomSheet
          isOpen={Boolean(selectedPrayerModal)}
          onClose={() => setSelectedPrayerModal(null)}
          maxHeight="92dvh"
        >
          {(() => {
            const item = selectedPrayerModal;
            const isMyPrayer = Boolean(user && item.user_id === user.userId);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
                {/* Header do Pedido */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: item.privacy === 'CONFIDENTIAL' ? '#ffe4e6' : 'var(--accent-primary-light)',
                      color: item.privacy === 'CONFIDENTIAL' ? '#e11d48' : 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {item.privacy === 'CONFIDENTIAL' ? '🔒' : (categoryIcons[item.category] || '🙏')}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--text-main)' }}>
                          {item.author}
                        </span>
                        {isMyPrayer && (
                          <span style={{ fontSize: '0.64rem', fontWeight: 800, background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px' }}>
                            Seu Pedido
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          color: item.privacy === 'CONFIDENTIAL' ? '#e11d48' : 'var(--accent-primary)',
                          background: item.privacy === 'CONFIDENTIAL' ? '#ffe4e6' : 'var(--accent-primary-light)',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {item.privacy === 'CONFIDENTIAL' ? '🔒 Confidencial Pastoral' : item.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Publicado {item.time_ago} • 👥 <strong>{item.praying_count}</strong> {item.praying_count === 1 ? 'irmão orando' : 'irmãos intercedendo'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPrayerModal(null)}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.90rem',
                      flexShrink: 0
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Conteúdo Completo do Pedido */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  position: 'relative'
                }}>
                  <div style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                    Motivo de Oração & Intercessão
                  </div>
                  <p style={{
                    fontSize: '0.96rem',
                    color: 'var(--text-main)',
                    lineHeight: 1.6,
                    margin: 0,
                    whiteSpace: 'pre-line',
                    fontStyle: 'italic'
                  }}>
                    "{item.content}"
                  </p>
                </div>

                {/* RESPOSTA PASTORAL (SE HOUVER) */}
                {item.pastoral_response && (
                  <div style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderRadius: '16px', padding: '16px', border: '1px solid #ddd6fe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#6d28d9' }}>
                        💬 Resposta Pastoral ({item.pastoral_responded_by || 'Corpo Pastoral'}):
                      </span>
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#4c1d95', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {item.pastoral_response}
                    </p>
                  </div>
                )}

                {/* TESTEMUNHO DE VITÓRIA (SE HOUVER) */}
                {item.testimony_text && (
                  <div style={{ background: '#ecfdf5', borderRadius: '16px', padding: '16px', border: '1px solid #a7f3d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#059669' }}>
                        ✨ Testemunho de Vitória / Oração Respondida:
                      </span>
                    </div>
                    <p style={{ fontSize: '0.86rem', color: '#065f46', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {item.testimony_text}
                    </p>
                  </div>
                )}

                {/* AÇÕES NO MODAL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {item.privacy !== 'CONFIDENTIAL' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleTogglePraying(item.id);
                        setSelectedPrayerModal(prev => {
                          if (!prev) return null;
                          const isNow = !prev.is_praying;
                          return {
                            ...prev,
                            is_praying: isNow,
                            praying_count: isNow ? prev.praying_count + 1 : Math.max(0, prev.praying_count - 1)
                          };
                        });
                      }}
                      style={{
                        width: '100%',
                        background: item.is_praying ? '#ecfdf5' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: item.is_praying ? '#059669' : '#ffffff',
                        border: item.is_praying ? '1.5px solid #a7f3d0' : 'none',
                        borderRadius: '14px',
                        padding: '14px',
                        fontWeight: 900,
                        fontSize: '0.90rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: item.is_praying ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.25)'
                      }}
                    >
                      <span>{item.is_praying ? '✓' : '🙏'}</span>
                      <span>{item.is_praying ? 'Estou Orando por Você' : 'Orar por este Pedido'}</span>
                    </button>
                  )}

                  {isMyPrayer && !item.testimony_text && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPrayerModal(null);
                        handleOpenTestimonyModal(item);
                      }}
                      style={{
                        width: '100%',
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1.5px solid #a7f3d0',
                        padding: '12px',
                        borderRadius: '14px',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>✨</span>
                      <span>Compartilhar Testemunho de Vitória!</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedPrayerModal(null)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#64748b',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Voltar ao Mural
                  </button>
                </div>
              </div>
            );
          })()}
        </BottomSheet>
      )}

    </div>
  );
};

