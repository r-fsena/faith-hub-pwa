import React, { createContext, useContext, useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signOut as amplifySignOut, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import awsmobile from '../aws-exports';

// Configura o Amplify uma única vez
Amplify.configure(awsmobile);

interface MemberUser {
  userId: string;
  email: string;
  name?: string;
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
          name: name || currentUser.username
        });
        setIsAuthenticated(true);

        // Auto-sincronização automática com a tabela de membros do MySQL
        if (email) {
          fetch(`${API_URL}/members/self-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: currentUser.userId,
              email,
              name: name || currentUser.username,
              phone: attrs.phone_number || undefined,
              birthdate: attrs.birthdate || undefined
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
