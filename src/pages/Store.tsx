import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image_urls: string[];
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'Coxinha Artesanal com Catupiry',
    category: 'Salgados & Lanches',
    description: 'Massa leve e crocante, recheada com peito de frango desfiado e autêntico Catupiry.',
    price: 9.50,
    image_urls: ['https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80']
  },
  {
    id: 'prod_2',
    name: 'Pastel de Forno Integral',
    category: 'Salgados & Lanches',
    description: 'Opção assada com recheio de palmito cremoso e ricota.',
    price: 8.50,
    image_urls: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80']
  },
  {
    id: 'prod_3',
    name: 'Bolo Caseiro de Cenoura com Chocolate',
    category: 'Doces e Sobremesas',
    description: 'Fatia generosa com cobertura aveludada de chocolate 50% cacau.',
    price: 7.00,
    image_urls: ['https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80']
  },
  {
    id: 'prod_4',
    name: 'Café Expresso Especial Grão Moído',
    category: 'Bebidas & Cafeteria',
    description: 'Café arábica premium extraído na hora na cafeteira italiana.',
    price: 5.00,
    image_urls: ['https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80']
  },
  {
    id: 'prod_5',
    name: 'Suco Natural de Laranja 400ml',
    category: 'Bebidas & Cafeteria',
    description: '100% natural, sem adição de açúcares, feito na hora.',
    price: 8.00,
    image_urls: ['https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80']
  },
  {
    id: 'prod_6',
    name: 'Bíblia de Estudo NVI Luxo',
    category: 'Livraria & Bíblias',
    description: 'Capa em couro sintético com bordas douradas, comentários exegéticos e mapas históricos.',
    price: 89.90,
    image_urls: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80']
  },
  {
    id: 'prod_7',
    name: 'Camisa Oficial Faith Movement',
    category: 'Vestuário & Camisas',
    description: 'Algodão egípcio 100% penteado com estampa minimalista.',
    price: 59.90,
    image_urls: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80']
  }
];

export const Store: React.FC = () => {
  const { addItem } = useCart();
  const [products] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);

  useEffect(() => {
    // Carrega a lista e ordem dos grupos configurada no Web Studio
    const savedGroups = localStorage.getItem('faithhub_pdv_groups');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        if (Array.isArray(parsed)) {
          // Filtra apenas ativos
          const activeOnly = parsed
            .filter((g: any) => typeof g === 'string' ? true : g.active !== false)
            .map((g: any) => typeof g === 'string' ? g : g.name);
          setGroups(activeOnly);
          return;
        }
      } catch (e) {}
    }
    // Grupos padrão ordenados
    setGroups([
      'Salgados & Lanches',
      'Doces e Sobremesas',
      'Bebidas & Cafeteria',
      'Livraria & Bíblias',
      'Vestuário & Camisas'
    ]);
  }, []);

  const filteredProducts = selectedGroup === 'ALL'
    ? products
    : products.filter(p => p.category === selectedGroup);

  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_urls[0],
      category: product.category
    });
  };

  return (
    <div className="pwa-content animate-fade-in">
      
      <div className="section-header-row">
        <div>
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Cantina & Livraria</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peça e retire no balcão da igreja sem filas</p>
        </div>
      </div>

      {/* Segmented Filter Bar com Grupos Ordenados */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
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

      {/* Grid de Produtos */}
      <div className="product-grid">
        {filteredProducts.map((prod) => (
          <div 
            key={prod.id} 
            className="product-card" 
            onClick={() => setSelectedProductModal(prod)}
            style={{ cursor: 'pointer' }}
          >
            {prod.image_urls && prod.image_urls[0] ? (
              <img src={prod.image_urls[0]} alt={prod.name} className="product-image" />
            ) : (
              <div className="product-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Sem Foto
              </div>
            )}

            <div className="product-info">
              <span style={{ fontSize: '0.64rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                {prod.category}
              </span>
              <h4 className="product-title">{prod.name}</h4>
              
              <div className="product-price">
                <span>R$ {prod.price.toFixed(2).replace('.', ',')}</span>
                <button 
                  type="button" 
                  className="add-cart-mini-btn" 
                  onClick={(e) => handleAddToCart(prod, e)}
                  title="Adicionar ao Pedido"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Detalhes do Produto */}
      {selectedProductModal && (
        <div className="drawer-overlay" onClick={() => setSelectedProductModal(null)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />

            {selectedProductModal.image_urls && selectedProductModal.image_urls[0] && (
              <img 
                src={selectedProductModal.image_urls[0]} 
                alt={selectedProductModal.name} 
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '16px' }}
              />
            )}

            <div>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                {selectedProductModal.category}
              </span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>
                {selectedProductModal.name}
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                {selectedProductModal.description}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--panel-border)', paddingTop: '14px' }}>
              <div>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', display: 'block' }}>Preço Unitário</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#059669' }}>
                  R$ {selectedProductModal.price.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <button 
                type="button" 
                className="btn-pwa-primary" 
                style={{ width: 'auto', padding: '12px 24px' }}
                onClick={() => {
                  handleAddToCart(selectedProductModal);
                  setSelectedProductModal(null);
                }}
              >
                + Adicionar ao Pedido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
