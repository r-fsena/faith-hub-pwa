import React, { useState, useEffect } from 'react';
import { 
  fetchCellGroups, 
  fetchCellPosts, 
  createCellPost, 
  fetchCellStudies, 
  fetchCellPartilhas, 
  togglePartilhaItem,
  requestJoinCell 
} from '../services/api';

interface CellGroup {
  id: string;
  name: string;
  network?: string;
  leader?: string;
  leader_name?: string;
  host?: string;
  neighborhood?: string;
  meeting_day?: string;
  meeting_time?: string;
  day_time?: string;
  whatsapp?: string;
  address?: string;
}

interface CellPost {
  id: string;
  author?: string;
  author_name?: string;
  avatar?: string;
  time_ago?: string;
  created_at?: string;
  content: string;
  likes?: number;
}

interface CellStudy {
  id: string;
  title: string;
  theme?: string;
  verse?: string;
  verse_reference?: string;
  icebreaker?: string;
  discussion_points?: string[] | string;
  practical_application?: string;
  content?: string;
}

interface SnackAssignment {
  id: string;
  date?: string;
  scheduled_date?: string;
  person?: string;
  member_name?: string;
  item: string;
  item_name?: string;
  confirmed?: boolean;
}

type PortalTab = 'dashboard' | 'mural' | 'estudos' | 'membros' | 'lanches';

