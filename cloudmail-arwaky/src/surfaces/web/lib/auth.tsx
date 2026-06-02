// surfaces/web/lib/auth.tsx
// Auth context — manages user identity via httpOnly cookie (no localStorage token)

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserId, EmailAddress, UserRole, AuthToken, IsOwner, LoadingState, Password, SanitizedUser } from '$taxonomy';
import { asUserId, asUserRole, createEmailAddress, asAuthToken, asIsOwner, asLoadingState, asPassword } from '$taxonomy';
import { loginApi, logoutApi, getCurrentUserApi } from './web_api_barrel';
import type { UserMeOutput } from '$contract';

interface AuthState {
  token: AuthToken | null;
  userId: UserId | null;
  email: EmailAddress | null;
  role: UserRole | null;
  isOwner: IsOwner;
  loading: LoadingState;
}

interface AuthContextValue extends AuthState {
  login: (email: EmailAddress, password: Password) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser?: SanitizedUser | null }) {
  const [state, setState] = useState<AuthState>(() => {
    if (initialUser) {
      return {
        token: asAuthToken('cookie'),
        userId: asUserId(initialUser.id),
        email: createEmailAddress(initialUser.email.full),
        role: asUserRole(initialUser.role),
        isOwner: asIsOwner(initialUser.isOwner),
        loading: asLoadingState(false),
      };
    }
    return {
      token: null,
      userId: null,
      email: null,
      role: null,
      isOwner: asIsOwner(false),
      loading: asLoadingState(true),
    };
  });

  useEffect(() => {
    if (initialUser) return; // Skip if already hydrated via SSR
    // Verify session via API (cookie is sent automatically)
    getCurrentUserApi()
      .then((resp: UserMeOutput) => {
        setState({
          token: asAuthToken('cookie'),
          userId: asUserId(resp.user.id),
          email: createEmailAddress(resp.user.email.full),
          role: asUserRole(resp.user.role),
          isOwner: asIsOwner(resp.user.isOwner),
          loading: asLoadingState(false)
        });
      })
      .catch(() => {
        setState({ token: null, userId: null, email: null, role: null, isOwner: asIsOwner(false), loading: asLoadingState(false) });
      });
  }, []);

  const login = async (email: EmailAddress, password: Password) => {
    await loginApi(email, password);
    // Cookie is set by API response; verify session
    const resp: UserMeOutput = await getCurrentUserApi();
    setState({
      token: asAuthToken('cookie'),
      userId: asUserId(resp.user.id),
      email: createEmailAddress(resp.user.email.full),
      role: asUserRole(resp.user.role),
      isOwner: asIsOwner(resp.user.isOwner),
      loading: asLoadingState(false)
    });
  };

  const logout = async () => {
    try { await logoutApi(); } catch { /* ignore */ }
    setState({ token: null, userId: null, email: null, role: null, isOwner: asIsOwner(false), loading: asLoadingState(false) });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
