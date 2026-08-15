import React, { useState } from 'react';
import { useBranding } from '../context/BrandingContext';

export const Giving: React.FC = () => {
  const { branding } = useBranding();
  const [amount, setAmount] = useState<number>(50);
  const [purpose, setPurpose] = useState<string>('Dízimo');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);

  const presetAmounts = [20, 50, 100, 200, 500];

  const currentAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  const handleCopyPix = () => {
    const pixPayload = `00020126580014br.gov.bcb.pix0136${branding.pwa_slug || 'faithhub'}520400005303986540${currentAmount.toFixed(2)}5802BR5913${branding.church_name.substring(0, 13)}6009SAO PAULO62070503***6304`;
    navigator.clipboard.writeText(pixPayload);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      <div className="section-header-row">
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Dízimos & Ofertas</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sua generosidade sustenta a missão e o Reino de Deus</p>
        </div>
      </div>

      {/* Card Principal de Doação */}
      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Destinação */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
            Finalidade da Contribuição
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {['Dízimo', 'Oferta', 'Missões'].map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setPurpose(item)}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: purpose === item ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                  background: purpose === item ? 'var(--accent-primary-light)' : '#ffffff',
                  color: purpose === item ? 'var(--accent-primary)' : 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Valores Pré-definidos */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
            Valor (R$)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
            {presetAmounts.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => { setAmount(val); setCustomAmount(''); }}
                style={{
                  padding: '10px 4px',
                  borderRadius: '10px',
                  border: amount === val && !customAmount ? '2px solid #059669' : '1px solid var(--panel-border)',
                  background: amount === val && !customAmount ? '#ecfdf5' : '#ffffff',
                  color: amount === val && !customAmount ? '#059669' : 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                R${val}
              </button>
            ))}
          </div>

          <input 
            type="number" 
            className="input-pwa" 
            placeholder="Ou digite outro valor (ex: 75.00)" 
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setAmount(0); }}
          />
        </div>

        {/* Resumo e Botão Pix */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Você está contribuindo com</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', margin: '4px 0 12px 0' }}>
            R$ {currentAmount.toFixed(2).replace('.', ',')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              type="button" 
              className="btn-pwa-primary"
              onClick={() => setShowQrCode(true)}
            >
              ⚡ Gerar QR Code Pix
            </button>

            <button 
              type="button" 
              className="btn-pwa-secondary"
              onClick={handleCopyPix}
            >
              {isCopied ? '✅ Chave Pix Copiada!' : '📋 Copiar Código Pix Copia e Cola'}
            </button>
          </div>
        </div>

      </div>

      {/* Versículo de Generosidade */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.80rem', color: '#78350f', fontStyle: 'italic', margin: 0 }}>
          "Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria." — 2 Coríntios 9:7
        </p>
      </div>

      {/* Modal QR Code */}
      {showQrCode && (
        <div className="drawer-overlay" onClick={() => setShowQrCode(false)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textAlign: 'center', color: 'var(--text-main)' }}>
              Pix • {purpose} ({branding.church_name})
            </h3>
            
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', border: '1px solid var(--panel-border)', margin: '0 auto' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Pix:${branding.church_name}:${currentAmount}:${purpose}`)}`} 
                alt="QR Code Pix"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
              R$ {currentAmount.toFixed(2).replace('.', ',')}
            </div>

            <button type="button" className="btn-pwa-secondary" onClick={handleCopyPix}>
              {isCopied ? '✅ Código Copiado!' : '📋 Copiar Código Pix'}
            </button>

            <button type="button" className="btn-pwa-primary" onClick={() => setShowQrCode(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
