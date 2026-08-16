import React, { useState, useRef, useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  showCloseButton?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  maxHeight = '90dvh',
  showCloseButton = true
}) => {
  const [dragY, setDragY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const deltaY = currentYRef.current - startYRef.current;

    // Só permite arrastar para BAIXO
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const deltaY = currentYRef.current - startYRef.current;

    // Se arrastou mais de 90px para baixo, fecha o modal
    if (deltaY > 90) {
      setDragY(window.innerHeight);
      setTimeout(() => {
        onClose();
        setDragY(0);
      }, 180);
    } else {
      // Retorna suavemente para a posição inicial
      setDragY(0);
    }
  };

  const overlayOpacity = Math.max(0, 0.65 - (dragY / 400));

  return (
    <div 
      className="drawer-overlay animate-fade-in" 
      onClick={onClose}
      style={{
        backgroundColor: `rgba(15, 23, 42, ${overlayOpacity})`
      }}
    >
      <div 
        ref={drawerRef}
        className="drawer-container"
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight,
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
      >
        {/* Barra superior de arrasto (Touch Target ampliado para puxar) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            padding: '10px 0 6px 0',
            margin: '-14px -14px 4px -14px',
            cursor: 'grab',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none'
          }}
        >
          <div className="drawer-handle" style={{ width: '48px', height: '6px', background: '#cbd5e1' }} />
          <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px', letterSpacing: '0.02em' }}>
            Deslize para baixo para fechar
          </span>
        </div>

        {/* Botão de Fechar ✕ opcional no topo direito */}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '14px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              zIndex: 10
            }}
            title="Fechar"
          >
            ✕
          </button>
        )}

        {/* Conteúdo do Drawer */}
        {children}
      </div>
    </div>
  );
};
