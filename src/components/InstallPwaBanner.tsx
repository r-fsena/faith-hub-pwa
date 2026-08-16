import React, { useState, useEffect } from 'react';
 
export const InstallPwaBanner: React.FC = () => {
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
      <div className="install-banner-pulsing">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Ícone com Halo Pulsante */}
          <div className="install-icon-pulsing">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
              <path d="M12 18h.01"/>
            </svg>
            <span className="install-halo" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#ffffff', letterSpacing: '-0.2px' }}>
                Instalar Aplicativo Oficial
              </span>
              <span className="install-badge-live">1-TOQUE</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
              Acesso direto na tela inicial sem ocupar memória
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button" 
            onClick={handleInstallClick}
            className="install-cta-btn"
          >
            Instalar
          </button>
          
          <button 
            type="button" 
            onClick={() => setIsDismissed(true)} 
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Fechar"
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, textAlign: 'center', color: 'var(--text-main)' }}>
              Como instalar no seu iPhone
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
              Siga os 2 passos rápidos no navegador Safari:
            </p>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '18px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem' }}>1</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                  Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima no rodapé do Safari).
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem' }}>2</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
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
