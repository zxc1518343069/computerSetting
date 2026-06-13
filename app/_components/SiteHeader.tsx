'use client';
import { useAuth } from '@/app/_components/AuthProvider';
import ThemeToggle from '@/app/_components/ThemeToggle';
import Time from '@/app/_components/Time';
import { authService } from '@/app/services/auth';
import {
    AppstoreOutlined,
    DashboardOutlined,
    DownOutlined,
    LogoutOutlined,
    ShoppingOutlined,
    ThunderboltFilled,
    ToolOutlined,
    TrophyOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { App, Avatar, Dropdown, Layout } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const { Header } = Layout;

const BRAND_CONFIG = {
    name: '明远装机',
    subName: 'Workshop Pro',
};

export default function SiteHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { message } = App.useApp();
    const { isLoggedIn, checkAuth } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
            message.success('已退出登录');
            checkAuth();
            router.push('/');
        } catch {
            message.error('退出失败');
        }
    };

    const navItems = [
        { label: '产品零售', path: '/retail', icon: <ShoppingOutlined /> },
        { label: '二手', path: '/second-hand', icon: <ToolOutlined /> },
        { label: '租赁', path: '/rental', icon: <AppstoreOutlined /> },
        // ...(isLoggedIn
        //     ? [
        //           {
        //               label: '管理后台',
        //               path: '/admin/dashboard',
        //               icon: <DashboardOutlined />,
        //               isAdmin: true,
        //           },
        //       ]
        //     : []),
    ];

    const diyActive = pathname === '/' || pathname.startsWith('/gamesList');
    const diyMenuItems = [
        {
            key: 'gamesList',
            label: <Link href="/gamesList">游戏榜单</Link>,
            icon: <TrophyOutlined />,
        },
    ];

    const userMenuItems = [
        {
            key: 'dashboard',
            label: <Link href="/admin/dashboard">进入后台</Link>,
            icon: <DashboardOutlined />,
        },
        { type: 'divider' as const },
        {
            key: 'logout',
            label: '退出登录',
            icon: <LogoutOutlined />,
            danger: true,
            onClick: handleLogout,
        },
    ];

    return (
        <Header
            className={`
            sticky top-0 z-50 px-6 md:px-8 h-16 flex items-center justify-between transition-all duration-300
            ${
                scrolled
                    ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm dark:bg-[#141414]/95 dark:border-slate-800/80'
                    : 'bg-white/80 backdrop-blur-sm border-b border-transparent dark:bg-[#141414]/80'
            }
        `}
        >
            <div className="flex items-center gap-12 h-full">
                {/* Brand Logo */}
                <Link href="/" className="flex items-center gap-3 group select-none">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 bg-gradient-to-br from-blue-600 to-purple-600 group-hover:scale-105 transition-transform duration-300">
                        <ThunderboltFilled style={{ fontSize: 20 }} />
                    </div>
                    <div className="flex flex-col justify-center h-full">
                        <span className="font-black text-lg leading-none tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-700">
                            {BRAND_CONFIG.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight mt-0.5 group-hover:text-blue-500 transition-colors">
                            {BRAND_CONFIG.subName}
                        </span>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-8 h-full">
                    {mounted && (
                        <>
                            <Dropdown menu={{ items: diyMenuItems }} trigger={['hover']}>
                                <Link
                                    href="/"
                                    className={`
                                    relative h-full flex items-center gap-2 text-sm font-bold transition-colors duration-300
                                    ${
                                        diyActive
                                            ? 'text-blue-600'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                    }
                                `}
                                >
                                    <span className="text-lg">
                                        <AppstoreOutlined />
                                    </span>
                                    <span>DIY整机</span>
                                    <DownOutlined className="text-[10px] opacity-70" />
                                    <span
                                        className={`
                                    absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full transition-all duration-300
                                    ${diyActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}
                                `}
                                    />
                                </Link>
                            </Dropdown>

                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`
                                relative h-full flex items-center gap-2 text-sm font-bold transition-colors duration-300
                                ${
                                    isActive(item.path)
                                        ? 'text-blue-600'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                }
                            `}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    <span>{item.label}</span>
                                    {/* Active Indicator Line */}
                                    <span
                                        className={`
                                absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full transition-all duration-300
                                ${isActive(item.path) ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}
                            `}
                                    />
                                </Link>
                            ))}
                        </>
                    )}
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <ThemeToggle />
                <Time />

                {mounted && (
                    <div className="ml-2 flex items-center border-l border-slate-200 dark:border-slate-800 pl-4">
                        {isLoggedIn ? (
                            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                                <div className="flex items-center gap-2 cursor-pointer group">
                                    <Avatar
                                        size="small"
                                        icon={<UserOutlined />}
                                        className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-110 transition-transform"
                                    />
                                    <span className="hidden md:inline text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
                                        管理员
                                    </span>
                                </div>
                            </Dropdown>
                        ) : (
                            <Link
                                href="/admin"
                                className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                            >
                                <UserOutlined />
                                <span>登录</span>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </Header>
    );
}
