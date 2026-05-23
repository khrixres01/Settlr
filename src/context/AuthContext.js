import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../db/supabase';
import { getMyRole, ensureProfile } from '../db/salesService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [role, setRole] = useState('user');

  async function loadRole(s) {
    if (!s?.user) { setRole('user'); return; }
    await ensureProfile(s.user.id);
    const r = await getMyRole(s.user.id);
    setRole(r);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null);
      loadRole(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      loadRole(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setRole('user');
  }

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ session, role, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
