'use client';
import Time from '@/app/_components/Time';
import { AppstoreOutlined, ThunderboltFilled, TrophyOutlined } from '@ant-design/icons';
import { Layout } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const { Header } = Layout;

export default function SiteHeader() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
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

    return (
        <Header
            className={`
            sticky top-0 z-50 px-6 md:px-8 h-16 flex items-center justify-between transition-all duration-300
            ${
                scrolled
                    ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm'
                    : 'bg-white/80 backdrop-blur-sm border-b border-transparent'
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
                            明远装机
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight mt-0.5 group-hover:text-blue-500 transition-colors">
                            Workshop Pro
                        </span>
                    </div>
                </Link>

                {/* Navigation - 底部横线风格 */}
                <nav className="hidden md:flex items-center gap-8 h-full">
                    <Link
                        href="/"
                        className={`
                        relative h-full flex items-center gap-2 text-sm font-bold transition-colors duration-300
                        ${isActive('/') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}
                    `}
                    >
                        <AppstoreOutlined className="text-lg" />
                        <span>装机配置</span>
                        {/* Active Indicator Line */}
                        <span
                            className={`
                            absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full transition-all duration-300
                            ${isActive('/') ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}
                        `}
                        />
                    </Link>

                    <Link
                        href="/gamesList"
                        className={`
                        relative h-full flex items-center gap-2 text-sm font-bold transition-colors duration-300
                        ${
                            isActive('/gamesList')
                                ? 'text-blue-600'
                                : 'text-slate-500 hover:text-slate-800'
                        }
                    `}
                    >
                        <TrophyOutlined
                            className={`text-lg ${isActive('/gamesList') ? 'text-blue-600' : ''}`}
                        />
                        <span>游戏榜单</span>
                        {/* Active Indicator Line */}
                        <span
                            className={`
                            absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full transition-all duration-300
                            ${isActive('/gamesList') ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}
                        `}
                        />
                    </Link>
                </nav>
            </div>

            <Time />
        </Header>
    );
}
