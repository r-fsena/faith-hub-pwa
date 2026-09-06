import { fetchActiveBroadcast } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

export interface AppNotification {
  id: string;
  type: 'birthday' | 'devotional' | 'study' | 'prayer' | 'broadcast' | 'event';
  title: string;
  description: string;
  timeAgo: string;
  category: string;
  actionLabel?: string;
  actionTarget?: 'devotionals' | 'prayers' | 'cell_groups' | 'events' | 'live' | 'whatsapp';
  actionPayload?: any;
  priority?: 'high' | 'normal';
  icon: string;
  createdAt: string;
}

const READ_NOTIFICATIONS_KEY = 'faithhub_read_notifications_v1';

export function getReadNotificationIds(): string[] {
  try {
    const saved = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function markNotificationAsRead(id: string) {
  try {
    const current = getReadNotificationIds();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.error('Erro ao marcar notificação como lida:', e);
  }
}

export function markAllNotificationsAsRead(ids: string[]) {
  try {
    const current = getReadNotificationIds();
    const updated = Array.from(new Set([...current, ...ids]));
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Erro ao marcar todas notificações:', e);
  }
}

export async function fetchAppNotifications(orgId: string = 'org_default'): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];
  const today = new Date();
  const todayDateStr = today.toISOString().split('T')[0];

  try {
    // 1. Verificar Transmissão / Culto ao Vivo Ativo
    try {
      const activeBroadcast = await fetchActiveBroadcast();
      if (activeBroadcast && (activeBroadcast.is_available || activeBroadcast.status === 'LIVE')) {
        notifications.push({
          id: `broadcast_${activeBroadcast.id || todayDateStr}`,
          type: 'broadcast',
          icon: '🔴',
          category: 'Culto Ao Vivo',
          title: activeBroadcast.title || 'Culto de Celebração Ao Vivo',
          description: activeBroadcast.description || 'A igreja está transmitindo ao vivo agora. Participe e seja abençoado!',
          timeAgo: 'Agora',
          priority: 'high',
          actionLabel: 'Assistir Agora',
          actionTarget: 'live',
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Erro ao buscar live para notificações:', e);
    }

    // 2. Aniversariantes do Dia e do Mês
    try {
      const bRes = await fetch(`${API_URL}/members?organization_id=${orgId}&birthdays=month`);
      if (bRes.ok) {
        const bJson = await bRes.json();
        const membersList = bJson.data || [];

        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1;

        // Aniversariantes de Hoje
        const todayBirthdays = membersList.filter((m: any) => {
          if (!m.birth_date) return false;
          const [_, mMonth, mDay] = m.birth_date.split('-').map(Number);
          return mMonth === currentMonth && mDay === currentDay;
        });

        for (const m of todayBirthdays) {
          notifications.push({
            id: `bday_today_${m.id}_${todayDateStr}`,
            type: 'birthday',
            icon: '🎂',
            category: 'Aniversário Hoje!',
            title: `Hoje é aniversário de ${m.name.split(' ')[0]}!`,
            description: `Celebre a vida de ${m.name}! Envie uma mensagem de bênção e carinho no dia de hoje.`,
            timeAgo: 'Hoje',
            priority: 'high',
            actionLabel: m.phone ? 'Parabenizar no WhatsApp' : undefined,
            actionTarget: m.phone ? 'whatsapp' : undefined,
            actionPayload: m.phone ? { phone: m.phone, name: m.name } : undefined,
            createdAt: todayDateStr
          });
        }

        // Próximos Aniversariantes da semana (até 7 dias à frente)
        const upcomingBirthdays = membersList.filter((m: any) => {
          if (!m.birth_date) return false;
          const [_, mMonth, mDay] = m.birth_date.split('-').map(Number);
          if (mMonth !== currentMonth) return false;
          const diff = mDay - currentDay;
          return diff > 0 && diff <= 7;
        });

        if (upcomingBirthdays.length > 0) {
          const names = upcomingBirthdays.slice(0, 3).map((m: any) => m.name.split(' ')[0]).join(', ');
          const extra = upcomingBirthdays.length > 3 ? ` e mais ${upcomingBirthdays.length - 3}` : '';
          notifications.push({
            id: `bday_upcoming_${todayDateStr}`,
            type: 'birthday',
            icon: '🎉',
            category: 'Aniversariantes da Semana',
            title: `${upcomingBirthdays.length} aniversariante(s) nos próximos dias`,
            description: `Fique atento para parabenizar: ${names}${extra}.`,
            timeAgo: 'Esta semana',
            priority: 'normal',
            createdAt: todayDateStr
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar aniversariantes:', e);
    }

    // 3. Devocional do Dia
    try {
      const dRes = await fetch(`${API_URL}/devotionals?organization_id=${orgId}`);
      if (dRes.ok) {
        const dJson = await dRes.json();
        const devList = dJson.data || [];
        const todayDev = devList.find((d: any) => (d.available_date || d.date || '').startsWith(todayDateStr));

        if (todayDev) {
          notifications.push({
            id: `devo_${todayDev.id || todayDateStr}`,
            type: 'devotional',
            icon: '☀️',
            category: 'Palavra do Dia',
            title: todayDev.title || 'Devocional Diário Disponível',
            description: todayDev.passage ? `Medite hoje em ${todayDev.passage} e alimente seu espírito.` : 'A reflexão bíblica de hoje já está disponível para você.',
            timeAgo: 'Hoje',
            priority: 'normal',
            actionLabel: 'Ler Palavra de Hoje',
            actionTarget: 'devotionals',
            createdAt: todayDateStr
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar devocionais para notificações:', e);
    }

    // 4. Novos Pedidos de Oração no Mural
    try {
      const pRes = await fetch(`${API_URL}/prayers?organization_id=${orgId}&status=APPROVED`);
      if (pRes.ok) {
        const pJson = await pRes.json();
        const prayers = pJson.data || [];
        if (prayers.length > 0) {
          const latestPrayer = prayers[0];
          notifications.push({
            id: `prayer_${latestPrayer.id}`,
            type: 'prayer',
            icon: '🙏',
            category: 'Mural de Oração',
            title: 'Novo pedido de oração da comunidade',
            description: `"${(latestPrayer.content || '').substring(0, 80)}..." - Interceda por esta causa!`,
            timeAgo: 'Recente',
            priority: 'normal',
            actionLabel: 'Interceder no Mural',
            actionTarget: 'prayers',
            createdAt: latestPrayer.created_at || todayDateStr
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar orações para notificações:', e);
    }

    // 5. Novos Estudos / Séries Bíblicas
    try {
      const sRes = await fetch(`${API_URL}/studies?organization_id=${orgId}`);
      if (sRes.ok) {
        const sJson = await sRes.json();
        const studies = sJson.data || sJson || [];
        if (Array.isArray(studies) && studies.length > 0) {
          const latestStudy = studies[0];
          notifications.push({
            id: `study_${latestStudy.id}`,
            type: 'study',
            icon: '📖',
            category: 'Estudo Bíblico',
            title: latestStudy.title || 'Novo Roteiro de Estudo',
            description: latestStudy.description || 'Novo estudo e roteiro para células disponível para crescimento espiritual.',
            timeAgo: 'Recente',
            priority: 'normal',
            actionLabel: 'Ver Lições',
            actionTarget: 'cell_groups',
            createdAt: latestStudy.created_at || todayDateStr
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar estudos para notificações:', e);
    }

  } catch (error) {
    console.error('Erro no motor de notificações:', error);
  }

  return notifications;
}
