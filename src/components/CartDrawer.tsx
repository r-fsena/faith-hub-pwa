import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useBranding } from '../context/BrandingContext';
import { createPdvOrder } from '../services/api';
import { CreditCardForm } from './CreditCardForm';
import { BottomSheet } from './BottomSheet';
import { useAuth } from '../context/AuthContext';
import { generatePixBrCode, getPixQrCodeImageUrl } from '../services/pixGenerator';

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
  const { items, isCartOpen, setIsCartOpen, updateQuantity, clearCart, totalPrice } = useCart();
  const { branding } = useBranding();
  const { user } = useAuth();

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'delivery' | 'payment_method' | 'pix' | 'card' | 'success'>('cart');
  const [deliveryMethod, setDeliveryMethod] = useState<'church' | 'home'>('church');
  const [pickupOption, setPickupOption] = useState<string>('Retirar no Balcão / Ponto de Coleta');

  // Entrega em Casa
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [numberComp, setNumberComp] = useState('');
  const [careOf, setCareOf] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  // Identificação
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isCartOpen) return null;

  const handleProceedToDelivery = () => {
    if (items.length === 0) return;
    setCheckoutStep('delivery');
  };

  const handleProceedToPaymentMethod = () => {
    if (!customerName.trim()) {
      alert("Por favor, informe seu nome para identificação do pedido.");
      return;
    }

    if (deliveryMethod === 'home' && (!address.trim() || !numberComp.trim())) {
      alert("Por favor, preencha o endereço completo para entrega.");
      return;
    }

    setCheckoutStep('payment_method');
  };

  const createOrderRecord = async (paymentMethod: 'PIX' | 'CREDIT_CARD', extraInfo?: string) => {
    setIsSaving(true);
    const deliveryDetailsString = deliveryMethod === 'home'
      ? `Entrega: ${address}, ${numberComp} (CEP: ${cep}) - A/C: ${careOf} | Horário: ${preferredTime || 'Livre'}`
      : `Retirada: ${pickupOption}`;

    const itemsPayload = items.map(item => ({
      name: item.name,
      qty: item.quantity,
      price: item.price,
      obs: item.observation
    }));

    try {
      const orderRes = await createPdvOrder({
        user_name: `${customerName.trim()} (${customerPhone.trim() || 'Sem tel'})`,
        delivery_method: deliveryMethod,
        delivery_details: `${deliveryDetailsString} [Pgto: ${paymentMethod}${extraInfo ? ` - ${extraInfo}` : ''}]`,
        items_json: itemsPayload,
        total_price: totalPrice
      });

      const orderId = orderRes?.id || `ORD-${Date.now().toString().slice(-6)}`;
      setCreatedOrderId(orderId);

      // Salva no histórico de pedidos do usuário atual
      const userKey = user?.email ? `faithhub_my_pdv_orders_${user.email.toLowerCase()}` : 'faithhub_my_pdv_orders_guest';
      const savedOrders = localStorage.getItem(userKey);
      const orderList = savedOrders ? JSON.parse(savedOrders) : [];
      const newOrderRecord = {
        id: orderId,
        date: new Date().toLocaleDateString('pt-BR'),
        status: 'RECEBIDO E PREPARANDO',
        total: totalPrice,
        items: itemsPayload,
        delivery: deliveryDetailsString,
        payment: paymentMethod,
        customer_name: user?.name || user?.email || 'Visitante',
        customer_email: user?.email || ''
      };
      localStorage.setItem(userKey, JSON.stringify([newOrderRecord, ...orderList]));

      return orderId;
    } catch (e) {
      console.error(e);
      return `ORD-${Date.now().toString().slice(-6)}`;
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartPix = async () => {
    await createOrderRecord('PIX');
    setCheckoutStep('pix');
  };

  const handleCreditCardSubmit = async (cardData: any) => {
    setIsSaving(true);
    try {
      await createOrderRecord('CREDIT_CARD', `${cardData.installments}x cartão final ${cardData.number.slice(-4)}`);
      alert("✅ Pagamento com Cartão Aprovado via Pagar.me!");
      setCheckoutStep('success');
      clearCart();
    } catch (err) {
      alert("Erro ao processar cartão.");
    } finally {
      setIsSaving(false);
    }
  };

  const getCartPixBrCode = () => {
    const rawKey = branding.pix_key || branding.cnpj || branding.email || '';
    if (!rawKey) return '';
    try {
      return generatePixBrCode({
        pixKey: rawKey,
        merchantName: branding.church_name || 'Igreja',
        merchantCity: branding.city || 'Brasil',
        amount: totalPrice,
        txId: createdOrderId ? `PED${createdOrderId.substring(0, 10)}` : 'LOJA',
        description: `Pedido ${createdOrderId || ''} ${branding.church_name}`.substring(0, 25)
      });
    } catch {
      return rawKey;
    }
  };

  const handleCopyPix = () => {
    const pixCode = getCartPixBrCode();
    if (!pixCode) {
      alert("Chave Pix da igreja não cadastrada.");
      return;
    }
    navigator.clipboard.writeText(pixCode);
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
    <BottomSheet isOpen={isCartOpen} onClose={handleClose}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '42vh', overflowY: 'auto' }}>
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
                        {item.observation && (
                          <div style={{ fontSize: '0.70rem', color: '#d97706', fontWeight: 700 }}>
                            Obs: {item.observation}
                          </div>
                        )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 800 }}>
                  <span>Total:</span>
                  <span style={{ fontSize: '1.25rem', color: '#059669' }}>
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-pwa-primary"
                  onClick={handleProceedToDelivery}
                >
                  Continuar para Entrega / Retirada →
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: FORMA DE ENTREGA & DADOS */}
        {checkoutStep === 'delivery' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCheckoutStep('cart')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ← Voltar
              </button>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Como deseja receber?
              </h3>
            </div>

            {/* Opções Retirar na Igreja vs Receber em Casa */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeliveryMethod('church')}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  border: deliveryMethod === 'church' ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                  background: deliveryMethod === 'church' ? 'var(--accent-primary-light)' : '#ffffff',
                  color: deliveryMethod === 'church' ? 'var(--accent-primary)' : 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>🏛️</span>
                Retirar na Igreja
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('home')}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  border: deliveryMethod === 'home' ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                  background: deliveryMethod === 'home' ? 'var(--accent-primary-light)' : '#ffffff',
                  color: deliveryMethod === 'home' ? 'var(--accent-primary)' : 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>🛵</span>
                Receber em Casa
              </button>
            </div>

            {/* Sub-opções de Retirada na Igreja */}
            {deliveryMethod === 'church' && (
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)' }}>Ponto de Retirada</span>
                {[
                  'Retirar no Balcão / Ponto de Coleta',
                  'Retirar ao Final do Culto'
                ].map(opt => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="pickup"
                      checked={pickupOption === opt}
                      onChange={() => setPickupOption(opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Sub-opções de Entrega em Casa */}
            {deliveryMethod === 'home' && (
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)' }}>Endereço de Entrega</span>
                <input type="text" className="input-pwa" placeholder="CEP (00000-000)" value={cep} onChange={e => setCep(e.target.value)} />
                <input type="text" className="input-pwa" placeholder="Rua / Avenida *" value={address} onChange={e => setAddress(e.target.value)} required />
                <input type="text" className="input-pwa" placeholder="Número e Complemento (Apto, Bloco) *" value={numberComp} onChange={e => setNumberComp(e.target.value)} required />
                <input type="text" className="input-pwa" placeholder="A/C (Aos cuidados de)" value={careOf} onChange={e => setCareOf(e.target.value)} />
                <input type="text" className="input-pwa" placeholder="Horário de preferência (ex: Manhã, Noite)" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} />
              </div>
            )}

            {/* Identificação do Cliente */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)' }}>Seus Dados para Contato</span>
              <input type="text" className="input-pwa" placeholder="Seu Nome Completo *" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
              <input type="tel" className="input-pwa" placeholder="WhatsApp para aviso de pedido pronto *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required />
            </div>

            <button
              type="button"
              className="btn-pwa-primary"
              onClick={handleProceedToPaymentMethod}
            >
              Escolher Forma de Pagamento →
            </button>
          </div>
        )}

        {/* STEP 3: SELEÇÃO DA FORMA DE PAGAMENTO (PIX OU CARTÃO PAGAR.ME) */}
        {checkoutStep === 'payment_method' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCheckoutStep('delivery')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ← Voltar
              </button>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Forma de Pagamento
              </h3>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Total a Pagar:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669' }}>
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Opção Pix */}
              <div
                onClick={handleStartPix}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1.5px solid var(--panel-border)',
                  background: '#ffffff',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    ⚡
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main)' }}>Pix Instantâneo</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Aprovação imediata com QR Code</div>
                  </div>
                </div>
                <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>›</span>
              </div>

              {/* Opção Cartão de Crédito Pagar.me */}
              <div
                onClick={() => setCheckoutStep('card')}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1.5px solid var(--panel-border)',
                  background: '#ffffff',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    💳
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--text-main)' }}>Cartão de Crédito (Pagar.me)</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Parcele em até 12x no cartão</div>
                  </div>
                </div>
                <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>›</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: CARTÃO DE CRÉDITO PAGAR.ME FORM */}
        {checkoutStep === 'card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCheckoutStep('payment_method')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.80rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ← Voltar
              </button>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Dados do Cartão
              </h3>
            </div>

            <CreditCardForm
              totalAmount={totalPrice}
              onSubmit={handleCreditCardSubmit}
              isLoading={isSaving}
            />
          </div>
        )}

        {/* STEP 5: PIX QR CODE & COPIA E COLA */}
        {checkoutStep === 'pix' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Pagamento via Pix
            </h3>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-primary)', background: 'var(--accent-primary-light)', padding: '4px 10px', borderRadius: '8px' }}>
              Pedido #{createdOrderId}
            </span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Pague <strong>R$ {totalPrice.toFixed(2).replace('.', ',')}</strong> apontando o app do seu banco:
            </p>

            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '16px', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
              <img
                src={getPixQrCodeImageUrl(getCartPixBrCode(), 200)}
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
          </div>
        )}

        {/* STEP 6: SUCESSO / PEDIDO CONFIRMADO */}
        {checkoutStep === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px', padding: '10px 0' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              ✓
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Pedido #{createdOrderId} Confirmado!
            </h3>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
              Obrigado, <strong>{customerName}</strong>! Seu pedido foi registrado no sistema da igreja e está sendo preparado.
            </p>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', width: '100%', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {deliveryMethod === 'church' ? 'Apresente seu nome ou código no balcão da cantina.' : 'Seu pedido será entregue no endereço informado.'}
            </div>
            <button type="button" className="btn-pwa-primary" onClick={handleClose}>
              Concluir & Ver Pedidos
            </button>
          </div>
        )}
    </BottomSheet>
  );
};
