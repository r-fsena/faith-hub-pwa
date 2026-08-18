import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword, confirmSignIn, signInWithRedirect, updateUserAttributes } from 'aws-amplify/auth';
import { getActiveCampusId } from '../services/api';
import { BottomSheet } from '../components/BottomSheet';
import { KidsVolunteerPanel } from '../components/KidsVolunteerPanel';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

const CURATED_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Faith1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Faith2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Faith3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Faith4'
];

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

export const Profile: React.FC = () => {
  const { user, isAuthenticated, signOut, checkAuth } = useAuth();
  const { branding } = useBranding();

  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'confirm' | 'forgot' | 'forgot_confirm' | 'new_password_required'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [acceptLGPD, setAcceptLGPD] = useState(true);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Perfil e Dados do Membro
  const [avatarUrl, setAvatarUrl] = useState<string>(CURATED_AVATARS[0]);
  const [memberProfile, setMemberProfile] = useState<{
    name: string;
    phone: string;
    address: string;
    role: string;
    campus_name: string;
  }>({
    name: '',
    phone: '',
    address: '',
    role: 'Membro',
    campus_name: 'Sede Principal'
  });

  // Modais de Edição
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isKidsVolunteerOpen, setIsKidsVolunteerOpen] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(true);

  // File Inputs para Câmera e Galeria
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('faithhub_user_avatar');
    if (savedAvatar) setAvatarUrl(savedAvatar);

    const savedLgpd = localStorage.getItem('faithhub_lgpd_consent');
    if (savedLgpd !== null) setLgpdConsent(savedLgpd === 'true');

    if (isAuthenticated && user) {
      loadUserProfile();
    }
  }, [isAuthenticated, user]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const localPhone = localStorage.getItem('faithhub_user_phone') || '';
      const localAddress = localStorage.getItem('faithhub_user_address') || '';

      setMemberProfile(prev => ({
        ...prev,
        name: user.name || user.email.split('@')[0],
        phone: localPhone,
        address: localAddress
      }));

      const activeCampus = getActiveCampusId();
      const res = await fetch(`${API_URL}/members?organization_id=org_default`);
      if (res.ok) {
        const json = await res.json();
        const found = (json.data || []).find((m: any) => m.email?.toLowerCase() === user.email?.toLowerCase() || m.id === user.userId);
        if (found) {
          setMemberProfile({
            name: found.name || user.name || '',
            phone: found.phone || localPhone,
            address: found.address || localAddress,
            role: found.role || 'Membro',
            campus_name: found.campus_name || (activeCampus === 'campus_sede' ? 'Sede Principal' : 'Congregação Local')
          });
          if (found.avatar_url && !savedAvatarExists()) {
            setAvatarUrl(found.avatar_url);
            localStorage.setItem('faithhub_user_avatar', found.avatar_url);
          }
        }
      }
    } catch (e) {
      console.log("Offline/fallback profile loading", e);
    }
  };

  const savedAvatarExists = () => Boolean(localStorage.getItem('faithhub_user_avatar'));

  // Salvar Edição de Dados Pessoais (Nome, Telefone, Endereço)
  const handleSaveProfileData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberProfile.name.trim()) {
      alert("Por favor, preencha seu nome.");
      return;
    }
    setIsSavingProfile(true);
    try {
      localStorage.setItem('faithhub_user_phone', memberProfile.phone);
      localStorage.setItem('faithhub_user_address', memberProfile.address);

      try {
        await updateUserAttributes({
          userAttributes: {
            name: memberProfile.name.trim()
          }
        });
      } catch (errCognito) {
        console.log("Cognito attr update notice:", errCognito);
      }

      if (user?.userId) {
        await fetch(`${API_URL}/members/${user.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: memberProfile.name.trim(),
            phone: memberProfile.phone,
            address: memberProfile.address,
            avatar_url: avatarUrl
          })
        }).catch(() => {});
      }

      setIsEditProfileOpen(false);
      alert("Perfil atualizado com sucesso!");
      await checkAuth();
    } catch (err: any) {
      console.error("Erro ao salvar perfil:", err);
      alert("Erro ao salvar dados.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Processar Imagem Selecionada (Avatar, Galeria ou Câmera)
  const handleProcessImage = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
        localStorage.setItem('faithhub_user_avatar', dataUrl);
        setShowAvatarPicker(false);

        if (user?.userId) {
          fetch(`${API_URL}/members/${user.userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar_url: dataUrl })
          }).catch(() => {});
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectCuratedAvatar = (url: string) => {
    setAvatarUrl(url);
    localStorage.setItem('faithhub_user_avatar', url);
    setShowAvatarPicker(false);

    if (user?.userId) {
      fetch(`${API_URL}/members/${user.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: url })
      }).catch(() => {});
    }
  };

  const handleToggleLgpd = (checked: boolean) => {
    setLgpdConsent(checked);
    localStorage.setItem('faithhub_lgpd_consent', String(checked));
  };

  // Auth Handlers
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

      // Sincroniza imediatamente com o banco MySQL
      fetch(`${API_URL}/members/self-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || email.split('@')[0],
          phone: phone ? (phone.startsWith('+') ? phone : `+55${phone.replace(/\D/g, '')}`) : undefined,
          birthdate: birthDate || undefined
        })
      }).catch(() => {});

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

  const handleGoogleLogin = async () => {
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (err) {
      console.error(err);
    }
  };

  // =========================================================================
  // SE ESTÁ AUTENTICADO: RENDERIZA O PERFIL DO MEMBRO
  // =========================================================================
  if (isAuthenticated && user) {
    return (
      <div className="pwa-content animate-fade-in" style={{ gap: '16px' }}>
        
        {/* Hidden inputs para Câmera e Galeria */}
        <input 
          type="file" 
          ref={cameraInputRef} 
          accept="image/*" 
          capture="user" 
          style={{ display: 'none' }} 
          onChange={e => e.target.files?.[0] && handleProcessImage(e.target.files[0])}
        />
        <input 
          type="file" 
          ref={galleryInputRef} 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={e => e.target.files?.[0] && handleProcessImage(e.target.files[0])}
        />

        <div className="responsive-2col-layout">
          {/* Coluna 1: Perfil do Membro, Operações Ministeriais e Logout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Card Principal de Perfil do Membro */}
            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '24px',
              padding: '24px 20px',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--shadow-sm)',
              textAlign: 'center',
              position: 'relative'
            }}>
          {/* Avatar com Botão de Ação */}
          <div style={{ position: 'relative', width: '92px', height: '92px', margin: '0 auto 12px auto' }}>
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--accent-primary)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
              }} 
            />
            <button 
              type="button" 
              onClick={() => setShowAvatarPicker(true)}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: '2px solid #ffffff',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.85rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
              title="Trocar Foto"
            >
              📷
            </button>
          </div>

          <h2 style={{ fontSize: '1.30rem', fontWeight: 900, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
            {memberProfile.name || user.name || 'Membro da Igreja'}
          </h2>
          
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            {user.email}
          </p>

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
              ✓ Membro Ativo
            </span>
            <span style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
              📍 {memberProfile.campus_name}
            </span>
          </div>

          {/* Botão para Editar Meus Dados */}
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              style={{
                background: '#ffffff',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                padding: '8px 18px',
                fontSize: '0.80rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>✏️</span> Editar Meus Dados
            </button>
          </div>
        </div>

        {/* Card Meus Dados Cadastrais */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '18px',
          border: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Meus Dados Pessoais
            </span>
            <span 
              onClick={() => setIsEditProfileOpen(true)}
              style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer' }}
            >
              Editar
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>👤</span>
              <div>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nome Completo</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>{memberProfile.name || 'Não informado'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>📱</span>
              <div>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>Telefone / WhatsApp</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>{memberProfile.phone || 'Adicionar telefone'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>📍</span>
              <div>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>Endereço / Bairro</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>{memberProfile.address || 'Adicionar endereço'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>🔒</span>
              <div>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>E-mail de Login (Único)</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)' }}>{user.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Informações da Igreja & Contatos */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '18px',
          border: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Minha Comunidade & Contatos
          </span>

          <div style={{ fontSize: '0.86rem', color: 'var(--text-main)', fontWeight: 800 }}>
            🏛️ {branding.church_name || 'Faith-Hub Comunidade'}
          </div>
          {branding.address && (
            <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
              📍 <strong>Endereço:</strong> {branding.address}, {branding.city} - {branding.state}
            </div>
          )}
          {branding.whatsapp && (
            <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
              💬 <strong>Secretaria (WhatsApp):</strong> {branding.whatsapp}
            </div>
          )}
          {branding.email && (
            <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
              ✉️ <strong>E-mail:</strong> {branding.email}
            </div>
          )}
          {branding.instagram && (
            <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
              📸 <strong>Instagram:</strong> {branding.instagram}
            </div>
          )}
        </div>

        {/* Configuração de Privacidade & LGPD */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          border: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
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
      </div>
    </div>

        {/* ========================================================
            BOTTOM SHEET: EDITAR DADOS PESSOAIS DO USUÁRIO
            ======================================================== */}
        <BottomSheet 
          isOpen={isEditProfileOpen} 
          onClose={() => setIsEditProfileOpen(false)}
          maxHeight="75vh"
        >
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.4rem' }}>✏️</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
              Editar Meus Dados
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Atualize suas informações pessoais de contato.
            </p>
          </div>

          <form onSubmit={handleSaveProfileData} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Nome Completo *
              </label>
              <input
                type="text"
                value={memberProfile.name}
                onChange={e => setMemberProfile({ ...memberProfile, name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1.5px solid var(--panel-border)',
                  fontSize: '0.88rem',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={memberProfile.phone}
                onChange={e => setMemberProfile({ ...memberProfile, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1.5px solid var(--panel-border)',
                  fontSize: '0.88rem',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Endereço / Bairro
              </label>
              <input
                type="text"
                value={memberProfile.address}
                onChange={e => setMemberProfile({ ...memberProfile, address: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1.5px solid var(--panel-border)',
                  fontSize: '0.88rem',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
                placeholder="Ex: Rua das Flores, 123"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>
                E-mail de Acesso (Não editável)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#e2e8f0',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  color: '#64748b',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-pwa-secondary"
                onClick={() => setIsEditProfileOpen(false)}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-pwa-primary"
                disabled={isSavingProfile}
                style={{ flex: 2 }}
              >
                {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </BottomSheet>

        {/* ========================================================
            BOTTOM SHEET: ESCOLHER FOTO / CÂMERA / GALERIA / AVATARES
            ======================================================== */}
        <BottomSheet 
          isOpen={showAvatarPicker} 
          onClose={() => setShowAvatarPicker(false)}
          maxHeight="70vh"
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, textAlign: 'center', color: 'var(--text-main)', margin: '4px 0 16px 0' }}>
            Trocar Foto de Perfil
          </h3>

          {/* Botões de Ação Rápida: Câmera e Galeria */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              style={{
                background: '#ffffff',
                border: '1.5px solid var(--panel-border)',
                borderRadius: '16px',
                padding: '14px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <span style={{ fontSize: '1.6rem' }}>📸</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>Tirar Foto (Câmera)</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              style={{
                background: '#ffffff',
                border: '1.5px solid var(--panel-border)',
                borderRadius: '16px',
                padding: '14px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <span style={{ fontSize: '1.6rem' }}>🖼️</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>Galeria de Fotos</span>
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '12px', textAlign: 'center' }}>
              Ou escolha um avatar ilustrado:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {PRESET_AVATARS.map((av, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelectPresetAvatar(av)}
                  style={{
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: avatarUrl === av ? '3px solid var(--accent-primary)' : '2px solid var(--panel-border)',
                    cursor: 'pointer',
                    aspectRatio: '1/1',
                    boxShadow: avatarUrl === av ? '0 0 0 2px var(--accent-primary-light)' : 'none',
                    transform: avatarUrl === av ? 'scale(1.05)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <img src={av} alt="Avatar Preset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        </BottomSheet>

      </div>
    );
  }

  // =========================================================================
  // SE NÃO ESTÁ AUTENTICADO: RENDERIZA A TELA DE LOGIN (ESTILO WEB STUDIO)
  // =========================================================================
  return (
    <div className="pwa-content animate-fade-in" style={{ justifyContent: 'center', minHeight: '80vh', alignItems: 'center' }}>
      
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: 'clamp(20px, 4vw, 32px)',
        border: '1px solid var(--panel-border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '460px',
        width: '100%'
      }}>
        
        {/* Logo & Header no mesmo padrão do Web Studio */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'var(--accent-primary-gradient)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '1.4rem',
            boxShadow: '0 8px 20px rgba(15, 118, 110, 0.25)',
            letterSpacing: '-0.5px'
          }}>
            FH
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
            {branding.church_name || 'Faith-Hub Community'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.80rem', marginTop: '4px' }}>
            Acesse seu portal comunitário e fique conectado.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div style={{
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '0.78rem',
            textAlign: 'center',
            border: '1px solid #fecaca',
            fontWeight: 700
          }}>
            {errorMsg}
          </div>
        )}

        {/* Switcher entre Entrar e Criar Conta */}
        {(authMode === 'login' || authMode === 'signup') && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '4px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '14px'
          }}>
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
                fontSize: '0.80rem',
                cursor: 'pointer',
                boxShadow: authMode === 'login' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Entrar
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
                fontSize: '0.80rem',
                cursor: 'pointer',
                boxShadow: authMode === 'signup' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Criar Conta
            </button>
          </div>
        )}

        {/* 1. MODO LOGIN */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                E-mail de Acesso
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu.email@exemplo.com"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1.5px solid var(--panel-border)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setErrorMsg(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Esqueci minha senha
                </button>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1.5px solid var(--panel-border)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-pwa-primary"
              disabled={loading}
              style={{ width: '100%', padding: '13px', marginTop: '4px', fontSize: '0.90rem', fontWeight: 800 }}
            >
              {loading ? 'Validando...' : 'Entrar no Aplicativo'}
            </button>

            {/* Divisor ou Google */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', color: '#94a3b8', fontSize: '0.74rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
              <span style={{ padding: '0 10px', fontWeight: 600 }}>ou acesse com</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                padding: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '12px',
                border: '1px solid var(--panel-border)',
                background: '#ffffff',
                color: 'var(--text-main)',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <GoogleIcon /> Continuar com Google
            </button>
          </form>
        )}

        {/* 2. MODO CRIAR CONTA */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Nome Completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Ex: João da Silva"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                E-mail *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu.email@exemplo.com"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Nascimento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Senha de Acesso (min. 8 caracteres) *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={acceptLGPD} 
                onChange={e => setAcceptLGPD(e.target.checked)} 
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              Concordo com os Termos de Uso e Privacidade (LGPD)
            </label>

            <button
              type="submit"
              className="btn-pwa-primary"
              disabled={loading}
              style={{ width: '100%', padding: '13px', fontSize: '0.90rem', fontWeight: 800 }}
            >
              {loading ? 'Cadastrando...' : 'Criar Minha Conta'}
            </button>
          </form>
        )}

        {/* 3. MODO CONFIRMAÇÃO DE CÓDIGO */}
        {authMode === 'confirm' && (
          <form onSubmit={handleConfirmCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Enviamos um código de 6 dígitos para o e-mail: <strong>{email}</strong>
            </p>
            <input
              type="text"
              value={confirmationCode}
              onChange={e => setConfirmationCode(e.target.value)}
              required
              placeholder="123456"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '4px', outline: 'none' }}
            />
            <button type="submit" className="btn-pwa-primary" disabled={loading} style={{ width: '100%', padding: '12px' }}>
              {loading ? 'Validando...' : 'Confirmar Código'}
            </button>
            <button type="button" className="btn-pwa-secondary" onClick={() => setAuthMode('login')}>
              Voltar ao Login
            </button>
          </form>
        )}

        {/* 4. MODO RECUPERAR SENHA */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: 0 }}>
              Digite seu e-mail para enviarmos as instruções de redefinição de senha.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu.email@exemplo.com"
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
            />
            <button type="submit" className="btn-pwa-primary" disabled={loading} style={{ width: '100%', padding: '12px' }}>
              {loading ? 'Enviando...' : 'Enviar Código de Redefinição'}
            </button>
            <button type="button" className="btn-pwa-secondary" onClick={() => setAuthMode('login')}>
              Voltar
            </button>
          </form>
        )}

        {/* 5. MODO CONFIRMAR REDEFINIÇÃO */}
        {authMode === 'forgot_confirm' && (
          <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="text"
              value={confirmationCode}
              onChange={e => setConfirmationCode(e.target.value)}
              required
              placeholder="Código de 6 dígitos recebido"
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
            />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="Nova senha (mínimo 8 caracteres)"
                style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
                title={showNewPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <button type="submit" className="btn-pwa-primary" disabled={loading} style={{ width: '100%', padding: '12px' }}>
              {loading ? 'Alterando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        )}

        {/* 6. MODO NOVA SENHA OBRIGATÓRIA (PRIMEIRO ACESSO) */}
        {authMode === 'new_password_required' && (
          <form onSubmit={handleConfirmNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '1.4rem' }}>🔐</span>
              <h4 style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Defina sua Senha Pessoal
              </h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Este é seu primeiro acesso através de convite. Crie sua senha definitiva.
              </p>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="Nova senha definitiva"
                style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
                title={showNewPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <button type="submit" className="btn-pwa-primary" disabled={loading} style={{ width: '100%', padding: '12px' }}>
              {loading ? 'Definindo...' : 'Definir Senha e Entrar'}
            </button>
          </form>
        )}

      </div>

    </div>
  );
};
