import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';

interface KidsQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  childName?: string;
}

export const KidsQrScannerModal: React.FC<KidsQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  childName
}) => {
  const [manualPin, setManualPin] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "kids-pwa-qr-reader-v2";

  useEffect(() => {
    let mounted = true;

    if (isOpen) {
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
              if (mounted) {
                // Audio Beep
                try {
                  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = "sine";
                  osc.frequency.setValueAtTime(880, ctx.currentTime);
                  gain.gain.setValueAtTime(0.2, ctx.currentTime);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.15);
                } catch (e) {}

                // Haptic Feedback
                if (navigator.vibrate) {
                  navigator.vibrate([100, 50, 100]);
                }

                // Stop camera and complete
                html5QrCode.stop().catch(() => {}).finally(() => {
                  onScanSuccess(decodedText.trim());
                });
              }
            },
            () => {}
          );
        } catch (err: any) {
          console.warn("Falha ao iniciar câmera do QR Scanner Kids:", err);
          if (mounted) {
            setCameraError("Câmera indisponível ou permissão negada. Digite o PIN abaixo.");
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
    }
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPin.trim()) return;
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    onScanSuccess(manualPin.trim());
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={e => e.stopPropagation()} style={{ maxHeight: '96dvh' }}>
        <div className="drawer-handle" />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)'
            }}>
              🛡️
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                Checkout Kids
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {childName ? `Liberando devolução de ${childName}` : 'Escanear QR Code ou digitar PIN do crachá'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: 32,
              height: 32,
              borderRadius: '50%',
              color: 'var(--text-muted)',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Camera Viewfinder Area Ampla */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 360,
            height: 300,
            background: '#090d16',
            borderRadius: 24,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            border: '2px solid rgba(22, 163, 74, 0.4)'
          }}>
            <div id={scannerContainerId} style={{ width: '100%', height: '100%' }} />

            {/* Mira com cantos destacados */}
            {!cameraError && isScanning && (
              <>
                <div style={{
                  position: 'absolute',
                  width: '220px',
                  height: '220px',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '28px', height: '28px', borderTop: '4px solid #16a34a', borderLeft: '4px solid #16a34a', borderRadius: '6px 0 0 0' }} />
                    <div style={{ width: '28px', height: '28px', borderTop: '4px solid #16a34a', borderRight: '4px solid #16a34a', borderRadius: '0 6px 0 0' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '28px', height: '28px', borderBottom: '4px solid #16a34a', borderLeft: '4px solid #16a34a', borderRadius: '0 0 0 6px' }} />
                    <div style={{ width: '28px', height: '28px', borderBottom: '4px solid #16a34a', borderRight: '4px solid #16a34a', borderRadius: '0 0 6px 0' }} />
                  </div>
                </div>

                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '12%',
                  right: '12%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #4ade80, #16a34a, transparent)',
                  boxShadow: '0 0 10px #4ade80',
                  animation: 'scanLine 2s infinite ease-in-out',
                  pointerEvents: 'none'
                }} />
              </>
            )}

            {cameraError && (
              <div style={{ padding: 20, textAlign: 'center', color: '#cbd5e1', fontSize: '0.80rem', zIndex: 10 }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷❌</div>
                <div>{cameraError}</div>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 700 }}>
            Aponte a câmera para o QR Code no celular ou crachá do responsável
          </div>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '4px 0', gap: 10 }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ou digite o PIN</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
          </div>

          {/* Digitação do PIN */}
          <form onSubmit={handleManualSubmit} style={{ width: '100%', display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="input-pwa"
              placeholder="Ex: 5966"
              value={manualPin}
              onChange={e => setManualPin(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                textAlign: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
                letterSpacing: '0.1em',
                borderRadius: 14,
                padding: '12px'
              }}
            />
            <button
              type="submit"
              disabled={!manualPin.trim()}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                padding: '0 20px',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: manualPin.trim() ? 'pointer' : 'not-allowed',
                opacity: manualPin.trim() ? 1 : 0.6
              }}
            >
              Liberar
            </button>
          </form>

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
