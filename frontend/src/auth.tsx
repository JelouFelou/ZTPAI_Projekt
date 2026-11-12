import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, apiRequest } from "./api";
import type { AuthResponse, User } from "./api";
import { AuthContext } from "./authContext";

const STORAGE_KEY = "boardrent-session";
type Session = { token: string; expiresAt: number; user: User };

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: Session = JSON.parse(raw);
    if (
      typeof value.token === "string" &&
      value.expiresAt > Date.now() &&
      value.user?.id
    )
      return value;
  } catch {
    /* corrupted storage */
  }
  sessionStorage.removeItem(STORAGE_KEY);
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession);
  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);
  const save = useCallback((response: AuthResponse) => {
    const next = {
      token: response.accessToken,
      expiresAt: Date.now() + response.expiresIn * 1000,
      user: response.user,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);
  const login = useCallback(
    async (email: string, password: string) => {
      save(
        await apiRequest<AuthResponse>("/auth/login", {
          method: "POST",
          body: { email, password },
        }),
      );
    },
    [save],
  );
  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      await apiRequest<User>("/auth/register", { method: "POST", body: data });
      await login(data.email, data.password);
    },
    [login],
  );
  const authorized = useCallback(
    async <T,>(
      path: string,
      options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
    ) => {
      if (!session || session.expiresAt <= Date.now()) {
        logout();
        throw new ApiError("Sesja wygasła. Zaloguj się ponownie.", 401);
      }
      try {
        return await apiRequest<T>(path, { ...options, token: session.token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) logout();
        throw error;
      }
    },
    [session, logout],
  );

  const token = session?.token;
  const expiresAt = session?.expiresAt;
  useEffect(() => {
    if (!token || !expiresAt) return;
    const timeout = window.setTimeout(
      logout,
      Math.max(0, expiresAt - Date.now()),
    );
    const controller = new AbortController();
    apiRequest<User>("/auth/me", { token, signal: controller.signal })
      .then((user) =>
        setSession((current) =>
          current?.token === token ? { ...current, user } : current,
        ),
      )
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          error instanceof ApiError &&
          error.status === 401
        )
          logout();
      });
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [token, expiresAt, logout]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        login,
        register,
        logout,
        authorized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
