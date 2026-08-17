import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const loadUser = useCallback(async (authUser) => {
    if (!authUser) { setUser(null); return; }
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (error) throw error;
    setUser({ ...authUser, ...profile });
  }, []);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      await loadUser(authUser);
    } catch (error) {
      setAuthError({ type: 'unknown', message: error.message });
      setUser(null);
    } finally { setIsLoadingAuth(false); }
  }, [loadUser]);

  useEffect(() => {
    checkUserAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user).catch((error) => setAuthError({ type: 'unknown', message: error.message }));
    });
    return () => subscription.unsubscribe();
  }, [checkUserAuth, loadUser]);

  const signIn = async (email, password) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuthError({ type: 'login', message: error.message }); throw error; }
  };

  const logout = async () => { await supabase.auth.signOut(); setUser(null); };

  return <AuthContext.Provider value={{
    user, isAuthenticated: Boolean(user), isLoadingAuth, isLoadingPublicSettings: false,
    authChecked: !isLoadingAuth, authError, appPublicSettings: null, signIn, logout,
    navigateToLogin: () => {}, checkAppState: checkUserAuth, checkUserAuth,
  }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within an AuthProvider');
  return value;
};
