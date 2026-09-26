import React, { useState, useEffect, useRef } from 'react';
import { useBranding } from '../../context/BrandingContext';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { ChevronRightIcon } from './Icons';
import { BottomSheet } from '../../components/BottomSheet';
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

// ==========================================
// ÍCONES VETORIAIS MODERNOS & MINIMALISTAS
// ==========================================
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="3"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
  </svg>
);

const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" x2="22" y1="2" y2="22"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="v2-spin" style={{ animation: 'spin 0.8s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);


interface WelcomeLoginScreenV2Props {
  onLoginSuccess?: () => void;
  onContinueAsGuest?: () => void;
}

export const WelcomeLoginScreenV2: React.FC<WelcomeLoginScreenV2Props> = ({
  onLoginSuccess,
  onContinueAsGuest
}) => {
  const { branding } = useBranding();
  const { checkAuth } = useAuth();
  const { resolvedTheme } = useTheme();

  const welcomeConfig = branding.welcome_screen_config;
  const churchTitle = (branding.church_name || 'Comunidade').trim();
  const isLargeChurchName = churchTitle.length > 24;

  const heroImage = welcomeConfig?.hero_image_url || branding.banner_url || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80';
  const headline = welcomeConfig?.headline || (isLargeChurchName ? 'Bem-vindo à sua família de fé' : `Viva o propósito da sua fé na ${churchTitle}`);
  const subtitle = welcomeConfig?.subtitle || (isLargeChurchName 
    ? `${churchTitle} • Conectando corações, transformando vidas e vivendo o propósito do Evangelho.`
    : 'Acompanhe devocionais, conecte-se à sua célula, participe de eventos e cresça em comunidade.');

  const defaultSlides = [
    {
      badge: isLargeChurchName ? 'BOAS-VINDAS' : churchTitle.toUpperCase(),
      title: headline,
      description: subtitle,
      image_url: heroImage
    },
    {
      badge: 'CÉLULAS & GRUPOS',
      title: 'Conecte-se em um Grupo',
      description: 'Amizades reais e comunhão nos lares da nossa congregação.',
      image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80'
    },
    {
      badge: 'PALAVRA DO DIA',
      title: 'Devocionais Diários',
      description: 'Mensagens em vídeo e estudos bíblicos preparados pelos pastores.',
      image_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80'
    },
    {
      badge: 'EVENTOS & FAMÍLIA',
      title: 'Eventos & Ministério Kids',
      description: 'Inscrições com QR Code express e check-in seguro para seus filhos.',
      image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80'
    }
  ];

  const allSlides = welcomeConfig?.slides && welcomeConfig.slides.length > 0 
    ? welcomeConfig.slides.map((s, idx) => ({
        ...s,
        image_url: (s as any).image_url || defaultSlides[idx % defaultSlides.length]?.image_url || heroImage
      }))
    : defaultSlides;

  // Array estendido com clones para Loop Infinito 360° fluido (sem rebobinamento ou salto brusco)
  const extendedSlides = allSlides.length > 1
    ? [allSlides[allSlides.length - 1], ...allSlides, allSlides[0]]
    : allSlides;

  // Índice virtual do carrossel (inicia em 1, que é o primeiro slide real)
  const [virtualSlide, setVirtualSlide] = useState(allSlides.length > 1 ? 1 : 0);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef<number>(0);

  // Índice do slide ativo real para os indicadores de dots (0 a allSlides.length - 1)
  const activeSlideIndex = allSlides.length > 1
    ? (virtualSlide - 1 + allSlides.length) % allSlides.length
    : 0;

  // Drawer & Fluxo de Auth
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'confirm' | 'forgot' | 'forgot_confirm'>('login');
  
  // Etapa do Cadastro (1 = Credenciais & Contato, 2 = Localização & LGPD)
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  // Estados dos Campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
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
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-avanço contínuo de slides a cada 7 segundos (sempre para frente em loop infinito)
  useEffect(() => {
    if (allSlides.length <= 1) return;
    const interval = setInterval(() => {
      if (!isDragging) {
        setIsTransitionEnabled(true);
        setVirtualSlide(prev => prev + 1);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [allSlides.length, isDragging]);

  // Teletransporte silencioso nos limites do array estendido (após completar a animação fluida)
  useEffect(() => {
    if (allSlides.length <= 1 || !isTransitionEnabled) return;

    // Se chegou no clone do primeiro slide (após o último)
    if (virtualSlide === extendedSlides.length - 1) {
      const timer = setTimeout(() => {
        setIsTransitionEnabled(false);
        setVirtualSlide(1); // Volta silenciosamente para o primeiro slide real
      }, 420);
      return () => clearTimeout(timer);
    }

    // Se chegou no clone do último slide (antes do primeiro)
    if (virtualSlide === 0) {
      const timer = setTimeout(() => {
        setIsTransitionEnabled(false);
        setVirtualSlide(allSlides.length); // Vai silenciosamente para o último slide real
      }, 420);
      return () => clearTimeout(timer);
    }
  }, [virtualSlide, extendedSlides.length, allSlides.length, isTransitionEnabled]);

  // Reabilita a transição suave no próximo frame após um teletransporte silencioso
  useEffect(() => {
    if (!isTransitionEnabled) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitionEnabled(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitionEnabled]);

  // Sincroniza a barra de status/navegação móvel (theme-color) com a cor da tela (#090d16)
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const originalColor = metaThemeColor?.getAttribute('content') || '#0f766e';
    metaThemeColor?.setAttribute('content', '#090d16');
    return () => {
      metaThemeColor?.setAttribute('content', originalColor);
    };
  }, []);

  // Medição da altura física real do display para renderizar diretamente no tamanho total do celular
  const [displayHeight, setDisplayHeight] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && window.screen?.height) {
        return `${window.screen.height}px`;
      }
    }
    return '100lvh';
  });

  useEffect(() => {
    const updateDisplayHeight = () => {
      if (typeof window !== 'undefined') {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && window.screen?.height) {
          const fullHeight = Math.max(window.screen.height, window.innerHeight);
          setDisplayHeight(`${fullHeight}px`);
        } else {
          setDisplayHeight('100lvh');
        }
      }
    };
    updateDisplayHeight();
    window.addEventListener('resize', updateDisplayHeight);
    window.addEventListener('orientationchange', updateDisplayHeight);
    return () => {
      window.removeEventListener('resize', updateDisplayHeight);
      window.removeEventListener('orientationchange', updateDisplayHeight);
    };
  }, []);

  // Gestos de Touch / Arraste
  const handleDragStart = (clientX: number) => {
    if (isAuthDrawerOpen) return;
    dragStartX.current = clientX;
    dragDeltaX.current = 0;
    setIsDragging(true);
  };

  const handleDragMove = (clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    dragDeltaX.current = delta;
    setDragOffset(delta);
  };

  const handleDragEnd = () => {
    if (dragStartX.current === null) return;
    const delta = dragDeltaX.current;
    const threshold = 40;

    if (delta < -threshold) {
      triggerHaptic('selection');
      setIsTransitionEnabled(true);
      setVirtualSlide(prev => prev + 1);
    } else if (delta > threshold) {
      triggerHaptic('selection');
      setIsTransitionEnabled(true);
      setVirtualSlide(prev => prev - 1);
    }

    dragStartX.current = null;
    dragDeltaX.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  };

  // Formatação ergonômica de Telefone
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) {
      setPhone(raw.length > 0 ? `(${raw}` : '');
    } else if (raw.length <= 7) {
      setPhone(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    } else {
      setPhone(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`);
    }
  };

  // Formatação e Busca de CEP (Sem corte de texto)
  const handleCepChange = async (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
    setSignupZip(formatted);

    if (raw.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            setSignupStreet(data.logradouro || '');
            setSignupNeighborhood(data.bairro || '');
            setSignupCity(data.localidade || '');
            setSignupState(data.uf || '');
            triggerHaptic('light');
          }
        }
      } catch (e) {
        console.warn('Erro ao consultar ViaCEP:', e);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    triggerHaptic('medium');
    setAuthMode(mode);
    setSignupStep(1);
    setErrorMsg('');
    setIsAuthDrawerOpen(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await signIn({ username: email.trim(), password });
      await checkAuth();
      setIsAuthDrawerOpen(false);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao entrar. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceSignupStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Informe seu e-mail.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMsg('A senha deve ter pelo menos 8 dígitos.');
      return;
    }
    setErrorMsg('');
    triggerHaptic('selection');
    setSignupStep(2);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptLGPD) {
      setErrorMsg('É necessário aceitar os termos de privacidade para criar sua conta.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      localStorage.setItem('faithhub_user_name', name.trim());
      localStorage.setItem('faithhub_user_email', email.trim());
      if (phone.trim()) localStorage.setItem('faithhub_user_phone', phone.trim());

      const cleanPhone = phone.replace(/\D/g, '');

      await signUp({
        username: email.trim(),
        password,
        options: {
          userAttributes: {
            name: name.trim(),
            phone_number: cleanPhone ? (cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`) : undefined,
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

  const handleConfirmCodeSubmit = async (e: React.FormEvent) => {
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
        : '';
      const userPhone = phone.trim();
      const userName = name.trim() || email.split('@')[0];

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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
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

  const handleConfirmResetPasswordSubmit = async (e: React.FormEvent) => {
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

  return (
    <div 
      onTouchStart={e => handleDragStart(e.touches[0].clientX)}
      onTouchMove={e => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
      onMouseDown={e => handleDragStart(e.clientX)}
      onMouseMove={e => { if (isDragging) handleDragMove(e.clientX); }}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100vw',
        height: displayHeight,
        minHeight: '100lvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        background: '#090d16',
        zIndex: 100,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Trilho Físico de Fotos com Resposta Visual ao Arraste */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 1,
        pointerEvents: 'none'
      }}>
        <div style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          transform: isDragging 
            ? `translateX(calc(-${virtualSlide * 100}% + ${dragOffset}px))`
            : `translateX(-${virtualSlide * 100}%)`,
          transition: isDragging || !isTransitionEnabled ? 'none' : 'transform 0.42s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform'
        }}>
          {extendedSlides.map((slide, idx) => {
            const slideImg = (slide as any).image_url || heroImage;
            return (
              <div 
                key={idx}
                style={{
                  minWidth: '100%',
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${slideImg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'brightness(0.92)'
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Scrim Gradiente Suave & Profundo para Alto Contraste */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(180deg, rgba(9, 13, 22, 0.82) 0%, rgba(9, 13, 22, 0.20) 25%, rgba(9, 13, 22, 0.50) 55%, rgba(9, 13, 22, 0.98) 85%, #090d16 100%)',
        zIndex: 2,
        pointerEvents: 'none'
      }} />

      {/* Header Minimalista da Igreja */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: 'calc(env(safe-area-inset-top, 16px) + 8px) 18px 0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px'
      }}>
        {/* Identidade da Igreja estilo iOS Glass Capsule */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(9, 13, 22, 0.65)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '999px',
          padding: '5px 14px 5px 6px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: 'calc(100% - 95px)',
          flex: 1,
          minWidth: 0
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--accent-primary, #0f766e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img 
              src={branding.logo_icon_url || '/brand/logo-symbol.png'} 
              alt={branding.church_name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/brand/logo-symbol.png')) {
                  target.src = '/brand/logo-symbol.png';
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ 
              fontSize: '0.86rem', 
              fontWeight: 700, 
              color: '#ffffff', 
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {branding.church_name || 'Faith-Hub'}
            </span>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              color: '#94a3b8',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Aplicativo Oficial
            </span>
          </div>
        </div>

        {/* Botão de Explorar como Visitante */}
        {welcomeConfig?.allow_guest_browse !== false && onContinueAsGuest && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onContinueAsGuest();
            }}
            className="v2-pressable"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '999px',
              padding: '7px 14px',
              color: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              outline: 'none',
              flexShrink: 0
            }}
          >
            <span>Explorar</span>
            <ChevronRightIcon size={12} color="#ffffff" />
          </button>
        )}
      </header>

      <div style={{ flex: 1, zIndex: 5 }} />

      {/* Carrossel de Boas-Vindas Refinado */}
      <div 
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => { if (isDragging) handleDragMove(e.clientX); }}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '0 24px calc(env(safe-area-inset-bottom, 0px) + 20px) 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        {/* Trilho de Slides com Animação Física Suave */}
        <div style={{ overflow: 'hidden', width: '100%' }}>
          <div style={{
            display: 'flex',
            width: '100%',
            transform: isDragging 
              ? `translateX(calc(-${virtualSlide * 100}% + ${dragOffset}px))`
              : `translateX(-${virtualSlide * 100}%)`,
            transition: isDragging || !isTransitionEnabled ? 'none' : 'transform 0.42s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}>
            {extendedSlides.map((slide, idx) => (
              <div 
                key={idx} 
                style={{ 
                  minWidth: '100%', 
                  width: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  boxSizing: 'border-box'
                }}
              >
                {/* Badge Discreta */}
                <div>
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    padding: '3px 9px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    textTransform: 'uppercase'
                  }}>
                    {slide.badge}
                  </span>
                </div>

                {/* Título de Alto Impacto */}
                <h1 style={{
                  fontSize: 'clamp(1.55rem, 5.2vw, 2.05rem)',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.16,
                  letterSpacing: '-0.025em',
                  margin: 0,
                  textShadow: '0 2px 14px rgba(0, 0, 0, 0.5)'
                }}>
                  {slide.title}
                </h1>

                {/* Subtítulo Minimalista */}
                <p style={{
                  fontSize: '0.88rem',
                  color: '#e2e8f0',
                  lineHeight: 1.48,
                  margin: 0,
                  maxWidth: '440px',
                  letterSpacing: '-0.01em'
                }}>
                  {slide.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé: Indicadores de Slide + Botão Entrar Sólido */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '6px',
          gap: '12px'
        }}>
          {/* Indicadores Minimalistas em Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {allSlides.map((_, idx) => {
              const isActive = activeSlideIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    triggerHaptic('light');
                    setIsTransitionEnabled(true);
                    setVirtualSlide(idx + 1);
                  }}
                  style={{
                    width: isActive ? '22px' : '6px',
                    height: '5px',
                    borderRadius: '999px',
                    background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.28)',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer'
                  }}
                />
              );
            })}
          </div>

          {/* Botão Principal Entrar (Sólido, Refinado, Sem Gradiente de IA) */}
          <button
            type="button"
            onClick={() => handleOpenAuth('login')}
            className="v2-pressable"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.94rem',
              borderRadius: '999px',
              padding: '13px 32px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              border: 'none',
              outline: 'none',
              letterSpacing: '-0.01em',
              flexShrink: 0
            }}
          >
            Entrar
          </button>
        </div>
      </div>

      {/* ========================================================
          DRAWER / BOTTOM SHEET ERGONÔMICO DA V2
          ======================================================== */}
      <BottomSheet
        isOpen={isAuthDrawerOpen}
        onClose={() => setIsAuthDrawerOpen(false)}
        maxHeight="88vh"
      >
        <div style={{ maxWidth: '420px', margin: '0 auto', width: '100%' }}>
          
          {/* Header do Drawer */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              {authMode === 'login' && 'Acessar Conta'}
              {authMode === 'signup' && (signupStep === 1 ? 'Criar Nova Conta' : 'Finalizar Perfil')}
              {authMode === 'confirm' && 'Confirmação'}
              {authMode === 'forgot' && 'Recuperar Senha'}
              {authMode === 'forgot_confirm' && 'Nova Senha'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              {authMode === 'login' && 'Digite seu e-mail e senha para continuar.'}
              {authMode === 'signup' && (signupStep === 1 ? 'Passo 1 de 2: Dados de acesso e contato.' : 'Passo 2 de 2: Endereço para comunhão e eventos.')}
              {authMode === 'confirm' && 'Insira o código de 6 dígitos que enviamos para seu e-mail.'}
              {authMode === 'forgot' && 'Enviaremos instruções de redefinição para o seu e-mail.'}
              {authMode === 'forgot_confirm' && 'Digite o código recebido e sua nova senha.'}
            </p>
          </div>

          {/* Feedback de Erro Suave */}
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              textAlign: 'center',
              border: '1px solid #fee2e2',
              marginBottom: '14px'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Segmented Control Nativo Estilo Apple / Linear */}
          {(authMode === 'login' || authMode === 'signup') && (
            <div className="v2-auth-segmented" style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => { triggerHaptic('selection'); setAuthMode('login'); setErrorMsg(''); }}
                className={`v2-auth-segmented-item ${authMode === 'login' ? 'active' : ''}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { triggerHaptic('selection'); setAuthMode('signup'); setSignupStep(1); setErrorMsg(''); }}
                className={`v2-auth-segmented-item ${authMode === 'signup' ? 'active' : ''}`}
              >
                Criar Conta
              </button>
            </div>
          )}

          {/* ========================================================
              FORMULÁRIO DE LOGIN
              ======================================================== */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
              <div className="v2-field-group">
                <label className="v2-field-label">E-mail</label>
                <div className="v2-input-wrapper">
                  <span className="v2-input-icon"><MailIcon /></span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="v2-input-field"
                  />
                </div>
              </div>

              <div className="v2-field-group">
                <div className="v2-field-label">
                  <span>Senha</span>
                  <span
                    onClick={() => { triggerHaptic('light'); setAuthMode('forgot'); setErrorMsg(''); }}
                    style={{ color: 'var(--accent-primary, #0f766e)', fontWeight: 600, cursor: 'pointer', fontSize: '0.74rem' }}
                  >
                    Esqueceu a senha?
                  </span>
                </div>
                <div className="v2-input-wrapper">
                  <span className="v2-input-icon"><LockIcon /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="v2-input-field"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="v2-input-action"
                    aria-label="Revelar senha"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="v2-btn-monolith"
                style={{ marginTop: '8px' }}
              >
                {loading ? <SpinnerIcon /> : null}
                <span>{loading ? 'Acessando...' : 'Entrar no Aplicativo'}</span>
              </button>
            </form>
          )}

          {/* ========================================================
              FORMULÁRIO DE CADASTRO EM 2 ETAPAS FLUIDAS
              ======================================================== */}
          {authMode === 'signup' && (
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              {/* Barra de Progresso das Etapas */}
              <div className="v2-stepper-track">
                <div className={`v2-stepper-bar ${signupStep >= 1 ? 'active' : ''}`} />
                <div className={`v2-stepper-bar ${signupStep >= 2 ? 'active' : ''}`} />
              </div>

              {/* ETAPA 1: Acesso & Contato */}
              {signupStep === 1 && (
                <form onSubmit={handleAdvanceSignupStep} style={{ display: 'flex', flexDirection: 'column', gap: '13px', width: '100%', boxSizing: 'border-box' }}>
                  <div className="v2-field-group">
                    <label className="v2-field-label">Nome Completo *</label>
                    <div className="v2-input-wrapper">
                      <span className="v2-input-icon"><UserIcon /></span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="v2-input-field"
                      />
                    </div>
                  </div>

                  <div className="v2-field-group">
                    <label className="v2-field-label">E-mail de Acesso *</label>
                    <div className="v2-input-wrapper">
                      <span className="v2-input-icon"><MailIcon /></span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="v2-input-field"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                    <div className="v2-field-group" style={{ minWidth: 0 }}>
                      <label className="v2-field-label">WhatsApp *</label>
                      <div className="v2-input-wrapper">
                        <span className="v2-input-icon"><PhoneIcon /></span>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={e => handlePhoneChange(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="v2-input-field"
                        />
                      </div>
                    </div>

                    <div className="v2-field-group" style={{ minWidth: 0 }}>
                      <label className="v2-field-label">Senha *</label>
                      <div className="v2-input-wrapper">
                        <span className="v2-input-icon"><LockIcon /></span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Mín. 8 dígitos"
                          className="v2-input-field"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="v2-input-action"
                          aria-label="Revelar senha"
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="v2-btn-monolith"
                    style={{ marginTop: '8px' }}
                  >
                    <span>Continuar</span>
                    <ChevronRightIcon size={14} color="#ffffff" />
                  </button>
                </form>
              )}

              {/* ETAPA 2: Endereço & Finalização (Com CEP Ergonômico sem Cortes) */}
              {signupStep === 2 && (
                <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px', width: '100%', boxSizing: 'border-box' }}>
                  <div className="v2-field-group">
                    <label className="v2-field-label">Data de Nascimento</label>
                    <div className="v2-input-wrapper">
                      <span className="v2-input-icon"><CalendarIcon /></span>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={e => setBirthDate(e.target.value)}
                        className="v2-input-field"
                      />
                    </div>
                  </div>

                  {/* Grid de CEP & Logradouro com Largura Segura para 00000-000 */}
                  <div style={{ display: 'flex', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                    <div className="v2-field-group" style={{ width: '140px', flexShrink: 0 }}>
                      <label className="v2-field-label">
                        <span>CEP</span>
                        {loadingCep && <SpinnerIcon />}
                      </label>
                      <div className="v2-input-wrapper">
                        <span className="v2-input-icon"><PinIcon /></span>
                        <input
                          type="text"
                          value={signupZip}
                          onChange={e => handleCepChange(e.target.value)}
                          placeholder="00000-000"
                          maxLength={9}
                          className="v2-input-field"
                          style={{ letterSpacing: '0.02em', fontWeight: 600 }}
                        />
                      </div>
                    </div>

                    <div className="v2-field-group" style={{ flex: 1, minWidth: 0 }}>
                      <label className="v2-field-label">Logradouro / Rua</label>
                      <div className="v2-input-wrapper">
                        <input
                          type="text"
                          value={signupStreet}
                          onChange={e => setSignupStreet(e.target.value)}
                          placeholder="Rua, Av..."
                          className="v2-input-field"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Número & Bairro/Cidade */}
                  <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                    <div className="v2-field-group" style={{ minWidth: 0 }}>
                      <label className="v2-field-label">Número</label>
                      <div className="v2-input-wrapper">
                        <input
                          type="text"
                          value={signupNumber}
                          onChange={e => setSignupNumber(e.target.value)}
                          placeholder="123"
                          className="v2-input-field"
                        />
                      </div>
                    </div>

                    <div className="v2-field-group" style={{ minWidth: 0 }}>
                      <label className="v2-field-label">Bairro / Cidade</label>
                      <div className="v2-input-wrapper">
                        <input
                          type="text"
                          value={signupNeighborhood ? `${signupNeighborhood}${signupCity ? ` • ${signupCity}/${signupState}` : ''}` : signupCity}
                          onChange={e => setSignupNeighborhood(e.target.value)}
                          placeholder="Bairro"
                          className="v2-input-field"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Termos LGPD */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    cursor: 'pointer',
                    marginTop: '2px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.03)',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}>
                    <input
                      type="checkbox"
                      checked={acceptLGPD}
                      onChange={e => setAcceptLGPD(e.target.checked)}
                      style={{ marginTop: '3px', accentColor: 'var(--accent-primary, #0f766e)' }}
                    />
                    <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                      Concordo com os Termos de Uso e Política de Privacidade da igreja.
                    </span>
                  </label>

                  {/* Ações: Voltar para Passo 1 ou Finalizar Cadastro */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px', width: '100%', boxSizing: 'border-box' }}>
                    <button
                      type="button"
                      onClick={() => { triggerHaptic('light'); setSignupStep(1); }}
                      className="v2-pressable"
                      style={{
                        height: '48px',
                        padding: '0 20px',
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '14px',
                        color: '#475569',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      Voltar
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="v2-btn-monolith"
                      style={{ flex: 1 }}
                    >
                      {loading ? <SpinnerIcon /> : null}
                      <span>{loading ? 'Cadastrando...' : 'Finalizar Cadastro'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ========================================================
              CONFIRMAÇÃO DE CÓDIGO
              ======================================================== */}
          {authMode === 'confirm' && (
            <form onSubmit={handleConfirmCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="v2-input-wrapper" style={{ height: '54px', justifyContent: 'center' }}>
                <input
                  type="text"
                  required
                  value={confirmationCode}
                  onChange={e => setConfirmationCode(e.target.value)}
                  placeholder="000000"
                  className="v2-input-field"
                  style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.4em', fontWeight: 800 }}
                />
              </div>

              <button type="submit" disabled={loading} className="v2-btn-monolith">
                {loading ? <SpinnerIcon /> : null}
                <span>{loading ? 'Confirmando...' : 'Confirmar Código'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('login')}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer', padding: '6px' }}
              >
                Voltar para Login
              </button>
            </form>
          )}

          {/* ========================================================
              ESQUECI A SENHA
              ======================================================== */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="v2-field-group">
                <label className="v2-field-label">E-mail cadastrado</label>
                <div className="v2-input-wrapper">
                  <span className="v2-input-icon"><MailIcon /></span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="v2-input-field"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="v2-btn-monolith" style={{ marginTop: '6px' }}>
                {loading ? <SpinnerIcon /> : null}
                <span>{loading ? 'Enviando...' : 'Enviar Código'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('login')}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer', padding: '6px' }}
              >
                Voltar para Login
              </button>
            </form>
          )}

          {/* ========================================================
              DEFINIR NOVA SENHA
              ======================================================== */}
          {authMode === 'forgot_confirm' && (
            <form onSubmit={handleConfirmResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="v2-field-group">
                <label className="v2-field-label">Código recebido por e-mail</label>
                <div className="v2-input-wrapper">
                  <input
                    type="text"
                    required
                    value={confirmationCode}
                    onChange={e => setConfirmationCode(e.target.value)}
                    placeholder="Código de 6 dígitos"
                    className="v2-input-field"
                    style={{ textAlign: 'center', letterSpacing: '0.2em', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div className="v2-field-group">
                <label className="v2-field-label">Nova Senha (mín. 8 dígitos)</label>
                <div className="v2-input-wrapper">
                  <span className="v2-input-icon"><LockIcon /></span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="v2-input-field"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="v2-input-action"
                    aria-label="Revelar senha"
                  >
                    {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="v2-btn-monolith" style={{ marginTop: '6px' }}>
                {loading ? <SpinnerIcon /> : null}
                <span>{loading ? 'Alterando...' : 'Salvar Nova Senha'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('login')}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer', padding: '6px' }}
              >
                Cancelar
              </button>
            </form>
          )}

        </div>
      </BottomSheet>
    </div>
  );
};
