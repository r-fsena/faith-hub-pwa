import React from 'react';

export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// 1. Localização / Pin de Campus (substitui 📍)
export const MapPinIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

// 2. Templo / Igreja / Congregação (substitui 🏛️)
export const ChurchIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2" />
    <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" />
    <path d="M18 22V5l-6-3-6 3v17" />
    <path d="M12 7v5" />
    <path d="M10 9h4" />
  </svg>
);

// 3. Cruz Cristã (substitui ✝️)
export const CrossIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M12 2v20" />
    <path d="M7 8h10" />
  </svg>
);

// 4. Brilho / Destaque (substitui ✨)
export const SparklesIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

// 5. Chevron Baixo (substitui ▾)
export const ChevronDownIcon: React.FC<IconProps> = ({ size = 14, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// 6. Chevron Direita (substitui ›)
export const ChevronRightIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

// 7. Chevron Esquerda / Voltar (substitui ‹)
export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

// 8. Relógio / Tempo (substitui ⏳ / ⏱️)
export const ClockIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// 9. Checkmark de Confirmação (substitui ✅)
export const CheckIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// 10. Fechar / Cancelar (substitui ✕)
export const CloseIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// 11. Escudo de Verificação / Membro Ativo (substitui selos de emoji)
export const ShieldCheckIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// Re-exporta os ícones de serviços para manter consistência absoluta
export { 
  LiveIcon, 
  BookOpenIcon, 
  UsersGroupIcon, 
  ShoppingBagIcon, 
  GivingHeartIcon, 
  CalendarEventIcon, 
  BibleScriptureIcon, 
  PrayerChatIcon 
} from '../../components/ServiceIcons';
