export interface PushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

export function checkPushNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!checkPushNotificationSupport()) return 'denied';
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    localStorage.setItem('faithhub_push_enabled', 'true');
    // Envia notificação local de boas-vindas
    showLocalNotification(
      '🔔 Notificações Ativadas!',
      'Você receberá avisos quando os cultos ao vivo iniciarem e novos devocionais forem publicados.'
    );
  }
  return permission;
}

export async function showLocalNotification(title: string, body: string, icon = '/icons.svg') {
  if (!checkPushNotificationSupport()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      vibrate: [200, 100, 200]
    } as NotificationOptions);
  } catch (err) {
    console.error('Erro ao disparar notificação local', err);
  }
}