export const CellGroups: React.FC = () => {
  const [cells, setCells] = useState<CellGroup[]>([]);
  const [viewMode, setViewMode] = useState<'portal' | 'discover'>('discover');
  const [myGroupId, setMyGroupId] = useState<string | null>(null);
  const [portalTab, setPortalTab] = useState<PortalTab>('dashboard');
  
  // Discover State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('ALL');
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);

  // Portal State
  const [posts, setPosts] = useState<CellPost[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [study, setStudy] = useState<CellStudy | null>(null);
  const [snacks, setSnacks] = useState<SnackAssignment[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const groupList = await fetchCellGroups();
    if (Array.isArray(groupList) && groupList.length > 0) {
      setCells(groupList);
      const savedGroupId = localStorage.getItem('faithhub_my_cell_group_id') || groupList[0].id;
      setMyGroupId(savedGroupId);
      setViewMode('portal');
      loadGroupSpecifics(savedGroupId);
    } else {
      setCells([]);
      setViewMode('discover');
    }
  };

  const loadGroupSpecifics = async (groupId: string) => {
    const p = await fetchCellPosts(groupId);
    if (Array.isArray(p)) setPosts(p);

    const s = await fetchCellStudies(groupId);
    if (Array.isArray(s) && s.length > 0) setStudy(s[0]);

    const l = await fetchCellPartilhas(groupId);
    if (Array.isArray(l)) setSnacks(l);
  };

  const myGroup = cells.find(g => g.id === myGroupId) || cells[0];

  const filteredCells = cells.filter(cell => {
    const name = cell.name || '';
    const neighborhood = cell.neighborhood || '';
    const leader = cell.leader || cell.leader_name || '';
    const network = cell.network || 'Geral';

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          leader.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNetwork = selectedNetwork === 'ALL' || network === selectedNetwork;
    return matchesSearch && matchesNetwork;
  });

  const handleRequestJoin = async (id: string) => {
    setPendingGroupId(id);
    await requestJoinCell('user_me', id);
    alert('Solicitação enviada com sucesso ao líder da célula!');
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() || !myGroupId) return;
    const res = await createCellPost({
      group_id: myGroupId,
      content: newPostText.trim(),
      author_name: 'Membro'
    });

    const newPost: CellPost = res || {
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

  const handleVolunteerSnack = async (snackId: string) => {
    await togglePartilhaItem(snackId);
    setSnacks(prev => prev.map(s => {
      if (s.id === snackId) {
        return { ...s, person: 'Eu (Voluntário)', member_name: 'Eu (Voluntário)', confirmed: true };
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
            {viewMode === 'portal' && myGroup ? 'Hub conectado da sua célula' : 'Encontre uma célula perto de você'}
          </p>
        </div>

        {cells.length > 0 && (
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
            {viewMode === 'portal' ? '🔍 Explorar' : '🏠 Minha Célula'}
          </button>
        )}
      </div>

      {/* ========================================================
          MODO 1: PORTAL CONECTADO DA MINHA CÉLULA (SUB-APP)
          ======================================================== */}
      {viewMode === 'portal' && myGroup ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card Hero da Minha Célula */}
          <div style={{ background: 'var(--accent-primary-gradient)', color: '#ffffff', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                  CÉLULA CONECTADA • {myGroup.network || 'Geral'}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: '2px' }}>
                  {myGroup.name}
                </h3>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 14px', borderRadius: '12px', marginTop: '14px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>👤 <strong>Liderança:</strong> {myGroup.leader || myGroup.leader_name || 'Pastoral'}</div>
              <div>🗓️ <strong>Encontro:</strong> {myGroup.meeting_day ? `${myGroup.meeting_day} às ${myGroup.meeting_time}` : (myGroup.day_time || 'A definir')}</div>
              {myGroup.address && <div>📍 <strong>Endereço:</strong> {myGroup.address} {myGroup.neighborhood ? `(${myGroup.neighborhood})` : ''}</div>}
            </div>
          </div>

          {/* Abas de Navegação Interna da Célula */}
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'dashboard', label: '📊 Início' },
              { id: 'mural', label: '💬 Mural' },
              { id: 'estudos', label: '📖 Estudos' },
              { id: 'lanches', label: '☕ Partilha' }
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
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: DASHBOARD */}
          {portalTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Estudo da Semana */}
              <div 
                onClick={() => setPortalTab('estudos')}
                style={{ background: '#ffffff', border: '1px solid var(--panel-border)', borderRadius: '18px', padding: '16px', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
              >
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  ESTUDO DA SEMANA
                </span>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 2px 0' }}>
                  {study?.title || 'Nenhum estudo publicado para esta semana'}
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                  {study?.verse || study?.verse_reference || 'Toque para ver a ministração e quebra-gelo'}
                </p>
              </div>

              {/* Botão de WhatsApp do Líder */}
              {myGroup.whatsapp && (
                <a
                  href={`https://wa.me/${myGroup.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pwa-secondary"
                  style={{ textDecoration: 'none', color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                >
                  💬 Falar com o Líder no WhatsApp
                </a>
              )}
            </div>
          )}

          {/* TAB: MURAL */}
          {portalTab === 'mural' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <form onSubmit={handleAddPost} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  className="input-pwa"
                  placeholder="Compartilhe um recado, aviso ou gratidão com a célula..."
                  rows={3}
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                />
                <button type="submit" className="btn-pwa-primary" style={{ padding: '10px', fontSize: '0.82rem' }}>
                  Publicar no Mural
                </button>
              </form>

              {posts.length === 0 ? (
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Nenhum recado no mural ainda. Seja o primeiro a publicar!
                </div>
              ) : (
                posts.map(p => (
                  <div key={p.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)' }}>{p.author || p.author_name || 'Membro'}</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>{p.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: ESTUDOS */}
          {portalTab === 'estudos' && (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {study ? (
                <>
                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                    {study.theme || 'Estudo Bíblico'}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                    {study.title}
                  </h3>
                  {study.verse && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                      {study.verse}
                    </div>
                  )}
                  {study.content && (
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {study.content}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  Nenhum estudo publicado para esta semana no momento.
                </div>
              )}
            </div>
          )}

          {/* TAB: LANCHES / PARTILHA */}
          {portalTab === 'lanches' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {snacks.length === 0 ? (
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Nenhum item de lanche ou partilha cadastrado para os próximos encontros.
                </div>
              ) : (
                snacks.map(snack => (
                  <div key={snack.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>{snack.item || snack.item_name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Responsável: {snack.person || snack.member_name || 'A definir'}</div>
                    </div>
                    {!snack.confirmed && (
                      <button type="button" className="btn-pwa-primary" onClick={() => handleVolunteerSnack(snack.id)} style={{ width: 'auto', padding: '6px 12px', fontSize: '0.74rem' }}>
                        Eu Levo!
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      ) : (
        /* ========================================================
            MODO 2: EXPLORAR / DISCOVER CÉLULAS
            ======================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="text"
            className="input-pwa"
            placeholder="Buscar por bairro, nome ou líder..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          {filteredCells.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>👥</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                Nenhuma célula cadastrada
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0', lineHeight: 1.4 }}>
                As células, redes e grupos caseiros cadastrados no Portal Web aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            filteredCells.map(cell => (
              <div key={cell.id} style={{ background: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                      {cell.network || 'Geral'}
                    </span>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                      {cell.name}
                    </h4>
                  </div>
                  {cell.neighborhood && (
                    <span style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                      📍 {cell.neighborhood}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  👤 <strong>Líder:</strong> {cell.leader || cell.leader_name || 'Pastoral'}
                </div>

                <button 
                  type="button" 
                  className="btn-pwa-primary" 
                  onClick={() => handleRequestJoin(cell.id)}
                  style={{ marginTop: '6px', padding: '10px', fontSize: '0.80rem' }}
                >
                  {pendingGroupId === cell.id ? '✓ Solicitação Enviada' : 'Quero Participar desta Célula'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};
