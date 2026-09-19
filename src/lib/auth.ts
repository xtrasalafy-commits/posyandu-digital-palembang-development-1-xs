// ============================================================
// Manajemen sesi reaktif (Supabase Auth → React state)
// ============================================================
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import type { SessionUser } from './types';

export interface AuthState {
  user: SessionUser | null;
  loading: boolean;
}

let state: AuthState = { user: null, loading: true };
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): AuthState {
  return state;
}

// Inisialisasi sesi awal
supabase.auth.onAuthStateChange((_event: string, session: any) => {
  setState({
    user: session?.user ? { id: session.user.id, email: session.user.email } : null,
    loading: false,
  });
});

export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  setState({
    user: data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null,
    loading: false,
  });
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export async function login(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function logout() {
  await supabase.auth.signOut();
}
