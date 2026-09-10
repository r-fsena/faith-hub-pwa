import React, { useState, useEffect, useRef } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { BottomSheet } from './BottomSheet';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

interface KidsCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KidsCheckoutModal: React.FC<KidsCheckoutModalProps> = ({ isOpen, onClose }) => {
  const { branding } = useBranding();
  const { user } = useAuth();
  const orgId = branding.organization_id || branding.id || 'org_default';

  // Abas do Modal: 'list' (Presentes) | 'camera' (Escanear QR) | 'pin' (Teclado PIN)
  const [activeTab, setActiveTab] = useState<'list' | 'camera' | 'pin'>('list');

  const [activeCheckins, setActiveCheckins] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Devolução de Criança Selecionada
  const [targetChild, setTargetChild] = useState<any | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Câmera integrada na aba 'camera'
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "kids-checkout-scanner-tab";

  // Card de Sucesso de Devolução
  const [successResult, setSuccessResult] = useState<{
    childName: string;
    parentName: string;
    roomName?: string;
  } | null>(null);

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
      setSuccessResult(null);
    }
  }, [isOpen, orgId]);

  const stopScannerSafely = async () => {
    if (!scannerRef.current) return;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    try {
      const isScanning = (scanner as any).isScanning || 
        (typeof scanner.getState === 'function' && scanner.getState() === 2);
      if (isScanning) {
        await scanner.stop();
      }
    } catch (e) {
      console.warn("Silent stop scanner warning in KidsCheckoutModal:", e);
    }
    try {
      scanner.clear();
    } catch (e) {}
  };

  // Inicializa a câmera se a aba ativa for 'camera'
  useEffect(() => {
    let mounted = true;
    let timer: any = null;

    if (isOpen && activeTab === 'camera' && !successResult) {
      setCameraError(null);
      setIsScanning(true);

      timer = setTimeout(async () => {
        try {
          await stopScannerSafely();
          if (!mounted) return;

          const html5QrCode = new Html5Qrcode(scannerContainerId);
          scannerRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edgeSize = Math.max(220, Math.floor(minEdge * 0.72));
              return { width: edgeSize, height: edgeSize };
            },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              if (mounted && !submitting) {
                handleScanSuccess(decodedText.trim());
              }
            },
            () => {}
          );
        } catch (err: any) {
          console.warn("Falha na câmera de checkout kids:", err);
          if (mounted) {
            setCameraError("Câmera indisponível. Você pode usar a aba de PIN numérico acima.");
            setIsScanning(false);
          }
        }
      }, 250);
    } else {
      stopScannerSafely();
    }

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      stopScannerSafely();
    };
  }, [isOpen, activeTab, successResult, submitting]);

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

  const playSuccessChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.12); // C6
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate([100, 60, 100]);
    }
  };

  // Validar Checkout via PIN
  const handlePerformCheckout = async (checkinId: string, pin: string, childName: string, parentName: string, roomName?: string) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_URL}/kids/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: checkinId,
          security_code: pin.trim(),
          checked_out_by: user?.name || 'Educador (PWA Mobile)'
        })
      });

      if (res.ok) {
        playSuccessChime();
        setSuccessResult({ childName, parentName, roomName });
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

  // Escaneou QR Code
  const handleScanSuccess = async (scannedCode: string) => {
    const clean = scannedCode.trim().toUpperCase();
    const found = activeCheckins.find(c =>
      c.security_code?.trim().toUpperCase() === clean ||
      clean.includes(c.security_code)
    );

    if (!found) {
      alert(`⚠️ Código QR "${scannedCode}" não encontrado entre as crianças ativas.`);
      return;
    }

    await handlePerformCheckout(found.id, clean, found.child_name, found.parent_name, found.room_name);
  };

  // Submissão de PIN via Teclado Numérico da Aba 'pin'
  const handleDirectPinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) return;

    const clean = pinInput.trim().toUpperCase();
    const found = activeCheckins.find(c =>
      c.security_code?.trim().toUpperCase() === clean
    );

    if (!found) {
      setErrorMessage(`Nenhuma criança encontrada com o PIN "${clean}".`);
      return;
    }

    handlePerformCheckout(found.id, clean, found.child_name, found.parent_name, found.room_name);
  };

  // Clique nos botões numéricos virtuais (0 a 9)
  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 6) {
      setPinInput(prev => prev + digit);
      setErrorMessage('');
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMessage('');
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
    <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="92vh">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '100%', width: '100%' }}>
        
        {/* Header Principal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
              }}>
                🛡️
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                Devolução & Checkout Kids
              </h3>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Validação segura de PIN e entrega aos responsáveis
            </p>
          </div>
        </div>

        {/* ========================================================
            TELA DE CONFIRMAÇÃO DE SUCESSO (CRIANÇA DEVOLVIDA)
            ======================================================== */}
        {successResult ? (
          <div style={{
            background: '#f0fdf4',
            border: '2.5px solid #22c55e',
            borderRadius: '24px',
            padding: '24px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: '#16a34a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.4rem',
              fontWeight: 900,
              boxShadow: '0 0 0 10px rgba(34, 197, 94, 0.2)',
              animation: 'bounceIn 0.3s ease'
            }}>
              ✓
            </div>

            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#14532d', letterSpacing: '-0.01em' }}>
                DEVOLUÇÃO REALIZADA!
              </div>
              <p style={{ fontSize: '0.86rem', fontWeight: 700, color: '#166534', margin: '4px 0 0 0' }}>
                Criança entregue em segurança com comprovante validado.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '16px',
              width: '100%',
              boxSizing: 'border-box',
              border: '1.5px solid var(--panel-border)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                👶 {successResult.childName}
              </div>
              <div style={{ fontSize: '0.80rem', color: '#475569' }}>
                Responsável: <b>{successResult.parentName}</b>
              </div>
              {successResult.roomName && (
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Sala: <b>{successResult.roomName}</b>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => { setSuccessResult(null); setActiveTab('list'); }}
              style={{
                width: '100%',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '16px',
                padding: '16px',
                fontWeight: 900,
                fontSize: '0.98rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(22, 163, 74, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🔄</span>
              <span>Devolver Próxima Criança</span>
            </button>
          </div>
        ) : (
          <>
            {/* Seletor Ergonômico de 3 Abas (Segmented Control Amplo) */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '14px',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => { setActiveTab('list'); setTargetChild(null); }}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'list' ? '#ffffff' : 'transparent',
                  color: activeTab === 'list' ? '#0f172a' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.80rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: activeTab === 'list' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <span>📋</span>
                <span>Presentes ({filteredCheckins.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('camera'); setTargetChild(null); }}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'camera' ? '#ffffff' : 'transparent',
                  color: activeTab === 'camera' ? '#0f172a' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.80rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: activeTab === 'camera' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <span>📷</span>
                <span>Câmera QR</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('pin'); setTargetChild(null); }}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'pin' ? '#ffffff' : 'transparent',
                  color: activeTab === 'pin' ? '#0f172a' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.80rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: activeTab === 'pin' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <span>🔢</span>
                <span>Digitar PIN</span>
              </button>
            </div>

            {/* ========================================================
                ABA 1: LISTA ESPAÇOSA DE CRIANÇAS PRESENTES
                ======================================================== */}
            {activeTab === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Modal / Card de Devolução quando uma criança específica da lista é selecionada */}
                {targetChild ? (
                  <div style={{
                    background: '#f8fafc',
                    border: '2px solid #16a34a',
                    borderRadius: '20px',
                    padding: '18px',
                    boxShadow: '0 8px 24px rgba(22, 163, 74, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: '#dcfce7',
                          color: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '1.2rem'
                        }}>
                          {targetChild.child_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                            {targetChild.child_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                            Responsável: <b>{targetChild.parent_name}</b> ({targetChild.parent_phone})
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setTargetChild(null); setPinInput(''); setErrorMessage(''); }}
                        style={{
                          background: '#e2e8f0',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          color: '#475569',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {targetChild.allergies && (
                      <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '0.76rem',
                        color: '#991b1b',
                        fontWeight: 700
                      }}>
                        ⚠️ Alerta de Alergia: {targetChild.allergies}
                      </div>
                    )}

                    <div style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      padding: '12px',
                      border: '1.5px solid #e2e8f0',
                      textAlign: 'center'
                    }}>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                        Confirme o PIN do Comprovante:
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={pinInput}
                        onChange={e => setPinInput(e.target.value.toUpperCase())}
                        placeholder="Ex: 1234"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '12px',
                          border: '2px solid #cbd5e1',
                          fontSize: '1.3rem',
                          fontWeight: 900,
                          letterSpacing: '0.2em',
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {errorMessage && (
                      <div style={{ color: '#dc2626', fontSize: '0.78rem', fontWeight: 800, textAlign: 'center' }}>
                        {errorMessage}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => { setTargetChild(null); setPinInput(''); }}
                        style={{
                          flex: 1,
                          padding: '14px',
                          borderRadius: '14px',
                          border: '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#475569',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!pinInput.trim() || submitting}
                        onClick={() => handlePerformCheckout(targetChild.id, pinInput, targetChild.child_name, targetChild.parent_name, targetChild.room_name)}
                        style={{
                          flex: 2,
                          padding: '14px',
                          borderRadius: '14px',
                          border: 'none',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.88rem',
                          cursor: pinInput.trim() && !submitting ? 'pointer' : 'not-allowed',
                          opacity: pinInput.trim() && !submitting ? 1 : 0.6,
                          boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)'
                        }}
                      >
                        {submitting ? 'Validando...' : 'Confirmar Devolução ✓'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Barra de Filtros e Busca */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="🔍 Buscar criança, pai ou PIN..."
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.84rem',
                          background: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      />
                      {rooms.length > 0 && (
                        <select
                          value={selectedRoomId}
                          onChange={e => setSelectedRoomId(e.target.value)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '14px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.80rem',
                            background: '#ffffff',
                            maxWidth: '130px',
                            fontWeight: 700
                          }}
                        >
                          <option value="all">Todas Salas</option>
                          {rooms.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Lista com Altura Confortável */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      maxHeight: 'calc(94dvh - 240px)',
                      overflowY: 'auto',
                      paddingRight: '2px'
                    }}>
                      {filteredCheckins.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                          <span style={{ fontSize: '2.4rem' }}>🎉</span>
                          <p style={{ fontSize: '0.90rem', margin: '8px 0 0 0', fontWeight: 700 }}>
                            {loading ? 'Carregando crianças...' : 'Nenhuma criança presente no momento.'}
                          </p>
                        </div>
                      ) : (
                        filteredCheckins.map(child => (
                          <div
                            key={child.id}
                            style={{
                              background: '#ffffff',
                              border: '1.5px solid #e2e8f0',
                              borderRadius: '18px',
                              padding: '14px 16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: '#f0fdf4',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                fontSize: '1.1rem',
                                flexShrink: 0
                              }}>
                                {child.child_name.charAt(0).toUpperCase()}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.96rem', fontWeight: 900, color: '#1e293b' }}>
                                    {child.child_name}
                                  </span>
                                  {child.room_name && (
                                    <span style={{
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '8px'
                                    }}>
                                      {child.room_name}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}>
                                  Pai: {child.parent_name} • PIN: <b style={{ color: '#0f172a', letterSpacing: '0.05em' }}>{child.security_code}</b>
                                </div>
                                {child.allergies && (
                                  <div style={{ fontSize: '0.70rem', color: '#dc2626', fontWeight: 700, marginTop: '3px' }}>
                                    ⚠️ {child.allergies}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setTargetChild(child);
                                setPinInput('');
                                setErrorMessage('');
                              }}
                              style={{
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '10px 16px',
                                fontSize: '0.80rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 3px 10px rgba(22, 163, 74, 0.25)',
                                flexShrink: 0
                              }}
                            >
                              Devolver
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ========================================================
                ABA 2: CÂMERA QR AMPLA INTEGRADA (Mantida no DOM para estabilidade do Html5Qrcode)
                ======================================================== */}
            <div style={{ display: activeTab === 'camera' ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '380px',
                  height: '320px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  background: '#090d16',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                  border: '2px solid rgba(22, 163, 74, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div id={scannerContainerId} style={{ width: '100%', height: '100%' }} />

                  {!cameraError && isScanning && (
                    <>
                      <div style={{
                        position: 'absolute',
                        width: '240px',
                        height: '240px',
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ width: '28px', height: '28px', borderTop: '4px solid #22c55e', borderLeft: '4px solid #22c55e', borderRadius: '6px 0 0 0' }} />
                          <div style={{ width: '28px', height: '28px', borderTop: '4px solid #22c55e', borderRight: '4px solid #22c55e', borderRadius: '0 6px 0 0' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ width: '28px', height: '28px', borderBottom: '4px solid #22c55e', borderLeft: '4px solid #22c55e', borderRadius: '0 0 0 6px' }} />
                          <div style={{ width: '28px', height: '28px', borderBottom: '4px solid #22c55e', borderRight: '4px solid #22c55e', borderRadius: '0 0 6px 0' }} />
                        </div>
                      </div>

                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '12%',
                        right: '12%',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, #4ade80, #16a34a, transparent)',
                        boxShadow: '0 0 12px #4ade80',
                        animation: 'scanLine 2s infinite ease-in-out',
                        pointerEvents: 'none'
                      }} />
                    </>
                  )}

                  {submitting && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.96rem',
                      zIndex: 20
                    }}>
                      <div style={{ fontSize: '2rem', animation: 'spin 1s infinite linear' }}>⏳</div>
                      <div>Processando devolução...</div>
                    </div>
                  )}

                  {cameraError && (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#f87171',
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '2rem' }}>📷⚠️</span>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>{cameraError}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('pin')}
                        style={{
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '8px 16px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          marginTop: '6px'
                        }}
                      >
                        Digitar PIN pelo Teclado
                      </button>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 700
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 6px #22c55e'
                  }} />
                  Aponte para o QR Code do crachá do responsável
                </div>
            </div>

            {/* ========================================================
                ABA 3: TECLADO NUMÉRICO DE PIN (DIGITAÇÃO RÁPIDA)
                ======================================================== */}
            {activeTab === 'pin' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                
                {/* Display do PIN */}
                <div style={{
                  width: '100%',
                  maxWidth: '320px',
                  background: '#f8fafc',
                  border: '2px solid #cbd5e1',
                  borderRadius: '20px',
                  padding: '16px',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    PIN de Segurança do Comprovante
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pinInput}
                    onChange={e => {
                      setPinInput(e.target.value.toUpperCase());
                      setErrorMessage('');
                    }}
                    placeholder="••••"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '2rem',
                      fontWeight: 900,
                      letterSpacing: '0.3em',
                      color: pinInput ? '#0f172a' : '#94a3b8',
                      textAlign: 'center',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {errorMessage && (
                  <div style={{ color: '#dc2626', fontSize: '0.80rem', fontWeight: 800, textAlign: 'center' }}>
                    {errorMessage}
                  </div>
                )}

                {/* Keypad Numérico Virtual */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  width: '100%',
                  maxWidth: '320px'
                }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      style={{
                        height: '56px',
                        borderRadius: '16px',
                        border: '1.5px solid #e2e8f0',
                        background: '#ffffff',
                        fontSize: '1.4rem',
                        fontWeight: 900,
                        color: '#0f172a',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        cursor: 'pointer'
                      }}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPinInput('')}
                    style={{
                      height: '56px',
                      borderRadius: '16px',
                      border: '1.5px solid #e2e8f0',
                      background: '#f1f5f9',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    LIMPAR
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    style={{
                      height: '56px',
                      borderRadius: '16px',
                      border: '1.5px solid #e2e8f0',
                      background: '#ffffff',
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    style={{
                      height: '56px',
                      borderRadius: '16px',
                      border: '1.5px solid #e2e8f0',
                      background: '#f1f5f9',
                      fontSize: '1.2rem',
                      fontWeight: 900,
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    ⌫
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!pinInput.trim() || submitting}
                  onClick={() => handleDirectPinSubmit()}
                  style={{
                    width: '100%',
                    maxWidth: '320px',
                    padding: '16px',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.94rem',
                    cursor: pinInput.trim() && !submitting ? 'pointer' : 'not-allowed',
                    opacity: pinInput.trim() && !submitting ? 1 : 0.6,
                    boxShadow: '0 6px 16px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  {submitting ? 'Localizando e Devolvendo...' : 'Validar PIN e Liberar ✓'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Rodapé de Fechar */}
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 'auto',
            width: '100%',
            padding: '12px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#64748b',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer'
          }}
        >
          Fechar Devolução
        </button>
      </div>
    </BottomSheet>
  );
};
