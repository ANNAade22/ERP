import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import api, { useCookieAuth } from '../utils/api';

interface User {
    id: string;
    email: string;
    role: string;
    exp: number;
    name?: string;
    avatar_path?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isAuthReady: boolean; // true once we've checked localStorage/token (avoids redirect on refresh)
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const COOKIE_TOKEN_SENTINEL = 'cookie';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() =>
        useCookieAuth ? null : localStorage.getItem('token')
    );
    const [user, setUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        if (useCookieAuth) {
            api.get<{ data?: { id?: string; name?: string; email?: string; role?: string; avatar_path?: string } }>('/profile')
                .then((res) => {
                    const d = res.data?.data;
                    if (d?.id) {
                        setToken(COOKIE_TOKEN_SENTINEL);
                        setUser({
                            id: d.id,
                            email: d.email ?? '',
                            role: d.role ?? '',
                            exp: 0,
                            name: d.name,
                            avatar_path: d.avatar_path,
                        });
                    } else {
                        setToken(null);
                        setUser(null);
                    }
                })
                .catch(() => { setToken(null); setUser(null); })
                .finally(() => setIsAuthReady(true));
            return;
        }
        const stored = localStorage.getItem('token');
        if (stored) {
            try {
                const decoded = jwtDecode<{ sub?: string; id?: string; email?: string; role?: string; exp?: number }>(stored);
                if ((decoded.exp ?? 0) * 1000 < Date.now()) {
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                } else {
                    setToken(stored);
                    setUser({
                        id: decoded.sub ?? decoded.id ?? '',
                        email: decoded.email ?? '',
                        role: decoded.role ?? '',
                        exp: decoded.exp ?? 0,
                    });
                }
            } catch (error) {
                console.error('Invalid token', error);
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            }
        } else {
            setUser(null);
        }
        setIsAuthReady(true);
    }, []);

    useEffect(() => {
        if (!isAuthReady || useCookieAuth) return;
        if (token && token !== COOKIE_TOKEN_SENTINEL) {
            try {
                const decoded = jwtDecode<{ sub?: string; id?: string; email?: string; role?: string; exp?: number }>(token);
                if ((decoded.exp ?? 0) * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser({
                        id: decoded.sub ?? decoded.id ?? '',
                        email: decoded.email ?? '',
                        role: decoded.role ?? '',
                        exp: decoded.exp ?? 0,
                    });
                }
            } catch (error) {
                console.error('Invalid token', error);
                logout();
            }
        } else if (!token) {
            setUser(null);
        }
    }, [token, isAuthReady]);

    // When authenticated, fetch profile once to get name (and keep avatar via Avatar component + userId)
    useEffect(() => {
        if (!token || !isAuthReady) return;
        if (useCookieAuth) return; // profile already used for initial state
        let cancelled = false;
        api.get<{ data?: { name?: string; avatar_path?: string } }>('/profile')
            .then((res) => {
                if (cancelled) return;
                const data = res.data?.data ?? (res.data as { name?: string; avatar_path?: string } | undefined);
                setUser((prev) => {
                    if (!prev) return null;
                    const updates: Partial<{ name: string; avatar_path: string }> = {};
                    if (data?.name !== undefined) updates.name = data.name;
                    if (data?.avatar_path !== undefined) updates.avatar_path = data.avatar_path;
                    return Object.keys(updates).length ? { ...prev, ...updates } : prev;
                });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [token, isAuthReady]);

    const login = (newToken: string) => {
        if (useCookieAuth) {
            setToken(COOKIE_TOKEN_SENTINEL);
            try {
                const decoded = jwtDecode<{ sub?: string; id?: string; email?: string; role?: string; exp?: number }>(newToken);
                setUser({
                    id: decoded.sub ?? decoded.id ?? '',
                    email: decoded.email ?? '',
                    role: decoded.role ?? '',
                    exp: decoded.exp ?? 0,
                });
            } catch {
                setUser(null);
            }
            return;
        }
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        if (useCookieAuth) {
            api.post('/auth/logout').catch(() => {});
        }
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isAuthReady, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
