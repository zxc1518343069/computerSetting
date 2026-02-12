'use client';
import {
    AppstoreOutlined,
    CloudUploadOutlined,
    DollarOutlined,
    HomeOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import ThemeToggle from '@/app/_components/ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        // 检查登录状态 (同时检查 localStorage 和 sessionStorage)
        const isLocalLoggedIn = localStorage.getItem('adminLoggedIn');
        const isSessionLoggedIn = sessionStorage.getItem('adminLoggedIn');
        if (isLocalLoggedIn !== 'true' && isSessionLoggedIn !== 'true') {
            router.push('/admin');
        }
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminLoggedIn');
        router.push('/admin');
    };

    const menuItems = [
        {
            title: '返回前台',
            path: '/',
            icon: <HomeOutlined />,
        },
        {
            title: '溢价控制',
            path: '/admin/dashboard/pricing',
            icon: <DollarOutlined />,
        },
        {
            title: '配件套餐',
            path: '/admin/dashboard/packages',
            icon: <AppstoreOutlined />,
        },
        {
            title: '数据交换',
            path: '/admin/dashboard/import',
            icon: <CloudUploadOutlined />,
        },
        {
            title: '系统配置',
            path: '/admin/dashboard/config',
            icon: <SettingOutlined />,
        },
    ];

    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-black overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* 侧边栏 */}
            <aside
                className={`relative flex flex-col border-r border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-500 ease-in-out z-30 ${
                    isSidebarCollapsed ? 'w-[88px]' : 'w-[280px]'
                }`}
            >
                {/* 顶部 Logo 区域 */}
                <div className="h-24 flex items-center px-6 mb-2">
                    <div
                        className={`flex items-center gap-4 overflow-hidden whitespace-nowrap transition-all duration-500 ${
                            isSidebarCollapsed ? 'justify-center w-full' : ''
                        }`}
                    >
                        <div className="relative group cursor-pointer">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                            <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                                <span className="text-lg">M</span>
                            </div>
                        </div>

                        <div
                            className={`flex flex-col transition-all duration-300 origin-left ${
                                isSidebarCollapsed
                                    ? 'opacity-0 w-0 scale-90 hidden'
                                    : 'opacity-100 w-auto scale-100'
                            }`}
                        >
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none mb-1">
                                明远装机
                            </h2>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
                                Admin Console
                            </p>
                        </div>
                    </div>
                </div>

                {/* 悬浮折叠按钮 */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-28 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md rounded-full p-1.5 transition-all duration-300 z-40 shadow-sm"
                >
                    {isSidebarCollapsed ? (
                        <MenuUnfoldOutlined className="text-xs" />
                    ) : (
                        <MenuFoldOutlined className="text-xs" />
                    )}
                </button>

                {/* 导航菜单 */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`group relative flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 ease-out ${
                                    isActive
                                        ? 'bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-100'
                                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            >
                                {/* 激活状态指示点 */}
                                {isActive && !isSidebarCollapsed && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full shadow-[0_0_12px_rgba(79,70,229,0.4)] animate-pulse"></div>
                                )}

                                <span
                                    className={`text-xl flex-shrink-0 transition-all duration-300 ${
                                        isActive
                                            ? 'text-indigo-600 dark:text-indigo-400 scale-110'
                                            : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:scale-105'
                                    }`}
                                >
                                    {item.icon}
                                </span>

                                <span
                                    className={`ml-3.5 font-medium whitespace-nowrap transition-all duration-300 ${
                                        isSidebarCollapsed
                                            ? 'opacity-0 w-0 hidden translate-x-4'
                                            : 'opacity-100 translate-x-0'
                                    }`}
                                >
                                    {item.title}
                                </span>

                                {/* Hover Glow Effect */}
                                {!isActive && (
                                    <div className="absolute inset-0 rounded-xl bg-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* 底部操作区 */}
                <div className="p-4 border-t border-gray-100/80 dark:border-gray-800 bg-gray-50/30 dark:bg-[#1f1f1f]/30 backdrop-blur-sm space-y-2">
                    <div
                        className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-4'}`}
                    >
                        <ThemeToggle />
                    </div>
                    {/* 退出按钮 */}
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full rounded-xl transition-all duration-300 group ${
                            isSidebarCollapsed
                                ? 'justify-center p-3 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                                : 'px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                    >
                        <span className="text-gray-400 dark:text-gray-500 group-hover:text-red-500 transition-colors text-lg">
                            <LogoutOutlined />
                        </span>
                        <span
                            className={`ml-3 font-medium text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-all duration-300 whitespace-nowrap ${
                                isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'
                            }`}
                        >
                            退出登录
                        </span>
                    </button>
                </div>
            </aside>

            {/* 主内容区域 */}
            <main className="flex-1 overflow-y-auto scroll-smooth relative bg-[#F8FAFC] dark:bg-black">
                {/* 顶部装饰光晕 */}
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-100/40 dark:bg-indigo-900/10 blur-[100px] rounded-full pointer-events-none -z-10 mix-blend-multiply dark:mix-blend-screen" />
                <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-100/40 dark:bg-purple-900/10 blur-[100px] rounded-full pointer-events-none -z-10 mix-blend-multiply dark:mix-blend-screen" />

                <div className="relative z-10 p-6 md:p-8 lg:p-10 max-w-[1600px] mx-auto min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
