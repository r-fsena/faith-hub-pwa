import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { BottomSheet } from './BottomSheet';
import { KidsQrScannerModal } from './KidsQrScannerModal';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

interface KidsCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KidsCheckoutModal: React.FC<KidsCheckoutModalProps> = ({ isOpen, onClose }) => {
  const { branding } = useBranding();
  const { user } = useAuth();
  const orgId = branding.organization_id || branding.id || 'org_default';

  const [activeCheckins, setActiveCheckins] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Checkout manual via PIN
  const [targetChild, setTargetChild] = useState<any | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Scanner Câmera QR
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCheckins();
      loadRooms();
      const interval = setInterval(loadCheckins, 8000);
      return () => clearInterval(interval);
    } else {
      setTargetChild(null);
      setPinInput('');
      setErrorMessage('');
    }
  }, [isOpen, orgId]);

  const loadRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/kids/rooms?organization_id=${encodeURIComponent(orgId)}`);
      if (res.ok) {
        const json = await res.json();
        setRooms(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCheckins = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/kids/checkins?organization_id=${encodeURIComponent(orgId)}&status=active`);
      if (res.ok) {
        const json = await res.json();
        setActiveCheckins(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Validar Checkout via PIN
  const handleValidatePinCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetChild || !pinInput.trim()) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_URL}/kids/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: targetChild.id,
          security_code: pinInput.trim(),
          checked_out_by: user?.name || 'Educador (PWA Mobile)'
        })
      });

      if (res.ok) {
        alert(`✅ Devolução de ${targetChild.child_name} realizada com sucesso!`);
        setTargetChild(null);
        setPinInput('');
        loadCheckins();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.message || 'PIN incorreto! Verifique o comprovante.');
      }
    } catch (e: any) {
      setErrorMessage('Erro de conexão ao realizar checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  // Validar Checkout via QR Code Escaneado pela Câmera
  const handleScanSuccess = async (scannedCode: string) => {
    setIsScannerOpen(false);

    // Localizar a criança pelo security_code escaneado
    const found = activeCheckins.find(c =>
      c.security_code?.trim().toUpperCase() === scannedCode.trim().toUpperCase() ||
      scannedCode.includes(c.security_code)
    );

    if (!found) {
      alert(`⚠️ Código QR "${scannedCode}" não encontrado entre as crianças presentes.`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/kids/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: found.id,
          security_code: scannedCode,
          checked_out_by: user?.name || 'Educador (PWA Mobile)'
        })
      });

      if (res.ok) {
        alert(`✅ Devolução de ${found.child_name} para ${found.parent_name} realizada com sucesso!`);
        loadCheckins();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Código QR inválido para esta criança.');
      }
    } catch (e) {
      alert('Erro de conexão ao realizar checkout.');
    }
  };

  const filteredCheckins = activeCheckins.filter(c => {
    const matchRoom = selectedRoomId === 'all' || c.room_id === selectedRoomId;
    const matchSearch = !search ||
      c.child_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.parent_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.security_code?.toLowerCase().includes(search.toLowerCase());
    return matchRoom && matchSearch;
  });

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="90vh">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              margin: '0 auto 8px auto'
            }}>
              🛡️
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              Checkout & Devolução Kids
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Validação de PIN e entrega segura aos responsáveis
            </p>
          </div>

          {/* Botão de Destaque: Câmera QR Code */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '0.92rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)'
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>📷</span>
            <span>Escanear QR Code do Responsável</span>
          </button>

          {/* Modal / Card de Confirmação de Devolução quando uma criança é selecionada */}
          {targetChild && (
            <div style={{
              background: '#f8fafc',
              border: '2px solid #16a34a',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                    👶 {targetChild.child_name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                    Responsável: <b>{targetChild.parent_name}</b> ({targetChild.parent_phone})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setTargetChild(null); setPinInput(''); setErrorMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {targetChild.allergies && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  color: '#991b1b',
                  fontWeight: 700,
                  marginBottom: '10px'
                }}>
                  ⚠️ Alerta: {targetChild.allergies}
                </div>
              )}

              <form onSubmit={handleValidatePinCheckout}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Digite o PIN de Segurança (4 Dígitos):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value.toUpperCase())}
                  placeholder="Ex: 1234"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '2px solid #cbd5e1',
                    fontSize: '1.3rem',
                    fontWeight: 900,
                    letterSpacing: '0.25em',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                />

                {errorMessage && (
                  <div style={{ color: '#dc2626', fontSize: '0.74rem', fontWeight: 800, marginTop: '6px', textAlign: 'center' }}>
                    {errorMessage}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setTargetChild(null); setPinInput(''); }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 800,
                      fontSize: '0.80rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!pinInput.trim() || submitting}
                    style={{
                      flex: 2,
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: pinInput.trim() && !submitting ? 'pointer' : 'not-allowed',
                      opacity: pinInput.trim() && !submitting ? 1 : 0.6
                    }}
                  >
                    {submitting ? 'Validando...' : 'Confirmar Devolução ✓'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtros e Busca de Crianças Presentes */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar criança ou PIN..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.82rem',
                boxSizing: 'border-box'
              }}
            />
            {rooms.length > 0 && (
              <select
                value={selectedRoomId}
                onChange={e => setSelectedRoomId(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.78rem',
                  background: '#ffffff',
                  maxWidth: '120px'
                }}
              >
                <option value="all">Todas Salas</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Contador de Presentes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
              Crianças Presentes na Sala ({filteredCheckins.length})
            </span>
            <button
              type="button"
              onClick={loadCheckins}
              style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
            >
              🔄 Atualizar
            </button>
          </div>

          {/* Lista de Crianças Ativas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
            {filteredCheckins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                <span style={{ fontSize: '1.8rem' }}>🎉</span>
                <p style={{ fontSize: '0.82rem', margin: '6px 0 0 0', fontWeight: 600 }}>
                  Nenhuma criança ativa no momento nesta sala.
                </p>
              </div>
            ) : (
              filteredCheckins.map(child => (
                <div
                  key={child.id}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.90rem', fontWeight: 900, color: '#1e293b' }}>
                        {child.child_name}
                      </span>
                      {child.room_name && (
                        <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>
                          {child.room_name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Pai: {child.parent_name} • PIN: <b style={{ color: '#0f172a' }}>{child.security_code}</b>
                    </div>
                    {child.allergies && (
                      <div style={{ fontSize: '0.66rem', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>
                        ⚠️ {child.allergies}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetChild(child);
                      setPinInput('');
                      setErrorMessage('');
                    }}
                    style={{
                      background: '#f0fdf4',
                      color: '#16a34a',
                      border: '1.5px solid #bbf7d0',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Devolver
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </BottomSheet>

      {/* Leitor de Câmera QR Code */}
      <KidsQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </>
  );
};
