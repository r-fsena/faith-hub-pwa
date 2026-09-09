import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { BottomSheet } from './BottomSheet';

interface EventQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onValidationSuccess?: (ticketData: any) => void;
  validatorName?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

export const EventQrScannerModal: React.FC<EventQrScannerModalProps> = ({
  isOpen,
  onClose,
  onValidationSuccess,
  validatorName = 'Portaria'
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'ERROR' | 'USED';
    message: string;
    attendee_name?: string;
    event?: string;
    lot?: string;
    scanned_at?: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "events-pwa-qr-reader-v2";

  // Inicializa Scanner de Câmera quando estiver aberto e na aba da câmera
  useEffect(() => {
    let mounted = true;

    if (isOpen && activeTab === 'camera' && !scanResult) {
      setCameraError(null);
      setIsScanning(true);

      const timer = setTimeout(async () => {
        try {
          if (scannerRef.current) {
            try {
              await scannerRef.current.stop();
            } catch (e) {}
            scannerRef.current = null;
          }

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
              if (mounted && !validating) {
                handleProcessScan(decodedText.trim());
              }
            },
            () => {}
          );
        } catch (err: any) {
          console.warn("Falha ao iniciar câmera do QR Scanner de Eventos:", err);
          if (mounted) {
            setCameraError("Câmera indisponível ou permissão negada. Use a aba de Código Manual acima.");
            setIsScanning(false);
          }
        }
      }, 250);

      return () => {
        mounted = false;
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            scannerRef.current = null;
          });
        }
      };
    } else {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
    }
  }, [isOpen, activeTab, scanResult]);

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.20);
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate([120, 60, 120]);
    }
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate([350, 120, 350]);
    }
  };

  const handleProcessScan = async (tokenOrCode: string) => {
    if (!tokenOrCode || validating) return;
    setValidating(true);

    try {
      const res = await fetch(`${API_URL}/tickets/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenOrCode,
          scanned_by: validatorName
        })
      });

      const data = await res.json();

      if (res.ok && data.isValid) {
        playSuccessSound();
        setScanResult({
          status: 'SUCCESS',
          message: data.message || 'Entrada Liberada!',
          attendee_name: data.attendee_name,
          event: data.event,
          lot: data.lot
        });
        if (onValidationSuccess) onValidationSuccess(data);
      } else {
        playErrorSound();
        setScanResult({
          status: data.isUsed ? 'USED' : 'ERROR',
          message: data.message || 'Ingresso Inválido ou Não Encontrado',
          attendee_name: data.attendee_name,
          event: data.event,
          lot: data.lot,
          scanned_at: data.scanned_at
        });
      }
    } catch (err: any) {
      playErrorSound();
      setScanResult({
        status: 'ERROR',
        message: 'Erro de conexão com o servidor de validação.'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessScan(manualCode.trim());
    setManualCode('');
  };

  const handleScanNext = () => {
    setScanResult(null);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="96dvh">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        
        {/* Header da Portaria */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
              }}>
                🎟️
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                Portaria & Check-in
              </h3>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Operador: <b>{validatorName}</b>
            </p>
          </div>
        </div>

        {/* ========================================================
            CARD DE FEEDBACK IMEDIATO (SUCESSO / ERRO / JÁ USADO)
            ======================================================== */}
        {scanResult ? (
          <div style={{
            background: scanResult.status === 'SUCCESS' ? '#f0fdf4' : '#fef2f2',
            border: `2.5px solid ${scanResult.status === 'SUCCESS' ? '#22c55e' : '#ef4444'}`,
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
              background: scanResult.status === 'SUCCESS' ? '#16a34a' : '#dc2626',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.4rem',
              fontWeight: 900,
              boxShadow: scanResult.status === 'SUCCESS'
                ? '0 0 0 10px rgba(34, 197, 94, 0.2)'
                : '0 0 0 10px rgba(239, 68, 68, 0.2)',
              animation: 'bounceIn 0.3s ease'
            }}>
              {scanResult.status === 'SUCCESS' ? '✓' : '✕'}
            </div>

            <div>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                color: scanResult.status === 'SUCCESS' ? '#14532d' : '#7f1d1d',
                letterSpacing: '-0.01em'
              }}>
                {scanResult.status === 'SUCCESS' ? 'ENTRADA LIBERADA!' : 'ACESSO NEGADO!'}
              </div>
              <p style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: scanResult.status === 'SUCCESS' ? '#166534' : '#991b1b',
                margin: '4px 0 0 0'
              }}>
                {scanResult.message}
              </p>
            </div>

            {/* Crachá Detalhado do Participante */}
            {scanResult.attendee_name && (
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
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1rem'
                  }}>
                    {scanResult.attendee_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Participante
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)' }}>
                      {scanResult.attendee_name}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  {scanResult.event && (
                    <div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700 }}>EVENTO</div>
                      <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#334155' }}>{scanResult.event}</div>
                    </div>
                  )}
                  {scanResult.lot && (
                    <div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700 }}>LOTE / SETOR</div>
                      <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0369a1' }}>{scanResult.lot}</div>
                    </div>
                  )}
                  {scanResult.scanned_at && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '0.66rem', color: '#dc2626', fontWeight: 700 }}>HORÁRIO DO REGISTRO</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626' }}>{scanResult.scanned_at}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botão Gigante de Próximo Ingresso */}
            <button
              type="button"
              onClick={handleScanNext}
              style={{
                width: '100%',
                background: scanResult.status === 'SUCCESS' ? '#16a34a' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '16px',
                padding: '16px',
                fontWeight: 900,
                fontSize: '0.98rem',
                cursor: 'pointer',
                boxShadow: scanResult.status === 'SUCCESS'
                  ? '0 6px 20px rgba(22, 163, 74, 0.35)'
                  : '0 6px 20px rgba(15, 23, 42, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              <span>🔄</span>
              <span>Validar Próximo Ingresso</span>
            </button>
          </div>
        ) : (
          <>
            {/* Segmented Control: Câmera vs Código Manual */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '14px',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'camera' ? '#ffffff' : 'transparent',
                  color: activeTab === 'camera' ? '#0f172a' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'camera' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>📸</span>
                <span>Câmera QR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'manual' ? '#ffffff' : 'transparent',
                  color: activeTab === 'manual' ? '#0f172a' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'manual' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>⌨️</span>
                <span>Digitar Código</span>
              </button>
            </div>

            {/* CONTEÚDO DA ABA 1: CÂMERA QR AMPLA */}
            {activeTab === 'camera' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                
                {/* Viewfinder Amplo com Cantos de Mira Estilizados */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '380px',
                  height: '320px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  background: '#090d16',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                  border: '2px solid rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Elemento Html5Qrcode */}
                  <div id={scannerContainerId} style={{ width: '100%', height: '100%' }} />

                  {/* Cantos de Mira da Câmera (Corner Brackets) */}
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
                          <div style={{ width: '28px', height: '28px', borderTop: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6', borderRadius: '6px 0 0 0' }} />
                          <div style={{ width: '28px', height: '28px', borderTop: '4px solid #3b82f6', borderRight: '4px solid #3b82f6', borderRadius: '0 6px 0 0' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ width: '28px', height: '28px', borderBottom: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6', borderRadius: '0 0 0 6px' }} />
                          <div style={{ width: '28px', height: '28px', borderBottom: '4px solid #3b82f6', borderRight: '4px solid #3b82f6', borderRadius: '0 0 6px 0' }} />
                        </div>
                      </div>

                      {/* Laser de Varredura */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '12%',
                        right: '12%',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, #38bdf8, #3b82f6, transparent)',
                        boxShadow: '0 0 12px #38bdf8',
                        animation: 'scanLine 2s infinite ease-in-out',
                        pointerEvents: 'none'
                      }} />
                    </>
                  )}

                  {/* Estado de Validação em Andamento */}
                  {validating && (
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
                      <div>Validando ingresso na base...</div>
                    </div>
                  )}

                  {/* Erro de Câmera */}
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
                        onClick={() => setActiveTab('manual')}
                        style={{
                          background: '#3b82f6',
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
                        Digitar Voucher Manualmente
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
                  Aponte o visor para o QR Code do ingresso
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA 2: DIGITAÇÃO MANUAL ERGONÔMICA */}
            {activeTab === 'manual' && (
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '8px 0' }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid var(--panel-border)',
                  borderRadius: '18px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text-main)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⌨️</span> Digite o Código do Voucher / Ingresso:
                  </label>

                  <input
                    type="text"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Ex: FH-9281 ou Token"
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '14px',
                      background: '#ffffff',
                      border: '2px solid #cbd5e1',
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />

                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    O código alfanumérico está impresso no passaporte digital ou comprovante.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!manualCode.trim() || validating}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '0.94rem',
                    cursor: manualCode.trim() && !validating ? 'pointer' : 'not-allowed',
                    opacity: manualCode.trim() && !validating ? 1 : 0.6,
                    boxShadow: '0 6px 16px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {validating ? 'Validando ingresso...' : 'Confirmar Ingresso ✓'}
                </button>
              </form>
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
          Fechar Portaria
        </button>
      </div>
    </BottomSheet>
  );
};
