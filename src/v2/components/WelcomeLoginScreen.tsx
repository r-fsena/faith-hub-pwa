import React, { useState, useEffect, useRef } from 'react';
import { useBranding } from '../../context/BrandingContext';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { ChevronRightIcon, SparklesIcon } from './Icons';
import { BottomSheet } from '../../components/BottomSheet';
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword, signInWithRedirect } from 'aws-amplify/auth';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

interface WelcomeLoginScreenProps {
  onLoginSuccess?: () => void;
  onContinueAsGuest?: () => void;
}

export const WelcomeLoginScreen: React.FC<WelcomeLoginScreenProps> = ({
  onLoginSuccess,
  onContinueAsGuest
}) => {
  const { branding } = useBranding();
  const { checkAuth } = useAuth();
  const { resolvedTheme } = useTheme();

  const welcomeConfig = branding.welcome_screen_config;
  const heroImage = welcomeConfig?.hero_image_url || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80';
  const churchTitle = branding.church_name || 'Comunidade';
  const headline = welcomeConfig?.headline || `Viva o propósito da sua fé na ${churchTitle}`;
  const subtitle = welcomeConfig?.subtitle || 'Acompanhe devocionais, conecte-se à sua célula, participe de eventos e cresça em comunidade.';

  const defaultSlides = [
    {
      badge: churchTitle.toUpperCase(),
      title: headline,
      description: subtitle
    },
    {
      badge: 'CÉLULAS & GRUPOS',
      title: 'Conecte-se em um Grupo',
      description: 'Amizades reais e comunhão nos lares da nossa congregação.'
    },
    {
      badge: 'PALAVRA DO DIA',
      title: 'Devocionais Diários',
      description: 'Mensagens em vídeo e estudos bíblicos preparados pelos pastores.'
    },
    {
      badge: 'EVENTOS & MINISTÉRIO',
      title: 'Eventos & Ministério Kids',
      description: 'Inscrições com QR Code express e check-in seguro para seus filhos.'
    }
  ];

  const allSlides = welcomeConfig?.slides && welcomeConfig.slides.length > 0 
    ? welcomeConfig.slides 
    : defaultSlides;

  // Estado do Carrossel de Slides com Arraste (Swipe)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef<number>(0);

  // Estado da Gaveta de Login / Cadastro
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'confirm' | 'forgot' | 'forgot_confirm'>('login');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto avanço de slides a cada 7 segundos se o usuário não estiver interagindo
  useEffect(() => {
    if (allSlides.length <= 1) return;
    const interval = setInterval(() => {
      if (!isDragging) {
        setCurrentSlide(prev => (prev + 1) % allSlides.length);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [allSlides.length, isDragging]);

  const handleDragStart = (clientX: number) => {
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
      // Arrastou da direita para a esquerda -> Próximo slide
      triggerHaptic('selection');
      setCurrentSlide(prev => (prev + 1) % allSlides.length);
    } else if (delta > threshold) {
      // Arrastou da esquerda para a direita -> Slide anterior
      triggerHaptic('selection');
      setCurrentSlide(prev => (prev - 1 + allSlides.length) % allSlides.length);
    }

    dragStartX.current = null;
    dragDeltaX.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  };

  // Handler de CEP
  const handleFetchCep = async (rawCep: string) => {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            setSignupStreet(data.logradouro || '');
            setSignupNeighborhood(data.bairro || '');
            setSignupCity(data.localidade || '');
            setSignupState(data.uf || '');
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

  const handleSignUpSubmit = async (e: React.FormEvent) => {
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
      localStorage.setItem('faithhub_user_name', name.trim());
      localStorage.setItem('faithhub_user_email', email.trim());
      if (phone.trim()) localStorage.setItem('faithhub_user_phone', phone.trim());

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

  const handleGoogleLogin = async () => {
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      background: '#090d16',
      zIndex: 100
    }}>
      {/* Imagem de Fundo em Tela Cheia (Hero) */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'scale(1.03)',
          filter: 'brightness(0.92)',
          transition: 'transform 10s ease',
          zIndex: 1
        }}
      />

      {/* Gradiente de Fusão Escuro (Scrim Superior e Inferior para Contraste Total) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(180deg, rgba(9, 13, 22, 0.70) 0%, rgba(9, 13, 22, 0.15) 30%, rgba(9, 13, 22, 0.40) 55%, rgba(9, 13, 22, 0.95) 85%, #090d16 100%)',
        zIndex: 2,
        pointerEvents: 'none'
      }} />

      {/* Topo: Logo da Igreja com Destaque Maior & Botão Explorar */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: 'calc(env(safe-area-inset-top, 16px) + 8px) 20px 0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Identidade Flutuante da Igreja em Vidro Líquido Proeminente */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(9, 13, 22, 0.65)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '999px',
          padding: '6px 18px 6px 8px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
          maxWidth: 'calc(100% - 105px)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--accent-primary, #0f766e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(15, 118, 110, 0.45)',
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
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '3px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
            <span style={{ 
              fontSize: '0.98rem', 
              fontWeight: 900, 
              color: '#ffffff', 
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {branding.church_name || 'Faith-Hub'}
            </span>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              color: 'var(--accent-secondary, #2dd4bf)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '1px'
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Aplicativo Oficial
            </span>
          </div>
        </div>

        {/* Botão Explorar como Visitante */}
        {welcomeConfig?.allow_guest_browse !== false && onContinueAsGuest && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onContinueAsGuest();
            }}
            className="v2-pressable"
            style={{
              background: 'rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              borderRadius: '999px',
              padding: '8px 16px',
              color: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 800,
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

      {/* Espaço central flexível */}
      <div style={{ flex: 1, zIndex: 5 }} />

      {/* Base Imersiva: Carrossel Interativo com Arraste (Swipe), Navegação e Botão Entrar */}
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
          padding: '0 24px calc(env(safe-area-inset-bottom, 20px) + 16px) 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(8px, 1.8vh, 16px)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'pan-y'
        }}
      >
        {/* Trilho Horizontal de Slides com Animação Física */}
        <div style={{ overflow: 'hidden', width: '100%' }}>
          <div style={{
            display: 'flex',
            width: '100%',
            transform: isDragging 
              ? `translateX(calc(-${currentSlide * 100}% + ${dragOffset}px))`
              : `translateX(-${currentSlide * 100}%)`,
            transition: isDragging ? 'none' : 'transform 0.38s cubic-bezier(0.25, 1, 0.5, 1)',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}>
            {allSlides.map((slide, idx) => (
              <div 
                key={idx} 
                style={{ 
                  minWidth: '100%', 
                  width: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 'clamp(6px, 1.4vh, 12px)',
                  boxSizing: 'border-box',
                  paddingRight: '6px'
                }}
              >
                {/* Badge do Slide Ativo */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, var(--accent-primary, #0f766e) 0%, var(--accent-secondary, #14b8a6) 100%)',
                    color: '#ffffff',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    boxShadow: '0 4px 12px rgba(15, 118, 110, 0.35)',
                    textTransform: 'uppercase'
                  }}>
                    {slide.badge}
                  </span>
                </div>

                {/* Título de Impacto (Headline) */}
                <h1 style={{
                  fontSize: 'clamp(1.48rem, 5.1vw, 2.05rem)',
                  fontWeight: 900,
                  color: '#ffffff',
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  margin: 0,
                  textShadow: '0 4px 20px rgba(0, 0, 0, 0.6)'
                }}>
                  {slide.title}
                </h1>

                {/* Subtítulo / Dizeres da Igreja */}
                <p style={{
                  fontSize: 'clamp(0.80rem, 2.4vw, 0.88rem)',
                  color: '#cbd5e1',
                  lineHeight: 1.42,
                  margin: 0,
                  maxWidth: '420px',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)'
                }}>
                  {slide.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Barra de Rodapé: Navegação por Toque/Clique + Dots + Dica de Arrastar + Botão Entrar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '6px',
          paddingTop: '6px',
          gap: '12px'
        }}>
          {/* Controles de Slides com Chevrons, Dots e Dica */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Seta Anterior */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setCurrentSlide(prev => (prev - 1 + allSlides.length) % allSlides.length);
                }}
                className="v2-pressable"
                aria-label="Slide anterior"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.20)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.90rem',
                  cursor: 'pointer',
                  outline: 'none',
                  lineHeight: 1
                }}
              >
                ‹
              </button>

              {/* Dots Indicadores */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px' }}>
                {allSlides.map((_, idx) => {
                  const isActive = currentSlide === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        triggerHaptic('light');
                        setCurrentSlide(idx);
                      }}
                      style={{
                        width: isActive ? '20px' : '7px',
                        height: '7px',
                        borderRadius: '999px',
                        background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                        boxShadow: isActive ? '0 0 10px rgba(255, 255, 255, 0.8)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </div>

              {/* Seta Próximo */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setCurrentSlide(prev => (prev + 1) % allSlides.length);
                }}
                className="v2-pressable"
                aria-label="Próximo slide"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.20)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.90rem',
                  cursor: 'pointer',
                  outline: 'none',
                  lineHeight: 1
                }}
              >
                ›
              </button>
            </div>

            {/* Dica visual de arrastar */}
            <span style={{
              fontSize: '0.66rem',
              color: 'rgba(255, 255, 255, 0.55)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              paddingLeft: '2px'
            }}>
              <span>⇄</span> Deslize para explorar
            </span>
          </div>

          {/* Botão Único "Entrar" */}
          <button
            type="button"
            onClick={() => handleOpenAuth('login')}
            className="v2-pressable"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
              color: '#090d16',
              fontWeight: 900,
              fontSize: '0.94rem',
              borderRadius: '999px',
              padding: '13px 30px',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(255, 255, 255, 0.2)',
              border: 'none',
              outline: 'none',
              letterSpacing: '0.01em',
              flexShrink: 0
            }}
          >
            Entrar
          </button>
        </div>
      </div>

      {/* ========================================================
          GAVETA FLUIDA DE AUTENTICAÇÃO (LIQUID BOTTOM SHEET)
          ======================================================== */}
      <BottomSheet
        isOpen={isAuthDrawerOpen}
        onClose={() => setIsAuthDrawerOpen(false)}
        maxHeight="86vh"
      >
        <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%' }}>
          
          {/* Header da Gaveta */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.30rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              {authMode === 'login' && 'Bem-vindo de volta!'}
              {authMode === 'signup' && 'Criar Nova Conta'}
              {authMode === 'confirm' && 'Confirmação de Cadastro'}
              {authMode === 'forgot' && 'Recuperar Senha'}
              {authMode === 'forgot_confirm' && 'Definir Nova Senha'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {authMode === 'login' && `Acesse com sua conta para se conectar à ${branding.church_name || 'igreja'}.`}
              {authMode === 'signup' && 'Preencha seus dados para fazer parte da comunidade.'}
              {authMode === 'confirm' && 'Digite o código de 6 dígitos enviado para seu e-mail.'}
              {authMode === 'forgot' && 'Informe seu e-mail cadastrado para receber o código.'}
              {authMode === 'forgot_confirm' && 'Digite o código e escolha sua nova senha.'}
            </p>
          </div>

          {/* Mensagem de Erro se houver */}
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              textAlign: 'center',
              border: '1px solid #fecaca',
              marginBottom: '14px'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Switcher entre Entrar e Criar Conta */}
          {(authMode === 'login' || authMode === 'signup') && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              background: 'var(--bg-card-subtle, #f1f5f9)',
              padding: '4px',
              borderRadius: '16px',
              marginBottom: '20px'
            }}>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                className={`v2-pressable v2-segment-btn ${authMode === 'login' ? 'active' : ''}`}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: authMode === 'login' ? '1px solid var(--v2-segment-active-border, rgba(0,0,0,0.06))' : '1px solid transparent',
                  background: authMode === 'login' ? 'var(--v2-segment-active-bg, #ffffff)' : 'transparent',
                  color: authMode === 'login' ? 'var(--v2-segment-active-color, var(--accent-primary))' : 'var(--text-muted)',
                  fontWeight: authMode === 'login' ? 900 : 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: authMode === 'login' ? 'var(--v2-segment-active-shadow, 0 2px 8px rgba(0,0,0,0.06))' : 'none'
                }}
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                className={`v2-pressable v2-segment-btn ${authMode === 'signup' ? 'active' : ''}`}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: authMode === 'signup' ? '1px solid var(--v2-segment-active-border, rgba(0,0,0,0.06))' : '1px solid transparent',
                  background: authMode === 'signup' ? 'var(--v2-segment-active-bg, #ffffff)' : 'transparent',
                  color: authMode === 'signup' ? 'var(--v2-segment-active-color, var(--accent-primary))' : 'var(--text-muted)',
                  fontWeight: authMode === 'signup' ? 900 : 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: authMode === 'signup' ? 'var(--v2-segment-active-shadow, 0 2px 8px rgba(0,0,0,0.06))' : 'none'
                }}
              >
                Criar Conta
              </button>
            </div>
          )}

          {/* ========================================================
              FORMULÁRIO DE LOGIN
              ======================================================== */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="input-pwa"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    Senha
                  </label>
                  <span
                    onClick={() => { setAuthMode('forgot'); setErrorMsg(''); }}
                    style={{ fontSize: '0.72rem', color: 'var(--accent-bright, var(--accent-primary))', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Esqueceu a senha?
                  </span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-pwa"
                  style={{ width: '100%' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-pwa-primary v2-pressable"
                style={{ width: '100%', padding: '14px', fontSize: '0.90rem', fontWeight: 900, marginTop: '6px' }}
              >
                {loading ? 'Entrando...' : 'Entrar no Aplicativo'}
              </button>

              {/* Divisor */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 700 }}>OU</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }} />
              </div>

              {/* Botão Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="v2-pressable"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid var(--panel-border)',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                  <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.1.2-1.9.4-2.7L1.6 6.4C.6 8.3 0 10.5 0 12s.6 3.7 1.6 5.6l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"/>
                </svg>
                <span>Continuar com Google</span>
              </button>
            </form>
          )}

          {/* ========================================================
              FORMULÁRIO DE CADASTRO (SIGNUP)
              ======================================================== */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="input-pwa"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)' }}>E-mail *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="input-pwa"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)' }}>WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="input-pwa"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Senha *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mín. 8 dígitos"
                    className="input-pwa"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Nascimento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="input-pwa"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Endereço com CEP */}
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    CEP {loadingCep && '⏳'}
                  </label>
                  <input
                    type="text"
                    value={signupZip}
                    onChange={e => {
                      setSignupZip(e.target.value);
                      handleFetchCep(e.target.value);
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    className="input-pwa"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Rua / Av</label>
                  <input
                    type="text"
                    value={signupStreet}
                    onChange={e => setSignupStreet(e.target.value)}
                    placeholder="Logradouro"
                    className="input-pwa"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Termo LGPD */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={acceptLGPD}
                  onChange={e => setAcceptLGPD(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  Concordo com os Termos de Uso e Política de Privacidade da igreja.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn-pwa-primary v2-pressable"
                style={{ width: '100%', padding: '14px', fontSize: '0.90rem', fontWeight: 900 }}
              >
                {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
              </button>
            </form>
          )}

          {/* ========================================================
              CONFIRMAÇÃO DE CÓDIGO
              ======================================================== */}
          {authMode === 'confirm' && (
            <form onSubmit={handleConfirmCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                required
                value={confirmationCode}
                onChange={e => setConfirmationCode(e.target.value)}
                placeholder="Código de 6 dígitos"
                className="input-pwa"
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.3em', fontWeight: 900 }}
              />

              <button type="submit" disabled={loading} className="btn-pwa-primary v2-pressable" style={{ width: '100%', padding: '14px' }}>
                {loading ? 'Confirmando...' : 'Confirmar Código'}
              </button>

              <button type="button" onClick={() => setAuthMode('login')} className="btn-pwa-secondary" style={{ width: '100%' }}>
                Voltar para Login
              </button>
            </form>
          )}

          {/* ========================================================
              ESQUECI A SENHA
              ======================================================== */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Seu e-mail cadastrado"
                className="input-pwa"
                style={{ width: '100%' }}
              />

              <button type="submit" disabled={loading} className="btn-pwa-primary v2-pressable" style={{ width: '100%', padding: '14px' }}>
                {loading ? 'Enviando...' : 'Enviar Código de Recuperação'}
              </button>

              <button type="button" onClick={() => setAuthMode('login')} className="btn-pwa-secondary" style={{ width: '100%' }}>
                Voltar para Login
              </button>
            </form>
          )}

          {/* ========================================================
              DEFINIR NOVA SENHA
              ======================================================== */}
          {authMode === 'forgot_confirm' && (
            <form onSubmit={handleConfirmResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                required
                value={confirmationCode}
                onChange={e => setConfirmationCode(e.target.value)}
                placeholder="Código recebido por e-mail"
                className="input-pwa"
                style={{ textAlign: 'center', fontWeight: 800 }}
              />

              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nova Senha (Mín. 8 dígitos)"
                className="input-pwa"
                style={{ width: '100%' }}
              />

              <button type="submit" disabled={loading} className="btn-pwa-primary v2-pressable" style={{ width: '100%', padding: '14px' }}>
                {loading ? 'Alterando...' : 'Salvar Nova Senha'}
              </button>

              <button type="button" onClick={() => setAuthMode('login')} className="btn-pwa-secondary" style={{ width: '100%' }}>
                Cancelar
              </button>
            </form>
          )}

        </div>
      </BottomSheet>
    </div>
  );
};
