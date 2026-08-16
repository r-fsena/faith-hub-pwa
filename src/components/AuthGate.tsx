import React from 'react';
import { useBranding } from '../context/BrandingContext';

interface AuthGateProps {
  featureName: string;
  featureDescription?: string;
  onGoToLogin: () => void;
  onGoToBible?: () => void;
  onBack?: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  featureName,
  featureDescription,
  onGoToLogin,
  onGoToBible,
  onBack
}) => {
  const { branding } = useBranding();

  const getFeatureIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'células & redes':
      case 'células':
        return '👥';
      case 'cantina & loja':
      case 'cantina':
        return '🛒';
      case 'palavra & ensino':
      case 'devocionais':
        return '📖';
      case 'mural de oração':
      case 'orações':
        return '🙏';
      case 'eventos & cursos':
      case 'eventos':
        return '🎟️';
      case 'contribuições & dízimos':
      case 'dízimos':
        return '🕊️';
      default:
        return '🔒';
    }
  };

  return (
    <div className="pwa-content animate-fade-in" style={{ justifyContent: 'center', minHeight: '70vh' }}>
      
      {/* Card Central da Entre-Tela de Login */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px 20px',
          border: '1px solid var(--panel-border)',
          boxShadow: 'var(--shadow-md)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px'
        }}
      >
        {/* Ícone com Halo Suave */}
        <div 
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'var(--accent-primary-gradient)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            boxShadow: '0 8px 20px rgba(15, 118, 110, 0.25)',
            marginBottom: '4px'
          }}
        >
          {getFeatureIcon(featureName)}
        </div>

        {/* Badge Exclusivo */}
        <span 
          style={{
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            fontSize: '0.70rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '4px 12px',
            borderRadius: '999px'
          }}
        >
          Área de Membros • {branding.church_name || 'Comunidade'}
        </span>

        {/* Título & Descrição */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, lineHeight: 1.25 }}>
          Acesse {featureName} com sua conta
        </h2>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
          {featureDescription || `Para interagir em ${featureName.toLowerCase()}, ter acesso a conteúdos exclusivos e sincronizar seus dados, entre ou crie seu cadastro em instantes.`}
        </p>

        {/* Vantagens de se Conectar */}
        <div 
          style={{
            width: '100%',
            background: '#f8fafc',
            border: '1px solid var(--panel-border)',
            borderRadius: '16px',
            padding: '14px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>✓</span>
            <span>Acesso completo ao hub da sua célula e estudos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>✓</span>
            <span>Inscrições em eventos e passaportes digitais</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>✓</span>
            <span>Pedidos na cantina e mural de intercessão</span>
          </div>
        </div>

        {/* Botão de Ação Primária: Ir para Login */}
        <button
          type="button"
          className="btn-pwa-primary"
          onClick={onGoToLogin}
          style={{ width: '100%', minHeight: '48px', fontSize: '0.92rem', marginTop: '6px' }}
        >
          🔐 Entrar ou Criar Conta Grátis
        </button>

        {/* Botão Secundário: Ler a Bíblia Livremente */}
        {onGoToBible && (
          <button
            type="button"
            className="btn-pwa-secondary"
            onClick={onGoToBible}
            style={{ width: '100%', minHeight: '42px', fontSize: '0.84rem' }}
          >
            📖 Ler a Bíblia Sagrada (Acesso Livre)
          </button>
        )}

        {/* Botão Voltar */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '6px 0' }}
          >
            ← Voltar ao Início
          </button>
        )}

      </div>

    </div>
  );
};
