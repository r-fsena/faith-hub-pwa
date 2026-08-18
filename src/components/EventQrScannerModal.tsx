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
  const scannerContainerId = "events-pwa-qr-reader";

  // Inicializa Scanner de Câmera
  useEffect(() => {
    let mounted = true;

    if (isOpen) {
      setCameraError(null);
      setScanResult(null);
      setIsScanning(true);

      const timer = setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(scannerContainerId);
          scannerRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: { width: 220, height: 220 },
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
            setCameraError("Câmera não disponível no momento. Você pode digitar o código manual abaixo.");
            setIsScanning(false);
          }
        }
      }, 300);

      return () => {
        mounted = false;
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            scannerRef.current = null;
          });
        }
      };
    }
  }, [isOpen]);

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300]);
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
    <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="92vh">
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Header do Scanner da Portaria */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.4rem' }}>📸</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              Validador de Portaria
            </h3>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Aponte para o QR Code do passaporte ou digite o código de 6 dígitos.
          </p>
        </div>

        {/* ========================================================
            CARD DE FEEDBACK IMEDIATO (SUCESSO / ERRO / JÁ USADO)
            ======================================================== */}
        {scanResult ? (
          <div style={{
            background: scanResult.status === 'SUCCESS' ? '#ecfdf5' : '#fef2f2',
            border: `2px solid ${scanResult.status === 'SUCCESS' ? '#10b981' : '#ef4444'}`,
            borderRadius: '20px',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: scanResult.status === 'SUCCESS' ? '#10b981' : '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 900
            }}>
              {scanResult.status === 'SUCCESS' ? '✓' : '✕'}
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: scanResult.status === 'SUCCESS' ? '#065f46' : '#991b1b' }}>
              {scanResult.status === 'SUCCESS' ? 'ENTRADA LIBERADA!' : 'ACESSO NEGADO!'}
            </div>

            <p style={{ fontSize: '0.84rem', fontWeight: 700, color: scanResult.status === 'SUCCESS' ? '#047857' : '#b91c1c', margin: 0 }}>
              {scanResult.message}
            </p>

            {scanResult.attendee_name && (
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '10px 14px',
                width: '100%',
                fontSize: '0.80rem',
                textAlign: 'left',
                border: '1px solid var(--panel-border)',
                marginTop: '4px'
              }}>
                <div>👤 <strong>Participante:</strong> {scanResult.attendee_name}</div>
                {scanResult.event && <div>🗓️ <strong>Evento:</strong> {scanResult.event}</div>}
                {scanResult.lot && <div>🎟️ <strong>Lote:</strong> {scanResult.lot}</div>}
              </div>
            )}

            <button
              type="button"
              onClick={handleScanNext}
              style={{
                width: '100%',
                background: scanResult.status === 'SUCCESS' ? '#10b981' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '13px',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: 'pointer',
                marginTop: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              🔄 Validar Próximo Ingresso
            </button>
          </div>
        ) : (
          <>
            {/* Viewfinder da Câmera */}
            <div style={{
              width: '100%',
              maxWidth: '300px',
              height: '240px',
              margin: '0 auto',
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#0f172a',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
              border: '2px solid var(--accent-primary)'
            }}>
              <div id={scannerContainerId} style={{ width: '100%', height: '100%' }} />

              {/* Mira Laser Animada */}
              {isScanning && !cameraError && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
                  boxShadow: '0 0 8px #ef4444',
                  animation: 'pulse 1.5s infinite',
                  pointerEvents: 'none'
                }} />
              )}

              {validating && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.75)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.90rem'
                }}>
                  ⏳ Validando na base...
                </div>
              )}
            </div>

            {cameraError && (
              <div style={{ fontSize: '0.76rem', color: '#b45309', background: '#fef3c7', padding: '8px 12px', borderRadius: '10px' }}>
                {cameraError}
              </div>
            )}

            {/* Fallback de Digitação Manual */}
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'left', display: 'block' }}>
                Ou digite o Código / Voucher Manual:
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Ex: FH-882190 ou Token"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1.5px solid var(--panel-border)',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim() || validating}
                  className="btn-pwa-primary"
                  style={{ padding: '0 18px', fontWeight: 900, fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                >
                  {validating ? '...' : 'Validar'}
                </button>
              </div>
            </form>
          </>
        )}

        <button
          type="button"
          className="btn-pwa-secondary"
          onClick={onClose}
          style={{ width: '100%', padding: '11px', fontWeight: 800, fontSize: '0.84rem' }}
        >
          Fechar Validador
        </button>
      </div>
    </BottomSheet>
  );
};
