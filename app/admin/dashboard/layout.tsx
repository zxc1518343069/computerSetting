'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        // 检查登录状态
        const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
        if (isLoggedIn !== 'true') {
            router.push('/admin');
        }
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem('adminLoggedIn');
        router.push('/admin');
    };

    const menuItems = [
        {
            title: '返回配置',
            path: '/',
            icon: '',
        },
        {
            title: '溢价控制',
            path: '/admin/dashboard/pricing',
            icon: '💰',
        },
        {
            title: '配件套餐',
            path: '/admin/dashboard/packages',
            icon: '📦',
        },
        {
            title: '导入数据',
            path: '/admin/dashboard/import',
            icon: '📦',
        },
        {
            title: '配置数据',
            path: '/admin/dashboard/config',
            icon: '⚙️',
        },
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* 侧边栏 */}
            <aside
                className={`bg-gray-800 text-white transition-all duration-300 ${
                    isSidebarCollapsed ? 'w-16' : 'w-64'
                }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    {!isSidebarCollapsed && <h2 className="text-xl font-bold">后台管理</h2>}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="text-white hover:bg-gray-700 p-2 rounded"
                    >
                        {isSidebarCollapsed ? '☰' : '✕'}
                    </button>
                </div>

                <nav className="mt-4">
                    {menuItems.map((item) => (
                        <div key={item.path}>
                            <Link
                                href={item.path}
                                className={`flex items-center px-4 py-3 hover:bg-gray-700 transition-colors ${
                                    pathname === item.path ? 'bg-gray-700' : ''
                                }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {!isSidebarCollapsed && <span className="ml-3">{item.title}</span>}
                            </Link>
                        </div>
                    ))}
                </nav>

                <div
                    className={`absolute bottom-0  border-t border-gray-700 ${
                        isSidebarCollapsed ? 'w-16' : 'w-64'
                    } `}
                >
                    <button
                        onClick={handleLogout}
                        className="flex items-center px-4 py-3 hover:bg-gray-700 transition-colors w-full"
                    >
                        <span className="text-xl">🚪</span>
                        {!isSidebarCollapsed && <span className="ml-3">退出登录</span>}
                    </button>
                </div>
            </aside>

            {/* 主内容区域 */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">{children}</div>
            </main>
        </div>
    );
}
