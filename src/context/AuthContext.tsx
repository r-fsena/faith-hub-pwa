import React, { createContext, useContext, useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signOut as amplifySignOut, fetchUserAttributes } from 'aws-amplify/auth';
import { getAuthHeaders, getActiveOrganizationId } from '../services/api';
import { Hub } from 'aws-amplify/utils';
import awsmobile from '../aws-exports';

// Configura o Amplify uma única vez
Amplify.configure(awsmobile);

interface MemberUser {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  attributes?: Record<string, string | undefined>;
}

interface AuthContextType {
  user: MemberUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
  checkAuth: async () => {}
});

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MemberUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    const unsubscribe = Hub.listen('auth', ({ payload }: { payload: any }) => {
      switch (payload.event) {
        case 'signedIn':
          checkAuth();
          break;
        case 'signedOut':
          setUser(null);
          setIsAuthenticated(false);
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    // Suporte a modo demo para pré-visualização e exportação de criativos
    const isDemo = typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('demo') === 'true' ||
      localStorage.getItem('faithhub_demo_auth') === 'true'
    );
    if (isDemo) {
      setUser({
        userId: 'usr_demo_pastor',
        email: 'pastor@igrejaviva.com.br',
        name: 'Pastor Rafael Sena'
      });
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        let name = '';
        let attrs: any = {};
        try {
          attrs = await fetchUserAttributes();
          name = attrs.name || attrs.given_name || '';
        } catch (e) {}

        const email = currentUser.signInDetails?.loginId || attrs.email || '';

        setUser({
          userId: currentUser.userId,
          email,
          name: name || currentUser.username,
          phone: attrs.phone_number,
          attributes: attrs
        });
        setIsAuthenticated(true);

        // Auto-sincronização automática com a tabela de membros do MySQL
        if (email) {
          await fetch(`${API_URL}/members/self-register`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
              organization_id: getActiveOrganizationId() || 'org_default',
              id: currentUser.userId,
              email,
              name: name || currentUser.username,
              phone: attrs.phone_number || undefined,
              birthdate: attrs.birthdate || localStorage.getItem('faithhub_user_birth_date') || undefined,
              address: localStorage.getItem('faithhub_user_address') || undefined
            })
          }).catch(() => {});
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await amplifySignOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error("Erro no signOut", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, signOut, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
