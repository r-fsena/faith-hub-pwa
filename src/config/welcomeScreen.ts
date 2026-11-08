// Additional slides follow the main welcome screen. Shared by Studio and PWA.
export interface WelcomeSlide {
  badge: string;
  title: string;
  description: string;
  image_url?: string;
}
export const DEFAULT_ADDITIONAL_WELCOME_SLIDES: WelcomeSlide[] = [
  { badge: 'CÉLULAS', title: 'Conecte-se em um Grupo', description: 'Amizades reais e comunhão nos lares da nossa congregação.', image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80' },
  { badge: 'PALAVRA', title: 'Devocionais Diários', description: 'Mensagens em vídeo e estudos bíblicos preparados pelos pastores.', image_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80' },
  { badge: 'EVENTOS', title: 'Eventos & Ministério Kids', description: 'Inscrições com QR Code express e check-in seguro para seus filhos.', image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80' },
];
export function resolveWelcomeSlides(main: WelcomeSlide, additional?: WelcomeSlide[]): WelcomeSlide[] {
  return [main, ...(additional ?? DEFAULT_ADDITIONAL_WELCOME_SLIDES).map((slide, i) => ({
    ...slide,
    image_url: slide.image_url || DEFAULT_ADDITIONAL_WELCOME_SLIDES[i % DEFAULT_ADDITIONAL_WELCOME_SLIDES.length].image_url || main.image_url,
  }))];
}
