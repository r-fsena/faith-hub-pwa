import React, { useState } from 'react';

interface CellGroup {
  id: string;
  name: string;
  network: string;
  leader: string;
  host: string;
  neighborhood: string;
  day_time: string;
  whatsapp: string;
  address: string;
}

interface CellPost {
  id: string;
  author: string;
  avatar: string;
  time_ago: string;
  content: string;
  likes: number;
}

interface CellStudy {
  id: string;
  title: string;
  theme: string;
  verse: string;
  icebreaker: string;
  discussion_points: string[];
  practical_application: string;
}

interface SnackAssignment {
  id: string;
  date: string;
  person: string;
  item: string;
  confirmed: boolean;
}

const SAMPLE_CELLS: CellGroup[] = [
  {
    id: 'grp_1',
    name: 'Célula Graça & Vida',
    network: 'Famílias',
    leader: 'Pr. Carlos & Mariana',
    host: 'Irmão Roberto',
    neighborhood: 'Jardins / Centro',
    day_time: 'Toda Quarta às 20h00',
    whatsapp: '5511987654321',
    address: 'Rua das Palmeiras, 142'
  },
  {
    id: 'grp_2',
    name: 'Célula Jovens do Reino (Next)',
    network: 'Jovens & Teens',
    leader: 'Lucas Sena & Beatriz',
    host: 'Espaço Conexão',
    neighborhood: 'Vila Mariana',
    day_time: 'Todo Sábado às 18h30',
    whatsapp: '5511987654322',
    address: 'Av. Paulista, 900 - Anexo'
  },
  {
    id: 'grp_3',
    name: 'Célula Mulheres Vitoriosas',
    network: 'Mulheres',
    leader: 'Pra. Ana Cláudia',
    host: 'Irmã Sueli',
    neighborhood: 'Moema / Sul',
    day_time: 'Toda Terça às 19h30',
    whatsapp: '5511987654323',
    address: 'Alameda dos Ipês, 55'
  },
  {
    id: 'grp_4',
    name: 'Célula Homens de Honra',
    network: 'Homens',
    leader: 'Diácono Marcos',
    host: 'Espaço Gourmet',
    neighborhood: 'Pinheiros',
    day_time: 'Toda Quinta às 20h00',
    whatsapp: '5511987654324',
    address: 'Rua dos Pinheiros, 310'
  }
];

const SAMPLE_POSTS: CellPost[] = [
  {
    id: 'p1',
    author: 'Pr. Carlos (Líder)',
    avatar: 'https://i.pravatar.cc/150?img=11',
    time_ago: 'Hoje às 10:30',
    content: 'Paz do Senhor, família! Nosso encontro desta quarta será na casa do irmão Roberto. Tragam seus corações abertos e convidados!',
    likes: 12
  },
  {
    id: 'p2',
    author: 'Mariana (Vice-Líder)',
    avatar: 'https://i.pravatar.cc/150?img=5',
    time_ago: 'Ontem',
    content: 'Quem puder confirmar presença para organizarmos o espaço e o lanche, por favor avise aqui nos comentários!',
    likes: 8
  }
];

const SAMPLE_STUDY: CellStudy = {
  id: 'st_1',
  title: 'Edificando Casas sobre a Rocha',
  theme: 'Série: Fundamentos da Fé',
  verse: 'Mateus 7:24-25 — "Todo aquele, pois, que ouve estas minhas palavras e as pratica será comparado a um homem prudente..."',
  icebreaker: 'Se você pudesse construir a casa dos seus sonhos em qualquer lugar do mundo, onde seria e por quê?',
  discussion_points: [
    'Qual a diferença prática entre apenas "ouvir" a Palavra e "praticá-la" no dia a dia?',
    'Quais tempestades ou ventos da vida testam a estrutura da nossa fé?',
    'Como podemos nos apoiar mutuamente na célula para não vacilar em tempos difíceis?'
  ],
  practical_application: 'Nesta semana, escolha uma área prática da sua rotina (finanças, família, oração) para firmar um compromisso real com base na Palavra de Deus.'
};

const SAMPLE_SNACKS: SnackAssignment[] = [
  { id: '1', date: 'Próxima Quarta (19/08)', person: 'Irmão Roberto', item: 'Salgados Assados & Torta', confirmed: true },
  { id: '2', date: 'Próxima Quarta (19/08)', person: 'Irmã Carla', item: 'Sucos Naturais e Refrigerante', confirmed: true },
  { id: '3', date: 'Quarta Seguinte (26/08)', person: 'Lucas & Família', item: 'Bolo Caseiro & Doces', confirmed: false },
  { id: '4', date: 'Quarta Seguinte (26/08)', person: 'A definir (Você?)', item: 'Copos e Guardanapos', confirmed: false }
];

