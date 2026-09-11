import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { useTheme } from '../context/ThemeContext';
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword, confirmSignIn, signInWithRedirect, updateUserAttributes } from 'aws-amplify/auth';
import { getActiveCampusId } from '../services/api';
import { BottomSheet } from '../components/BottomSheet';
import { KidsCheckinModal } from '../components/KidsCheckinModal';
import { KidsCheckoutModal } from '../components/KidsCheckoutModal';
import { KidsPagingModal } from '../components/KidsPagingModal';
import { EventQrScannerModal } from '../components/EventQrScannerModal';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { checkIsMasterOrAdmin } from '../utils/roles';

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

export interface ProfileProps {
  onLoginSuccess?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onLoginSuccess }) => {
  const { user, isAuthenticated, signOut, checkAuth } = useAuth();
  const { branding } = useBranding();
  const { isFeatureEnabled } = useFeatureFlags();
  const { themePreference, setThemePreference } = useTheme();
  const isV2Flag = isFeatureEnabled('pwa.v2_experience', false);
  const isV2Active = localStorage.getItem('faithhub_force_v2') === 'true' || (isV2Flag && localStorage.getItem('faithhub_force_v2') !== 'false');

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
  const [signupAddress, setSignupAddress] = useState('');
  const [signupStreet, setSignupStreet] = useState('');
  const [signupNumber, setSignupNumber] = useState('');
  const [signupComplement, setSignupComplement] = useState('');
  const [signupNeighborhood, setSignupNeighborhood] = useState('');
  const [signupCity, setSignupCity] = useState('');
  const [signupState, setSignupState] = useState('');
  const [signupZip, setSignupZip] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [acceptLGPD, setAcceptLGPD] = useState(true);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Perfil e Dados do Membro
  const [avatarUrl, setAvatarUrl] = useState<string>(CURATED_AVATARS[0]);
  const [memberProfile, setMemberProfile] = useState<{
    id?: string;
    name: string;
    phone: string;
    birth_date: string;
    address: string;
    address_street: string;
    address_number: string;
    address_complement: string;
    address_neighborhood: string;
    address_city: string;
    address_state: string;
    address_zip: string;
    role: string;
    campus_name: string;
    operational_permissions?: string[];
  }>({
    name: '',
    phone: '',
    birth_date: '',
    address: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    role: 'Membro',
    campus_name: 'Sede Principal',
    operational_permissions: []
  });

  // Helper para buscar dados de CEP via ViaCEP
  const handleFetchCep = async (rawCep: string, target: 'signup' | 'edit') => {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            if (target === 'signup') {
              setSignupStreet(data.logradouro || '');
              setSignupNeighborhood(data.bairro || '');
              setSignupCity(data.localidade || '');
              setSignupState(data.uf || '');
            } else {
              setMemberProfile(prev => ({
                ...prev,
                address_zip: cleanCep,
                address_street: data.logradouro || prev.address_street,
                address_neighborhood: data.bairro || prev.address_neighborhood,
                address_city: data.localidade || prev.address_city,
                address_state: data.uf || prev.address_state
              }));
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao consultar ViaCEP:', e);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // Modais de Edição & Operacional
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  // Modais Operacionais Individuais
  const [isKidsCheckinOpen, setIsKidsCheckinOpen] = useState(false);
  const [isKidsCheckoutOpen, setIsKidsCheckoutOpen] = useState(false);
  const [isKidsPagingOpen, setIsKidsPagingOpen] = useState(false);
  const [isEventScannerOpen, setIsEventScannerOpen] = useState(false);
  const [isOperationalMenuOpen, setIsOperationalMenuOpen] = useState(false);
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
      const localName = localStorage.getItem('faithhub_user_name') || user.name || user.email.split('@')[0];
      const localPhone = localStorage.getItem('faithhub_user_phone') || user.phone || user.attributes?.phone_number || '';
      const localAddress = localStorage.getItem('faithhub_user_address') || '';

      setMemberProfile(prev => ({
        ...prev,
        name: localName,
        phone: localPhone,
        address: localAddress
      }));

      const activeCampus = getActiveCampusId();
      const currentOrgId = branding.organization_id || 'org_default';
      const res = await fetch(`${API_URL}/members?organization_id=${encodeURIComponent(currentOrgId)}`);
      if (res.ok) {
        const json = await res.json();
        const found = (json.data || []).find((m: any) => m.email?.toLowerCase() === user.email?.toLowerCase() || m.id === user.userId);
        if (found) {
          const finalName = found.name || localName;
          const finalPhone = found.phone || localPhone;
          const finalAddress = found.address || localAddress;
          const finalBirthDate = found.birth_date ? found.birth_date.split('T')[0] : '';

          let perms: string[] = [];
          if (Array.isArray(found.operational_permissions)) {
            perms = found.operational_permissions;
          } else if (typeof found.operational_permissions === 'string') {
            try {
              perms = JSON.parse(found.operational_permissions);
            } catch {
              perms = [];
            }
          }

          setMemberProfile({
            id: found.id,
            name: finalName,
            phone: finalPhone,
            birth_date: finalBirthDate,
            address: finalAddress,
            address_street: found.address_street || '',
            address_number: found.address_number || '',
            address_complement: found.address_complement || '',
            address_neighborhood: found.address_neighborhood || '',
            address_city: found.address_city || '',
            address_state: found.address_state || '',
            address_zip: found.address_zip || '',
            role: found.role || 'Membro',
            campus_name: found.campus_name || (activeCampus === 'campus_sede' ? 'Sede Principal' : 'Congregação Local'),
            operational_permissions: perms
          });

          if (finalName) localStorage.setItem('faithhub_user_name', finalName);
          if (finalPhone) localStorage.setItem('faithhub_user_phone', finalPhone);
          if (finalAddress) localStorage.setItem('faithhub_user_address', finalAddress);

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

  // Salvar Edição de Dados Pessoais (Nome, Telefone, Nascimento, Endereço Segregado)
  const handleSaveProfileData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberProfile.name.trim()) {
      alert("Por favor, preencha seu nome.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const fullAddressStr = memberProfile.address_street 
        ? `${memberProfile.address_street}, ${memberProfile.address_number || 'S/N'}${memberProfile.address_complement ? ` - ${memberProfile.address_complement}` : ''} - ${memberProfile.address_neighborhood}, ${memberProfile.address_city} - ${memberProfile.address_state}`
        : memberProfile.address;

      localStorage.setItem('faithhub_user_name', memberProfile.name.trim());
      localStorage.setItem('faithhub_user_phone', memberProfile.phone.trim());
      localStorage.setItem('faithhub_user_address', fullAddressStr);

      try {
        await updateUserAttributes({
          userAttributes: {
            name: memberProfile.name.trim()
          }
        });
      } catch (errCognito) {
        console.log("Cognito attr update notice:", errCognito);
      }

      const payload = {
        id: user?.userId,
        email: user?.email,
        name: memberProfile.name.trim(),
        phone: memberProfile.phone.trim(),
        birth_date: memberProfile.birth_date || null,
        address: fullAddressStr,
        address_street: memberProfile.address_street,
        address_number: memberProfile.address_number,
        address_complement: memberProfile.address_complement,
        address_neighborhood: memberProfile.address_neighborhood,
        address_city: memberProfile.address_city,
        address_state: memberProfile.address_state,
        address_zip: memberProfile.address_zip,
        avatar_url: avatarUrl
      };

      // Sincroniza via self-register (MySQL)
      await fetch(`${API_URL}/members/self-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});

      if (user?.userId) {
        await fetch(`${API_URL}/members/${user.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }

      setMemberProfile(prev => ({ ...prev, address: fullAddressStr }));
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
        onLoginSuccess?.();
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
      onLoginSuccess?.();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao definir nova senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !name.trim()) {
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
      // Salva localmente os dados cadastrados
      localStorage.setItem('faithhub_user_name', name.trim());
      localStorage.setItem('faithhub_user_email', email.trim());
      if (phone.trim()) localStorage.setItem('faithhub_user_phone', phone.trim());
      if (signupAddress.trim()) localStorage.setItem('faithhub_user_address', signupAddress.trim());

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

      const fullSignupAddr = signupStreet 
        ? `${signupStreet}, ${signupNumber || 'S/N'}${signupComplement ? ` - ${signupComplement}` : ''} - ${signupNeighborhood}, ${signupCity} - ${signupState}`
        : (signupAddress.trim() || localStorage.getItem('faithhub_user_address') || '');
      const userPhone = phone.trim() || localStorage.getItem('faithhub_user_phone') || '';
      const userName = name.trim() || localStorage.getItem('faithhub_user_name') || email.split('@')[0];

      // Sincroniza imediatamente com o banco MySQL
      await fetch(`${API_URL}/members/self-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: userName,
          phone: userPhone ? (userPhone.startsWith('+') ? userPhone : `+55${userPhone.replace(/\D/g, '')}`) : undefined,
          birth_date: birthDate || undefined,
          address: fullSignupAddr || undefined,
          address_street: signupStreet || undefined,
          address_number: signupNumber || undefined,
          address_complement: signupComplement || undefined,
          address_neighborhood: signupNeighborhood || undefined,
          address_city: signupCity || undefined,
          address_state: signupState || undefined,
          address_zip: signupZip || undefined
        })
      }).catch((e) => console.log('self-register error:', e));

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
                {checkIsMasterOrAdmin(user.email, memberProfile.role) ? (
                  <span style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#92400e', border: '1px solid #fcd34d', padding: '4px 12px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 900 }}>
                    👑 Administrador Master
                  </span>
                ) : (
                  <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                    ✓ {memberProfile.role || 'Membro Ativo'}
                  </span>
                )}
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
                    background: 'var(--bg-card, #ffffff)',
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

            {/* Card Menu Operacional (Check-in Kids, Checkout, Portaria de Eventos) */}
            {(() => {
              const isAdminOrMaster = checkIsMasterOrAdmin(user?.email, memberProfile.role);
              const userRole = (memberProfile.role || '').toUpperCase();
              const isLeader = isAdminOrMaster || ['LEADER', 'LÍDER', 'EDUCADOR', 'VOLUNTÁRIO', 'VOLUNTEER', 'OBREIRO', 'STAFF'].includes(userRole);

              // Admins e Master Admins SEMPRE possuem acesso total e irrestrito (todas as 4 ferramentas)
              const permissions = isAdminOrMaster 
                ? ['kids_checkin', 'kids_checkout', 'events_checkin', 'kids_calls']
                : ((memberProfile.operational_permissions && memberProfile.operational_permissions.length > 0)
                    ? memberProfile.operational_permissions
                    : (isLeader ? ['kids_checkin', 'kids_checkout', 'events_checkin', 'kids_calls'] : []));

              const hasAny = permissions.length > 0;
              if (!hasAny && !isAdminOrMaster && !isLeader) return null;

              return (
                <div 
                  onClick={() => setIsOperationalMenuOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #115e59 100%)',
                    borderRadius: '20px',
                    padding: '18px 20px',
                    color: '#ffffff',
                    boxShadow: '0 8px 24px rgba(15, 118, 110, 0.28)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '4.5rem', opacity: 0.12, pointerEvents: 'none' }}>
                    ⚡
                  </div>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: '#99f6e4', letterSpacing: '0.06em', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '20px' }}>
                      <span>⚡</span> Ferramentas de Campo
                    </div>
                    <div style={{ fontSize: '1.08rem', fontWeight: 900, marginTop: '6px', letterSpacing: '-0.02em' }}>
                      Menu Operacional
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#ccfbf1', marginTop: '2px' }}>
                      {isAdminOrMaster 
                        ? '👑 Acesso Master Completo (Todas as ferramentas)'
                        : `${permissions.length} ${permissions.length === 1 ? 'ferramenta liberada' : 'ferramentas liberadas'} para seu perfil`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOperationalMenuOpen(true);
                    }}
                    style={{
                      background: '#ffffff',
                      color: '#0f766e',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 16px',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      zIndex: 1
                    }}
                  >
                    <span>Abrir</span>
                    <span>→</span>
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Coluna 2: Dados Pessoais, Contatos e Privacidade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Card Meus Dados Cadastrais */}
            <div style={{
              background: 'var(--bg-card, #ffffff)',
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>👤</span>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nome Completo</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>{memberProfile.name || 'Não informado'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🎂</span>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>Data de Nascimento / Aniversário</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {memberProfile.birth_date ? memberProfile.birth_date.split('-').reverse().join('/') : 'Adicionar data de nascimento'}
                    </div>
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
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>Endereço Residencial</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>
                      {memberProfile.address_street ? (
                        `${memberProfile.address_street}, ${memberProfile.address_number || 'S/N'}${memberProfile.address_complement ? ` (${memberProfile.address_complement})` : ''} - ${memberProfile.address_neighborhood || ''}, ${memberProfile.address_city || ''} - ${memberProfile.address_state || ''}${memberProfile.address_zip ? ` • CEP: ${memberProfile.address_zip}` : ''}`
                      ) : (
                        memberProfile.address || 'Adicionar endereço completo'
                      )}
                    </div>
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
              background: 'var(--bg-card, #ffffff)',
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
              background: 'var(--bg-card, #ffffff)',
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

        {/* Botão de Sair da Conta (Logout) no Final da Página */}
        <div style={{
          marginTop: '8px',
          paddingTop: '16px',
          borderTop: '1px solid var(--panel-border)',
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}>
          <button 
            type="button" 
            onClick={signOut}
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1.5px solid #fecaca',
              borderRadius: '14px',
              padding: '12px 24px',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🚪</span> Sair da Conta (Logout)
          </button>
        </div>

        {/* Seletor de Tema: Claro / Escuro / Sistema */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '20px',
          border: '1px solid var(--panel-border)',
          maxWidth: '380px',
          width: '100%',
          margin: '20px auto 0 auto',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Aparência do Aplicativo
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 800 }}>
              {themePreference === 'light' ? 'Modo Claro' : themePreference === 'dark' ? 'Modo Escuro' : 'Conforme Sistema'}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'var(--bg-card-subtle, #f1f5f9)',
            padding: '4px',
            borderRadius: '14px'
          }}>
            <button
              type="button"
              onClick={() => setThemePreference('light')}
              style={{
                background: themePreference === 'light' ? 'var(--bg-card, #ffffff)' : 'transparent',
                color: themePreference === 'light' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 4px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                boxShadow: themePreference === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/><path d="M12 20v2"/>
                <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
                <path d="M2 12h2"/><path d="M20 12h2"/>
                <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
              <span>Claro</span>
            </button>

            <button
              type="button"
              onClick={() => setThemePreference('dark')}
              style={{
                background: themePreference === 'dark' ? 'var(--bg-card, #ffffff)' : 'transparent',
                color: themePreference === 'dark' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 4px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                boxShadow: themePreference === 'dark' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
              <span>Escuro</span>
            </button>

            <button
              type="button"
              onClick={() => setThemePreference('system')}
              style={{
                background: themePreference === 'system' ? 'var(--bg-card, #ffffff)' : 'transparent',
                color: themePreference === 'system' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 4px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                boxShadow: themePreference === 'system' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="3" rx="2"/>
                <line x1="8" x2="16" y1="21" y2="21"/>
                <line x1="12" x2="12" y1="17" y2="21"/>
              </svg>
              <span>Sistema</span>
            </button>
          </div>
        </div>

        {/* Indicador de Versão do App e Alternância de Experiência (V1 vs V2) */}
        <div style={{
          marginTop: '16px',
          padding: '14px 16px',
          background: 'var(--bg-card-subtle, #f8fafc)',
          borderRadius: '16px',
          border: '1px solid var(--panel-border)',
          maxWidth: '380px',
          width: '100%',
          margin: '16px auto 0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            Faith-Hub Mobile • {isV2Active ? 'Versão 2.0 (App Nativo Fluido)' : 'Versão 1.0 (Clássico)'}
          </div>
          
          <button
            type="button"
            onClick={() => {
              const next = !isV2Active;
              localStorage.setItem('faithhub_force_v2', next ? 'true' : 'false');
              window.location.reload();
            }}
            style={{
              background: isV2Active ? 'var(--bg-card, #f1f5f9)' : 'var(--accent-primary-light)',
              color: isV2Active ? 'var(--text-secondary)' : 'var(--accent-primary)',
              border: '1px solid var(--panel-border)',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isV2Active ? '← Voltar para Versão Clássica (v1)' : '✨ Experimentar Versão 2.0 (Fluida)'}
          </button>
        </div>

        {/* Modais Operacionais Individuais (Desacoplados e Ergonômicos) */}
        <KidsCheckinModal 
          isOpen={isKidsCheckinOpen} 
          onClose={() => {
            setIsKidsCheckinOpen(false);
            setIsOperationalMenuOpen(true);
          }} 
        />

        <KidsCheckoutModal 
          isOpen={isKidsCheckoutOpen} 
          onClose={() => {
            setIsKidsCheckoutOpen(false);
            setIsOperationalMenuOpen(true);
          }} 
        />

        <KidsPagingModal 
          isOpen={isKidsPagingOpen} 
          onClose={() => {
            setIsKidsPagingOpen(false);
            setIsOperationalMenuOpen(true);
          }} 
        />

        {/* Modal / Scanner de Ingressos e Portaria de Eventos */}
        <EventQrScannerModal
          isOpen={isEventScannerOpen}
          onClose={() => {
            setIsEventScannerOpen(false);
            setIsOperationalMenuOpen(true);
          }}
          validatorName={memberProfile.name || user?.name || 'Portaria'}
        />

        {/* ========================================================
            BOTTOM SHEET: MENU OPERACIONAL & FERRAMENTAS DE CAMPO
            ======================================================== */}
        <BottomSheet
          isOpen={isOperationalMenuOpen}
          onClose={() => setIsOperationalMenuOpen(false)}
          maxHeight="82vh"
        >
          {(() => {
            const isAdminOrMaster = checkIsMasterOrAdmin(user?.email, memberProfile.role);
            const userRole = (memberProfile.role || '').toUpperCase();
            const isLeader = isAdminOrMaster || ['LEADER', 'LÍDER', 'EDUCADOR', 'VOLUNTÁRIO', 'VOLUNTEER', 'OBREIRO', 'STAFF'].includes(userRole);

            // Admins e Master Admins SEMPRE possuem acesso total e irrestrito (todas as 4 ferramentas)
            const permissions = isAdminOrMaster 
              ? ['kids_checkin', 'kids_checkout', 'events_checkin', 'kids_calls']
              : ((memberProfile.operational_permissions && memberProfile.operational_permissions.length > 0)
                  ? memberProfile.operational_permissions
                  : (isLeader ? ['kids_checkin', 'kids_checkout', 'events_checkin', 'kids_calls'] : []));

            const canKidsCheckin = permissions.includes('kids_checkin');
            const canKidsCheckout = permissions.includes('kids_checkout');
            const canEventsCheckin = permissions.includes('events_checkin');
            const canKidsCalls = permissions.includes('kids_calls');

            const hasAny = canKidsCheckin || canKidsCheckout || canEventsCheckin || canKidsCalls;

            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', paddingRight: '32px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)'
                  }}>
                    ⚡
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.22rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                      Menu Operacional
                    </h3>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Ferramentas de campo ativas para sua escala ministerial
                    </p>
                  </div>
                </div>

                {!hasAny ? (
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '16px',
                    padding: '28px 20px',
                    textAlign: 'center',
                    border: '1.5px dashed #cbd5e1'
                  }}>
                    <span style={{ fontSize: '2rem' }}>🔒</span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#334155', margin: '8px 0 4px 0' }}>
                      Nenhuma ferramenta atribuída
                    </h4>
                    <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                      Seu cadastro ainda não possui ferramentas operacionais liberadas. Converse com o líder do seu ministério ou com a secretaria da igreja para liberar seu acesso às escalas.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 1. Check-in de Crianças */}
                    {canKidsCheckin && (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            flexShrink: 0
                          }}>
                            🚸
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                              Check-in Kids (Crianças)
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Totem e registro de entrada nas salas infantis
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOperationalMenuOpen(false);
                            setIsKidsCheckinOpen(true);
                          }}
                          style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                          }}
                        >
                          Check-in →
                        </button>
                      </div>
                    )}

                    {/* 2. Checkout & Devolução Kids */}
                    {canKidsCheckout && (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: '#f0fdf4',
                            color: '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            flexShrink: 0
                          }}>
                            🛡️
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                              Checkout & Devolução Kids
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Validação de PIN e entrega segura aos pais
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOperationalMenuOpen(false);
                            setIsKidsCheckoutOpen(true);
                          }}
                          style={{
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(22,163,74,0.25)'
                          }}
                        >
                          Checkout →
                        </button>
                      </div>
                    )}

                    {/* 3. Portaria de Eventos (Scanner QR) */}
                    {canEventsCheckin && (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: '#faf5ff',
                            color: '#9333ea',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            flexShrink: 0
                          }}>
                            🎫
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                              Portaria & Validação de Ingressos
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Leitor de QR Code para ingressos de eventos
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOperationalMenuOpen(false);
                            setIsEventScannerOpen(true);
                          }}
                          style={{
                            background: '#9333ea',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(147,51,234,0.25)'
                          }}
                        >
                          Escanear →
                        </button>
                      </div>
                    )}

                    {/* 4. Chamador de Pais Kids */}
                    {canKidsCalls && (
                      <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        border: '1.5px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: '#fffbeb',
                            color: '#d97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            flexShrink: 0
                          }}>
                            📢
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                              Chamador de Pais no Culto
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Alerta de crianças no telão da igreja
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOperationalMenuOpen(false);
                            setIsKidsPagingOpen(true);
                          }}
                          style={{
                            background: '#d97706',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(217,119,6,0.25)'
                          }}
                        >
                          Chamador →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </BottomSheet>

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={memberProfile.birth_date}
                  onChange={e => setMemberProfile({ ...memberProfile, birth_date: e.target.value })}
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
                />
              </div>
            </div>

            {/* Endereço Segregado com Busca ViaCEP */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  CEP
                </label>
                {loadingCep && <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Buscando CEP...</span>}
              </div>
              <input
                type="text"
                value={memberProfile.address_zip}
                onChange={e => {
                  const val = e.target.value;
                  setMemberProfile({ ...memberProfile, address_zip: val });
                  if (val.replace(/\D/g, '').length === 8) {
                    handleFetchCep(val, 'edit');
                  }
                }}
                maxLength={9}
                placeholder="00000-000"
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
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Logradouro (Rua, Avenida, etc.)
              </label>
              <input
                type="text"
                value={memberProfile.address_street}
                onChange={e => setMemberProfile({ ...memberProfile, address_street: e.target.value })}
                placeholder="Ex: Rua das Flores"
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
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Número
                </label>
                <input
                  type="text"
                  value={memberProfile.address_number}
                  onChange={e => setMemberProfile({ ...memberProfile, address_number: e.target.value })}
                  placeholder="123"
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
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Complemento
                </label>
                <input
                  type="text"
                  value={memberProfile.address_complement}
                  onChange={e => setMemberProfile({ ...memberProfile, address_complement: e.target.value })}
                  placeholder="Apto 42, Bloco B"
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
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Bairro
                </label>
                <input
                  type="text"
                  value={memberProfile.address_neighborhood}
                  onChange={e => setMemberProfile({ ...memberProfile, address_neighborhood: e.target.value })}
                  placeholder="Centro"
                  style={{
                    width: '100%',
                    padding: '12px 10px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1.5px solid var(--panel-border)',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Cidade
                </label>
                <input
                  type="text"
                  value={memberProfile.address_city}
                  onChange={e => setMemberProfile({ ...memberProfile, address_city: e.target.value })}
                  placeholder="São Paulo"
                  style={{
                    width: '100%',
                    padding: '12px 10px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1.5px solid var(--panel-border)',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  UF
                </label>
                <input
                  type="text"
                  value={memberProfile.address_state}
                  onChange={e => setMemberProfile({ ...memberProfile, address_state: e.target.value.toUpperCase() })}
                  maxLength={2}
                  placeholder="SP"
                  style={{
                    width: '100%',
                    padding: '12px 8px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1.5px solid var(--panel-border)',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
              </div>
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
              {CURATED_AVATARS.map((av, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelectCuratedAvatar(av)}
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
          {branding.logo_icon_url ? (
            <img
              src={branding.logo_icon_url}
              alt={branding.church_name}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                objectFit: 'cover',
                margin: '0 auto 12px',
                display: 'block',
                boxShadow: '0 8px 20px rgba(15, 118, 110, 0.25)'
              }}
            />
          ) : (
            <img
              src="/brand/logo-symbol.png"
              alt="Faith-Hub"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                objectFit: 'contain',
                margin: '0 auto 12px',
                display: 'block',
                boxShadow: '0 8px 20px rgba(15, 118, 110, 0.25)'
              }}
            />
          )}
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

            {/* Endereço Residencial Segregado com Busca ViaCEP */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  CEP
                </label>
                {loadingCep && <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Buscando endereço...</span>}
              </div>
              <input
                type="text"
                value={signupZip}
                onChange={e => {
                  const val = e.target.value;
                  setSignupZip(val);
                  if (val.replace(/\D/g, '').length === 8) {
                    handleFetchCep(val, 'signup');
                  }
                }}
                maxLength={9}
                placeholder="00000-000"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Rua / Logradouro
              </label>
              <input
                type="text"
                value={signupStreet}
                onChange={e => setSignupStreet(e.target.value)}
                placeholder="Ex: Av. Brasil"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Número
                </label>
                <input
                  type="text"
                  value={signupNumber}
                  onChange={e => setSignupNumber(e.target.value)}
                  placeholder="Ex: 500"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Complemento
                </label>
                <input
                  type="text"
                  value={signupComplement}
                  onChange={e => setSignupComplement(e.target.value)}
                  placeholder="Ex: Bloco A"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Bairro
                </label>
                <input
                  type="text"
                  value={signupNeighborhood}
                  onChange={e => setSignupNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  style={{ width: '100%', padding: '12px 10px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Cidade
                </label>
                <input
                  type="text"
                  value={signupCity}
                  onChange={e => setSignupCity(e.target.value)}
                  placeholder="Cidade"
                  style={{ width: '100%', padding: '12px 10px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  UF
                </label>
                <input
                  type="text"
                  value={signupState}
                  onChange={e => setSignupState(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="UF"
                  style={{ width: '100%', padding: '12px 8px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid var(--panel-border)', fontSize: '0.85rem', textAlign: 'center', outline: 'none' }}
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
