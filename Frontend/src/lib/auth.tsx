import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Role = "civilian" | "admin" | "guest";
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
}

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string, asAdmin?: boolean) => Promise<User>;
  register: (data: { name: string; email: string; phone: string; password: string; location?: string }) => Promise<User>;
  guest: () => User;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "safezone.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(KEY, JSON.stringify(u));
    else localStorage.removeItem(KEY);
  };

  const login: AuthCtx["login"] = async (email, _password, asAdmin) => {
    const role: Role = asAdmin || /authority|admin|gov/i.test(email) ? "admin" : "civilian";
    const u: User = {
      id: crypto.randomUUID(),
      name: email.split("@")[0] || "Operator",
      email,
      role,
    };
    persist(u);
    return u;
  };

  const register: AuthCtx["register"] = async ({ name, email, phone }) => {
    const u: User = { id: crypto.randomUUID(), name, email, phone, role: "civilian" };
    persist(u);
    return u;
  };

  const guest = () => {
    const u: User = { id: "guest", name: "Guest", email: "", role: "guest" };
    persist(u);
    return u;
  };

  const logout = () => persist(null);

  return <Ctx.Provider value={{ user, login, register, guest, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
