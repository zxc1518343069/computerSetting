'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme as antTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    initialTheme = 'system',
}: {
    children: React.ReactNode;
    initialTheme?: Theme;
}) {
    const [theme, setTheme] = useState<Theme>(initialTheme);
    const [mounted, setMounted] = useState(false);

    // 初始化：从 localStorage 读取设置 (仅在客户端执行)
    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme && savedTheme !== initialTheme) {
            setTheme(savedTheme);
        }
    }, [initialTheme]);

    // 监听 theme 变化并应用到 document
    useEffect(() => {
        // ... (rest of the effect)
        if (!mounted) return;

        const root = window.document.documentElement;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const applyTheme = () => {
            const systemTheme = mediaQuery.matches ? 'dark' : 'light';
            const activeTheme = theme === 'system' ? systemTheme : theme;

            if (activeTheme === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }

            localStorage.setItem('theme', theme);
        };

        applyTheme();

        if (theme === 'system') {
            mediaQuery.addEventListener('change', applyTheme);
            return () => mediaQuery.removeEventListener('change', applyTheme);
        }
    }, [theme, mounted]);

    // 计算当前是否应该是暗色模式 (用于 Ant Design)
    // 如果是服务端渲染，且 theme 为 dark，则直接返回 true
    const isDark =
        theme === 'dark' ||
        (mounted &&
            theme === 'system' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <ConfigProvider
                locale={zhCN}
                theme={{
                    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
                    token: {
                        colorPrimary: '#2563eb', // Tailwind blue-600
                        colorBgBase: isDark ? '#141414' : '#ffffff',
                    },
                }}
            >
                {children}
            </ConfigProvider>
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
