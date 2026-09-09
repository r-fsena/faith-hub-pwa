import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { BottomSheet } from './BottomSheet';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

interface KidsPagingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CALL_REASONS = [
  { id: 'CHORO', label: 'Choro Inconsolável', icon: '😭', color: '#ef4444', bg: '#fef2f2' },
  { id: 'FRALDA', label: 'Troca de Fralda', icon: '🧷', color: '#d97706', bg: '#fffbeb' },
  { id: 'MEDICAMENTO', label: 'Medicamento', icon: '💊', color: '#2563eb', bg: '#eff6ff' },
  { id: 'OUTRO', label: 'Necessidade / Outro', icon: '⚠️', color: '#7c3aed', bg: '#faf5ff' }
];

export const KidsPagingModal: React.FC<KidsPagingModalProps> = ({ isOpen, onClose }) => {
  const { branding } = useBranding();
  const orgId = branding.organization_id || branding.id || 'org_default';

  const [activeCheckins, setActiveCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Criar Chamada
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  const [selectedCheckinId, setSelectedCheckinId] = useState('');
  const [callReason, setCallReason] = useState('CHORO');
  const [callCustomMsg, setCallCustomMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    } else {
      setIsCreatingCall(false);
      setSelectedCheckinId('');
      setCallCustomMsg('');
    }
  }, [isOpen, orgId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/kids/checkins?organization_id=${encodeURIComponent(orgId)}&status=active`);
      if (res.ok) {
        const json = await res.json();
        setActiveCheckins(json.data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar chamados:', e);
    } finally {
      setLoading(false);
    }
  };

  // Disparar Alerta no Telão
  const handleTriggerCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckinId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/kids/call-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: selectedCheckinId,
          reason: callReason,
          message: callCustomMsg.trim() || null
        })
      });

      if (res.ok) {
        setIsCreatingCall(false);
        setSelectedCheckinId('');
        setCallCustomMsg('');
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Erro ao disparar chamada.');
      }
    } catch (e) {
      alert('Erro de conexão ao disparar chamada.');
    } finally {
      setSubmitting(false);
    }
  };

  // Dar Baixa / Resolver Chamada
  const handleResolveCall = async (checkinId: string) => {
    try {
      await fetch(`${API_URL}/kids/resolve-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: checkinId })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Filtrar chamados em andamento (is_calling === 1 ou true)
  const activeCalls = activeCheckins.filter(c => Boolean(c.is_calling));
  const availableChildren = activeCheckins.filter(c => !c.is_calling);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="88vh">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: '#fffbeb',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            margin: '0 auto 8px auto'
          }}>
            📢
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            Chamador de Pais no Culto
          </h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Alertas no telão da nave principal e notificação aos pais
          </p>
        </div>

        {/* Botão de Disparo Rápido */}
        {!isCreatingCall ? (
          <button
            type="button"
            onClick={() => {
              setIsCreatingCall(true);
              if (availableChildren.length > 0) {
                setSelectedCheckinId(availableChildren[0].id);
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)'
            }}
          >
            <span>+ Chamar Responsável no Telão</span>
          </button>
        ) : (
          /* Formulário de Criação de Alerta */
          <form onSubmit={handleTriggerCall} style={{
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '16px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#92400e' }}>
                📢 Nova Chamada no Telão
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingCall(false)}
                style={{ background: 'none', border: 'none', color: '#78350f', fontSize: '0.80rem', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕ Cancelar
              </button>
            </div>

            {/* Seleção de Criança */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#78350f', marginBottom: '4px' }}>
                Selecione a Criança:
              </label>
              <select
                value={selectedCheckinId}
                onChange={e => setSelectedCheckinId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #fcd34d',
                  fontSize: '0.84rem',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              >
                {availableChildren.length === 0 ? (
                  <option value="">Nenhuma criança presente sem chamada</option>
                ) : (
                  availableChildren.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.child_name} (PIN: {c.security_code} - Sala: {c.room_name || 'Kids'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Motivo do Chamado */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#78350f', marginBottom: '6px' }}>
                Motivo do Chamado:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {CALL_REASONS.map(r => {
                  const isSel = callReason === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setCallReason(r.id)}
                      style={{
                        background: isSel ? r.bg : '#ffffff',
                        border: isSel ? `2px solid ${r.color}` : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{r.icon}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: isSel ? 900 : 700, color: isSel ? r.color : '#334155' }}>
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mensagem Opcional */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#78350f', marginBottom: '4px' }}>
                Observação Extra (Opcional):
              </label>
              <input
                type="text"
                value={callCustomMsg}
                onChange={e => setCallCustomMsg(e.target.value)}
                placeholder="Ex: Favor comparecer ao berçário 2"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #fcd34d',
                  fontSize: '0.80rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!selectedCheckinId || submitting}
              style={{
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '0.84rem',
                fontWeight: 900,
                cursor: selectedCheckinId && !submitting ? 'pointer' : 'not-allowed',
                opacity: selectedCheckinId && !submitting ? 1 : 0.6
              }}
            >
              {submitting ? 'Acionando...' : 'Exibir Chamado no Telão 📢'}
            </button>
          </form>
        )}

        {/* ========================================================
            LISTA DE CHAMADOS EM ANDAMENTO NO TELÃO
            ======================================================== */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
              Chamados Ativos no Telão ({activeCalls.length})
            </span>
            {activeCalls.length > 0 && (
              <span style={{
                background: '#fee2e2',
                color: '#dc2626',
                fontSize: '0.64rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '12px',
                animation: 'pulse 1.5s infinite'
              }}>
                ● NO TELÃO AGORA
              </span>
            )}
          </div>

          {activeCalls.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '28px 16px',
              background: '#f8fafc',
              borderRadius: '14px',
              border: '1.5px dashed #cbd5e1'
            }}>
              <span style={{ fontSize: '1.8rem' }}>🕊️</span>
              <p style={{ fontSize: '0.80rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>
                Nenhum pai sendo chamado no momento.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeCalls.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #fecaca',
                    borderRadius: '16px',
                    padding: '14px',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: '1rem',
                        fontWeight: 900,
                        padding: '4px 10px',
                        borderRadius: '10px',
                        letterSpacing: '0.1em'
                      }}>
                        {c.security_code}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.90rem', fontWeight: 900, color: '#1e293b' }}>
                          {c.child_name}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                          Pai: {c.parent_name} • {c.room_name || 'Sala Kids'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: '#fef2f2',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    color: '#991b1b',
                    fontWeight: 700,
                    marginBottom: '10px'
                  }}>
                    Motivo: <b>{c.call_reason || 'Solicitação da Sala'}</b>
                    {c.call_message && ` - "${c.call_message}"`}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleResolveCall(c.id)}
                    style={{
                      width: '100%',
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)'
                    }}
                  >
                    <span>✓ Pais Chegaram (Finalizar Chamado)</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </BottomSheet>
  );
};
