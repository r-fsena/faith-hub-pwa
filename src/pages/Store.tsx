import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { fetchPdvProducts, getActiveCampusId } from '../services/api';
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { getFeatureConfig } = useFeatureFlags();

  // Configuração via Feature Flag (Hierarquia Tenant -> Campus)
  const layoutConfig = getFeatureConfig<{ layout?: 'list' | 'grid'; allow_user_toggle?: boolean }>(
    'pdv.catalog_layout',
    { layout: 'list', allow_user_toggle: true }
  );

  const [userLayoutOverride, setUserLayoutOverride] = useState<'list' | 'grid' | null>(() => {
    return (localStorage.getItem('faithhub_pwa_catalog_layout_pref') as 'list' | 'grid') || null;
  });

  const activeLayout: 'list' | 'grid' = useMemo(() => {
    if (layoutConfig?.allow_user_toggle !== false && userLayoutOverride) {
      return userLayoutOverride;
    }
    return layoutConfig?.layout === 'grid' ? 'grid' : 'list';
  }, [layoutConfig, userLayoutOverride]);

  const handleToggleLayout = (mode: 'list' | 'grid') => {
    setUserLayoutOverride(mode);
    localStorage.setItem('faithhub_pwa_catalog_layout_pref', mode);
  };

  const orgId = branding.organization_id || 'org_default';
  const cacheKey = `faithhub_cached_pdv_products_${orgId}`;

  // Helper seguro para imagens que nunca quebra na deserialização
  const parseProductImages = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        return [raw.trim()];
      } catch {
        return [raw.trim()];
      }
    }
    return [];
  };

  // Carrega produtos do cache local para render imediato sem telas vazias
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => products.length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCampusId, setActiveCampusId] = useState<string>(() => getActiveCampusId());
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [groups, setGroups] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'catalog' | 'my_orders'>('catalog');
  const [myOrders, setMyOrders] = useState<any[]>([]);

  // Modal de Detalhes / Observação
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [itemObs, setItemObs] = useState<string>('');

  const loadProductsFromBackend = useCallback(async (campusId?: string, isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else if (products.length === 0) {
        setLoading(true);
      }
      setErrorMessage(null);

      const targetCampus = campusId !== undefined ? campusId : activeCampusId;
      const effectiveOrgId = branding.organization_id || 'org_default';
      const backendProducts = await fetchPdvProducts(effectiveOrgId, targetCampus);

      if (backendProducts && Array.isArray(backendProducts)) {
        const mapped: Product[] = backendProducts.map((p: any) => ({
          id: p.id || String(Math.random()),
          name: p.name || p.title || 'Produto sem nome',
          category: (p.category || 'Geral').trim(),
          description: p.description || '',
          price: Number(p.price) || 0,
          image_urls: parseProductImages(p.image_urls)
        }));
        setProducts(mapped);
        try {
          localStorage.setItem(`faithhub_cached_pdv_products_${effectiveOrgId}`, JSON.stringify(mapped));
        } catch {}
      } else {
        if (products.length === 0) {
          setProducts([]);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar catálogo da loja:', err);
      if (products.length === 0) {
        setErrorMessage('Não foi possível conectar ao catálogo. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeCampusId, branding.organization_id, products.length]);

  useEffect(() => {
    loadProductsFromBackend(activeCampusId);
    loadMyOrders();
  }, [branding.organization_id]);

  useEffect(() => {
    const handleCampusChanged = (e: any) => {
      const newCampus = e.detail?.campusId || getActiveCampusId();
      setActiveCampusId(newCampus);
      loadProductsFromBackend(newCampus);
    };

    window.addEventListener('pwa-campus-changed', handleCampusChanged);
    return () => {
      window.removeEventListener('pwa-campus-changed', handleCampusChanged);
    };
  }, [loadProductsFromBackend]);

  // Recalcula grupos sempre que os produtos ou o branding mudarem
  useEffect(() => {
    updateVisibleGroups(products);
  }, [products, branding.store_config]);

  const updateVisibleGroups = (productList: Product[]) => {
    const existingCategories = Array.from(
      new Set(productList.map(p => p.category?.trim()).filter(Boolean))
    );

    if (existingCategories.length === 0) {
      setGroups([]);
      setSelectedGroup('ALL');
      return;
    }

    const configuredList = branding.store_config?.product_groups;
    if (Array.isArray(configuredList) && configuredList.length > 0) {
      const activeConfiguredNames = configuredList
        .filter((g: any) => typeof g === 'string' ? true : g.active !== false)
        .map((g: any) => typeof g === 'string' ? g.trim() : g.name?.trim())
        .filter((name: string) => existingCategories.includes(name));

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

  // Cores adaptativas para Modo Claro e Escuro
  const cardBg = isDark ? 'var(--v2-card-bg, #111827)' : '#ffffff';
  const cardBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--panel-border, #e2e8f0)';
  const secondaryBg = isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc';
  const textTitleColor = isDark ? '#f8fafc' : 'var(--text-main, #0f172a)';
  const textMutedColor = isDark ? '#94a3b8' : 'var(--text-muted, #64748b)';

  return (
    <div className="pwa-content animate-fade-in" style={{ paddingBottom: '90px' }}>
      
      {/* Header com Switch entre Catálogo e Meus Pedidos + Botão de Recarregar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '14px'
      }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem', color: textTitleColor, margin: '0 0 2px 0' }}>
            {viewMode === 'catalog' ? (branding.store_title || 'Loja Oficial') : 'Meus Pedidos'}
          </h2>
          <p style={{ fontSize: '0.74rem', color: textMutedColor, margin: 0 }}>
            {viewMode === 'catalog' 
              ? (branding.store_subtitle || 'Livros, vestuário, devocionais e itens com retirada expressa') 
              : 'Acompanhe o status do preparo dos seus itens'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Botão Ergonômico de Recarregar / Atualizar Catálogo */}
          <button
            type="button"
            onClick={() => loadProductsFromBackend(activeCampusId, true)}
            disabled={loading || isRefreshing}
            title="Recarregar catálogo de produtos"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
              color: isDark ? '#f8fafc' : 'var(--text-main)',
              border: 'none',
              padding: '7px 10px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.74rem',
              cursor: (loading || isRefreshing) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'opacity 0.2s ease',
              opacity: (loading || isRefreshing) ? 0.6 : 1
            }}
          >
            <span style={{ display: 'inline-block' }} className={(loading || isRefreshing) ? 'animate-spin' : ''}>
              🔄
            </span>
            <span style={{ fontSize: '0.68rem' }}>
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </span>
          </button>

          {/* Seletor Rápido de Layout Lista/Grade se permitido pela congregação */}
          {viewMode === 'catalog' && layoutConfig?.allow_user_toggle !== false && (
            <div style={{
              display: 'flex',
              background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
              padding: '3px',
              borderRadius: '10px',
              gap: '2px',
              border: cardBorder
            }}>
              <button
                type="button"
                onClick={() => handleToggleLayout('list')}
                title="Exibir em Lista"
                style={{
                  border: 'none',
                  padding: '5px 8px',
                  borderRadius: '7px',
                  background: activeLayout === 'list' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
                  color: activeLayout === 'list' ? 'var(--accent-primary)' : textMutedColor,
                  boxShadow: activeLayout === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>☰</span>
                <span style={{ fontSize: '0.66rem' }}>Lista</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleLayout('grid')}
                title="Exibir em Grade"
                style={{
                  border: 'none',
                  padding: '5px 8px',
                  borderRadius: '7px',
                  background: activeLayout === 'grid' ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
                  color: activeLayout === 'grid' ? 'var(--accent-primary)' : textMutedColor,
                  boxShadow: activeLayout === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>⊞</span>
                <span style={{ fontSize: '0.66rem' }}>Grade</span>
              </button>
            </div>
          )}

          {/* Switch Catálogo / Meus Pedidos */}
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
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {viewMode === 'catalog' ? '📋 Pedidos' : '🛍️ Catálogo'}
          </button>
        </div>
      </div>

      {/* ========================================================
          MODO 1: CATÁLOGO DO PDV MOBILE
          ======================================================== */}
      {viewMode === 'catalog' ? (
        <>
          {/* Segmented Filter Bar com Categorias */}
          {groups.length > 0 && (
            <div className="no-scrollbar" style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              marginBottom: '10px',
              WebkitOverflowScrolling: 'touch'
            }}>
              <button
                type="button"
                onClick={() => setSelectedGroup('ALL')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  border: selectedGroup === 'ALL' ? 'none' : cardBorder,
                  background: selectedGroup === 'ALL' ? 'var(--accent-primary)' : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
                  color: selectedGroup === 'ALL' ? '#ffffff' : textTitleColor,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: selectedGroup === 'ALL' ? '0 2px 6px rgba(15,118,110,0.3)' : 'none'
                }}
              >
                Todos ({products.length})
              </button>

              {groups.map((group) => {
                const count = products.filter(p => p.category === group).length;
                if (count === 0) return null;
                const isSelected = selectedGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '999px',
                      border: isSelected ? 'none' : cardBorder,
                      background: isSelected ? 'var(--accent-primary)' : (isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
                      color: isSelected ? '#ffffff' : textTitleColor,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 2px 6px rgba(15,118,110,0.3)' : 'none'
                    }}
                  >
                    {group} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Mensagem de Erro com Botão de Tentar Novamente */}
          {errorMessage && (
            <div style={{
              background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '18px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{ fontSize: '1.8rem' }}>⚠️</div>
              <p style={{ fontSize: '0.84rem', color: isDark ? '#fca5a5' : '#991b1b', margin: 0, fontWeight: 600 }}>
                {errorMessage}
              </p>
              <button
                type="button"
                className="btn-pwa-primary"
                onClick={() => loadProductsFromBackend(activeCampusId, true)}
                style={{ width: 'auto', padding: '8px 18px', fontSize: '0.80rem' }}
              >
                🔄 Tentar Novamente
              </button>
            </div>
          )}

          {/* Carregando ou Catálogo Vazio */}
          {loading && products.length === 0 ? (
            <div style={{
              background: cardBg,
              borderRadius: '20px',
              padding: '40px 20px',
              textAlign: 'center',
              border: cardBorder,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }} className="animate-spin">🔄</div>
              <p style={{ fontSize: '0.84rem', fontWeight: 700, color: textMutedColor, margin: 0 }}>
                Carregando catálogo da loja...
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{
              background: cardBg,
              borderRadius: '20px',
              padding: '36px 20px',
              textAlign: 'center',
              border: cardBorder,
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '4px' }}>🛍️</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: textTitleColor, margin: 0 }}>
                Nenhum produto encontrado
              </h3>
              <p style={{ fontSize: '0.78rem', color: textMutedColor, margin: 0, lineHeight: 1.45, maxWidth: '320px' }}>
                {selectedGroup !== 'ALL' 
                  ? `Não há produtos cadastrados na categoria "${selectedGroup}".`
                  : 'Os itens de livraria, vestuário e produtos cadastrados no Portal Web aparecerão aqui automaticamente.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedGroup('ALL');
                  loadProductsFromBackend(activeCampusId, true);
                }}
                style={{
                  marginTop: '10px',
                  background: 'var(--accent-primary-light)',
                  color: 'var(--accent-primary)',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔄</span> Atualizar Catálogo
              </button>
            </div>
          ) : activeLayout === 'grid' ? (
            /* ========================================================
               MODO GRADE (GRID 2 COLUNAS RESPONSIVO)
               ======================================================== */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '12px'
            }}>
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleOpenProductModal(prod)}
                  style={{
                    background: cardBg,
                    borderRadius: '18px',
                    padding: '10px',
                    border: cardBorder,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    {/* Imagem em destaque */}
                    <div style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      background: secondaryBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '8px',
                      border: cardBorder,
                      position: 'relative'
                    }}>
                      {prod.image_urls && prod.image_urls[0] ? (
                        <img
                          src={prod.image_urls[0]}
                          alt={prod.name}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '2rem' }}>🛍️</span>
                      )}
                      <span style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        background: isDark ? 'rgba(17, 24, 39, 0.90)' : 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(4px)',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        fontSize: '0.60rem',
                        fontWeight: 800,
                        color: 'var(--accent-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}>
                        {prod.category}
                      </span>
                    </div>

                    {/* Nome do Produto */}
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: textTitleColor,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.2em'
                    }}>
                      {prod.name}
                    </div>
                  </div>

                  {/* Preço e Botão Rápido */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    paddingTop: '6px',
                    borderTop: cardBorder
                  }}>
                    <div>
                      <span style={{ fontSize: '0.62rem', color: textMutedColor, display: 'block' }}>Preço</span>
                      <span style={{ fontSize: '0.90rem', fontWeight: 900, color: '#10b981' }}>
                        R$ {prod.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

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
                      title="Adicionar ao Pedido"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'var(--accent-primary-light)',
                        color: 'var(--accent-primary)',
                        border: 'none',
                        fontSize: '1.15rem',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ========================================================
               MODO LISTA (CARDS HORIZONTAIS COMPACTOS)
               ======================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleOpenProductModal(prod)}
                  style={{
                    background: cardBg,
                    borderRadius: '16px',
                    padding: '10px 14px',
                    border: cardBorder,
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
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: secondaryBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: cardBorder
                  }}>
                    {prod.image_urls && prod.image_urls[0] ? (
                      <img
                        src={prod.image_urls[0]}
                        alt={prod.name}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.3rem' }}>🛍️</span>
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
                      color: textTitleColor,
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
                      color: '#10b981',
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
                      background: secondaryBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: textMutedColor,
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
            <div style={{ textAlign: 'center', padding: '40px 0', color: textMutedColor }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛍️</div>
              <p style={{ fontSize: '0.85rem' }}>Você ainda não realizou nenhum pedido hoje.</p>
              <button
                type="button"
                className="btn-pwa-primary"
                onClick={() => setViewMode('catalog')}
                style={{ width: 'auto', margin: '10px auto 0', padding: '8px 18px', fontSize: '0.80rem' }}
              >
                Explorar Catálogo
              </button>
            </div>
          ) : (
            myOrders.map(order => (
              <div 
                key={order.id}
                style={{
                  background: cardBg,
                  borderRadius: '18px',
                  padding: '16px',
                  border: cardBorder,
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.70rem', color: textMutedColor }}>{order.date}</span>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: textTitleColor }}>Pedido #{order.id}</div>
                  </div>

                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: order.status === 'PRONTO PARA RETIRADA' 
                      ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5')
                      : (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb'),
                    color: order.status === 'PRONTO PARA RETIRADA' ? '#10b981' : '#f59e0b'
                  }}>
                    {order.status === 'PRONTO PARA RETIRADA' ? '✓ PRONTO NO BALCÃO' : '⏳ EM PREPARO'}
                  </span>
                </div>

                <div style={{
                  background: secondaryBg,
                  padding: '10px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {order.items && order.items.map((it: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: textTitleColor }}>
                      <span>{it.qty}x {it.name} {it.obs ? `(${it.obs})` : ''}</span>
                      <span style={{ fontWeight: 700 }}>R$ {(it.price * it.qty).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: cardBorder,
                  paddingTop: '10px',
                  fontSize: '0.84rem'
                }}>
                  <span style={{ color: textMutedColor, fontSize: '0.76rem' }}>{order.delivery}</span>
                  <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.05rem' }}>
                    Total: R$ {Number(order.total).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de Detalhes do Produto com Observação */}
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
                <h2 style={{ fontSize: '1.20rem', fontWeight: 900, color: textTitleColor, margin: '4px 0 0 0' }}>
                  {selectedProductModal.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProductModal(null)}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: textMutedColor,
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
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '16px', border: cardBorder }}
              />
            )}

            <div style={{
              background: secondaryBg,
              padding: '14px',
              borderRadius: '14px',
              border: cardBorder,
              fontSize: '0.86rem',
              color: isDark ? '#cbd5e1' : 'var(--text-secondary, #475569)',
              lineHeight: 1.5
            }}>
              {selectedProductModal.description || 'Item selecionado com carinho no catálogo da comunidade.'}
            </div>

            {/* Campo de Observação por Item */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: textMutedColor, marginBottom: '4px', display: 'block' }}>
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: cardBorder,
              paddingTop: '14px',
              marginTop: '4px'
            }}>
              <div>
                <span style={{ fontSize: '0.70rem', color: textMutedColor, display: 'block' }}>Preço Unitário</span>
                <span style={{ fontSize: '1.30rem', fontWeight: 900, color: '#10b981' }}>
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
