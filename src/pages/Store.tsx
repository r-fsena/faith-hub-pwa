import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { fetchPdvProducts } from '../services/api';
import { BottomSheet } from '../components/BottomSheet';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image_urls: string[];
}

export const Store: React.FC = () => {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { branding } = useBranding();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [groups, setGroups] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'catalog' | 'my_orders'>('catalog');
  const [myOrders, setMyOrders] = useState<any[]>([]);

  // Modal de Detalhes / Observação
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [itemObs, setItemObs] = useState<string>('');

  useEffect(() => {
    loadProductsFromBackend();
    loadMyOrders();
  }, [branding.organization_id]);

  // Recalcula grupos sempre que os produtos ou o branding mudarem
  useEffect(() => {
    updateVisibleGroups(products);
  }, [products, branding.store_config]);

  const updateVisibleGroups = (productList: Product[]) => {
    // 1. Extrai apenas as categorias únicas que POSSUEM produtos cadastrados
    const existingCategories = Array.from(
      new Set(productList.map(p => p.category?.trim()).filter(Boolean))
    );

    if (existingCategories.length === 0) {
      setGroups([]);
      setSelectedGroup('ALL');
      return;
    }

    // 2. Se a igreja tiver configurado uma lista/ordem de grupos personalizada
    const configuredList = branding.store_config?.product_groups;
    if (Array.isArray(configuredList) && configuredList.length > 0) {
      const activeConfiguredNames = configuredList
        .filter((g: any) => typeof g === 'string' ? true : g.active !== false)
        .map((g: any) => typeof g === 'string' ? g.trim() : g.name?.trim())
        .filter((name: string) => existingCategories.includes(name)); // SÓ inclui se houver produtos

      // Inclui categorias existentes que porventura ainda não estejam na lista de ordenação
      const missing = existingCategories.filter(cat => !activeConfiguredNames.includes(cat));
      const finalList = [...activeConfiguredNames, ...missing];
      setGroups(finalList);

      if (selectedGroup !== 'ALL' && !finalList.includes(selectedGroup)) {
        setSelectedGroup('ALL');
      }
    } else {
      setGroups(existingCategories);
      if (selectedGroup !== 'ALL' && !existingCategories.includes(selectedGroup)) {
        setSelectedGroup('ALL');
      }
    }
  };

  const loadProductsFromBackend = async () => {
    try {
      const backendProducts = await fetchPdvProducts(branding.organization_id);
      if (backendProducts && Array.isArray(backendProducts)) {
        const mapped: Product[] = backendProducts.map((p: any) => ({
          id: p.id,
          name: p.name || p.title,
          category: (p.category || 'Geral').trim(),
          description: p.description || '',
          price: Number(p.price) || 0,
          image_urls: Array.isArray(p.image_urls) ? p.image_urls : (typeof p.image_urls === 'string' ? JSON.parse(p.image_urls || '[]') : [])
        }));
        setProducts(mapped);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    }
  };

  const loadMyOrders = () => {
    const userEmail = user?.email || localStorage.getItem('faithhub_user_email') || '';
    const userKey = userEmail ? `faithhub_my_pdv_orders_${userEmail.toLowerCase()}` : 'faithhub_my_pdv_orders_guest';
    const saved = localStorage.getItem(userKey);
    if (saved) {
      try {
        setMyOrders(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    setMyOrders([]);
  };

  const filteredProducts = selectedGroup === 'ALL'
    ? products
    : products.filter(p => p.category === selectedGroup);

  const handleOpenProductModal = (product: Product) => {
    setSelectedProductModal(product);
    setItemObs('');
  };

  const handleConfirmAddToCart = () => {
    if (!selectedProductModal) return;
    addItem({
      id: selectedProductModal.id,
      name: selectedProductModal.name,
      price: selectedProductModal.price,
      image_url: selectedProductModal.image_urls[0],
      category: selectedProductModal.category,
      observation: itemObs.trim() || undefined
    });
    setSelectedProductModal(null);
    setItemObs('');
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      {/* Header com Switch entre Catálogo e Meus Pedidos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>
            {viewMode === 'catalog' ? (branding.store_title || 'Loja Oficial') : 'Meus Pedidos'}
          </h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {viewMode === 'catalog' ? (branding.store_subtitle || 'Livros, vestuário, devocionais e itens com retirada expressa') : 'Acompanhe o status do preparo dos seus itens'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (viewMode === 'catalog') {
              loadMyOrders();
              setViewMode('my_orders');
            } else {
              setViewMode('catalog');
            }
          }}
          style={{
            background: 'var(--accent-primary-light)',
            color: 'var(--accent-primary)',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          {viewMode === 'catalog' ? '📋 Meus Pedidos' : '🛍️ Ver Catálogo'}
        </button>
      </div>

      {/* ========================================================
          MODO 1: CATÁLOGO DO PDV MOBILE
          ======================================================== */}
      {viewMode === 'catalog' ? (
        <>
          {/* Segmented Filter Bar com Grupos Ordenados (só exibe se houver grupos com produtos) */}
          {groups.length > 0 && (
            <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
              <button
                type="button"
                onClick={() => setSelectedGroup('ALL')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  border: '1px solid var(--panel-border)',
                  background: selectedGroup === 'ALL' ? 'var(--accent-primary)' : '#ffffff',
                  color: selectedGroup === 'ALL' ? '#ffffff' : 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Todos ({products.length})
              </button>

              {groups.map((group) => {
                const count = products.filter(p => p.category === group).length;
                if (count === 0) return null;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '999px',
                      border: '1px solid var(--panel-border)',
                      background: selectedGroup === group ? 'var(--accent-primary)' : '#ffffff',
                      color: selectedGroup === group ? '#ffffff' : 'var(--text-main)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {group} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Grid de Produtos */}
          {filteredProducts.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '36px 20px', textAlign: 'center', border: '1px solid var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>🛍️</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                Nenhum produto cadastrado na loja
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0', lineHeight: 1.4 }}>
                Os itens de livraria, vestuário e produtos cadastrados no Portal Web aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleOpenProductModal(prod)}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    border: '1px solid var(--panel-border)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Miniatura ou Ícone à esquerda */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #f1f5f9'
                  }}>
                    {prod.image_urls && prod.image_urls[0] ? (
                      <img
                        src={prod.image_urls[0]}
                        alt={prod.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.2rem' }}>🛍️</span>
                    )}
                  </div>

                  {/* Informações do Produto */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: 'var(--accent-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {prod.category}
                    </div>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.3
                    }}>
                      {prod.name}
                    </div>
                    <div style={{
                      fontSize: '0.84rem',
                      fontWeight: 900,
                      color: '#059669',
                      marginTop: '2px'
                    }}>
                      R$ {prod.price.toFixed(2).replace('.', ',')}
                    </div>
                  </div>

                  {/* Ações e Seta à direita */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({
                          id: prod.id,
                          name: prod.name,
                          price: prod.price,
                          image_url: prod.image_urls[0],
                          category: prod.category
                        });
                      }}
                      title="Adicionar Imediatamente"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'var(--accent-primary-light)',
                        color: 'var(--accent-primary)',
                        border: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>

                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.92rem',
                      fontWeight: 700
                    }}>
                      ›
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ========================================================
            MODO 2: MEUS PEDIDOS (MONITOR DE STATUS EM TEMPO REAL)
            ======================================================== */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '14px' }}>
          {myOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛍️</div>
              <p style={{ fontSize: '0.85rem' }}>Você ainda não realizou nenhum pedido hoje.</p>
            </div>
          ) : (
            myOrders.map(order => (
              <div 
                key={order.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid var(--panel-border)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>{order.date}</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>Pedido #{order.id}</div>
                  </div>

                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: order.status === 'PRONTO PARA RETIRADA' ? '#ecfdf5' : '#fffbeb',
                    color: order.status === 'PRONTO PARA RETIRADA' ? '#059669' : '#d97706'
                  }}>
                    {order.status === 'PRONTO PARA RETIRADA' ? '✓ PRONTO NO BALCÃO' : '⏳ EM PREPARO'}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {order.items && order.items.map((it: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span>{it.qty}x {it.name} {it.obs ? `(${it.obs})` : ''}</span>
                      <span style={{ fontWeight: 700 }}>R$ {(it.price * it.qty).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--panel-border)', paddingTop: '10px', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>{order.delivery}</span>
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: '1.05rem' }}>
                    Total: R$ {Number(order.total).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de Detalhes do Produto com Observação (BottomSheet Padrão Devocionais) */}
      {selectedProductModal && (
        <BottomSheet
          isOpen={Boolean(selectedProductModal)}
          onClose={() => setSelectedProductModal(null)}
          maxHeight="92dvh"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                  background: 'var(--accent-primary-light)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase'
                }}>
                  {selectedProductModal.category}
                </span>
                <h2 style={{ fontSize: '1.20rem', fontWeight: 900, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                  {selectedProductModal.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProductModal(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.90rem',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            {selectedProductModal.image_urls && selectedProductModal.image_urls[0] && (
              <img
                src={selectedProductModal.image_urls[0]}
                alt={selectedProductModal.name}
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '16px', border: '1px solid #e2e8f0' }}
              />
            )}

            <div style={{
              background: '#f8fafc',
              padding: '14px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              fontSize: '0.86rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              {selectedProductModal.description || 'Item selecionado com carinho no catálogo da comunidade.'}
            </div>

            {/* Campo de Observação por Item */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Observação para a Cozinha / Balcão (Opcional)
              </label>
              <input
                type="text"
                className="input-pwa"
                placeholder="Ex: Sem cebola, embalar para presente, bem passado..."
                value={itemObs}
                onChange={e => setItemObs(e.target.value)}
              />
            </div>

            {/* Rodapé com Preço e Botão */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--panel-border)', paddingTop: '14px', marginTop: '4px' }}>
              <div>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', display: 'block' }}>Preço Unitário</span>
                <span style={{ fontSize: '1.30rem', fontWeight: 900, color: '#059669' }}>
                  R$ {selectedProductModal.price.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <button
                type="button"
                className="btn-pwa-primary"
                style={{ width: 'auto', padding: '14px 22px', fontSize: '0.88rem', fontWeight: 800 }}
                onClick={handleConfirmAddToCart}
              >
                + Adicionar ao Pedido
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

    </div>
  );
};
