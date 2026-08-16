import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword, confirmSignIn } from 'aws-amplify/auth';

const AVATARS = [
  'https://i.pravatar.cc/150?img=11',
  'https://i.pravatar.cc/150?img=12',
  'https://i.pravatar.cc/150?img=33',
  'https://i.pravatar.cc/150?img=47',
  'https://i.pravatar.cc/150?img=68',
  'https://i.pravatar.cc/150?img=5',
  'https://i.pravatar.cc/150?img=8'
];

export const Profile: React.FC = () => {
  const { user, isAuthenticated, signOut, checkAuth } = useAuth();
  const { branding } = useBranding();

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'confirm' | 'forgot' | 'forgot_confirm' | 'new_password_required'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [acceptLGPD, setAcceptLGPD] = useState(true);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Perfil e Customizações
  const [avatarUrl, setAvatarUrl] = useState<string>(AVATARS[0]);
  const [lgpdConsent, setLgpdConsent] = useState<boolean>(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('faithhub_user_avatar');
    if (savedAvatar) setAvatarUrl(savedAvatar);

    const savedLgpd = localStorage.getItem('faithhub_lgpd_consent');
    if (savedLgpd !== null) setLgpdConsent(savedLgpd === 'true');
  }, []);

  const handleSelectAvatar = (url: string) => {
    setAvatarUrl(url);
    localStorage.setItem('faithhub_user_avatar', url);
    setShowAvatarPicker(false);
  };

  const handleToggleLgpd = (checked: boolean) => {
    setLgpdConsent(checked);
    localStorage.setItem('faithhub_lgpd_consent', String(checked));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await signIn({ username: email.trim(), password });
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setAuthMode('new_password_required');
      } else {
        await checkAuth();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao entrar. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await confirmSignIn({ challengeResponse: newPassword });
      await checkAuth();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao definir nova senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (!acceptLGPD) {
      setErrorMsg('É necessário aceitar os termos de privacidade para criar sua conta.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await signUp({
        username: email.trim(),
        password,
        options: {
          userAttributes: {
            name: name.trim(),
            phone_number: phone ? (phone.startsWith('+') ? phone : `+55${phone.replace(/\D/g, '')}`) : undefined,
            birthdate: birthDate || undefined
          }
        }
      });
      setAuthMode('confirm');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await confirmSignUp({
        username: email.trim(),
        confirmationCode: confirmationCode.trim()
      });
      alert('Conta confirmada com sucesso! Faça seu login.');
      setAuthMode('login');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Código inválido.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await resetPassword({ username: email.trim() });
      setAuthMode('forgot_confirm');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao solicitar redefinição.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await confirmResetPassword({
        username: email.trim(),
        confirmationCode: confirmationCode.trim(),
        newPassword
      });
      alert('Senha alterada com sucesso! Faça login com a nova senha.');
      setAuthMode('login');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Código ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  // Se o usuário já está autenticado
  if (isAuthenticated && user) {
    return (
      <div className="pwa-content animate-fade-in">
        
        {/* Card Perfil do Membro com Troca de Avatar */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center', position: 'relative' }}>
          
          <div style={{ position: 'relative', width: '74px', height: '74px', margin: '0 auto 12px auto' }}>
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-primary)' }} 
            />
            <button 
              type="button" 
              onClick={() => setShowAvatarPicker(true)}
              style={{ position: 'absolute', bottom: 0, right: -4, background: 'var(--accent-primary)', color: '#ffffff', border: '2px solid #ffffff', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem' }}
              title="Trocar Foto"
            >
              📷
            </button>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {user.name || 'Membro da Igreja'}
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {user.email}
          </p>

          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 800 }}>
              ✓ Membro Ativo
            </span>
            <span style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 800 }}>
              Célula Graça & Vida
            </span>
          </div>
        </div>

        {/* Modal de Escolha de Avatar */}
        {showAvatarPicker && (
          <div className="drawer-overlay" onClick={() => setShowAvatarPicker(false)}>
            <div className="drawer-container" onClick={e => e.stopPropagation()}>
              <div className="drawer-handle" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', color: 'var(--text-main)' }}>
                Escolha seu Avatar
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '10px 0' }}>
                {AVATARS.map((url, i) => (
                  <img 
                    key={i}
                    src={url} 
                    alt={`Avatar ${i}`} 
                    onClick={() => handleSelectAvatar(url)}
                    style={{ width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', border: avatarUrl === url ? '3px solid var(--accent-primary)' : '1px solid var(--panel-border)', objectFit: 'cover' }}
                  />
                ))}
              </div>
              <button type="button" className="btn-pwa-secondary" onClick={() => setShowAvatarPicker(false)}>
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Informações da Igreja e Vínculo */}
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Minha Comunidade & Contatos
          </span>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            🏛️ <strong>{branding.church_name}</strong>
          </div>
          {branding.address && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              📍 <strong>Endereço:</strong> {branding.address}, {branding.city} - {branding.state}
            </div>
          )}
          {branding.whatsapp && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              💬 <strong>Secretaria (WhatsApp):</strong> {branding.whatsapp}
            </div>
          )}
          {branding.email && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              ✉️ <strong>E-mail:</strong> {branding.email}
            </div>
          )}
          {branding.instagram && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              📸 <strong>Instagram:</strong> {branding.instagram}
            </div>
          )}
          {branding.youtube && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              🎥 <strong>Canal YouTube:</strong> {branding.youtube}
            </div>
          )}
          {branding.website && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              🌐 <strong>Site Oficial:</strong> {branding.website}
            </div>
          )}
        </div>

        {/* Configuração de Privacidade & LGPD */}
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '16px', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-main)' }}>
              Termos de Uso & LGPD
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Permitir notificações e comunicados da liderança
            </div>
          </div>

          <label className="switch-control">
            <input 
              type="checkbox" 
              checked={lgpdConsent} 
              onChange={e => handleToggleLgpd(e.target.checked)} 
            />
            <span className="slider-round" />
          </label>
        </div>

        {/* Botão de Desconectar */}
        <button 
          type="button" 
          className="btn-pwa-secondary"
          onClick={signOut}
          style={{ color: '#ef4444', fontWeight: 800 }}
        >
          Sair da Conta (Logout)
        </button>

      </div>
    );
  }

  // Se não está autenticado, renderiza o fluxo de Login / Cadastro Cognito
  return (
    <div className="pwa-content animate-fade-in">
      
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
        
        {/* Switcher entre Entrar e Criar Conta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '14px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: authMode === 'login' ? '#ffffff' : 'transparent',
              color: authMode === 'login' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: authMode === 'login' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Entrar na Conta
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: authMode === 'signup' ? '#ffffff' : 'transparent',
              color: authMode === 'signup' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: authMode === 'signup' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Criar Nova Conta
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '12px', fontSize: '0.78rem', marginBottom: '14px', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                E-mail
              </label>
              <input 
                type="email" 
                className="input-pwa" 
                placeholder="seu@email.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Senha
              </label>
              <input 
                type="password" 
                className="input-pwa" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="button" 
              onClick={() => { setAuthMode('forgot'); setErrorMsg(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right', cursor: 'pointer' }}
            >
              Esqueceu sua senha?
            </button>

            <button type="submit" className="btn-pwa-primary" disabled={loading} style={{ marginTop: '6px' }}>
              {loading ? 'Entrando...' : 'Entrar no Aplicativo'}
            </button>
          </form>
        )}

        {/* SIGNUP FORM COM CAMPOS COMPLETOS */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Nome Completo *
              </label>
              <input 
                type="text" 
                className="input-pwa" 
                placeholder="Seu nome completo" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                E-mail *
              </label>
              <input 
                type="email" 
                className="input-pwa" 
                placeholder="seu@email.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  WhatsApp / Celular
                </label>
                <input 
                  type="tel" 
                  className="input-pwa" 
                  placeholder="(11) 98765-4321" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Data de Nascimento
                </label>
                <input 
                  type="date" 
                  className="input-pwa" 
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Senha de Acesso (mínimo 8 caracteres) *
              </label>
              <input 
                type="password" 
                className="input-pwa" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Aceite LGPD & Termos */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', margin: '4px 0' }}>
              <input 
                type="checkbox" 
                checked={acceptLGPD} 
                onChange={e => setAcceptLGPD(e.target.checked)} 
                style={{ marginTop: '2px' }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                Concordo com os <strong>Termos de Uso e Política de Privacidade (LGPD)</strong> para receber avisos e comunicações da igreja.
              </span>
            </label>

            <button type="submit" className="btn-pwa-primary" disabled={loading}>
              {loading ? 'Criando Conta...' : 'Cadastrar e Conectar'}
            </button>
          </form>
        )}

        {/* CONFIRM EMAIL CODE */}
        {authMode === 'confirm' && (
          <form onSubmit={handleConfirmCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Enviamos um código de verificação para <strong>{email}</strong>.
            </p>

            <input 
              type="text" 
              className="input-pwa" 
              placeholder="Digite o código (ex: 123456)" 
              value={confirmationCode}
              onChange={e => setConfirmationCode(e.target.value)}
              required
            />

            <button type="submit" className="btn-pwa-primary" disabled={loading}>
              {loading ? 'Confirmando...' : 'Confirmar e Ativar Conta'}
            </button>

            <button 
              type="button" 
              onClick={() => setAuthMode('login')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              ← Voltar ao login
            </button>
          </form>
        )}

        {/* TROCA DE SENHA OBRIGATÓRIA NO 1º ACESSO (CONVITE) */}
        {authMode === 'new_password_required' && (
          <form onSubmit={handleConfirmNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Este é o seu primeiro acesso. Por favor, cadastre uma nova senha pessoal para continuar.
            </p>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Nova Senha Pessoal *
              </label>
              <input 
                type="password" 
                className="input-pwa" 
                placeholder="Mínimo 8 caracteres" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-pwa-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Nova Senha & Entrar'}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Informe seu e-mail cadastrado para enviarmos as instruções de recuperação.
            </p>

            <input 
              type="email" 
              className="input-pwa" 
              placeholder="seu@email.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <button type="submit" className="btn-pwa-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Código de Recuperação'}
            </button>

            <button 
              type="button" 
              onClick={() => setAuthMode('login')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              ← Voltar ao login
            </button>
          </form>
        )}

        {/* FORGOT CONFIRM PASSWORD */}
        {authMode === 'forgot_confirm' && (
          <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Digite o código que você recebeu por e-mail e sua nova senha.
            </p>

            <input 
              type="text" 
              className="input-pwa" 
              placeholder="Código de recuperação" 
              value={confirmationCode}
              onChange={e => setConfirmationCode(e.target.value)}
              required
            />

            <input 
              type="password" 
              className="input-pwa" 
              placeholder="Nova senha (mínimo 8 dígitos)" 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />

            <button type="submit" className="btn-pwa-primary" disabled={loading}>
              {loading ? 'Redefinindo...' : 'Salvar Nova Senha'}
            </button>
          </form>
        )}

      </div>

    </div>
  );
};
