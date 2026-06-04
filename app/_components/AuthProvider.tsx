'use client';

import { authService, type CurrentAdminUser } from '@/app/services/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
    isLoggedIn: boolean;
    currentUser: CurrentAdminUser | null;
    checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 获取 Cookie 值的辅助函数
 */
function getCookie(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<CurrentAdminUser | null>(null);

    const checkAuth = () => {
        const isAdmin = getCookie('is_admin') === 'true';
        setIsLoggedIn(isAdmin);

        if (!isAdmin) {
            setCurrentUser(null);
            return;
        }

        authService
            .me()
            .then((user) => {
                setCurrentUser(user);
            })
            .catch(() => {
                setIsLoggedIn(false);
                setCurrentUser(null);
            });
    };

    // 初始化时检查一次
    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ isLoggedIn, currentUser, checkAuth }}>
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
