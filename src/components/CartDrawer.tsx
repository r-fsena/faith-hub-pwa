import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useBranding } from '../context/BrandingContext';

export const CartFloatingButton: React.FC = () => {
  const { totalItemsCount, totalPrice, setIsCartOpen } = useCart();

  if (totalItemsCount === 0) return null;

  return (
    <button 
      type="button" 
      className="floating-cart-btn"
      onClick={() => setIsCartOpen(true)}
    >
      <div className="cart-counter-badge">
        {totalItemsCount}
      </div>
      <span>Ver Pedido</span>
      <span style={{ opacity: 0.9 }}>• R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
    </button>
  );
};

export const CartDrawer: React.FC = () => {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, clearCart, totalPrice } = useCart();
  const { branding } = useBranding();
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'pix' | 'success'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  if (!isCartOpen) return null;

  const handleProceedToPix = () => {
    if (!customerName.trim()) {
      alert("Por favor, digite seu nome para identificação do pedido.");
      return;
    }
    setCheckoutStep('pix');
  };

  const handleCopyPix = () => {
    const samplePixCode = `00020126580014br.gov.bcb.pix0136${branding.pwa_slug || 'faithhub'}520400005303986540${totalPrice.toFixed(2)}5802BR5913${branding.church_name.substring(0, 13)}6009SAO PAULO62070503***6304`;
    navigator.clipboard.writeText(samplePixCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleFinishOrder = () => {
    setCheckoutStep('success');
    clearCart();
  };

  const handleClose = () => {
    setIsCartOpen(false);
    setTimeout(() => setCheckoutStep('cart'), 300);
  };

  return (
    <div className="drawer-overlay" onClick={handleClose}>
      <div className="drawer-container" onClick={e => e.stopPropagation()}>
        <div className="drawer-handle" />

        {/* STEP 1: ITENS DO CARRINHO */}
        {checkoutStep === 'cart' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Seu Pedido (Cantina / Loja)
              </h3>
              <button 
                type="button" 
                onClick={clearCart}
                style={{ fontSize: '0.74rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                Limpar
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛒</div>
                <p style={{ fontSize: '0.85rem' }}>Seu carrinho está vazio.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '40vh', overflowY: 'auto' }}>
                {items.map((item) => (
                  <div 
                    key={item.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 12px', 
                      background: '#f8fafc', 
                      borderRadius: '14px',
                      border: '1px solid var(--panel-border)' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🛍️</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)' }}>{item.name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>
                          R$ {item.price.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{ width: '26px', height: '26px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: '#ffffff', cursor: 'pointer', fontWeight: 800 }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, minWidth: '16px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{ width: '26px', height: '26px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: '#ffffff', cursor: 'pointer', fontWeight: 800 }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--panel-border)', paddingTop: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="input-pwa"
                    placeholder="Seu Nome Completo *"
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)} 
                  />
                  <input 
                    type="tel" 
                    className="input-pwa"
                    placeholder="WhatsApp para aviso de retirada"
                    value={customerPhone} 
                    onChange={e => setCustomerPhone(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 800 }}>
                  <span>Total:</span>
                  <span style={{ fontSize: '1.25rem', color: '#059669' }}>
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <button 
                  type="button" 
                  className="btn-pwa-primary"
                  onClick={handleProceedToPix}
                >
                  ⚡ Pagar com Pix Instantâneo
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: PIX QR CODE & COPIA E COLA */}
        {checkoutStep === 'pix' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Pagamento via Pix
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Pague <strong>R$ {totalPrice.toFixed(2).replace('.', ',')}</strong> apontando o app do seu banco:
            </p>

            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '16px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`Pix:${branding.church_name}:${totalPrice}`)}`} 
                alt="QR Code Pix"
                style={{ width: '160px', height: '160px', display: 'block' }}
              />
            </div>

            <button 
              type="button" 
              className="btn-pwa-secondary"
              onClick={handleCopyPix}
              style={{ fontWeight: 800 }}
            >
              {isCopied ? '✅ Código Pix Copiado!' : '📋 Copiar Código Pix (Copia e Cola)'}
            </button>

            <button 
              type="button" 
              className="btn-pwa-primary"
              onClick={handleFinishOrder}
            >
              Já realizei o pagamento
            </button>

            <button 
              type="button" 
              onClick={() => setCheckoutStep('cart')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              ← Voltar ao carrinho
            </button>
          </div>
        )}

        {/* STEP 3: SUCESSO / PEDIDO CONFIRMADO */}
        {checkoutStep === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px', padding: '10px 0' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              ✓
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Pedido Confirmado!
            </h3>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
              Obrigado, <strong>{customerName}</strong>! Seu pedido foi registrado e está sendo preparado pela equipe da cantina.
            </p>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', width: '100%', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              Apresente seu nome no balcão para retirar.
            </div>
            <button type="button" className="btn-pwa-primary" onClick={handleClose}>
              Concluir
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
