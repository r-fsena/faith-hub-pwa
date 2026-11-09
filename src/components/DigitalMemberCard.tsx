import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import './DigitalMemberCard.css';

export interface DigitalMemberCardProps {
  member: {
    id?: string; name: string; email?: string; role?: string; status?: string;
    campus_name?: string; birth_date?: string; baptism_date?: string; created_at?: string;
  };
  churchName?: string; logoUrl?: string; avatarUrl?: string; accentColor?: string; onEdit?: () => void;
}

export const DigitalMemberCard: React.FC<DigitalMemberCardProps> = ({
  member, churchName = 'Faith-Hub Community', logoUrl, avatarUrl, onEdit
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => setAvatarFailed(false), [avatarUrl]);
  const memberCode = `FH-${(member.id || member.email || '04829').replace(/[^0-9a-zA-Z]/g, '').slice(-5).toUpperCase()}`;
  const joined = member.created_at ? new Date(member.created_at).getFullYear() : null;
  const memberSinceYear = joined && Number.isFinite(joined) ? joined : '—';
  const isActive = ['ACTIVE', 'ATIVO'].includes((member.status || '').toUpperCase());
  const roleText = (member.role || 'Membro').toUpperCase();
  useEffect(() => {
    let live = true;
    const payload = JSON.stringify({ v: 1, app: 'faith-hub', id: member.id || member.email, code: memberCode,
      name: member.name, role: member.role || 'Membro', church: churchName, campus: member.campus_name || 'Sede Principal' });
    QRCode.toDataURL(payload, { width: 256, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(url => { if (live) setQrCodeDataUrl(url); })
      .catch(err => console.error('Erro ao gerar QR Code do membro:', err));
    return () => { live = false; };
  }, [member, churchName, memberCode]);

  return <>
    <section className="member-card" aria-label="Carteira digital do membro">
      <div className="member-card-toolbar">
        <strong>🪪 Carteira Digital Oficial</strong>
        {onEdit && <button type="button" onClick={onEdit} aria-label="Editar dados do perfil">✏️ Editar dados</button>}
      </div>
      <div className="member-card-face" role="button" tabIndex={0}
        aria-label={isFlipped ? 'Ver frente da carteira' : 'Ver verso da carteira'}
        onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setIsFlipped(current => !current); } }}
        onClick={() => setIsFlipped(current => !current)}>
        {!isFlipped && (
          <div className="member-card-front">
            <header className="member-card-header">
              <div className="member-card-identity">
                {logoUrl ? <img className="member-card-logo" data-brand-logo="true" src={logoUrl} alt="" /> : <span aria-hidden="true">⛪</span>}
                <div className="member-card-church"><strong>{churchName}</strong><p>Credencial Digital de Membro</p></div>
              </div>
              <span className="member-card-role">{roleText}</span>
            </header>
            <div className="member-card-person">
              <div className="member-card-avatar">
                {avatarUrl && !avatarFailed ? <img src={avatarUrl} alt={member.name} onError={() => setAvatarFailed(true)} /> : <span>{member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>}
              </div>
              <div className="member-card-person-details"><h2>{member.name || 'Membro da Igreja'}</h2><p>{member.campus_name || 'Sede Principal'} · desde {memberSinceYear}</p><p className="member-card-code">#{memberCode}</p></div>
            </div>
            <footer className="member-card-footer">
              <div><p className="member-card-label">Status Eclesiástico</p><strong className="member-card-status">{isActive ? '✓ Membro Ativo e Regular' : 'Cadastro pendente de regularização'}</strong><p className="member-card-hint">↻ Toque no cartão para ver o verso</p></div>
              {qrCodeDataUrl && <button type="button" className="member-card-qr" aria-label="Ampliar QR Code da carteira" onClick={event => { event.stopPropagation(); setIsQrModalOpen(true); }}><img src={qrCodeDataUrl} alt="QR Code" width={46} height={46} /></button>}
            </footer>
          </div>
        )}
        {isFlipped && (
          <div className="member-card-back">
            <div><p className="member-card-label">Registro Eclesiástico</p><h2>{member.name}</h2></div>
            <dl className="member-card-records"><div><dt>Batismo nas Águas</dt><dd>{member.baptism_date ? new Date(member.baptism_date).toLocaleDateString('pt-BR') : 'Não informado'}</dd></div><div><dt>Matrícula Geral</dt><dd>{memberCode}</dd></div></dl>
            <p className="member-card-verse">“Assim nós, embora muitos, somos um só corpo em Cristo, e cada membro está ligado a todos os outros.” (Romanos 12:5)</p>
            <footer className="member-card-footer"><div><p>Verificado digitalmente via Faith-Hub</p><p className="member-card-hint">↻ Toque no cartão para voltar</p></div></footer>
          </div>
        )}
      </div>
    </section>
    {isQrModalOpen && <div className="member-card-modal-overlay" onClick={() => setIsQrModalOpen(false)}>
      <div className="member-card member-card-modal" role="dialog" aria-modal="true" aria-label="Credencial de Membro" onClick={event => event.stopPropagation()}>
        <h2>Credencial de Membro</h2><p>Apresente na portaria ou recepção para credenciamento rápido</p>
        <div className="member-card-qr member-card-qr-large"><img src={qrCodeDataUrl} alt="QR Code Ampliado" width={180} height={180} /></div>
        <strong>{member.name}</strong><p>#{memberCode} · {member.campus_name || 'Sede'}</p>
        <button type="button" className="member-card-close" onClick={() => setIsQrModalOpen(false)}>Fechar</button>
      </div>
    </div>}
  </>;
};
