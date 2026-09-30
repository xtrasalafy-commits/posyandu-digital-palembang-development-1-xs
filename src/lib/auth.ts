// ============================================================
// Manajemen sesi reaktif (Server API → React state)
// ============================================================
import { useSyncExternalStore } from 'react';
import { db } from './db';
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

// Sinkronisasi dari perubahan auth (login/logout / API)
db.auth.onAuthStateChange((_event: string, session: any) => {
  setState({
    user: session?.user ? { id: session.user.id, email: session.user.email } : null,
    loading: false,
  });
});

export async function initAuth() {
  try {
    const { data } = await db.auth.getSession();
    setState({
      user: data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null,
      loading: false,
    });
  } catch {
    setState({ user: null, loading: false });
  }
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export async function login(email: string, password: string) {
  return db.auth.signInWithPassword({ email, password });
}

export async function logout() {
  await db.auth.signOut();
}
