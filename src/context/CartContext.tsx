import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  quantity: number;
  category?: string;
  observation?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: { id: string; name: string; price: number; image_url?: string; category?: string; observation?: string }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalItemsCount: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItemsCount: 0,
  totalPrice: 0,
  isCartOpen: false,
  setIsCartOpen: () => {}
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('faithhub_pwa_cart');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem('faithhub_pwa_cart', JSON.stringify(newItems));
  };

  const addItem = (product: { id: string; name: string; price: number; image_url?: string; category?: string; observation?: string }) => {
    const existingIndex = items.findIndex(i => i.id === product.id && i.observation === product.observation);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      saveCart(updated);
    } else {
      const newItem: CartItem = {
        id: `${product.id}_${Date.now()}`,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        category: product.category,
        observation: product.observation,
        quantity: 1
      };
      saveCart([...items, newItem]);
    }
  };

  const removeItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    saveCart(updated);
  };

  const updateQuantity = (id: string, delta: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[];

    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItemsCount,
      totalPrice,
      isCartOpen,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
