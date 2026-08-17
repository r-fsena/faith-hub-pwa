import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchCellGroups, 
  fetchCellPosts, 
  createCellPost, 
  fetchCellStudies, 
  fetchCellPartilhas, 
  togglePartilhaItem,
  requestJoinCell,
  fetchCellGroupDetails,
  evaluateCellJoinRequest,
  createPartilhaItem,
  deletePartilhaItem,
  removeCellMember,
  updateCellGroupDetails
} from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

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
  whatsapp_contact?: string;
  address?: string;
  description?: string;
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
  event_date?: string;
  person?: string;
  member_name?: string;
  user_name?: string;
  item: string;
  item_name?: string;
  quantity?: string;
  confirmed?: boolean;
  is_confirmed?: boolean;
}

interface CellMember {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  created_at?: string;
}

type PortalTab = 'dashboard' | 'mural' | 'estudos' | 'lanches' | 'lideranca';
type LeaderSubTab = 'requests' | 'members' | 'lanches' | 'settings';

export const CellGroups: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [cells, setCells] = useState<CellGroup[]>([]);
  const [viewMode, setViewMode] = useState<'portal' | 'discover'>('discover');
  const [myGroupId, setMyGroupId] = useState<string | null>(null);
  const [portalTab, setPortalTab] = useState<PortalTab>('dashboard');
  const [isCellLeader, setIsCellLeader] = useState(false);
  
  // Discover State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('ALL');
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);

  // Portal State
  const [posts, setPosts] = useState<CellPost[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [study, setStudy] = useState<CellStudy | null>(null);
  const [snacks, setSnacks] = useState<SnackAssignment[]>([]);

  // Leader Hub State
  const [leaderSubTab, setLeaderSubTab] = useState<LeaderSubTab>('requests');
  const [pendingUsers, setPendingUsers] = useState<CellMember[]>([]);
  const [groupMembers, setGroupMembers] = useState<CellMember[]>([]);
  const [, setLoadingDetails] = useState(false);
  
  // Form add snack
  const [newSnackItem, setNewSnackItem] = useState('');
  const [newSnackDate, setNewSnackDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSnackQty, setNewSnackQty] = useState('');
  const [isAddingSnack, setIsAddingSnack] = useState(false);

  // Form edit meeting
  const [editMeetingDay, setEditMeetingDay] = useState('');
  const [editMeetingTime, setEditMeetingTime] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [user, isAuthenticated]);

  const loadAllData = async () => {
    const groupList = await fetchCellGroups();
    const cellsArray = Array.isArray(groupList) ? groupList : [];
    setCells(cellsArray);

    let assignedGroupId: string | null = null;
    let userRole = 'Membro';

    if (user?.email) {
      try {
        const res = await fetch(`${API_URL}/members?organization_id=org_default`);
        if (res.ok) {
          const json = await res.json();
          const member = (json.data || []).find((m: any) => 
            m.email?.toLowerCase() === user.email?.toLowerCase() || m.id === user.userId
          );
          if (member) {
            userRole = member.role || 'Membro';
            if (member.cell_group_id) {
              assignedGroupId = member.cell_group_id;
            }
            if (member.pending_cell_group_id) {
              setPendingGroupId(member.pending_cell_group_id);
            }
          }
        }
      } catch (e) {}

      if (!assignedGroupId) {
        assignedGroupId = localStorage.getItem(`faithhub_my_cell_group_id_${user.email.toLowerCase()}`);
      }
    }

    const matchedGroup = cellsArray.find(c => c.id === assignedGroupId);

    if (matchedGroup) {
      setMyGroupId(matchedGroup.id);
      setViewMode('portal');

      const roleUpper = userRole.toUpperCase();
      const isLeader = Boolean(
        (matchedGroup.leader_name && user?.name && matchedGroup.leader_name.toLowerCase() === user.name.toLowerCase()) ||
        (matchedGroup.leader && user?.name && matchedGroup.leader.toLowerCase() === user.name.toLowerCase()) ||
        ['ADMIN', 'PASTOR', 'LEADER', 'LÍDER', 'ADMINISTRADOR'].includes(roleUpper)
      );
      setIsCellLeader(isLeader);

      loadGroupSpecifics(matchedGroup.id, cellsArray);
    } else {
      setMyGroupId(null);
      setViewMode('discover');
      setIsCellLeader(false);
    }
  };

  const loadGroupSpecifics = async (groupId: string, groupList?: CellGroup[]) => {
    const p = await fetchCellPosts(groupId);
    if (Array.isArray(p)) setPosts(p);

    const s = await fetchCellStudies(groupId);
    if (Array.isArray(s) && s.length > 0) setStudy(s[0]);

    const l = await fetchCellPartilhas(groupId);
    if (Array.isArray(l)) setSnacks(l);

    // Carrega dados completos de liderança (pedidos pendentes e membros)
    setLoadingDetails(true);
    const details = await fetchCellGroupDetails(groupId);
    if (details) {
      if (Array.isArray(details.pending_users)) setPendingUsers(details.pending_users);
      if (Array.isArray(details.members)) setGroupMembers(details.members);
      
      setEditMeetingDay(details.meeting_day || '');
      setEditMeetingTime(details.meeting_time || '');
      setEditAddress(details.address || '');
      setEditWhatsapp(details.whatsapp_contact || details.whatsapp || '');
    } else {
      const activeCell = (groupList || cells).find(c => c.id === groupId);
      if (activeCell) {
        setEditMeetingDay(activeCell.meeting_day || '');
        setEditMeetingTime(activeCell.meeting_time || '');
        setEditAddress(activeCell.address || '');
        setEditWhatsapp(activeCell.whatsapp || activeCell.whatsapp_contact || '');
      }
    }
    setLoadingDetails(false);
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
        return { ...s, person: 'Eu (Voluntário)', member_name: 'Eu (Voluntário)', confirmed: true, is_confirmed: true };
      }
      return s;
    }));
    alert('Obrigado por abençoar a célula com o lanche!');
  };

  // --- LÍDER ACTIONS ---
  const handleApproveMember = async (member: CellMember) => {
    if (!myGroupId) return;
    const ok = await evaluateCellJoinRequest(myGroupId, member.id, true);
    if (ok) {
      setPendingUsers(prev => prev.filter(u => u.id !== member.id));
      setGroupMembers(prev => [member, ...prev]);
      alert(`✓ ${member.name} foi aprovado(a) com sucesso na célula!`);
    } else {
      alert('Erro ao aprovar solicitação.');
    }
  };

  const handleRejectMember = async (member: CellMember) => {
    if (!myGroupId) return;
    if (!confirm(`Deseja recusar a entrada de ${member.name}?`)) return;
    const ok = await evaluateCellJoinRequest(myGroupId, member.id, false);
    if (ok) {
      setPendingUsers(prev => prev.filter(u => u.id !== member.id));
    }
  };

  const handleRemoveMember = async (member: CellMember) => {
    if (!myGroupId) return;
    if (!confirm(`Remover ${member.name} desta célula?`)) return;
    const ok = await removeCellMember(myGroupId, member.id);
    if (ok) {
      setGroupMembers(prev => prev.filter(u => u.id !== member.id));
      alert(`${member.name} foi desvinculado(a) da célula.`);
    }
  };

  const handleCreateSnack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGroupId || !newSnackItem.trim() || !newSnackDate) return;
    setIsAddingSnack(true);
    const res = await createPartilhaItem({
      cell_group_id: myGroupId,
      item_name: newSnackItem.trim(),
      event_date: newSnackDate,
      quantity: newSnackQty.trim()
    });
    if (res && res.partilha) {
      setSnacks(prev => [res.partilha, ...prev]);
      setNewSnackItem('');
      setNewSnackQty('');
      alert('✓ Item adicionado à escala de lanche da célula!');
    }
    setIsAddingSnack(false);
  };

  const handleDeleteSnack = async (snackId: string) => {
    if (!confirm('Remover este item da escala?')) return;
    const ok = await deletePartilhaItem(snackId);
    if (ok) {
      setSnacks(prev => prev.filter(s => s.id !== snackId));
    }
  };

  const handleSaveMeetingInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGroupId || !myGroup) return;
    setSavingMeeting(true);
    setSaveSuccess(false);

    const ok = await updateCellGroupDetails({
      id: myGroupId,
      name: myGroup.name,
      meeting_day: editMeetingDay,
      meeting_time: editMeetingTime,
      address: editAddress,
      whatsapp_contact: editWhatsapp
    });

    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setCells(prev => prev.map(c => c.id === myGroupId ? {
        ...c,
        meeting_day: editMeetingDay,
        meeting_time: editMeetingTime,
        address: editAddress,
        whatsapp: editWhatsapp,
        whatsapp_contact: editWhatsapp
      } : c));
    } else {
      alert('Erro ao atualizar informações do encontro.');
    }
    setSavingMeeting(false);
  };

  return (
    <div className="pwa-content animate-fade-in" style={{ paddingBottom: '90px' }}>
      
      {/* Header com Switch entre "Minha Célula" e "Explorar Células" */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem', margin: 0 }}>Células & Redes</h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            {viewMode === 'portal' && myGroup ? 'Hub conectado do seu Pequeno Grupo' : 'Encontre uma célula perto de você'}
          </p>
        </div>

        {cells.length > 0 && myGroupId && (
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

          {/* Abas de Navegação Interna da Célula (Incluindo Gestão do Líder se for Líder) */}
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'dashboard', label: '📊 Início' },
              { id: 'mural', label: '💬 Mural' },
              { id: 'estudos', label: '📖 Estudos' },
              { id: 'lanches', label: '☕ Partilha' },
              ...(isCellLeader ? [{ 
                id: 'lideranca', 
                label: pendingUsers.length > 0 ? `🛡️ Gestão do Líder (${pendingUsers.length})` : '🛡️ Gestão do Líder' 
              }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPortalTab(tab.id as PortalTab)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: portalTab === tab.id ? '1.5px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                  background: portalTab === tab.id 
                    ? 'var(--accent-primary-light)' 
                    : (tab.id === 'lideranca' && pendingUsers.length > 0 ? '#fef2f2' : '#ffffff'),
                  color: portalTab === tab.id 
                    ? 'var(--accent-primary)' 
                    : (tab.id === 'lideranca' && pendingUsers.length > 0 ? '#dc2626' : 'var(--text-main)'),
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

          {/* TAB 1: DASHBOARD */}
          {portalTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Notificação rápida para o Líder se houver novos pedidos */}
              {pendingUsers.length > 0 && (
                <div 
                  onClick={() => { setPortalTab('lideranca'); setLeaderSubTab('requests'); }}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔔</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#991b1b' }}>
                        {pendingUsers.length} solicitação(ões) de entrada pendente(s)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                        Toque para aprovar os novos participantes da célula
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#dc2626' }}>Ver ➔</span>
                </div>
              )}

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
              {(myGroup.whatsapp || myGroup.whatsapp_contact) && (
                <a
                  href={`https://wa.me/${(myGroup.whatsapp || myGroup.whatsapp_contact || '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pwa-secondary"
                  style={{ textDecoration: 'none', color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <span>💬</span>
                  <span>Falar com o Líder no WhatsApp</span>
                </a>
              )}
            </div>
          )}

          {/* TAB 2: MURAL */}
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

          {/* TAB 3: ESTUDOS */}
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

          {/* TAB 4: LANCHES / PARTILHA (VISÃO MEMBROS) */}
          {portalTab === 'lanches' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Escala de Lanches & Comunhão
                </span>
                <button 
                  type="button"
                  onClick={() => { setPortalTab('lideranca'); setLeaderSubTab('lanches'); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  + Adicionar Item (Líder)
                </button>
              </div>

              {snacks.length === 0 ? (
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Nenhum item de lanche cadastrado para os próximos encontros.
                </div>
              ) : (
                snacks.map(snack => {
                  const isConfirmed = snack.confirmed || snack.is_confirmed;
                  return (
                    <div key={snack.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                          {snack.item || snack.item_name} {snack.quantity ? `(${snack.quantity})` : ''}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          🗓️ {snack.event_date || snack.scheduled_date || snack.date || 'Próximo Encontro'} • 👤 {snack.person || snack.member_name || snack.user_name || 'A definir'}
                        </div>
                      </div>
                      {!isConfirmed ? (
                        <button type="button" className="btn-pwa-primary" onClick={() => handleVolunteerSnack(snack.id)} style={{ width: 'auto', padding: '6px 12px', fontSize: '0.74rem' }}>
                          Eu Levo!
                        </button>
                      ) : (
                        <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          ✓ Confirmado
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================
              TAB 5: PAINEL DE GESTÃO DO LÍDER (ORGANIZADO NA CÉLULA)
              ======================================================== */}
          {portalTab === 'lideranca' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Sub-navegação do Líder */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '14px' }}>
                {[
                  { id: 'requests', label: pendingUsers.length > 0 ? `Pedidos (${pendingUsers.length})` : 'Pedidos' },
                  { id: 'members', label: `Membros (${groupMembers.length})` },
                  { id: 'lanches', label: 'Lanches' },
                  { id: 'settings', label: 'Encontro' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setLeaderSubTab(sub.id as LeaderSubTab)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: 'none',
                      background: leaderSubTab === sub.id ? '#ffffff' : 'transparent',
                      color: leaderSubTab === sub.id ? 'var(--text-main)' : 'var(--text-muted)',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      boxShadow: leaderSubTab === sub.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      textAlign: 'center'
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* SUBTAB 1: SOLICITAÇÕES DE ENTRADA PENDENTES */}
              {leaderSubTab === 'requests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Pessoas que solicitaram entrar na sua célula pelo aplicativo:
                  </div>

                  {pendingUsers.length === 0 ? (
                    <div style={{ background: '#ffffff', borderRadius: '18px', padding: '30px 20px', textAlign: 'center', border: '1px solid var(--panel-border)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                      <div style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main)' }}>
                        Nenhuma solicitação pendente
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Quando novos membros ou visitantes pedirem ingresso no app, eles aparecerão aqui para sua aprovação.
                      </div>
                    </div>
                  ) : (
                    pendingUsers.map(user => (
                      <div key={user.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #fecaca', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {user.phone ? `📱 ${user.phone}` : (user.email ? `✉️ ${user.email}` : 'Novo Membro')}
                            </div>
                          </div>
                          <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800 }}>
                            Pendente
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleApproveMember(user)}
                            style={{ flex: 1, background: '#059669', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}
                          >
                            ✓ Aprovar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRejectMember(user)}
                            style={{ background: '#f1f5f9', color: '#dc2626', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer' }}
                          >
                            ✕ Recusar
                          </button>

                          {user.phone && (
                            <a
                              href={`https://wa.me/${user.phone.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(user.name)}!%20Vi%20sua%20solicita%C3%A7%C3%A3o%20para%20nossa%20c%C3%A9lula%20${encodeURIComponent(myGroup.name)}!`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '8px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.76rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              💬 WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUBTAB 2: MEMBROS ATIVOS DA CÉLULA */}
              {leaderSubTab === 'members' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Participantes integrados à sua célula ({groupMembers.length}):
                  </div>

                  {groupMembers.length === 0 ? (
                    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      Nenhum membro vinculado ainda. Aprove as solicitações para montar sua equipe!
                    </div>
                  ) : (
                    groupMembers.map(member => (
                      <div key={member.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '14px', border: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                            {member.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {member.phone ? `📱 ${member.phone}` : (member.email || 'Membro')}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {member.phone && (
                            <a
                              href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ background: '#ecfdf5', color: '#059669', padding: '6px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, textDecoration: 'none' }}
                            >
                              💬 Contato
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member)}
                            title="Desvincular da célula"
                            style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 8px', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUBTAB 3: LANCHES & PARTILHA (GESTÃO DO LÍDER) */}
              {leaderSubTab === 'lanches' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Formulário para Adicionar Item */}
                  <form onSubmit={handleCreateSnack} style={{ background: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                      + Adicionar Item na Escala de Lanches
                    </div>
                    
                    <input 
                      type="text" 
                      className="input-pwa"
                      placeholder="Ex: Bolo de Cenoura, Salgadinhos, Suco de Laranja..."
                      value={newSnackItem}
                      onChange={e => setNewSnackItem(e.target.value)}
                      required
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Data do Encontro</label>
                        <input 
                          type="date" 
                          className="input-pwa"
                          value={newSnackDate}
                          onChange={e => setNewSnackDate(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Quantidade (Opcional)</label>
                        <input 
                          type="text" 
                          className="input-pwa"
                          placeholder="Ex: 2 garrafas"
                          value={newSnackQty}
                          onChange={e => setNewSnackQty(e.target.value)}
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-pwa-primary"
                      disabled={isAddingSnack}
                      style={{ marginTop: '4px', padding: '10px', fontSize: '0.80rem' }}
                    >
                      {isAddingSnack ? 'Adicionando...' : 'Adicionar à Escala'}
                    </button>
                  </form>

                  {/* Lista de Itens com opção de excluir */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Itens Ativos na Escala ({snacks.length}):
                    </div>

                    {snacks.length === 0 ? (
                      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Nenhum item adicionado ainda.
                      </div>
                    ) : (
                      snacks.map(snack => (
                        <div key={snack.id} style={{ background: '#ffffff', borderRadius: '14px', padding: '12px 14px', border: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                              {snack.item || snack.item_name} {snack.quantity ? `(${snack.quantity})` : ''}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              🗓️ {snack.event_date || snack.scheduled_date || 'Encontro'} • 👤 {snack.person || snack.member_name || snack.user_name || 'A definir'}
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteSnack(snack.id)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.80rem', cursor: 'pointer', padding: '4px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* SUBTAB 4: CONFIGURAÇÃO RÁPIDA DO ENCONTRO */}
              {leaderSubTab === 'settings' && (
                <form onSubmit={handleSaveMeetingInfo} style={{ background: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                    ⚙️ Informações do Encontro Semanal
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Dia da Semana
                    </label>
                    <input 
                      type="text" 
                      className="input-pwa"
                      placeholder="Ex: Toda Quarta-feira"
                      value={editMeetingDay}
                      onChange={e => setEditMeetingDay(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Horário do Encontro
                    </label>
                    <input 
                      type="text" 
                      className="input-pwa"
                      placeholder="Ex: 20:00"
                      value={editMeetingTime}
                      onChange={e => setEditMeetingTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Endereço / Casa do Anfitrião
                    </label>
                    <input 
                      type="text" 
                      className="input-pwa"
                      placeholder="Ex: Rua das Palmeiras, 120 (Apto 402)"
                      value={editAddress}
                      onChange={e => setEditAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      WhatsApp de Contato da Liderança
                    </label>
                    <input 
                      type="text" 
                      className="input-pwa"
                      placeholder="Ex: 48999999999"
                      value={editWhatsapp}
                      onChange={e => setEditWhatsapp(e.target.value)}
                    />
                  </div>

                  {saveSuccess && (
                    <div style={{ background: '#ecfdf5', color: '#059669', padding: '8px 12px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: 800, textAlign: 'center' }}>
                      ✓ Dados do encontro atualizados com sucesso!
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn-pwa-primary"
                    disabled={savingMeeting}
                    style={{ marginTop: '6px', padding: '10px', fontSize: '0.82rem' }}
                  >
                    {savingMeeting ? 'Salvando...' : 'Salvar Alterações do Encontro'}
                  </button>
                </form>
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