type PortalTab = 'dashboard' | 'mural' | 'estudos' | 'membros' | 'lanches' | 'fotos';

export const CellGroups: React.FC = () => {
  // Modo de visualização: 'portal' (Meu Grupo Conectado) ou 'discover' (Explorar Células)
  const [viewMode, setViewMode] = useState<'portal' | 'discover'>('portal');
  const [myGroupId] = useState<string>('grp_1');
  const [portalTab, setPortalTab] = useState<PortalTab>('dashboard');
  
  // Discover State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('ALL');
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);

  // Portal State
  const [posts, setPosts] = useState<CellPost[]>(SAMPLE_POSTS);
  const [newPostText, setNewPostText] = useState('');
  const [snacks, setSnacks] = useState<SnackAssignment[]>(SAMPLE_SNACKS);

  const myGroup = SAMPLE_CELLS.find(g => g.id === myGroupId) || SAMPLE_CELLS[0];

  const filteredCells = SAMPLE_CELLS.filter(cell => {
    const matchesSearch = cell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          cell.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          cell.leader.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNetwork = selectedNetwork === 'ALL' || cell.network === selectedNetwork;
    return matchesSearch && matchesNetwork;
  });

  const handleRequestJoin = (id: string) => {
    setPendingGroupId(id);
    alert('Solicitação enviada com sucesso ao líder da célula!');
  };

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    const newPost: CellPost = {
      id: `p_${Date.now()}`,
      author: 'Eu (Membro)',
      avatar: 'https://i.pravatar.cc/150?img=68',
      time_ago: 'Agora mesmo',
      content: newPostText.trim(),
      likes: 1
    };
    setPosts([newPost, ...posts]);
    setNewPostText('');
  };

  const handleVolunteerSnack = (snackId: string) => {
    setSnacks(prev => prev.map(s => {
      if (s.id === snackId) {
        return { ...s, person: 'Eu (Voluntário)', confirmed: true };
      }
      return s;
    }));
    alert('Obrigado por abençoar a célula com o lanche!');
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      {/* Header com Switch entre "Minha Célula" e "Explorar Células" */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Células & Redes</h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {viewMode === 'portal' ? 'Hub conectado da sua célula' : 'Encontre uma célula perto de você'}
          </p>
        </div>

        <button 
          type="button" 
          onClick={() => setViewMode(viewMode === 'portal' ? 'discover' : 'portal')}
          style={{
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          {viewMode === 'portal' ? '🔍 Explorar Células' : '🏠 Minha Célula'}
        </button>
      </div>

      {/* ========================================================
          MODO 1: PORTAL CONECTADO DA MINHA CÉLULA (SUB-APP)
          ======================================================== */}
      {viewMode === 'portal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card Hero da Minha Célula */}
          <div style={{ background: 'var(--accent-primary-gradient)', color: '#ffffff', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                  CÉLULA CONECTADA • {myGroup.network}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: '2px' }}>
                  {myGroup.name}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="https://i.pravatar.cc/150?img=11" alt="Líder" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #ffffff' }} />
                <img src="https://i.pravatar.cc/150?img=5" alt="Líder" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #ffffff', marginLeft: '-10px' }} />
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 14px', borderRadius: '12px', marginTop: '14px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>👤 <strong>Liderança:</strong> {myGroup.leader}</div>
              <div>🗓️ <strong>Encontro:</strong> {myGroup.day_time}</div>
              <div>📍 <strong>Endereço:</strong> {myGroup.address} ({myGroup.neighborhood})</div>
            </div>
          </div>

          {/* Abas de Navegação Interna da Célula */}
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'dashboard', label: '📊 Início' },
              { id: 'mural', label: '💬 Mural' },
              { id: 'estudos', label: '📖 Estudos' },
              { id: 'membros', label: '👥 Membros' },
              { id: 'lanches', label: '☕ Partilha' },
              { id: 'fotos', label: '📸 Álbum' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPortalTab(tab.id as PortalTab)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: portalTab === tab.id ? '1.5px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                  background: portalTab === tab.id ? 'var(--accent-primary-light)' : '#ffffff',
                  color: portalTab === tab.id ? 'var(--accent-primary)' : 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* WIDGET DASHBOARD DA CÉLULA (Fase 3 UI/UX) */}
          {portalTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Widget 1: Lição da Semana Preview */}
              <div 
                onClick={() => setPortalTab('estudos')}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid var(--panel-border)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                    📖 LIÇÃO DA SEMANA
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Ver estudo ›</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }}>
                  {SAMPLE_STUDY.title}
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                  "{SAMPLE_STUDY.verse.slice(0, 110)}..."
                </p>
              </div>

              {/* Grid de 2 Widgets: Mural + Escala de Lanches */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                
                {/* Mini Mural */}
                <div 
                  onClick={() => setPortalTab('mural')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    padding: '14px',
                    border: '1px solid var(--panel-border)',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '120px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0284c7' }}>💬 MURAL DO GRUPO</span>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: 700, margin: '6px 0 0 0', lineHeight: 1.3 }}>
                      {posts[0]?.content.slice(0, 55)}...
                    </p>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 800 }}>
                    {posts.length} recados ›
                  </span>
                </div>

                {/* Mini Escala de Lanche */}
                <div 
                  onClick={() => setPortalTab('lanches')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    padding: '14px',
                    border: '1px solid var(--panel-border)',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '120px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ea580c' }}>☕ PARTILHA & LANCHE</span>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: 700, margin: '6px 0 0 0', lineHeight: 1.3 }}>
                      {snacks[0]?.item}
                    </p>
                    <span style={{ fontSize: '0.70rem', color: '#059669', fontWeight: 800 }}>
                      ✓ {snacks[0]?.person}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 800 }}>
                    Ver escala ›
                  </span>
                </div>

              </div>

              {/* Widget Membros & Galeria Teaser */}
              <div 
                onClick={() => setPortalTab('membros')}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '14px 16px',
                  border: '1px solid var(--panel-border)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img src="https://i.pravatar.cc/150?img=11" alt="Membro" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #ffffff' }} />
                    <img src="https://i.pravatar.cc/150?img=5" alt="Membro" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #ffffff', marginLeft: '-8px' }} />
                    <img src="https://i.pravatar.cc/150?img=33" alt="Membro" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #ffffff', marginLeft: '-8px' }} />
                  </div>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    8 participantes conectados
                  </span>
                </div>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--accent-primary)' }}>Ver todos ›</span>
              </div>

            </div>
          )}

          {/* FERRAMENTA 1: MURAL DO GRUPO */}
          {portalTab === 'mural' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Form Novo Post */}
              <form onSubmit={handleAddPost} style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea 
                  rows={2}
                  className="input-pwa"
                  placeholder="Compartilhe um aviso, oração ou gratidão com sua célula..."
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                />
                <button type="submit" className="btn-pwa-primary" style={{ padding: '8px 16px', alignSelf: 'flex-end', width: 'auto', fontSize: '0.80rem' }}>
                  Publicar no Mural
                </button>
              </form>

              {/* Feed de Posts */}
              {posts.map(post => (
                <div key={post.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={post.avatar} alt={post.author} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)' }}>{post.author}</div>
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>{post.time_ago}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '4px 0' }}>
                    {post.content}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--panel-border)', paddingTop: '8px' }}>
                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}>
                      ❤️ {post.likes} Curtidas
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FERRAMENTA 2: ESTUDOS DA SEMANA */}
          {portalTab === 'estudos' && (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  {SAMPLE_STUDY.theme}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>
                  {SAMPLE_STUDY.title}
                </h3>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', borderLeft: '4px solid var(--accent-primary)' }}>
                <p style={{ fontSize: '0.86rem', fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0 }}>
                  {SAMPLE_STUDY.verse}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0284c7', marginBottom: '4px' }}>
                  🧊 Quebra-Gelo
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {SAMPLE_STUDY.icebreaker}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                  💬 Perguntas para Discussão
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {SAMPLE_STUDY.discussion_points.map((pt, i) => (
                    <div key={i} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      <strong>{i + 1}.</strong> {pt}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '14px', borderRadius: '14px' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46', marginBottom: '2px' }}>
                  🎯 Desafio Prático da Semana
                </h4>
                <p style={{ fontSize: '0.80rem', color: '#047857', margin: 0 }}>
                  {SAMPLE_STUDY.practical_application}
                </p>
              </div>
            </div>
          )}

          {/* FERRAMENTA 3: MEMBROS DA CÉLULA */}
          {portalTab === 'membros' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Integrantes da Célula (8 participantes)
              </div>

              {[
                { name: 'Pr. Carlos', role: 'Líder', avatar: 'https://i.pravatar.cc/150?img=11', badge: 'Líder' },
                { name: 'Mariana Silva', role: 'Vice-Líder', avatar: 'https://i.pravatar.cc/150?img=5', badge: 'Vice-Líder' },
                { name: 'Irmão Roberto', role: 'Anfitrião', avatar: 'https://i.pravatar.cc/150?img=33', badge: 'Anfitrião' },
                { name: 'Carla Dias', role: 'Membro', avatar: 'https://i.pravatar.cc/150?img=47', badge: 'Membro' },
                { name: 'Lucas Sena', role: 'Membro', avatar: 'https://i.pravatar.cc/150?img=68', badge: 'Membro' },
              ].map((m, i) => (
                <div key={i} style={{ background: '#ffffff', borderRadius: '14px', padding: '12px 14px', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={m.avatar} alt={m.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>{m.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.role}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'var(--accent-primary-light)', padding: '4px 10px', borderRadius: '8px' }}>
                    {m.badge}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* FERRAMENTA 4: ESCALA DE LANCHE / PARTILHA */}
          {portalTab === 'lanches' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Escala do Lanche Semanal
              </div>

              {snacks.map(item => (
                <div key={item.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{item.date}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>{item.item}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Responsável: <strong>{item.person}</strong></div>
                  </div>

                  {item.confirmed ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: '8px' }}>
                      ✓ Confirmado
                    </span>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => handleVolunteerSnack(item.id)}
                      style={{ background: 'var(--accent-primary)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Levar Este Item
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* FERRAMENTA 5: ÁLBUM DE FOTOS */}
          {portalTab === 'fotos' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                { url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80', caption: 'Confraternização de Quarta' },
                { url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80', caption: 'Noite de Louvor & Pizza' },
                { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80', caption: 'Estudo nos Lares' },
                { url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=400&q=80', caption: 'Comunhão da Célula' }
              ].map((pic, i) => (
                <div key={i} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--panel-border)', background: '#ffffff' }}>
                  <img src={pic.url} alt={pic.caption} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                  <div style={{ padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {pic.caption}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================
          MODO 2: DISCOVER / EXPLORAR CÉLULAS DA IGREJA
          ======================================================== */}
      {viewMode === 'discover' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Busca Rápida */}
          <input 
            type="text" 
            className="input-pwa" 
            placeholder="🔍 Buscar por bairro, líder ou nome da célula..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />

          {/* Segmented Filter Redes */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['ALL', 'Famílias', 'Jovens & Teens', 'Mulheres', 'Homens'].map(net => (
              <button
                key={net}
                type="button"
                onClick={() => setSelectedNetwork(net)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: '1px solid var(--panel-border)',
                  background: selectedNetwork === net ? 'var(--accent-primary)' : '#ffffff',
                  color: selectedNetwork === net ? '#ffffff' : 'var(--text-main)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {net === 'ALL' ? 'Todas as Redes' : net}
              </button>
            ))}
          </div>

          {/* Lista de Células Disponíveis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredCells.map(cell => {
              const isMyCell = cell.id === myGroupId;
              const isPending = cell.id === pendingGroupId;

              return (
                <div 
                  key={cell.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    padding: '16px',
                    border: isMyCell ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {cell.network} • {cell.neighborhood}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                        {cell.name}
                      </h3>
                    </div>
                    {isMyCell && (
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 800 }}>
                        Minha Célula
                      </span>
                    )}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Liderança:</strong> {cell.leader}</div>
                    <div><strong>Horário:</strong> {cell.day_time}</div>
                    <div><strong>Endereço:</strong> {cell.address}</div>
                  </div>

                  {isMyCell ? (
                    <button 
                      type="button" 
                      className="btn-pwa-primary"
                      onClick={() => setViewMode('portal')}
                    >
                      Acessar Portal da Minha Célula
                    </button>
                  ) : isPending ? (
                    <div style={{ background: '#fffbeb', color: '#d97706', padding: '10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, textAlign: 'center', border: '1px solid #fde68a' }}>
                      ⏳ Solicitação em análise pelo líder
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      className="btn-pwa-secondary"
                      onClick={() => handleRequestJoin(cell.id)}
                      style={{ fontWeight: 800 }}
                    >
                      Solicitar Participação
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
