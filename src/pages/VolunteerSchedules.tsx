import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMySchedules, respondToSchedule, fetchMinistries, joinMinistry } from '../services/api';

interface VolunteerSchedulesProps {
  onBack?: () => void;
}

export const VolunteerSchedules: React.FC<VolunteerSchedulesProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my_schedules' | 'join_ministry'>('my_schedules');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeringItemId, setAnsweringItemId] = useState<string | null>(null);
  const [declineReasonModal, setDeclineReasonModal] = useState<string | null>(null);
  const [declineText, setDeclineText] = useState('');
  const [joiningMinId, setJoiningMinId] = useState<string | null>(null);
  const [joinRolesText, setJoinRolesText] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sch, mins] = await Promise.all([
        fetchMySchedules(),
        fetchMinistries()
      ]);
      setSchedules(sch || []);
      setMinistries(mins || []);
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
              Seus cultos escalados e oportunidades de servir
            </p>
          </div>
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 16px' }}>
        <button
          onClick={() => setActiveTab('my_schedules')}
          style={{
            padding: '10px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'my_schedules' ? 'var(--accent-primary, #0f766e)' : 'var(--panel-bg, #ffffff)',
            color: activeTab === 'my_schedules' ? '#ffffff' : 'var(--text-muted, #64748b)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06))'
          }}
        >
          Minhas Escalas ({schedules.length})
        </button>

        <button
          onClick={() => setActiveTab('join_ministry')}
          style={{
            padding: '10px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'join_ministry' ? 'var(--accent-primary, #0f766e)' : 'var(--panel-bg, #ffffff)',
            color: activeTab === 'join_ministry' ? '#ffffff' : 'var(--text-muted, #64748b)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06))'
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
                        ✓ Sua vaga está garantida no altar!
                      </span>
                      <button
                        onClick={() => setDeclineReasonModal(item.roster_item_id)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.74rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Tive um imprevisto
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          
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
        )}
      </div>

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

    </div>
  );
};
