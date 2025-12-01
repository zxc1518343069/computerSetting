'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

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
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                </svg>
            ),
        },
        {
            title: '溢价控制',
            path: '/admin/dashboard/pricing',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            ),
        },
        {
            title: '配件套餐',
            path: '/admin/dashboard/packages',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                </svg>
            ),
        },
        {
            title: '导入数据',
            path: '/admin/dashboard/import',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                </svg>
            ),
        },
        {
            title: '系统配置',
            path: '/admin/dashboard/config',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
            ),
        },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* 侧边栏 */}
            <aside
                className={`relative bg-white border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 z-20 flex flex-col ${
                    isSidebarCollapsed ? 'w-20' : 'w-72'
                }`}
            >
                {/* 顶部 Logo 区域 */}
                <div className="h-20 flex items-center px-6 border-b border-slate-100">
                    <div
                        className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${
                            isSidebarCollapsed ? 'justify-center w-full' : ''
                        }`}
                    >
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
                            M
                        </div>
                        <div
                            className={`transition-opacity duration-300 ${
                                isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100'
                            }`}
                        >
                            <h2 className="text-lg font-bold text-slate-800 leading-tight">
                                明远装机
                            </h2>
                            <p className="text-xs text-slate-400 font-medium">后台管理系统</p>
                        </div>
                    </div>
                </div>

                {/* 悬浮折叠按钮 */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-24 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all z-30"
                >
                    <svg
                        className={`w-4 h-4 transition-transform duration-300 ${
                            isSidebarCollapsed ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </button>

                {/* 导航菜单 */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center px-3 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                                    isActive
                                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100/50 font-medium'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            >
                                {/* 激活状态指示条 */}
                                {isActive && !isSidebarCollapsed && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
                                )}

                                <span
                                    className={`flex-shrink-0 transition-colors duration-200 ${
                                        isActive
                                            ? 'text-blue-600'
                                            : 'text-slate-400 group-hover:text-slate-600'
                                    }`}
                                >
                                    {item.icon}
                                </span>

                                <span
                                    className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ${
                                        isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'
                                    }`}
                                >
                                    {item.title}
                                </span>

                                {/* 折叠时的悬浮提示 (Tooltip) 可以根据需要添加，这里保持简洁 */}
                            </Link>
                        );
                    })}
                </nav>

                {/* 底部用户信息/退出 */}
                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full rounded-xl transition-all duration-200 group ${
                            isSidebarCollapsed
                                ? 'justify-center p-2 hover:bg-red-50'
                                : 'px-4 py-3 hover:bg-red-50'
                        }`}
                    >
                        <div
                            className={`flex-shrink-0 transition-colors ${
                                isSidebarCollapsed
                                    ? 'text-slate-400 group-hover:text-red-500'
                                    : 'text-slate-400 group-hover:text-red-500'
                            }`}
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                        </div>
                        <span
                            className={`ml-3 font-medium text-slate-500 group-hover:text-red-600 transition-all duration-300 whitespace-nowrap ${
                                isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'
                            }`}
                        >
                            退出登录
                        </span>
                    </button>
                </div>
            </aside>

            {/* 主内容区域 */}
            <main className="flex-1 overflow-y-auto scroll-smooth relative">
                {/* 装饰背景 - 与子页面配合 */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-slate-50/50" />
                </div>

                <div className="relative z-10 p-4 md:p-8 lg:p-10 max-w-[1920px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
