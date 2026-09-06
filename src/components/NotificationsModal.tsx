import React, { useState, useEffect } from 'react';
import { checkPushNotificationSupport, requestPushPermission } from '../services/pushNotifications';
import type { AppNotification } from '../services/notificationEngine';
import { 
  fetchAppNotifications, 
  getReadNotificationIds, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../services/notificationEngine';
import { useBranding } from '../context/BrandingContext';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: any, subView?: any) => void;
  onOpenLive?: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ 
  isOpen, 
  onClose,
  onNavigate,
  onOpenLive,
  onUnreadCountChange
}) => {
  const { branding } = useBranding();
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'birthday' | 'spiritual' | 'prayers'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (checkPushNotificationSupport()) {
      setIsSupported(true);
      setPushStatus(Notification.permission);
    }
    loadNotificationsData();
  }, [branding.organization_id]);

  useEffect(() => {
    if (isOpen) {
      loadNotificationsData();
    }
  }, [isOpen]);

  const loadNotificationsData = async () => {
    setLoading(true);
    const orgId = branding.organization_id || 'org_default';
    const items = await fetchAppNotifications(orgId);
    setNotifications(items);
    const currentRead = getReadNotificationIds();
    setReadIds(currentRead);

    const unread = items.filter(n => !currentRead.includes(n.id)).length;
    if (onUnreadCountChange) onUnreadCountChange(unread);
    setLoading(false);
  };

  const handleActivatePush = async () => {
    const permission = await requestPushPermission();
    setPushStatus(permission);
  };

  const handleNotificationClick = (n: AppNotification) => {
    markNotificationAsRead(n.id);
    const newRead = [...readIds, n.id];
    setReadIds(newRead);
    const unread = notifications.filter(item => !newRead.includes(item.id)).length;
    if (onUnreadCountChange) onUnreadCountChange(unread);

    if (n.actionTarget === 'whatsapp' && n.actionPayload?.phone) {
      const cleanPhone = n.actionPayload.phone.replace(/\D/g, '');
      const firstName = n.actionPayload.name.split(' ')[0];
      const text = encodeURIComponent(`Olá ${firstName}, que alegria! Passando para te desejar um feliz aniversário e que as bênçãos do Senhor se multipliquem sobre você hoje! 🎉🎂🙏`);
      window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${text}`, '_blank');
      return;
    }

    if (n.actionTarget === 'live' && onOpenLive) {
      onClose();
      onOpenLive();
      return;
    }

    if (n.actionTarget && onNavigate) {
      onClose();
      if (n.actionTarget === 'devotionals') onNavigate('devotionals');
      else if (n.actionTarget === 'cell_groups') onNavigate('cells');
      else if (n.actionTarget === 'prayers') onNavigate('home', 'prayers');
      else if (n.actionTarget === 'events') onNavigate('home', 'events');
    }
  };

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id);
    markAllNotificationsAsRead(allIds);
    setReadIds(allIds);
    if (onUnreadCountChange) onUnreadCountChange(0);
  };

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'birthday') return n.type === 'birthday';
    if (activeFilter === 'spiritual') return n.type === 'devotional' || n.type === 'study' || n.type === 'broadcast';
    if (activeFilter === 'prayers') return n.type === 'prayer';
    return true;
  });

  const unreadTotal = notifications.filter(n => !readIds.includes(n.id)).length;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div 
        className="drawer-container" 
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="drawer-handle" />

        {/* Top Header do Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                Central de Avisos
              </h3>
              {unreadTotal > 0 && (
                <span style={{
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {unreadTotal} nova{unreadTotal > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Aniversariantes, estudos, devocionais e avisos da igreja
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadTotal > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                  cursor: 'pointer'
                }}
              >
                Limpar
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filtros em Pílulas */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              background: activeFilter === 'all' ? 'var(--accent-primary)' : '#f1f5f9',
              color: activeFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Tudo ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('birthday')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              background: activeFilter === 'birthday' ? 'var(--accent-primary)' : '#f1f5f9',
              color: activeFilter === 'birthday' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🎂 Aniversariantes
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('spiritual')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              background: activeFilter === 'spiritual' ? 'var(--accent-primary)' : '#f1f5f9',
              color: activeFilter === 'spiritual' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📖 Estudos & Palavra
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('prayers')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              background: activeFilter === 'prayers' ? 'var(--accent-primary)' : '#f1f5f9',
              color: activeFilter === 'prayers' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🙏 Orações
          </button>
        </div>

        {/* Scroll Container de Notificações */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '2px', marginTop: '6px' }}>
          
          {/* Card de Ativação de Notificações Push (apenas se não estiver concedido) */}
          {isSupported && pushStatus !== 'granted' && (
            <div 
              style={{
                background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
                border: '1.5px solid var(--accent-primary)',
                borderRadius: '16px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  🔔
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                    Ativar Notificações no Celular
                  </div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-secondary)' }}>
                    Receba avisos imediatos de cultos e mensagens importantes.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-pwa-primary"
                onClick={handleActivatePush}
                style={{ padding: '8px', fontSize: '0.78rem' }}
              >
                Ativar Notificações Agora
              </button>
            </div>
          )}

          {/* Lista de Notificações */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Carregando novidades da comunidade...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ background: '#ffffff', padding: '32px 16px', borderRadius: '16px', border: '1px solid var(--panel-border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>✨</div>
              Você está em dia com todos os avisos e novidades da igreja!
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isRead = readIds.includes(n.id);
              return (
                <div 
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    background: isRead ? '#ffffff' : '#f0fdf4',
                    padding: '14px',
                    borderRadius: '16px',
                    border: isRead ? '1px solid var(--panel-border)' : '1.5px solid #86efac',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: n.actionTarget ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  {/* Linha 1: Ícone, Categoria e Tempo */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{n.icon}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        color: n.type === 'birthday' ? '#b45309' : (n.type === 'broadcast' ? '#dc2626' : 'var(--accent-primary)'),
                        background: n.type === 'birthday' ? '#fef3c7' : (n.type === 'broadcast' ? '#fee2e2' : 'var(--accent-primary-light)'),
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {n.category}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {!isRead && (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#16a34a',
                          display: 'inline-block'
                        }} />
                      )}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {n.timeAgo}
                      </span>
                    </div>
                  </div>

                  {/* Linha 2: Título e Descrição */}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                      {n.title}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                      {n.description}
                    </p>
                  </div>

                  {/* Linha 3: Botão de Ação Direta */}
                  {n.actionLabel && (
                    <div style={{ marginTop: '2px' }}>
                      <button
                        type="button"
                        style={{
                          background: n.type === 'birthday' ? '#16a34a' : 'var(--accent-primary)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        {n.actionLabel} <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé Fechar */}
        <div style={{ paddingTop: '10px', marginTop: '6px', borderTop: '1px solid var(--panel-border)' }}>
          <button 
            type="button" 
            className="btn-pwa-secondary" 
            onClick={onClose} 
            style={{ fontWeight: 800, width: '100%', padding: '10px' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
