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
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={e => e.stopPropagation()} style={{ maxHeight: '92dvh' }}>
        <div className="drawer-handle" />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'var(--accent-primary-light)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              ✨
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                Check-in Confirmado!
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Crachá de segurança & QR Code de retirada
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: 32,
              height: 32,
              borderRadius: '50%',
              color: 'var(--text-muted)',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Printable Card Area */}
        <div ref={printRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
          {/* Room Pill */}
          <div style={{
            background: badge.room_color ? `${badge.room_color}18` : 'var(--accent-primary-light)',
            color: badge.room_color || 'var(--accent-primary)',
            border: `1px solid ${badge.room_color || 'var(--accent-primary)'}35`,
            padding: '4px 14px',
            borderRadius: 20,
            fontSize: '0.76rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            📍 {badge.room_name}
          </div>

          {/* Child Name */}
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            {badge.child_name}
          </h2>

          {/* Parent Info */}
          <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
            Responsável: <strong>{badge.parent_name}</strong> • {badge.parent_phone}
          </div>

          {/* Allergies Warning */}
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
              textAlign: 'left'
            }}>
              ⚠️ {badge.allergies ? `Alergia: ${badge.allergies}` : ''} {badge.medical_notes ? `• Obs: ${badge.medical_notes}` : ''}
            </div>
          )}

          {/* QR Code Frame */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1.5px dashed var(--panel-border)',
            borderRadius: 18,
            padding: 12,
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <img 
              src={qrCodeUrl} 
              alt={`QR Code ${badge.security_code}`} 
              style={{ width: 160, height: 160, borderRadius: 10, display: 'block' }} 
            />
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Apresente no checkout
            </span>
          </div>

          {/* Large Security PIN Box */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid var(--panel-border)',
            borderRadius: 16,
            padding: '10px 20px',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Código de Retirada</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Entrada: {checkinTime}</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
              {badge.security_code}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
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
                  borderRadius: 14,
                  padding: '12px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)'
                }}
              >
                <span>💬</span> WhatsApp Pais
              </a>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="btn-pwa-secondary"
              style={{ flex: 1, borderRadius: 14, minHeight: 46 }}
            >
              <span>🖨️</span> Imprimir Crachá
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: onNewCheckin ? '1fr 1fr' : '1fr', gap: 8 }}>
            {onNewCheckin && (
              <button
                type="button"
                onClick={onNewCheckin}
                className="btn-pwa-secondary"
                style={{
                  borderRadius: 14,
                  minHeight: 48,
                  borderColor: 'var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  fontWeight: 800
                }}
              >
                <span>➕</span> Novo Check-in
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-pwa-primary"
              style={{ borderRadius: 14, minHeight: 48 }}
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
