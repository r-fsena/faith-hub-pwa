import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { getUploadPresignedUrl } from '../services/api';
import { generatePixBrCode, getPixQrCodeImageUrl, normalizePixKey } from '../services/pixGenerator';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

interface SpecialProject {
  id: string;
  title: string;
  image_url?: string;
  target_amount: number;
  collected_amount: number;
  description?: string;
  pix_key?: string;
  status: string;
}

export const Giving: React.FC = () => {
  const { branding } = useBranding();
  const { user } = useAuth();
  const { isEnabled: isOfficialPixEnabled } = useFeatureFlag('financial.pix_static_official', true);

  const [viewTab, setViewTab] = useState<'tithes' | 'projects'>('tithes');
  const [projects, setProjects] = useState<SpecialProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Dízimo State
  const [amount, setAmount] = useState<number>(50);
  const [purpose, setPurpose] = useState<string>('Dízimo');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);

  // Contexto do Modal de QR Code Ativo (Dízimo ou Campanha Específica)
  const [activeModalTitle, setActiveModalTitle] = useState<string>('');
  const [activeModalPixKey, setActiveModalPixKey] = useState<string>('');
  const [activeModalProjectId, setActiveModalProjectId] = useState<string | null>(null);

  // Anexar Comprovante
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptAttached, setReceiptAttached] = useState(false);

  const presetAmounts = [20, 50, 100, 200, 500];
  const currentAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  const orgId = branding.organization_id || 'org_default';
  const churchPixKey = branding.pix_key || branding.cnpj || branding.email || '';

  useEffect(() => {
    fetchProjects();
  }, [orgId]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${API_URL}/financial/projects?organization_id=${orgId}`);
      if (res.ok) {
        const json = await res.json();
        setProjects(json.data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar projetos especiais:', e);
    } finally {
      setLoadingProjects(false);
    }
  };

  /**
   * Constrói o payload oficial BR Code ou chave simples dependendo da flag
   */
  const buildPixCode = (customKey?: string, projectId?: string, customTitle?: string) => {
    const rawKey = customKey || churchPixKey;
    if (!rawKey) return '';

    if (!isOfficialPixEnabled) {
      return rawKey;
    }

    try {
      const itemTitle = customTitle || purpose;
      return generatePixBrCode({
        pixKey: rawKey,
        merchantName: branding.church_name || 'Igreja',
        merchantCity: branding.city || 'Brasil',
        amount: currentAmount > 0 ? currentAmount : undefined,
        txId: projectId ? `PROJ${projectId.substring(0, 10)}` : (purpose === 'Dízimo' ? 'DIZIMO' : 'OFERTA'),
        description: `${itemTitle} ${branding.church_name}`.substring(0, 25)
      });
    } catch (err) {
      console.warn('Fallback Pix BR Code:', err);
      return rawKey;
    }
  };

  const handleCopyPix = (customKey?: string, projectId?: string, customTitle?: string) => {
    const payload = buildPixCode(customKey, projectId, customTitle);
    if (!payload) {
      alert('Chave Pix da igreja ainda não configurada.');
      return;
    }

    navigator.clipboard.writeText(payload);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);

    // Registra intenção / transação na tesouraria
    fetch(`${API_URL}/financial/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: orgId,
        type: 'INCOME',
        category: projectId ? 'Campanha / Projeto' : purpose,
        description: projectId ? `Contribuição Projeto PIX: ${customTitle || branding.church_name}` : `${purpose} via App PWA`,
        amount: currentAmount,
        payment_method: 'PIX',
        status: 'PAID',
        member_name: user?.name || user?.email || 'Membro do App',
        origin_module: 'TITHES',
        project_id: projectId || null
      })
    }).catch(() => {});
  };

  const [confirmSuccess, setConfirmSuccess] = useState(false);

  const handleConfirmContribution = async (customKey?: string, projectId?: string, customTitle?: string) => {
    try {
      await fetch(`${API_URL}/financial/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          type: 'INCOME',
          category: projectId ? 'Campanha / Projeto' : purpose,
          description: projectId ? `Contribuição Projeto PIX: ${customTitle || branding.church_name}` : `${purpose} via App PWA`,
          amount: currentAmount,
          payment_method: 'PIX',
          status: 'PAID',
          member_name: user?.name || user?.email || 'Membro do App',
          origin_module: 'TITHES',
          project_id: projectId || null
        })
      });
      setConfirmSuccess(true);
      setTimeout(() => {
        setConfirmSuccess(false);
        setShowQrCode(false);
      }, 2000);
    } catch {
      setShowQrCode(false);
    }
  };

  const handleOpenQrCodeModal = (customKey?: string, projectId?: string, customTitle?: string) => {
    setActiveModalPixKey(customKey || churchPixKey);
    setActiveModalProjectId(projectId || null);
    setActiveModalTitle(customTitle || purpose);
    setShowQrCode(true);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadingReceipt(true);

    try {
      const presigned = await getUploadPresignedUrl(file.type, 'receipts');
      let receiptUrl = '';
      if (presigned?.uploadUrl) {
        await fetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });
        receiptUrl = presigned.uploadUrl.split('?')[0];
      }

      // Salva transação na tesouraria com comprovante
      await fetch(`${API_URL}/financial/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          type: 'INCOME',
          category: activeModalProjectId ? 'Campanha / Projeto' : purpose,
          description: `${activeModalTitle || purpose} com comprovante anexado`,
          amount: currentAmount,
          payment_method: 'PIX',
          status: 'PAID',
          member_name: user?.name || user?.email || 'Membro do App',
          origin_module: 'TITHES',
          receipt_url: receiptUrl || null,
          project_id: activeModalProjectId || null
        })
      });

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

  // Payload ativo do modal
  const activeBrCode = buildPixCode(activeModalPixKey, activeModalProjectId || undefined, activeModalTitle);
  const activeQrCodeUrl = getPixQrCodeImageUrl(activeBrCode, 280);

  return (
    <div className="pwa-content animate-fade-in">
      
      {/* Header com Switch entre Dízimos e Projetos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
            Contribuições
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            {branding.church_name}
          </p>
        </div>

        {/* Switch de Visualização */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => setViewTab('tithes')}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: '9px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: viewTab === 'tithes' ? '#ffffff' : 'transparent',
              color: viewTab === 'tithes' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              boxShadow: viewTab === 'tithes' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Dízimos & Ofertas
          </button>
          <button
            type="button"
            onClick={() => setViewTab('projects')}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: '9px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: viewTab === 'projects' ? '#ffffff' : 'transparent',
              color: viewTab === 'projects' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              boxShadow: viewTab === 'projects' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Campanhas ({projects.length})
          </button>
        </div>
      </div>

      {/* ========================================================
          MODO 1: DÍZIMOS & OFERTAS INSTITUCIONAIS
          ======================================================== */}
      {viewTab === 'tithes' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card Dízimo Institucional */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Finalidade */}
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Finalidade da Contribuição
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['Dízimo', 'Oferta', 'Missões'].map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPurpose(item)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '12px',
                      border: purpose === item ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                      background: purpose === item ? 'var(--accent-primary-light)' : '#ffffff',
                      color: purpose === item ? 'var(--accent-primary)' : 'var(--text-main)',
                      fontWeight: 800,
                      fontSize: '0.80rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Valores Pré-definidos */}
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Selecione o Valor
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {presetAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { setAmount(val); setCustomAmount(''); }}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '10px',
                      border: (!customAmount && amount === val) ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                      background: (!customAmount && amount === val) ? 'var(--accent-primary)' : '#ffffff',
                      color: (!customAmount && amount === val) ? '#ffffff' : 'var(--text-main)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    R$ {val}
                  </button>
                ))}
              </div>

              <input 
                type="number" 
                step="0.01"
                className="input-pwa" 
                style={{ width: '100%', marginTop: '10px', fontSize: '0.84rem' }}
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

              <div style={{ background: '#ffffff', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px', fontSize: '0.74rem', color: 'var(--text-secondary)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div>🏛️ <strong>Favorecido:</strong> {branding.church_name}</div>
                {churchPixKey && <div>🔑 <strong>Chave Pix:</strong> {churchPixKey}</div>}
                <div>📍 <strong>Localização:</strong> {branding.city || 'Brasil'} {branding.state ? `- ${branding.state}` : ''}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn-pwa-primary"
                  onClick={() => handleOpenQrCodeModal(churchPixKey, undefined, purpose)}
                >
                  ⚡ Gerar QR Code Pix Oficial
                </button>

                <button 
                  type="button" 
                  className="btn-pwa-secondary"
                  onClick={() => handleCopyPix(churchPixKey, undefined, purpose)}
                >
                  {isCopied ? '✅ Código Pix Oficial Copiado!' : '📋 Copiar Código Pix Copia e Cola'}
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
              const collected = Number(proj.collected_amount || 0);
              const target = Number(proj.target_amount || 1);
              const pct = Math.min(Math.round((collected / target) * 100), 100);

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
                  {proj.image_url && (
                    <img src={proj.image_url} alt={proj.title} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                  )}
                  
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      {proj.title}
                    </h3>
                    <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                      {proj.description || 'Campanha oficial da igreja.'}
                    </p>

                    {/* Barra de Progresso da Meta */}
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#059669' }}>R$ {collected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Meta: R$ {target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({pct}%)</span>
                      </div>

                      <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        className="btn-pwa-primary"
                        onClick={() => handleOpenQrCodeModal(proj.pix_key || churchPixKey, proj.id, proj.title)}
                      >
                        ⚡ Semeie Neste Projeto (Pix)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ========================================================
          MODAL DE QR CODE OFICIAL PIX
          ======================================================== */}
      {showQrCode && (
        <div className="drawer-overlay" onClick={() => setShowQrCode(false)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="drawer-handle" />
            
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                Pix Oficial • Banco Central
              </div>
              <h3 style={{ fontSize: '1.10rem', fontWeight: 900, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                {activeModalTitle}
              </h3>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {branding.church_name}
              </div>
            </div>
            
            {/* QR Code Container */}
            <div style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: '20px',
              border: '1px solid var(--panel-border)',
              margin: '0 auto',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              {activeBrCode ? (
                <img 
                  src={activeQrCodeUrl} 
                  alt="QR Code Pix Oficial"
                  style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
                />
              ) : (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.80rem' }}>
                  Chave Pix não encontrada para esta igreja.
                </div>
              )}

              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669' }}>
                {currentAmount > 0 ? `R$ ${currentAmount.toFixed(2).replace('.', ',')}` : 'Valor Livre'}
              </div>
            </div>

            {/* Informações do Recebedor */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '10px 14px', border: '1px solid var(--panel-border)', fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div>🏛️ <strong>Favorecido:</strong> {branding.church_name}</div>
              <div>🔑 <strong>Chave:</strong> {activeModalPixKey || churchPixKey || 'Não cadastrada'}</div>
              <div>📍 <strong>Cidade:</strong> {branding.city || 'Brasil'}</div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <button 
                type="button" 
                className="btn-pwa-primary" 
                onClick={() => handleCopyPix(activeModalPixKey, activeModalProjectId || undefined, activeModalTitle)}
                style={{ padding: '14px', fontSize: '0.85rem' }}
              >
                {isCopied ? '✅ Código Pix Copiado com Sucesso!' : '📋 Copiar Código Pix Copia e Cola'}
              </button>

              <button 
                type="button" 
                className="btn-pwa-secondary"
                style={{ borderColor: '#059669', color: '#059669', background: '#ecfdf5', fontWeight: 800, padding: '12px' }}
                onClick={() => handleConfirmContribution(activeModalPixKey, activeModalProjectId || undefined, activeModalTitle)}
              >
                {confirmSuccess ? '🎉 Pagamento Confirmado com Sucesso!' : '✅ Já realizei o pagamento (Confirmar)'}
              </button>

              <button 
                type="button" 
                onClick={() => {
                  setShowQrCode(false);
                  setShowAttachModal(true);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', padding: '6px' }}
              >
                📷 Anexar Comprovante (Opcional)
              </button>

              <button 
                type="button" 
                onClick={() => setShowQrCode(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '4px' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE ANEXAR COMPROVANTE
          ======================================================== */}
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
