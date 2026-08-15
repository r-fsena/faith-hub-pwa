import React, { useState } from 'react';

interface PrayerRequest {
  id: string;
  author: string;
  category: string;
  text: string;
  prayers_count: number;
  time_ago: string;
  user_prayed?: boolean;
}

const SAMPLE_PRAYERS: PrayerRequest[] = [
  {
    id: '1',
    author: 'Irmã Maria Luiza',
    category: 'Saúde & Cura',
    text: 'Peço oração pela recuperação da cirurgia da minha mãe. Cremos no poder curador de Jesus!',
    prayers_count: 24,
    time_ago: 'Há 2 horas',
    user_prayed: false
  },
  {
    id: '2',
    author: 'Irmão Carlos Eduardo',
    category: 'Família & Restauração',
    text: 'Orando pela salvação e reconciliação da minha família e filhos neste ano.',
    prayers_count: 38,
    time_ago: 'Há 5 horas',
    user_prayed: true
  },
  {
    id: '3',
    author: 'Anônimo',
    category: 'Portas de Emprego',
    text: 'Estou em processo seletivo esta semana. Que a boa e perfeita vontade de Deus se cumpra!',
    prayers_count: 19,
    time_ago: 'Ontem',
    user_prayed: false
  }
];

export const Prayers: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [prayers, setPrayers] = useState<PrayerRequest[]>(SAMPLE_PRAYERS);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Saúde & Cura');
  const [newText, setNewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleTogglePray = (id: string) => {
    setPrayers(prev => prev.map(p => {
      if (p.id === id) {
        const prayed = !p.user_prayed;
        return {
          ...p,
          user_prayed: prayed,
          prayers_count: prayed ? p.prayers_count + 1 : p.prayers_count - 1
        };
      }
      return p;
    }));
  };

  const handleCreatePrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const newRequest: PrayerRequest = {
      id: `prayer_${Date.now()}`,
      author: isAnonymous ? 'Anônimo' : (newName.trim() || 'Membro da Igreja'),
      category: newCategory,
      text: newText.trim(),
      prayers_count: 1,
      time_ago: 'Agora mesmo',
      user_prayed: true
    };

    setPrayers([newRequest, ...prayers]);
    setShowNewModal(false);
    setNewText('');
    setNewName('');
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      <div className="section-header-row">
        <div>
          {onBack && (
            <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer', marginBottom: '4px' }}>
              ← Voltar ao Início
            </button>
          )}
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Mural de Oração</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Intercedendo uns pelos outros em amor</p>
        </div>

        <button 
          type="button" 
          className="btn-pwa-primary" 
          style={{ width: 'auto', padding: '8px 14px', fontSize: '0.78rem' }}
          onClick={() => setShowNewModal(true)}
        >
          + Pedir Oração
        </button>
      </div>

      {/* Lista de Pedidos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {prayers.map(p => (
          <div 
            key={p.id}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                  🙏
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)' }}>{p.author}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700 }}>{p.category}</div>
                </div>
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>{p.time_ago}</span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
              "{p.text}"
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ❤️ {p.prayers_count} irmãos orando
              </span>

              <button 
                type="button" 
                onClick={() => handleTogglePray(p.id)}
                style={{
                  background: p.user_prayed ? 'var(--accent-primary-light)' : '#f1f5f9',
                  color: p.user_prayed ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                {p.user_prayed ? '✅ Estou orando!' : '🙏 Orar por este pedido'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo Pedido de Oração */}
      {showNewModal && (
        <div className="drawer-overlay" onClick={() => setShowNewModal(false)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', textAlign: 'center' }}>
              Enviar Pedido de Oração
            </h3>

            <form onSubmit={handleCreatePrayer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Categoria
                </label>
                <select 
                  className="input-pwa" 
                  value={newCategory} 
                  onChange={e => setNewCategory(e.target.value)}
                >
                  <option value="Saúde & Cura">Saúde & Cura</option>
                  <option value="Família & Casamento">Família & Casamento</option>
                  <option value="Portas de Emprego">Portas de Emprego</option>
                  <option value="Vida Espiritual">Vida Espiritual</option>
                  <option value="Gratidão">Gratidão / Testemunho</option>
                </select>
              </div>

              {!isAnonymous && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    Seu Nome
                  </label>
                  <input 
                    type="text" 
                    className="input-pwa" 
                    placeholder="Seu nome ou deixe anônimo"
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                  />
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isAnonymous} 
                  onChange={e => setIsAnonymous(e.target.checked)} 
                />
                <span>Enviar como anônimo</span>
              </label>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Descreva o Motivo da Oração *
                </label>
                <textarea 
                  rows={4}
                  className="input-pwa" 
                  placeholder="Compartilhe com a igreja seu pedido para que possamos clamar juntos..."
                  value={newText} 
                  onChange={e => setNewText(e.target.value)}
                  required 
                />
              </div>

              <button type="submit" className="btn-pwa-primary">
                Enviar para o Mural
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
