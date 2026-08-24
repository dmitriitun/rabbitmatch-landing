'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AUTH_HINT_COOKIE } from '@/lib/auth-shared';

export type SessionUser = {
  email: string;
  isAdmin: boolean;
};

type AuthState = {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Does the browser carry the readable "there is a session" hint cookie? */
function hasSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.startsWith(`${AUTH_HINT_COOKIE}=`));
}

/**
 * Session is resolved on the client, not in the layout.
 *
 * Reading the session server-side means calling `cookies()` during render,
 * which marks every page dynamic and forces a full React render per request —
 * for a site whose traffic is overwhelmingly anonymous visitors and crawlers,
 * that is the entire rendering cost of the service. Instead the login route
 * sets a readable `rm_signed_in` hint cookie next to the httpOnly session, and
 * only a browser carrying that hint spends a request on `/api/auth/me`.
 * Anonymous visitors get fully static HTML and make zero auth calls.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!hasSessionHint()) return;
    let cancelled = false;

    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: SessionUser | null } | null) => {
        if (cancelled || !data?.user) return;
        setUser({ email: data.user.email, isAdmin: data.user.isAdmin === true });
      })
      .catch(() => {
        /* offline or logged out — stay anonymous */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(() => ({ user, setUser, logout }), [user, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/** Safe variant that returns `null` outside the provider. */
export function useAuthOptional(): AuthState | null {
  return useContext(AuthContext);
}
