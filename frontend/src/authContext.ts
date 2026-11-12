import { createContext, useContext } from "react";
import type { User } from "./api";

export type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
  authorized: <T>(
    path: string,
    options?: { method?: string; body?: unknown; signal?: AbortSignal },
  ) => Promise<T>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing");
  return context;
}
