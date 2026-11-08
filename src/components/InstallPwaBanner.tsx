import React, { useEffect, useState } from 'react';
import { usePwaInstallation } from '../context/PwaInstallationContext';
import { useBranding } from '../context/BrandingContext';

export const InstallPwaBanner: React.FC = () => {
  const installation = usePwaInstallation();
  const { branding } = useBranding();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  useEffect(() => { setIsDismissed(false); setShowIOSModal(false); }, [branding.organization_id]);
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafariDesktop = !isIOS && /safari/i.test(ua) && !/chrome|chromium|crios|android/i.test(ua);
  if (!installation || installation.installed || isDismissed) return null;
  const { ready, error, manifest } = installation;
  const appName = manifest?.name || branding.church_name;
  const handleInstallClick = async () => {
    if (!ready) { if (error) installation.retry(); return; }
    if (isIOS || isSafariDesktop) { setShowIOSModal(true); return; }
    const outcome = await installation.prompt();
    if (outcome === 'accepted') setIsDismissed(true);
    if (outcome === 'manual') setShowIOSModal(true);
  };

  return (
    <>
      <div className="install-banner-pulsing">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          {/* Ícone com Halo Pulsante */}
          <div className="install-icon-pulsing" style={{ flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
              <path d="M12 18h.01"/>
            </svg>
            <span className="install-halo" />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 900, fontSize: 'clamp(0.76rem, 2.6vw, 0.86rem)', color: '#ffffff', letterSpacing: '-0.2px' }}>
                Instalar {appName}
              </span>
              <span className="install-badge-live" style={{ fontSize: '0.60rem', padding: '1px 5px' }}>1-TOQUE</span>
            </div>
            <div style={{ fontSize: 'clamp(0.66rem, 2.2vw, 0.72rem)', color: 'rgba(255,255,255,0.85)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {error || (ready ? 'Acesso direto à sua igreja pela tela inicial' : 'Preparando o nome, o ícone e o endereço da igreja…')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button 
            type="button" 
            onClick={handleInstallClick}
            disabled={!ready && !error}
            aria-busy={!ready && !error}
            aria-label={error ? 'Tentar preparar instalação novamente' : `Instalar ${appName}`}
            className="install-cta-btn"
            style={{ padding: '8px 12px', minHeight: '36px', fontSize: '0.76rem' }}
          >
            {error ? 'Tentar novamente' : ready ? 'Instalar' : 'Preparando…'}
          </button>
          
          <button 
            type="button" 
            onClick={() => setIsDismissed(true)} 
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.3rem', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              Instalar {appName}
            </h3>
            {manifest && <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--panel-border)', borderRadius: 12 }}>
              <img src={manifest.apple_touch_icon} alt="" width={48} height={48} style={{ borderRadius: 10 }} />
              <div><strong>{manifest.name}</strong><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>{new URL(manifest.start_url).hostname}{new URL(manifest.start_url).pathname}</div></div>
            </div>}
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
              {isIOS ? 'No iPhone ou iPad, abra esta página no Safari e siga os passos:' : isSafariDesktop ? 'No Safari do Mac, siga os passos:' : 'No navegador do celular, siga os passos:'}
            </p>

            <div style={{ background: 'var(--exp-background, #f8fafc)', padding: '16px', borderRadius: 'var(--exp-radius, 18px)', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'var(--exp-on-primary, #ffffff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem' }}>1</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                  {isIOS ? <>Toque em <strong>Compartilhar</strong> no Safari.</> : isSafariDesktop ? <>Abra o menu <strong>Arquivo</strong> do Safari.</> : <>Abra o menu <strong>⋮</strong> do navegador (ou o ícone de instalação na barra de endereço).</>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'var(--exp-on-primary, #ffffff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem' }}>2</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                  {isIOS ? <>Selecione <strong>Adicionar à Tela de Início</strong> e confirme o nome da igreja.</> : isSafariDesktop ? <>Selecione <strong>Adicionar ao Dock</strong>.</> : <>Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à Tela de Início</strong>.</>}
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
