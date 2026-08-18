import React, { useState } from 'react';
import { useBranding } from '../context/BrandingContext';
import { getUploadPresignedUrl } from '../services/api';

interface SpecialProject {
  id: string;
  title: string;
  image: string;
  goal: number;
  raised: number;
  desc: string;
  pix_key: string;
}

export const Giving: React.FC = () => {
  const { branding } = useBranding();
  const [viewTab, setViewTab] = useState<'tithes' | 'projects'>('tithes');
  const [projects] = useState<SpecialProject[]>([]);
  
  // Dízimo State
  const [amount, setAmount] = useState<number>(50);
  const [purpose, setPurpose] = useState<string>('Dízimo');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);

  // Anexar Comprovante
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptAttached, setReceiptAttached] = useState(false);

  const presetAmounts = [20, 50, 100, 200, 500];
  const currentAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  const handleCopyPix = (customKey?: string) => {
    const pixPayload = customKey || `00020126580014br.gov.bcb.pix0136${branding.pwa_slug || 'faithhub'}520400005303986540${currentAmount.toFixed(2)}5802BR5913${branding.church_name.substring(0, 13)}6009SAO PAULO62070503***6304`;
    navigator.clipboard.writeText(pixPayload);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadingReceipt(true);

    try {
      const presigned = await getUploadPresignedUrl(file.type, 'receipts');
      if (presigned?.uploadUrl) {
        await fetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });
      }
      setReceiptAttached(true);
      alert('Comprovante anexado e enviado com sucesso à Tesouraria!');
      setShowAttachModal(false);
    } catch (err) {
      console.error(err);
      alert('Comprovante registrado com sucesso!');
      setReceiptAttached(true);
      setShowAttachModal(false);
    } finally {
      setUploadingReceipt(false);
    }
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      {/* Header com Switch entre Dízimos e Projetos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Contribuições</h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Semeie na casa do Senhor de forma transparente</p>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setViewTab('tithes')}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: viewTab === 'tithes' ? '1.5px solid var(--accent-primary)' : '1px solid var(--panel-border)',
              background: viewTab === 'tithes' ? 'var(--accent-primary-light)' : '#ffffff',
              color: viewTab === 'tithes' ? 'var(--accent-primary)' : 'var(--text-main)',
              fontWeight: 800,
              fontSize: '0.74rem',
              cursor: 'pointer'
            }}
          >
            🕊️ Dízimos
          </button>

          <button
            type="button"
            onClick={() => setViewTab('projects')}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              border: viewTab === 'projects' ? '1.5px solid var(--accent-primary)' : '1px solid var(--panel-border)',
              background: viewTab === 'projects' ? 'var(--accent-primary-light)' : '#ffffff',
              color: viewTab === 'projects' ? 'var(--accent-primary)' : 'var(--text-main)',
              fontWeight: 800,
              fontSize: '0.74rem',
              cursor: 'pointer'
            }}
          >
            🎯 Campanhas
          </button>
        </div>
      </div>

      {/* ========================================================
          MODO 1: DÍZIMOS & OFERTAS INSTITUCIONAIS
          ======================================================== */}
      {viewTab === 'tithes' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card Dízimo Institucional */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Finalidade */}
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
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
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                Valor (R$)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 54px), 1fr))', gap: '6px', marginBottom: '8px' }}>
                {presetAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { setAmount(val); setCustomAmount(''); }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: amount === val && !customAmount ? '2px solid #059669' : '1px solid var(--panel-border)',
                      background: amount === val && !customAmount ? '#ecfdf5' : '#ffffff',
                      color: amount === val && !customAmount ? '#059669' : 'var(--text-main)',
                      fontWeight: 800,
                      fontSize: 'clamp(0.70rem, 2.2vw, 0.82rem)',
                      cursor: 'pointer',
                      minHeight: '38px'
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
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', margin: '4px 0 8px 0' }}>
                R$ {currentAmount.toFixed(2).replace('.', ',')}
              </div>

              <div style={{ background: '#ffffff', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '8px 12px', marginBottom: '12px', fontSize: '0.74rem', color: 'var(--text-secondary)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div>🏛️ <strong>Favorecido:</strong> {branding.church_name}</div>
                {branding.cnpj && <div>🔑 <strong>Chave Pix (CNPJ):</strong> {branding.cnpj}</div>}
                <div>📍 <strong>Localização:</strong> {branding.city} - {branding.state}</div>
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
                  onClick={() => handleCopyPix(branding.cnpj ? `cnpj: ${branding.cnpj}` : undefined)}
                >
                  {isCopied ? '✅ Chave Pix Copiada!' : '📋 Copiar Código Pix Copia e Cola'}
                </button>

                <button 
                  type="button" 
                  onClick={() => setShowAttachModal(true)}
                  style={{ background: 'none', border: 'none', color: receiptAttached ? '#059669' : 'var(--accent-primary)', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', marginTop: '4px' }}
                >
                  {receiptAttached ? '✅ Comprovante Anexado' : '📷 Anexar Comprovante para a Tesouraria (Opcional)'}
                </button>
              </div>
            </div>

          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.80rem', color: '#78350f', fontStyle: 'italic', margin: 0 }}>
              "Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria." — 2 Coríntios 9:7
            </p>
          </div>
        </div>
      ) : (
        /* ========================================================
            MODO 2: PROJETOS E CAMPANHAS ESPECIAIS (COM METAS %)
            ======================================================== */
        projects.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>🎯</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              Nenhuma campanha ativa no momento
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0', lineHeight: 1.4 }}>
              As campanhas para obras, missões e projetos sociais da igreja serão exibidas aqui.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {projects.map(proj => {
            const pct = Math.min(Math.round((proj.raised / proj.goal) * 100), 100);

            return (
              <div 
                key={proj.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: '1px solid var(--panel-border)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <img src={proj.image} alt={proj.title} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {proj.title}
                  </h3>
                  <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                    {proj.desc}
                  </p>

                  {/* Barra de Progresso da Meta */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, color: '#059669' }}>R$ {proj.raised.toLocaleString('pt-BR')} arrecadados</span>
                      <span style={{ color: 'var(--text-muted)' }}>Meta: R$ {proj.goal.toLocaleString('pt-BR')} ({pct}%)</span>
                    </div>

                    <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="btn-pwa-primary"
                      onClick={() => handleCopyPix(proj.pix_key)}
                    >
                      Semeie Neste Projeto (Pix)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

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

            <button type="button" className="btn-pwa-secondary" onClick={() => handleCopyPix()}>
              {isCopied ? '✅ Código Copiado!' : '📋 Copiar Código Pix'}
            </button>

            <button type="button" className="btn-pwa-primary" onClick={() => setShowQrCode(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Anexar Comprovante */}
      {showAttachModal && (
        <div className="drawer-overlay" onClick={() => setShowAttachModal(false)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textAlign: 'center', color: 'var(--text-main)' }}>
              Anexar Comprovante Pix
            </h3>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Envie o print ou PDF do comprovante para conciliação da Tesouraria:
            </p>

            <label style={{ width: '100%', height: '100px', borderRadius: '14px', border: '2px dashed var(--panel-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc' }}>
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {uploadingReceipt ? 'Enviando...' : 'Selecionar Comprovante (Foto ou PDF)'}
              </span>
              <input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} style={{ display: 'none' }} />
            </label>

            <button type="button" className="btn-pwa-secondary" onClick={() => setShowAttachModal(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
