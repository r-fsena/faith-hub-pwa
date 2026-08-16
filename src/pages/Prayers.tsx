import React, { useState, useEffect } from 'react';
import { fetchPrayers, createPrayerRequest, prayForRequest } from '../services/api';

interface PrayerRequest {
  id: string;
  author: string;
  category: 'Família' | 'Saúde' | 'Finanças' | 'Espiritual' | 'Gratidão' | 'Outros';
  privacy: 'PUBLIC' | 'CONFIDENTIAL';
  content: string;
  praying_count: number;
  time_ago: string;
  is_praying?: boolean;
}

const SAMPLE_PRAYERS: PrayerRequest[] = [
  {
    id: 'pr_1',
    author: 'Irmã Maria Luiza',
    category: 'Saúde',
    privacy: 'PUBLIC',
    content: 'Peço oração pela recuperação da minha mãe que está passando por uma cirurgia amanhã. Cremos na cura completa em nome de Jesus!',
    praying_count: 24,
    time_ago: 'Há 2 horas',
    is_praying: true
  },
  {
    id: 'pr_2',
    author: 'Membro Anônimo',
    category: 'Família',
    privacy: 'PUBLIC',
    content: 'Pela restauração do diálogo e da paz no casamento. Que Deus renove o amor e a paciência no nosso lar.',
    praying_count: 18,
    time_ago: 'Hoje cedo',
    is_praying: false
  },
  {
    id: 'pr_3',
    author: 'Lucas Gabriel',
    category: 'Finanças',
    privacy: 'PUBLIC',
    content: 'Entrevista de emprego marcada para esta quinta-feira. Peço a bênção e graça do Senhor diante dos entrevistadores.',
    praying_count: 15,
    time_ago: 'Ontem',
    is_praying: false
  }
];

export const Prayers: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [prayers, setPrayers] = useState<PrayerRequest[]>(SAMPLE_PRAYERS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal Novo Pedido
  const [showModal, setShowModal] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState<PrayerRequest['category']>('Família');
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'CONFIDENTIAL'>('PUBLIC');
  const [content, setContent] = useState('');

  useEffect(() => {
    loadPrayers();
  }, [selectedCategory]);

  const loadPrayers = async () => {
    // 1. Carrega do localStorage imediato
    const saved = localStorage.getItem('faithhub_community_prayers');
    if (saved) {
      try {
        setPrayers(JSON.parse(saved));
      } catch (e) { }
    }

    // 2. Busca do backend a versão em nuvem
    try {
      const data = await fetchPrayers(selectedCategory);
      if (Array.isArray(data) && data.length > 0) {
        setPrayers(data);
        localStorage.setItem('faithhub_community_prayers', JSON.stringify(data));
      }
    } catch (e) {
      console.log("Offline fallback para orações", e);
    }
  };

  const savePrayers = (updated: PrayerRequest[]) => {
    setPrayers(updated);
    localStorage.setItem('faithhub_community_prayers', JSON.stringify(updated));
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

    // Envia ao backend
    try {
      await prayForRequest(id);
    } catch (e) {
      console.log("Erro ao registrar oração em nuvem", e);
    }
  };

  const handleSubmitPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const authorDisplayName = isAnonymous ? 'Membro Anônimo' : (authorName.trim() || 'Membro da Igreja');

    // Envia ao backend
    try {
      const res = await createPrayerRequest({
        author_name: authorDisplayName,
        is_anonymous: isAnonymous,
        category,
        privacy,
        content: content.trim()
      });

      const prayerObj: PrayerRequest = res?.prayer || {
        id: `pr_${Date.now()}`,
        author: authorDisplayName,
        category,
        privacy,
        content: content.trim(),
        praying_count: 1,
        time_ago: 'Agora mesmo',
        is_praying: true
      };

      if (privacy === 'CONFIDENTIAL') {
        alert("🔒 Seu pedido confidencial foi enviado com segurança diretamente ao Corpo Pastoral da igreja.");
      } else {
        savePrayers([prayerObj, ...prayers]);
        alert("✨ Seu pedido de oração foi publicado no mural da comunidade!");
      }

      // Salva no registro de pedidos enviados pelo próprio usuário
      const mySaved = localStorage.getItem('faithhub_my_sent_prayers');
      const mySentList = mySaved ? JSON.parse(mySaved) : [];
      localStorage.setItem('faithhub_my_sent_prayers', JSON.stringify([prayerObj, ...mySentList]));
    } catch (err) {
      console.error("Erro salvando oração", err);
    }

    setShowModal(false);
    setContent('');
    setAuthorName('');
    setIsAnonymous(false);
    setPrivacy('PUBLIC');
  };

  const filteredPrayers = prayers.filter(p => {
    if (p.privacy === 'CONFIDENTIAL') return false; // Nunca mostra confidenciais no feed público
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="pwa-content animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {onBack && (
            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', marginBottom: '4px' }}>
              ← Voltar ao Início
            </button>
          )}
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Mural de Oração</h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Intercedendo uns pelos outros em amor</p>
        </div>

        <button
          type="button"
          className="btn-pwa-primary"
          onClick={() => setShowModal(true)}
          style={{ width: 'auto', padding: '8px 14px', fontSize: '0.75rem' }}
        >
          + Pedir Oração
        </button>
      </div>

      {/* Segmented Filter Categorias */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['ALL', 'Família', 'Saúde', 'Finanças', 'Espiritual', 'Gratidão'].map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              border: '1px solid var(--panel-border)',
              background: selectedCategory === cat ? 'var(--accent-primary)' : '#ffffff',
              color: selectedCategory === cat ? '#ffffff' : 'var(--text-main)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {cat === 'ALL' ? 'Todos os Motivos' : cat}
          </button>
        ))}
      </div>

      {/* Lista de Pedidos de Oração */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredPrayers.map(item => (
          <div
            key={item.id}
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '16px',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                  🙏
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>{item.author}</div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>{item.time_ago}</div>
                </div>
              </div>

              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'var(--accent-primary-light)', padding: '4px 10px', borderRadius: '8px' }}>
                {item.category}
              </span>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              "{item.content}"
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                👥 {item.praying_count} irmãos intercedendo
              </span>

              <button
                type="button"
                onClick={() => handleTogglePraying(item.id)}
                style={{
                  background: item.is_praying ? '#ecfdf5' : '#f1f5f9',
                  color: item.is_praying ? '#059669' : 'var(--text-secondary)',
                  border: item.is_praying ? '1px solid #a7f3d0' : 'none',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {item.is_praying ? '✓ Estou orando' : '🙏 Orar por este pedido'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NOVO PEDIDO DE ORAÇÃO (COM PRIVACIDADE) */}
      {showModal && (
        <div className="drawer-overlay" onClick={() => setShowModal(false)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', textAlign: 'center' }}>
              Enviar Pedido de Oração
            </h3>

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
                    <span style={{ fontSize: '0.64rem', opacity: 0.8, fontWeight: 500 }}>Sigiloso aos pastores</span>
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
                  <option value="Família">Família</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Finanças">Finanças / Trabalho</option>
                  <option value="Espiritual">Vida Espiritual</option>
                  <option value="Gratidão">Gratidão / Agradecimento</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              {/* Nome ou Anônimo */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Seu Nome (ou marque Anônimo)
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

              <button type="submit" className="btn-pwa-primary" style={{ marginTop: '6px' }}>
                {privacy === 'CONFIDENTIAL' ? '🔒 Enviar com Sigilo aos Pastores' : '✨ Publicar no Mural de Oração'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
