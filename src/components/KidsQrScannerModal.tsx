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

      // Pequeno timeout para garantir que o elemento DOM esteja renderizado
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
                // Toca som de beep
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

                // Vibração
                if (navigator.vibrate) {
                  navigator.vibrate([100, 50, 100]);
                }

                // Para a câmera
                html5QrCode.stop().catch(() => {}).finally(() => {
                  onScanSuccess(decodedText.trim());
                });
              }
            },
            () => {
              // Frame sem QR code lido (ignora)
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div 
        className="animate-scale-up"
        style={{
          background: '#ffffff',
          borderRadius: 24,
          maxWidth: 380,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.15)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📸
            </div>
            <div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900 }}>Escanear QR Code</div>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
                {childName ? `Checkout de ${childName}` : 'Realizar Checkout Seguro'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              width: 28,
              height: 28,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.8rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Camera Viewfinder Area */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 280,
            height: 280,
            background: '#0f172a',
            borderRadius: 20,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
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
                width: 190,
                height: 190,
                border: '2px solid rgba(255, 255, 255, 0.6)',
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
                  background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)',
                  boxShadow: '0 0 8px #22d3ee',
                  animation: 'scanLine 2s infinite ease-in-out'
                }} />
              </div>
            )}

            {cameraError && (
              <div style={{ padding: 20, textAlign: 'center', color: '#cbd5e1', fontSize: '0.78rem', zIndex: 10 }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷❌</div>
                <div>{cameraError}</div>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 10, textAlign: 'center' }}>
            Aponte a câmera para o QR Code no celular dos pais
          </div>

          {/* Divisor "OU" */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '14px 0 10px 0', gap: 10 }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Ou digite o PIN</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Digitação Manual do PIN */}
          <form onSubmit={handleManualSubmit} style={{ width: '100%', display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="pwa-input"
              placeholder="Ex: K-5966 ou 5966"
              value={manualPin}
              onChange={e => setManualPin(e.target.value)}
              style={{
                flex: 1,
                textAlign: 'center',
                fontWeight: 900,
                fontSize: '1.05rem',
                letterSpacing: '0.05em',
                padding: '10px'
              }}
            />
            <button
              type="submit"
              disabled={!manualPin.trim()}
              style={{
                background: 'var(--accent-primary, #0f766e)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 16px',
                fontWeight: 900,
                fontSize: '0.82rem',
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
