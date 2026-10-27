import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export interface DigitalMemberCardProps {
  member: {
    id?: string;
    name: string;
    email?: string;
    role?: string;
    status?: string;
    campus_name?: string;
    birth_date?: string;
    baptism_date?: string;
    created_at?: string;
  };
  churchName?: string;
  logoUrl?: string;
  avatarUrl?: string;
  accentColor?: string;
}

export const DigitalMemberCard: React.FC<DigitalMemberCardProps> = ({
  member,
  churchName = 'Faith-Hub Community',
  logoUrl,
  avatarUrl,
  accentColor = '#0f766e'
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Gera código único do membro (ex: #FH-04829)
  const memberCode = `FH-${(member.id || member.email || '04829').replace(/[^0-9a-zA-Z]/g, '').slice(-5).toUpperCase()}`;

  // Calcula ano de ingresso
  const joined = member.created_at ? new Date(member.created_at).getFullYear() : null;
  const memberSinceYear = joined && Number.isFinite(joined) ? joined : '—';
  const isActive = ['ACTIVE', 'ATIVO'].includes((member.status || '').toUpperCase());

  // Gerar QR Code localmente
  useEffect(() => {
    const payload = JSON.stringify({
      v: 1,
      app: 'faith-hub',
      id: member.id || member.email,
      code: memberCode,
      name: member.name,
      role: member.role || 'Membro',
      church: churchName,
      campus: member.campus_name || 'Sede Principal'
    });

    QRCode.toDataURL(payload, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Erro ao gerar QR Code do membro:', err));
  }, [member, churchName, memberCode]);

  const roleText = (member.role || 'Membro').toUpperCase();
  const isLeader = roleText.includes('LÍDER') || roleText.includes('PASTOR') || roleText.includes('ADMIN');

  return (
    <>
      {/* Container principal da carteira */}
      <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>

        {/* Barra superior de identificação */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            <span>🪪</span>
            <span>Carteira Digital Oficial</span>
          </div>
          <button
            type="button"
            onClick={() => setIsFlipped(current => !current)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--accent-primary, #0f766e)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🔄</span> {isFlipped ? 'Ver Frente' : 'Ver Verso'}
          </button>
        </div>

        {/* Card Interativo */}
        <div
          onClick={() => setIsFlipped(current => !current)}
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '230px',
            borderRadius: '24px',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s ease',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(0,0,0,0.06)'
          }}
        >
          {/* ========================================================
              FRENTE DA CARTEIRINHA (Estilo Jotiva / Apple Wallet)
              ======================================================== */}
          {!isFlipped && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '230px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f2c2b 100%)',
              padding: '20px 22px',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              overflow: 'hidden'
            }}
          >
            {/* Efeito sutil de brilho no fundo */}
            <div style={{
              position: 'absolute',
              top: '-40%',
              right: '-20%',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            {/* Topo: Nome da Igreja e Badge com Matrícula */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={churchName} style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                    ⛪
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 900, letterSpacing: '-0.2px', textTransform: 'uppercase' }}>
                    {churchName}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600 }}>
                    Credencial Digital de Membro
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  background: isLeader ? 'rgba(245, 158, 11, 0.25)' : 'rgba(168, 85, 247, 0.25)',
                  color: isLeader ? '#fde047' : '#e9d5ff',
                  border: isLeader ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(168, 85, 247, 0.5)',
                  padding: '3px 9px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  letterSpacing: '0.5px'
                }}>
                  {roleText}
                </span>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, marginTop: '3px' }}>
                  #{memberCode}
                </div>
              </div>
            </div>

            {/* Meio: Foto, Nome e Congregação */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '14px 0', zIndex: 1 }}>
              {/* Foto do Membro com Borda Dourada/Esmeralda */}
              <div style={{
                position: 'relative',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '2.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                flexShrink: 0,
                background: '#334155'
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                    {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing: '-0.3px'
                }}>
                  {member.name || 'Membro da Igreja'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>📍</span>
                  <span>{member.campus_name || 'Sede Principal'}</span>
                  <span>·</span>
                  <span>desde {memberSinceYear}</span>
                </div>
              </div>
            </div>

            {/* Rodapé: QR Code e Selo de Autenticidade */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
              <div>
                <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status Eclesiástico
                </div>
                <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  {isActive ? 'Membro Ativo e Regular' : 'Cadastro pendente de regularização'}
                </div>
              </div>

              {/* Miniatura do QR Code com toque para zoom */}
              {qrCodeDataUrl && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsQrModalOpen(true);
                  }}
                  title="Toque para ampliar o QR Code"
                  style={{
                    background: '#ffffff',
                    padding: '4px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                  }}
                >
                  <img src={qrCodeDataUrl} alt="QR Code" style={{ width: '42px', height: '42px', display: 'block' }} />
                </div>
              )}
            </div>
          </div>
          )}

          {/* ========================================================
              VERSO DA CARTEIRINHA (Dados de Batismo, Versículo)
              ======================================================== */}
          {isFlipped && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '230px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              padding: '22px',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1.5px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 800 }}>
                Registro Eclesiástico
              </div>
              <div style={{ fontSize: '0.90rem', fontWeight: 800, marginTop: '4px', color: '#f8fafc' }}>
                {member.name}
              </div>

              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px 10px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.5)' }}>Batismo nas Águas</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#e2e8f0', marginTop: '2px' }}>
                    {member.baptism_date ? new Date(member.baptism_date).toLocaleDateString('pt-BR') : 'Confirmado'}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px 10px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.5)' }}>Matrícula Geral</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                    {memberCode}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px', fontSize: '0.70rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, textAlign: 'center' }}>
                "Assim nós, embora muitos, somos um só corpo em Cristo, e cada membro está ligado a todos os outros." (Romanos 12:5)
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.45)' }}>
                Verificado digitalmente via Faith-Hub
              </div>
              <span style={{ fontSize: '0.70rem', color: '#10b981', fontWeight: 800 }}>
                ✓ Válido
              </span>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Modal Zoom do QR Code para Leitura na Portaria / Recepção */}
      {isQrModalOpen && (
        <div
          onClick={() => setIsQrModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '320px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
              Credencial de Membro
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
              Apresente na portaria ou recepção para credenciamento rápido
            </div>

            <div style={{ margin: '18px auto', padding: '12px', background: '#f8fafc', borderRadius: '16px', display: 'inline-block', border: '1px solid #e2e8f0' }}>
              <img src={qrCodeDataUrl} alt="QR Code Ampliado" style={{ width: '180px', height: '180px', display: 'block' }} />
            </div>

            <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#0f172a' }}>
              {member.name}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#0f766e', fontWeight: 700, marginTop: '2px' }}>
              #{memberCode} · {member.campus_name || 'Sede'}
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '10px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
