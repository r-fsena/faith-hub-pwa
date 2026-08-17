import React, { useState, useEffect, useRef } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

export const KidsPassCard: React.FC = () => {
  const { branding } = useBranding();
  const { user, isAuthenticated } = useAuth();
  
  const [activeCheckins, setActiveCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [isCallingModalOpen, setIsCallingModalOpen] = useState(false);
  const [currentCallingItem, setCurrentCallingItem] = useState<any | null>(null);

  const alertedCheckinIds = useRef<Set<string>>(new Set());

  // Som de Alerta Urgente para Chamada dos Pais
  const alertSound = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAGAACBh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eH";

  const fetchParentStatus = async () => {
    const parentPhone = user?.phone || user?.attributes?.phone_number || phoneSearch || localStorage.getItem('faithhub_kids_parent_phone') || '';
    if (!parentPhone) return;

    try {
      const orgId = branding.organization_id || branding.id || 'org_default';
      const res = await fetch(`${API_URL}/kids/parent-status?phone=${encodeURIComponent(parentPhone)}&organization_id=${encodeURIComponent(orgId)}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.active_checkins || [];
        setActiveCheckins(list);

        // Verifica se há alguma chamada ativa
        const calling = list.find((c: any) => c.status === 'CALLING_PARENTS');
        if (calling && !alertedCheckinIds.current.has(calling.id)) {
          alertedCheckinIds.current.add(calling.id);
          setCurrentCallingItem(calling);
          setIsCallingModalOpen(true);

          // Toca som de alerta
          try {
            const audio = new Audio(alertSound);
            audio.play().catch(() => {});
          } catch (e) {}

          // Vibra o celular se suportado
          if (navigator.vibrate) {
            navigator.vibrate([300, 100, 300, 100, 500]);
          }
        }
      }
    } catch (e) {
      console.log("Erro ao buscar status kids dos pais:", e);
    }
  };

  const userPhone = user?.phone || user?.attributes?.phone_number || '';
  const orgId = branding.organization_id || branding.id || 'org_default';

  useEffect(() => {
    fetchParentStatus();
    const interval = setInterval(fetchParentStatus, 8000); // Polling a cada 8s durante o culto
    return () => clearInterval(interval);
  }, [userPhone, phoneSearch, orgId]);

  const [selectedQrItem, setSelectedQrItem] = useState<any | null>(null);

  if (activeCheckins.length === 0) {
    return null; // Não exibe se não houver filhos com check-in ativo hoje
  }

  return (
    <div style={{ margin: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1.2rem' }}>🚸</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Meus Filhos no Kids ({activeCheckins.length})
          </span>
        </div>
        <span style={{ fontSize: '0.70rem', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 8, fontWeight: 800 }}>
          ● Seguro na Sala
        </span>
      </div>

      {activeCheckins.map(item => {
        const isCalling = item.status === 'CALLING_PARENTS';

        return (
          <div
            key={item.id}
            style={{
              background: isCalling ? '#fef2f2' : '#ffffff',
              border: isCalling ? '2px solid #ef4444' : '1px solid var(--panel-border)',
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: isCalling ? '0 4px 18px rgba(239, 68, 68, 0.25)' : '0 2px 10px rgba(0,0,0,0.03)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: item.room_color || 'var(--accent-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.95rem'
                }}>
                  {item.child_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    {item.child_name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {item.room_icon} {item.room_name}
                  </div>
                </div>
              </div>

              {/* Botão para abrir QR Code & PIN */}
              <button
                type="button"
                onClick={() => setSelectedQrItem(item)}
                style={{
                  background: '#f0fdfa',
                  border: '1.5px solid var(--accent-primary)',
                  borderRadius: 10,
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '1rem' }}>📱</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.56rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase' }}>QR Code & PIN</div>
                  <div style={{ fontSize: '0.90rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
                    {item.security_code}
                  </div>
                </div>
              </button>
            </div>

            {/* Alerta Visual de Chamado */}
            {isCalling && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 800, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fca5a5' }}>
                <div>
                  <div>🚨 OS EDUCADORES ESTÃO CHAMANDO VOCÊ!</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, marginTop: 2 }}>Motivo: {item.call_reason} {item.call_message ? `• "${item.call_message}"` : ''}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCallingModalOpen(true)}
                  style={{ background: '#b91c1c', color: '#ffffff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: '0.70rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Ver Sala
                </button>
              </div>
            )}

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Entrada: {new Date(item.checkin_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setSelectedQrItem(item)}>
                Toque para ver QR Code ➔
              </span>
            </div>
          </div>
        );
      })}

      {/* Modal de Exibição do QR Code para os Pais Apresentarem */}
      {selectedQrItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              background: '#f0fdfa',
              color: 'var(--accent-primary)',
              border: '1px solid #99f6e4',
              padding: '4px 14px',
              borderRadius: 16,
              fontSize: '0.74rem',
              fontWeight: 800,
              marginBottom: 8,
              textTransform: 'uppercase'
            }}>
              🚸 {selectedQrItem.room_name}
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              {selectedQrItem.child_name}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 16px 0' }}>
              Apresente esta tela ao educador para retirar seu filho com segurança
            </p>

            <div style={{
              background: '#ffffff',
              border: '2px dashed #cbd5e1',
              borderRadius: 16,
              padding: 14,
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              marginBottom: 16
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(selectedQrItem.security_code)}&margin=10`}
                alt="QR Code de Retirada"
                style={{ width: 190, height: 190, borderRadius: 8, display: 'block' }}
              />
            </div>

            <div style={{
              background: '#f8fafc',
              border: '2px solid var(--accent-primary)',
              borderRadius: 14,
              padding: '10px 20px',
              width: '100%',
              marginBottom: 16
            }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>PIN de Segurança</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
                {selectedQrItem.security_code}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedQrItem(null)}
              style={{
                width: '100%',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '12px',
                fontWeight: 900,
                fontSize: '0.86rem',
                cursor: 'pointer'
              }}
            >
              Fechar Crachá
            </button>
          </div>
        </div>
      )}

      {/* Modal / Alerta Urgente de Chamada de Pais */}
      {isCallingModalOpen && currentCallingItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: 24,
            maxWidth: 380,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(239, 68, 68, 0.4)',
            border: '3px solid #ef4444'
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#fee2e2', color: '#b91c1c',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 12px auto'
            }}>
              🚨
            </div>

            <div style={{ color: '#b91c1c', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Chamado do Ministério Infantil
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-main)', margin: '6px 0 10px 0' }}>
              {currentCallingItem.child_name} precisa de você!
            </h3>

            <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', padding: '12px', borderRadius: 12, marginBottom: 16, textAlign: 'left' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Sala:</div>
              <div style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {currentCallingItem.room_icon} {currentCallingItem.room_name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 6 }}>Motivo:</div>
              <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#b91c1c' }}>
                {currentCallingItem.call_reason}
              </div>
              {currentCallingItem.call_message && (
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4, fontStyle: 'italic' }}>
                  "{currentCallingItem.call_message}"
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsCallingModalOpen(false)}
              style={{
                width: '100%',
                background: '#b91c1c',
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: 12,
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: 'pointer'
              }}
            >
              Estou a caminho da sala!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
