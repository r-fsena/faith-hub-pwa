import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchMySchedules, 
  respondToSchedule, 
  fetchMinistries, 
  joinMinistry, 
  fetchMyBlockouts, 
  createBlockout, 
  deleteBlockout,
  fetchEligiblePeersForSwap,
  requestRosterSwap,
  fetchMyPendingSwaps,
  respondToSwap
} from '../services/api';

interface VolunteerSchedulesProps {
  onBack?: () => void;
}

export const VolunteerSchedules: React.FC<VolunteerSchedulesProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my_schedules' | 'swaps' | 'blockouts' | 'join_ministry'>('my_schedules');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [blockouts, setBlockouts] = useState<any[]>([]);
  const [pendingSwaps, setPendingSwaps] = useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [answeringItemId, setAnsweringItemId] = useState<string | null>(null);
  const [declineReasonModal, setDeclineReasonModal] = useState<string | null>(null);
  const [declineText, setDeclineText] = useState('');
  const [joiningMinId, setJoiningMinId] = useState<string | null>(null);
  const [joinRolesText, setJoinRolesText] = useState('');

  // Estados do Modal de Novo Bloqueio
  const [isBlockoutModalOpen, setIsBlockoutModalOpen] = useState(false);
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('Viagem / Férias');
  const [savingBlockout, setSavingBlockout] = useState(false);

  // Estados do Shift Swap (Troca de Escalas)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTargetSchedule, setSwapTargetSchedule] = useState<any | null>(null);
  const [eligiblePeers, setEligiblePeers] = useState<any[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [swapReason, setSwapReason] = useState('');
  const [requestingSwap, setRequestingSwap] = useState(false);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [respondingSwapId, setRespondingSwapId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sch, mins, blk, swp] = await Promise.all([
        fetchMySchedules(),
        fetchMinistries(),
        fetchMyBlockouts(),
        fetchMyPendingSwaps()
      ]);
      setSchedules(sch || []);
      setMinistries(mins || []);
      setBlockouts(blk || []);
      setPendingSwaps(swp || { incoming: [], outgoing: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRespond = async (rosterItemId: string, status: 'ACCEPTED' | 'DECLINED', reason?: string) => {
    setAnsweringItemId(rosterItemId);
    try {
      const ok = await respondToSchedule(rosterItemId, status, reason);
      if (ok) {
        setSchedules(prev => prev.map(item => {
          if (item.roster_item_id === rosterItemId) {
            return {
              ...item,
              confirmation_status: status,
              decline_reason: reason || null
            };
          }
          return item;
        }));
        setDeclineReasonModal(null);
        setDeclineText('');
      } else {
        alert('Erro ao responder à escala. Tente novamente.');
      }
    } finally {
      setAnsweringItemId(null);
    }
  };

  const handleJoinMinistry = async (ministryId: string) => {
    if (!user) return alert('Você precisa estar autenticado para se voluntariar.');
    try {
      const ok = await joinMinistry(ministryId, user.userId || 'me', joinRolesText);
      if (ok) {
        alert('✓ Sua candidatura foi enviada para a liderança do ministério com sucesso!');
        setJoiningMinId(null);
        setJoinRolesText('');
      } else {
        alert('Erro ao enviar inscrição.');
      }
    } catch (e) {
      alert('Erro ao se inscrever.');
    }
  };

  const handleCreateBlockout = async () => {
    if (!blockStartDate || !blockEndDate) {
      return alert('Por favor selecione a data de início e término do bloqueio.');
    }
    if (blockStartDate > blockEndDate) {
      return alert('A data de término deve ser igual ou posterior à data de início.');
    }
    setSavingBlockout(true);
    try {
      const ok = await createBlockout(blockStartDate, blockEndDate, blockReason);
      if (ok) {
        setIsBlockoutModalOpen(false);
        setBlockStartDate('');
        setBlockEndDate('');
        setBlockReason('Viagem / Férias');
        const updated = await fetchMyBlockouts();
        setBlockouts(updated || []);
      } else {
        alert('Erro ao salvar bloqueio de data.');
      }
    } finally {
      setSavingBlockout(false);
    }
  };

  const handleDeleteBlockout = async (id: string) => {
    if (!confirm('Deseja realmente remover este bloqueio de indisponibilidade?')) return;
    try {
      const ok = await deleteBlockout(id);
      if (ok) {
        setBlockouts(prev => prev.filter(b => b.id !== id));
      } else {
        alert('Erro ao remover bloqueio.');
      }
    } catch (e) {
      alert('Erro ao remover.');
    }
  };

  const handleOpenSwapModal = async (scheduleItem: any) => {
    setSwapTargetSchedule(scheduleItem);
    setSwapReason('');
    setSelectedPeerId('');
    setIsSwapModalOpen(true);
    setLoadingPeers(true);
    try {
      const peers = await fetchEligiblePeersForSwap(scheduleItem.schedule_id, scheduleItem.role_id || '');
      setEligiblePeers(peers || []);
    } catch {
      setEligiblePeers([]);
    } finally {
      setLoadingPeers(false);
    }
  };

  const handleConfirmSwapRequest = async () => {
    if (!swapTargetSchedule) return;
    setRequestingSwap(true);
    try {
      const res = await requestRosterSwap(
        swapTargetSchedule.roster_item_id,
        selectedPeerId || undefined,
        swapReason.trim() || undefined
      );
      if (res.success) {
        alert('✓ Solicitação de troca enviada com sucesso!');
        setIsSwapModalOpen(false);
        loadData();
      } else {
        alert(res.message || 'Erro ao enviar pedido de troca.');
      }
    } finally {
      setRequestingSwap(false);
    }
  };

  const handleRespondSwap = async (swapId: string, action: 'ACCEPT' | 'REJECT') => {
    setRespondingSwapId(swapId);
    try {
      const res = await respondToSwap(swapId, action);
      if (res.success) {
        alert(res.message);
        loadData();
      } else {
        alert(res.message || 'Erro ao responder à troca.');
      }
    } finally {
      setRespondingSwapId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%', paddingBottom: '40px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'var(--panel-bg, #ffffff)',
                border: '1px solid var(--panel-border, #e2e8f0)',
                borderRadius: '12px',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-main, #0f172a)',
                fontSize: '1rem'
              }}
            >
              ←
            </button>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
              Escalas & Voluntariado
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
              Seus cultos escalados, agenda e oportunidades de servir
            </p>
          </div>
        </div>
      </div>

      {/* ABAS (4 Segmentos) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', padding: '0 16px' }}>
        <button
          onClick={() => setActiveTab('my_schedules')}
          style={{
            padding: '10px 2px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'my_schedules' ? 'var(--accent-primary, #0f766e)' : 'var(--panel-bg, #ffffff)',
            color: activeTab === 'my_schedules' ? '#ffffff' : 'var(--text-muted, #64748b)',
            fontWeight: 800,
            fontSize: '0.72rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06))',
            whiteSpace: 'nowrap',
            textAlign: 'center'
          }}
        >
          Escalas ({schedules.length})
        </button>

        <button
          onClick={() => setActiveTab('swaps')}
          style={{
            padding: '10px 2px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'swaps' ? 'var(--accent-primary, #0f766e)' : 'var(--panel-bg, #ffffff)',
            color: activeTab === 'swaps' ? '#ffffff' : 'var(--text-muted, #64748b)',
            fontWeight: 800,
            fontSize: '0.72rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06))',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          Trocas {pendingSwaps.incoming.length > 0 && `(${pendingSwaps.incoming.length})`}
          {pendingSwaps.incoming.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444'
            }} />
          )}
        </button>

        <button
          onClick={() => setActiveTab('blockouts')}
          style={{
            padding: '10px 2px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'blockouts' ? 'var(--accent-primary, #0f766e)' : 'var(--panel-bg, #ffffff)',
            color: activeTab === 'blockouts' ? '#ffffff' : 'var(--text-muted, #64748b)',
            fontWeight: 800,
            fontSize: '0.72rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06))',
            whiteSpace: 'nowrap',
            textAlign: 'center'
          }}
        >
          Bloqueios ({blockouts.length})
        </button>

        <button
          onClick={() => setActiveTab('join_ministry')}
          style={{
            padding: '10px 2px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'join_ministry' ? 'var(--accent-primary, #0f766e)' : 'var(--panel-bg, #ffffff)',
            color: activeTab === 'join_ministry' ? '#ffffff' : 'var(--text-muted, #64748b)',
            fontWeight: 800,
            fontSize: '0.72rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06))',
            whiteSpace: 'nowrap',
            textAlign: 'center'
          }}
        >
          Quero Servir 🤝
        </button>
      </div>

      {/* CONTEÚDO */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔄</div>
            <div>Carregando suas escalas...</div>
          </div>
        ) : activeTab === 'my_schedules' ? (
          
          /* ABA: MINHAS ESCALAS */
          schedules.length === 0 ? (
            <div style={{ background: 'var(--panel-bg, #ffffff)', borderRadius: '18px', padding: '36px 20px', textAlign: 'center', border: '1px solid var(--panel-border, #e2e8f0)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🙌</div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main, #0f172a)' }}>
                Você não possui escalas pendentes
              </div>
              <div style={{ fontSize: '0.80rem', color: 'var(--text-muted, #64748b)', marginTop: '6px' }}>
                Quando a liderança do seu ministério publicar a escala do próximo culto, ela aparecerá aqui para sua confirmação.
              </div>
              <button
                onClick={() => setActiveTab('join_ministry')}
                style={{
                  marginTop: '16px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--accent-primary, #0f766e)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer'
                }}
              >
                Conhecer Ministérios e Servir
              </button>
            </div>
          ) : (
            schedules.map(item => {
              const isAccepted = item.confirmation_status === 'ACCEPTED';
              const isDeclined = item.confirmation_status === 'DECLINED';
              const isPending = item.confirmation_status === 'PENDING';

              return (
                <div
                  key={item.roster_item_id}
                  style={{
                    background: 'var(--panel-bg, #ffffff)',
                    borderRadius: '18px',
                    padding: '18px',
                    border: isAccepted 
                      ? '1.5px solid #10b981' 
                      : (isDeclined ? '1.5px solid #ef4444' : '1.5px solid var(--accent-primary, #0f766e)'),
                    boxShadow: 'var(--shadow-sm, 0 2px 4px rgba(0,0,0,0.05))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Topo do Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: `${item.ministry_color || '#0f766e'}20`,
                        color: item.ministry_color || '#0f766e',
                        textTransform: 'uppercase'
                      }}>
                        {item.ministry_name}
                      </span>
                      <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
                        {item.service_title}
                      </div>
                      <div style={{ fontSize: '0.80rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                        📅 {new Date(item.service_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às {item.service_time}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '10px',
                      background: isAccepted ? '#ecfdf5' : (isDeclined ? '#fee2e2' : '#fef3c7'),
                      color: isAccepted ? '#059669' : (isDeclined ? '#dc2626' : '#d97706')
                    }}>
                      {isAccepted ? '✓ Confirmado' : (isDeclined ? '✗ Recusado' : '⏳ Aguardando Aceite')}
                    </span>
                  </div>

                  {/* Posição Escalada */}
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🏷️</span>
                    <div>
                      <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Sua Função nesta Escala
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '0.90rem', color: '#0f172a' }}>
                        {item.role_name}
                      </div>
                    </div>
                  </div>

                  {/* Notas / Orientações */}
                  {item.schedule_notes && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', background: '#fffbeb', padding: '8px 12px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                      <strong>Orientações:</strong> {item.schedule_notes}
                    </div>
                  )}

                  {/* Botões One-Tap de Confirmação */}
                  {isPending && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                      <button
                        onClick={() => handleRespond(item.roster_item_id, 'ACCEPTED')}
                        disabled={answeringItemId === item.roster_item_id}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: 'none',
                          background: '#10b981',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <span>✓</span>
                        <span>Confirmar</span>
                      </button>

                      <button
                        onClick={() => setDeclineReasonModal(item.roster_item_id)}
                        disabled={answeringItemId === item.roster_item_id}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1.5px solid #ef4444',
                          background: '#ffffff',
                          color: '#ef4444',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>✗</span>
                        <span>Não Poderei</span>
                      </button>
                    </div>
                  )}

                  {isAccepted && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
                        ✓ Sua vaga está garantida no altar!
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleOpenSwapModal(item)}
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#166534',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          🔄 Pedir Troca
                        </button>
                        <button
                          onClick={() => setDeclineReasonModal(item.roster_item_id)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.74rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  )}

                  {item.confirmation_status === 'SWAP_REQUESTED' && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🔄</span>
                      <div style={{ fontSize: '0.76rem', color: '#92400e', fontWeight: 700, lineHeight: 1.4 }}>
                        Troca solicitada para este culto. Aguardando confirmação de um colega voluntário.
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : activeTab === 'swaps' ? (
          /* ABA: TROCAS DE ESCALA (SHIFT SWAP) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* SOLICITAÇÕES RECEBIDAS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>📥</span>
                <span style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main, #0f172a)' }}>
                  Pedidos de Troca Recebidos ({pendingSwaps.incoming.length})
                </span>
              </div>

              {pendingSwaps.incoming.length === 0 ? (
                <div style={{ background: 'var(--panel-bg, #ffffff)', borderRadius: '14px', padding: '24px 16px', textAlign: 'center', border: '1px solid var(--panel-border, #e2e8f0)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🕊️</div>
                  <div style={{ fontSize: '0.80rem', color: 'var(--text-muted, #64748b)' }}>
                    Nenhum pedido de troca recebido no momento.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingSwaps.incoming.map(sw => (
                    <div
                      key={sw.swap_id}
                      style={{
                        background: 'var(--panel-bg, #ffffff)',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1.5px solid #3b82f6',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800 }}>
                            {sw.ministry_name}
                          </span>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main, #0f172a)', marginTop: '4px' }}>
                            {sw.requesting_member_name} precisa de substituto
                          </div>
                        </div>
                        <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
                          Função: <strong>{sw.role_name}</strong>
                        </span>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', fontSize: '0.78rem', color: '#334155' }}>
                        <div>📅 Culto: <strong>{sw.service_title}</strong></div>
                        <div style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '2px' }}>
                          {new Date(sw.service_date).toLocaleDateString('pt-BR')} às {sw.service_time}
                        </div>
                        {sw.reason && (
                          <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#475569' }}>
                            "{sw.reason}"
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={() => handleRespondSwap(sw.swap_id, 'ACCEPT')}
                          disabled={respondingSwapId === sw.swap_id}
                          style={{
                            padding: '10px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#10b981',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.80rem',
                            cursor: 'pointer'
                          }}
                        >
                          {respondingSwapId === sw.swap_id ? 'Confirmando...' : '✓ Assumir Vaga'}
                        </button>
                        <button
                          onClick={() => handleRespondSwap(sw.swap_id, 'REJECT')}
                          disabled={respondingSwapId === sw.swap_id}
                          style={{
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#64748b',
                            fontWeight: 700,
                            fontSize: '0.80rem',
                            cursor: 'pointer'
                          }}
                        >
                          Não Posso
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MINHAS SOLICITAÇÕES ENVIADAS */}
            {pendingSwaps.outgoing.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>📤</span>
                  <span style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main, #0f172a)' }}>
                    Suas Trocas Solicitadas ({pendingSwaps.outgoing.length})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingSwaps.outgoing.map(sw => (
                    <div
                      key={sw.swap_id}
                      style={{
                        background: 'var(--panel-bg, #ffffff)',
                        borderRadius: '14px',
                        padding: '14px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.80rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#0f172a' }}>{sw.service_title}</strong>
                        <span style={{
                          background: sw.status === 'PENDING' ? '#fef3c7' : (sw.status === 'ACCEPTED' ? '#dcfce7' : '#fee2e2'),
                          color: sw.status === 'PENDING' ? '#92400e' : (sw.status === 'ACCEPTED' ? '#15803d' : '#b91c1c'),
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.70rem'
                        }}>
                          {sw.status === 'PENDING' ? '⏳ Aguardando' : (sw.status === 'ACCEPTED' ? '✓ Aceita' : 'Recusada')}
                        </span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '2px' }}>
                        {new Date(sw.service_date).toLocaleDateString('pt-BR')} • {sw.role_name}
                      </div>
                      {sw.target_member_name && (
                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '4px' }}>
                          Destinado a: <strong>{sw.target_member_name}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : activeTab === 'join_ministry' ? (
          
          /* ABA: QUERO SERVIR (MINISTÉRIOS) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Escolha um ministério para manifestar interesse e entrar no bolsão de voluntários:
            </div>

            {ministries.map(min => (
              <div
                key={min.id}
                style={{
                  background: 'var(--panel-bg, #ffffff)',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid var(--panel-border, #e2e8f0)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: `${min.color || '#0f766e'}20`,
                      color: min.color || '#0f766e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900
                    }}>
                      {min.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main, #0f172a)' }}>
                        {min.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)' }}>
                        Líder: {min.leader_name || 'Coordenação Geral'}
                      </div>
                    </div>
                  </div>
                </div>

                {min.description && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.4 }}>
                    {min.description}
                  </div>
                )}

                {joiningMinId === min.id ? (
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                      Quais são seus dons/funções de interesse?
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Toco teclado, canto, já trabalhei com crianças..."
                      value={joinRolesText}
                      onChange={e => setJoinRolesText(e.target.value)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.80rem', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setJoiningMinId(null)}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleJoinMinistry(min.id)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#0f766e', color: '#fff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Confirmar Inscrição
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setJoiningMinId(min.id); setJoinRolesText(''); }}
                    style={{
                      marginTop: '4px',
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'var(--accent-primary-light, #f0fdfa)',
                      color: 'var(--accent-primary, #0f766e)',
                      fontWeight: 800,
                      fontSize: '0.80rem',
                      cursor: 'pointer'
                    }}
                  >
                    + Quero Fazer Parte Deste Ministério
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ABA: BLOQUEIOS DE INDISPONIBILIDADE (FASE 3) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* CARD EXPLICATIVO & BOTÃO NOVO BLOQUEIO */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              borderRadius: '18px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 4px 16px rgba(15,23,42,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>🗓️</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.98rem' }}>Agenda de Indisponibilidade</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Avise previamente quando estará viajando ou impossibilitado de servir
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                O sistema automaticamente sinalizará aos líderes dos seus ministérios para <strong>não escalarem você</strong> nas datas marcadas.
              </div>

              <button
                onClick={() => setIsBlockoutModalOpen(true)}
                style={{
                  background: '#0ea5e9',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>+</span>
                <span>Bloquear Data / Viagem</span>
              </button>
            </div>

            {/* LISTA DE BLOQUEIOS ATIVOS */}
            {blockouts.length === 0 ? (
              <div style={{
                background: 'var(--panel-bg, #ffffff)',
                borderRadius: '16px',
                padding: '30px 20px',
                textAlign: 'center',
                border: '1px solid var(--panel-border, #e2e8f0)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✨</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main, #0f172a)' }}>
                  Nenhum bloqueio cadastrado
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                  Sua agenda está livre e você está apto a ser convocado para as próximas escalas.
                </div>
              </div>
            ) : (
              blockouts.map(b => {
                const formatD = (dStr: string) => {
                  if (!dStr) return '';
                  const [y, m, d] = dStr.split('T')[0].split('-');
                  return `${d}/${m}/${y}`;
                };

                return (
                  <div
                    key={b.id}
                    style={{
                      background: 'var(--panel-bg, #ffffff)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid var(--panel-border, #e2e8f0)',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '20px'
                        }}>
                          🚫 Bloqueado
                        </span>
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                          {formatD(b.start_date)} até {formatD(b.end_date)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
                        Motivo: <strong>{b.reason || 'Compromisso pessoal'}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteBlockout(b.id)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '6px 12px',
                        color: '#ef4444',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                    >
                      Remover
                    </button>
                  </div>
                );
              })
            )}

          </div>
        )}
      </div>

      {/* MODAL: NOVO BLOQUEIO DE INDISPONIBILIDADE */}
      {isBlockoutModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '420px',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
              Bloquear Período de Escala
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
              Defina os dias em que você estará ausente da igreja para evitar convocação na escala.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                Data de Início
              </label>
              <input
                type="date"
                value={blockStartDate}
                onChange={e => setBlockStartDate(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                Data de Término
              </label>
              <input
                type="date"
                value={blockEndDate}
                onChange={e => setBlockEndDate(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                Motivo do Bloqueio
              </label>
              <select
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                <option value="Viagem / Férias">✈️ Viagem / Férias</option>
                <option value="Trabalho / Plantão">💼 Trabalho / Plantão</option>
                <option value="Saúde / Consulta">🏥 Saúde / Consulta / Repouso</option>
                <option value="Família / Pessoal">👨‍👩‍👧‍👦 Família / Pessoal</option>
                <option value="Outro Motivo">📌 Outro Motivo</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsBlockoutModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.80rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingBlockout}
                onClick={handleCreateBlockout}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0f766e',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: savingBlockout ? 'not-allowed' : 'pointer'
                }}
              >
                {savingBlockout ? 'Salvando...' : 'Confirmar Bloqueio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MOTIVO DA RECUSA */}
      {declineReasonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
              Justificar Ausência na Escala
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
              Ajude sua liderança a remanejar outro voluntário informando brevemente o motivo:
            </p>
            <textarea
              rows={3}
              placeholder="Ex: Viagem marcada, plantão de trabalho, consulta médica..."
              value={declineText}
              onChange={e => setDeclineText(e.target.value)}
              style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setDeclineReasonModal(null)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.80rem', cursor: 'pointer' }}
              >
                Voltar
              </button>
              <button
                onClick={() => handleRespond(declineReasonModal, 'DECLINED', declineText)}
                style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 800, fontSize: '0.80rem', cursor: 'pointer' }}
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SOLICITAR TROCA DE ESCALA (SHIFT SWAP) */}
      {isSwapModalOpen && swapTargetSchedule && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🔄</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  Pedir Troca de Escala
                </h3>
              </div>
              <button
                onClick={() => setIsSwapModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.80rem' }}>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{swapTargetSchedule.service_title}</div>
              <div style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '2px' }}>
                {new Date(swapTargetSchedule.service_date).toLocaleDateString('pt-BR')} às {swapTargetSchedule.service_time} • {swapTargetSchedule.role_name}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Colega Voluntário para Substituição:
              </label>
              {loadingPeers ? (
                <div style={{ fontSize: '0.78rem', color: '#64748b', padding: '8px' }}>Buscando voluntários aptos...</div>
              ) : (
                <select
                  value={selectedPeerId}
                  onChange={e => setSelectedPeerId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    background: '#ffffff'
                  }}
                >
                  <option value="">Qualquer voluntário apto (Solicitação aberta)</option>
                  {eligiblePeers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <span style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                {eligiblePeers.length} colegas aptos disponíveis nesta data/horário.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Motivo da Solicitação:
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Viagem imprevista, consulta médica, plantão de trabalho..."
                value={swapReason}
                onChange={e => setSwapReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.80rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSwapRequest}
                disabled={requestingSwap}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0f766e',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer'
                }}
              >
                {requestingSwap ? 'Enviando...' : 'Confirmar Pedido de Troca'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
