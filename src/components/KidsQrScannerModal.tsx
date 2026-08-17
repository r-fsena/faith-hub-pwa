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
  const scannerContainerId = "kids-pwa-qr-reader";

  useEffect(() => {
    let mounted = true;

    if (isOpen) {
      setCameraError(null);
      setIsScanning(true);

      // Timeout para garantir que o container no DOM esteja pronto
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
            () => {
              // Frame ignorado
            }
          );
        } catch (err: any) {
          console.warn("Falha ao iniciar câmera do QR Scanner:", err);
          if (mounted) {
            setCameraError("Não foi possível acessar a câmera. Você pode digitar o PIN abaixo.");
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
      <div className="drawer-container" onClick={e => e.stopPropagation()} style={{ maxHeight: '92dvh' }}>
        <div className="drawer-handle" />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'var(--accent-primary-light)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              📸
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                Realizar Checkout
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {childName ? `Liberando devolução de ${childName}` : 'Escanear QR Code ou digitar PIN'}
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

        {/* Camera Viewfinder Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 280,
            height: 250,
            background: '#0f172a',
            borderRadius: 20,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
            border: '1.5px solid var(--panel-border)'
          }}>
            {/* Elemento onde a biblioteca injeta o vídeo */}
            <div id={scannerContainerId} style={{ width: '100%', height: '100%' }} />

            {/* Mira com animação */}
            {!cameraError && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 170,
                height: 170,
                border: '2px solid rgba(255, 255, 255, 0.7)',
                borderRadius: 16,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '90%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, var(--accent-primary, #0f766e), transparent)',
                  boxShadow: '0 0 8px var(--accent-primary, #0f766e)',
                  animation: 'scanLine 2s infinite ease-in-out'
                }} />
              </div>
            )}

            {cameraError && (
              <div style={{ padding: 16, textAlign: 'center', color: '#cbd5e1', fontSize: '0.78rem', zIndex: 10 }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>📷❌</div>
                <div>{cameraError}</div>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
            Aponte a câmera para o QR Code no celular do responsável
          </div>

          {/* Divisor "OU DIGITE O PIN" */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '14px 0 10px 0', gap: 10 }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ou digite o PIN</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
          </div>

          {/* Digitação Manual do PIN */}
          <form onSubmit={handleManualSubmit} style={{ width: '100%', display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="input-pwa"
              placeholder="Ex: K-5966 ou 5966"
              value={manualPin}
              onChange={e => setManualPin(e.target.value)}
              style={{
                flex: 1,
                textAlign: 'center',
                fontWeight: 900,
                fontSize: '1.1rem',
                letterSpacing: '0.08em',
                borderRadius: 14
              }}
            />
            <button
              type="submit"
              disabled={!manualPin.trim()}
              className="btn-pwa-primary"
              style={{
                width: 'auto',
                minWidth: 100,
                borderRadius: 14,
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
