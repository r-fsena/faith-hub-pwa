import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';

export const InstallPwaBanner: React.FC = () => {
  const { branding } = useBranding();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando como PWA instalado
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    // Detecta iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Captura evento de instalação do Chrome / Android
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(`Para instalar no celular: abra o menu do seu navegador e clique em "Adicionar à Tela de Início" ou "Instalar Aplicativo".`);
    }
  };

  return (
    <>
      <div className="install-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            📱
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
              Instale o App {branding.pwa_short_name || 'da Igreja'}
            </div>
            <div style={{ fontSize: '0.70rem', opacity: 0.85 }}>
              Acesso rápido com 1 toque na tela do celular
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button" 
            onClick={handleInstallClick}
            style={{ 
              background: '#ffffff', 
              color: 'var(--accent-primary)', 
              fontWeight: 800, 
              fontSize: '0.76rem', 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: 'pointer' 
            }}
          >
            Instalar
          </button>
          <button 
            type="button" 
            onClick={() => setIsDismissed(true)} 
            style={{ background: 'none', border: 'none', color: '#ffffff', opacity: 0.7, cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Modal de Instruções para iPhone / iPad */}
      {showIOSModal && (
        <div className="drawer-overlay" onClick={() => setShowIOSModal(false)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', color: 'var(--text-main)' }}>
              Como instalar no seu iPhone
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
              Siga os 2 passos rápidos no Safari:
            </p>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>1</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                  Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima no rodapé do Safari).
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>2</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                  Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
                </div>
              </div>
            </div>

            <button type="button" className="btn-pwa-primary" onClick={() => setShowIOSModal(false)}>
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
