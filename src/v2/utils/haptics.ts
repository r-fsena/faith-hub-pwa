/**
 * Utilitário de Haptic Feedback e micro-vibrações para sensação nativa no PWA
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' = 'light') {
  if (typeof window === 'undefined' || !('navigator' in window) || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'selection':
      case 'light':
        navigator.vibrate(8);
        break;
      case 'medium':
        navigator.vibrate(15);
        break;
      case 'heavy':
        navigator.vibrate(25);
        break;
      case 'success':
        navigator.vibrate([10, 30, 15]);
        break;
      case 'error':
        navigator.vibrate([30, 40, 30]);
        break;
    }
  } catch {
    // Ignora silenciosamente se o navegador bloquear vibração
  }
}
