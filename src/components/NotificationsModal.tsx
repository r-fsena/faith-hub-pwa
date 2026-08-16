import React, { useState, useEffect } from 'react';
import { checkPushNotificationSupport, requestPushPermission } from '../services/pushNotifications';
import { fetchActiveBroadcast } from '../services/api';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      if (checkPushNotificationSupport()) {
        setIsSupported(true);
        setPushStatus(Notification.permission);
      }
      loadBroadcast();
    }
  }, [isOpen]);

  const loadBroadcast = async () => {
    const b = await fetchActiveBroadcast();
    if (b) setActiveBroadcast(b);
  };

  const handleActivatePush = async () => {
    const permission = await requestPushPermission();
    setPushStatus(permission);
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={e => e.stopPropagation()}>
        <div className="drawer-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              Avisos & Notificações
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Fique por dentro das programações e avisos da igreja
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        {/* Card de Ativação de Notificações Push no Celular */}
        {isSupported && (
          <div 
            style={{
              background: pushStatus === 'granted' ? '#f0fdf4' : 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
              border: pushStatus === 'granted' ? '1.5px solid #86efac' : '1.5px solid var(--accent-primary)',
              borderRadius: '18px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: pushStatus === 'granted' ? '#dcfce7' : 'var(--accent-primary-light)', color: pushStatus === 'granted' ? '#16a34a' : 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  {pushStatus === 'granted' ? '✓' : '🔔'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    {pushStatus === 'granted' ? 'Notificações Ativadas' : 'Ativar Avisos no Celular'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {pushStatus === 'granted' 
                      ? 'Você receberá avisos de transmissões e eventos'
                      : 'Receba alertas quando a igreja iniciar transmissões'}
                  </div>
                </div>
              </div>

              {pushStatus === 'granted' && (
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                  Ativo
                </span>
              )}
            </div>

            {pushStatus !== 'granted' && (
              <button
                type="button"
                className="btn-pwa-primary"
                onClick={handleActivatePush}
                style={{ padding: '10px', fontSize: '0.82rem' }}
              >
                🔔 Ativar Notificações Push Agora
              </button>
            )}
          </div>
        )}

        {/* Lista de Avisos e Comunicados Reais */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Últimos Comunicados
          </span>

          {activeBroadcast ? (
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: '6px' }}>
                  ● AO VIVO AGORA
                </span>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Transmissão</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '2px' }}>
                {activeBroadcast.title || 'Culto ao Vivo'}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                {activeBroadcast.description || 'Assista à ministração e louvor ao vivo diretamente pelo aplicativo.'}
              </p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', padding: '24px 16px', borderRadius: '16px', border: '1px solid var(--panel-border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Nenhum comunicado recente no momento. Quando a liderança publicar avisos ou transmissões, eles aparecerão aqui.
            </div>
          )}
        </div>

        <button type="button" className="btn-pwa-secondary" onClick={onClose} style={{ fontWeight: 800 }}>
          Fechar
        </button>
      </div>
    </div>
  );
};
