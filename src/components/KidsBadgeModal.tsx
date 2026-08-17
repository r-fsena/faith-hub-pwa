import React, { useRef } from 'react';
import { createPortal } from 'react-dom';

export interface KidsBadgeData {
  id: string;
  child_name: string;
  room_name: string;
  room_color?: string;
  parent_name: string;
  parent_phone: string;
  security_code: string;
  checkin_at: string;
  allergies?: string;
  medical_notes?: string;
  church_name?: string;
}

interface KidsBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: KidsBadgeData | null;
  onNewCheckin?: () => void;
}

export const KidsBadgeModal: React.FC<KidsBadgeModalProps> = ({ isOpen, onClose, badge, onNewCheckin }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !badge) return null;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(badge.security_code)}&margin=10`;
  const cleanPhone = badge.parent_phone.replace(/\D/g, '');
  const checkinTime = new Date(badge.checkin_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const checkinDate = new Date(badge.checkin_at || Date.now()).toLocaleDateString('pt-BR');

  const whatsappMessage = `*${badge.church_name || 'Ministério Infantil'}* 🚸\n\nOlá *${badge.parent_name}*!\nO check-in de *${badge.child_name}* foi realizado com sucesso na sala *${badge.room_name}*.\n\n🔑 *PIN de Segurança / Retirada:* *${badge.security_code}*\n⏰ *Horário:* ${checkinTime} de ${checkinDate}\n\nGuarde este código ou apresente o QR Code no seu aplicativo Faith-Hub para retirar seu filho ao final do culto.`;

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div 
        className="animate-scale-up"
        style={{
          background: '#ffffff',
          borderRadius: 24,
          maxWidth: 420,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-primary, #0f766e) 0%, #0d9488 100%)',
          color: '#ffffff',
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              ✨
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.2 }}>Check-in Confirmado!</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>Crachá de Segurança & QR Code</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              width: 30,
              height: 30,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900
            }}
          >
            ✕
          </button>
        </div>

        {/* Printable Card Area */}
        <div ref={printRef} style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          
          {/* Room Pill */}
          <div style={{
            background: badge.room_color ? `${badge.room_color}15` : '#f0fdfa',
            color: badge.room_color || 'var(--accent-primary, #0f766e)',
            border: `1px solid ${badge.room_color || 'var(--accent-primary, #0f766e)'}40`,
            padding: '4px 14px',
            borderRadius: 20,
            fontSize: '0.78rem',
            fontWeight: 800,
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            📍 {badge.room_name}
          </div>

          {/* Child Name */}
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main, #0f172a)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            {badge.child_name}
          </h2>

          {/* Parent Info */}
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 14 }}>
            Responsável: <strong>{badge.parent_name}</strong> • {badge.parent_phone}
          </div>

          {/* Allergies / Medical Notes Warning */}
          {(badge.allergies || badge.medical_notes) && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
              borderRadius: 12,
              padding: '8px 12px',
              fontSize: '0.76rem',
              fontWeight: 800,
              width: '100%',
              marginBottom: 14,
              textAlign: 'left'
            }}>
              ⚠️ {badge.allergies ? `Alergia: ${badge.allergies}` : ''} {badge.medical_notes ? `• Obs: ${badge.medical_notes}` : ''}
            </div>
          )}

          {/* QR Code Frame */}
          <div style={{
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: 16,
            padding: 12,
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            marginBottom: 14
          }}>
            <img 
              src={qrCodeUrl} 
              alt={`QR Code ${badge.security_code}`} 
              style={{ width: 170, height: 170, borderRadius: 8, display: 'block' }} 
            />
            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#94a3b8', marginTop: 6, textTransform: 'uppercase' }}>
              Apresente no checkout
            </span>
          </div>

          {/* Large Security PIN Box */}
          <div style={{
            background: '#f8fafc',
            border: '2px solid var(--accent-primary, #0f766e)',
            borderRadius: 14,
            padding: '10px 24px',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Código de Retirada</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Entrada: {checkinTime}</div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--accent-primary, #0f766e)', letterSpacing: '0.08em' }}>
              {badge.security_code}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {cleanPhone && (
              <a
                href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  background: '#25d366',
                  color: '#ffffff',
                  borderRadius: 12,
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  textDecoration: 'none'
                }}
              >
                <span>💬</span> WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={handlePrint}
              style={{
                flex: 1,
                background: '#f1f5f9',
                color: 'var(--text-main, #0f172a)',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <span>🖨️</span> Imprimir
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: onNewCheckin ? '1fr 1fr' : '1fr', gap: 8 }}>
            {onNewCheckin && (
              <button
                type="button"
                onClick={onNewCheckin}
                style={{
                  background: 'var(--accent-primary-light, #f0fdfa)',
                  color: 'var(--accent-primary, #0f766e)',
                  border: '1.5px solid var(--accent-primary, #0f766e)',
                  borderRadius: 12,
                  padding: '12px',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4
                }}
              >
                <span>➕</span> Novo Check-in
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--accent-primary, #0f766e)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '12px',
                fontWeight: 900,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)'
              }}
            >
              <span>🚪</span> Voltar às Salas
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
