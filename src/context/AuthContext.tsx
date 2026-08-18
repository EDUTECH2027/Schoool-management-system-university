import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '../api/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'head_teacher' | 'teacher' | 'student' | 'parent' | 'platform_owner' | 'platform_admin';
  initials: string;
  teacher_id?: string | null;
  student_id?: string | null;
  parent_id?: string | null;
  must_change_password?: boolean;
  token?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginStudent: (studentId: string) => Promise<boolean>;
  logout: () => void;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, login: async () => false, loginStudent: async () => false, logout: () => {}, clearMustChangePassword: () => {},
});

const stored = (): AuthUser | null => {
  try { return JSON.parse(localStorage.getItem('auth_user') ?? 'null'); }
  catch { return null; }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(stored);

  const applyLoginResult = (res: { token: string; user: AuthUser }) => {
    const authUser: AuthUser = {
      id:         res.user.id,
      name:       res.user.name,
      email:      res.user.email,
      role:       res.user.role,
      initials:   res.user.initials,
      teacher_id: res.user.teacher_id ?? null,
      student_id: res.user.student_id ?? null,
      parent_id:  res.user.parent_id  ?? null,
      must_change_password: !!res.user.must_change_password,
      token:      res.token,
    };
    setUser(authUser);
    localStorage.setItem('auth_user', JSON.stringify(authUser));
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      applyLoginResult(await api.login(email, password));
      return true;
    } catch {
      return false;
    }
  };

  // Matricule only, no password — see routes/auth.js POST /student-login.
  const loginStudent = async (studentId: string): Promise<boolean> => {
    try {
      applyLoginResult(await api.studentLogin(studentId));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    api.logout().catch(() => {});
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const clearMustChangePassword = () => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, must_change_password: false };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, loginStudent, logout, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
