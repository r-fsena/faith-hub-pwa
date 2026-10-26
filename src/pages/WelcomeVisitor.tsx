import React, { useState } from 'react';
import { useBranding } from '../context/BrandingContext';

interface WelcomeVisitorProps {
  onBack?: () => void;
  onExploreApp?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

export const WelcomeVisitor: React.FC<WelcomeVisitorProps> = ({ onBack, onExploreApp }) => {
  const { branding } = useBranding();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [email, setEmail] = useState('');
  const [prayerRequest, setPrayerRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Por favor, preencha pelo menos seu nome e WhatsApp.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        neighborhood: neighborhood.trim() || undefined,
        email: email.trim() || undefined,
        notes: prayerRequest.trim() ? `Pedido de oração no acolhimento: ${prayerRequest.trim()}` : undefined,
        origin_channel: 'QR_CODE',
        organization_id: branding.organization_id || 'org_default'
      };

      const res = await fetch(`${API_URL}/pastoral/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Não foi possível enviar seus dados. Tente novamente.');
      }
    } catch (e) {
      alert('Erro de conexão ao enviar seus dados. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main, #0f172a)',
      color: 'var(--text-main, #f8fafc)',
      padding: '24px 20px 80px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              color: '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ← Voltar
          </button>
        )}
        <div style={{ fontSize: '0.80rem', color: '#94a3b8', fontWeight: 600 }}>
          {branding.church_name || 'Comunidade da Fé'}
        </div>
      </div>

      {submitted ? (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '36px 24px',
          textAlign: 'center',
          marginTop: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🕊️</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 10px 0', color: '#38bdf8' }}>
            Que Alegria Ter Você Aqui!
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 24px 0' }}>
            Olá, <strong>{name}</strong>! Recebemos seus dados com muito amor. Nossa equipe pastoral e os líderes de células estão à sua inteira disposição para orar e caminhar com você e sua família.
          </p>

          <div style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '16px',
            padding: '16px',
            fontSize: '0.82rem',
            color: '#7dd3fc',
            lineHeight: 1.5,
            marginBottom: '28px'
          }}>
            📖 <em>"O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti."</em> (Números 6:24-25)
          </div>

          <button
            onClick={onExploreApp || onBack}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)'
            }}
          >
            Explorar o Aplicativo da Igreja 🚀
          </button>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 12px auto',
              boxShadow: '0 6px 18px rgba(59, 130, 246, 0.3)'
            }}>
              🤝
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Seja Muito Bem-Vindo(a)!
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              É uma honra receber você no nosso culto. Deixe seu contato para que possamos orar por você e te acolher!
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Seu Nome Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Beatriz Lima"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.90rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Seu WhatsApp / Telefone *
              </label>
              <input
                type="tel"
                required
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.90rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Bairro onde mora (para indicarmos uma célula perto)
              </label>
              <input
                type="text"
                placeholder="Ex: Centro / Vila Nova"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.90rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                E-mail (opcional)
              </label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.90rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Como podemos orar por você hoje?
              </label>
              <textarea
                rows={3}
                placeholder="Escreva aqui seu pedido de oração ou motivo de gratidão..."
                value={prayerRequest}
                onChange={(e) => setPrayerRequest(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                marginTop: '8px'
              }}
            >
              {loading ? 'Enviando...' : '✓ Confirmar Minha Visita'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
