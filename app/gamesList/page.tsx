'use client';

import SiteHeader from '@/app/_components/SiteHeader';
import { Game } from '@/const/types';
import { DesktopOutlined, FireFilled, GlobalOutlined, SearchOutlined } from '@ant-design/icons';
import { Input, Layout, Tabs } from 'antd';
import React, { useState } from 'react';
import GameCard from './_components/GameCard';
import GameCardSkeleton from './_components/GameCardSkeleton';
import { useGames } from './hooks/useGames';

const { Content } = Layout;

export default function GamesListPage() {
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState('online');

    const { onlineGames, singleGames, loading } = useGames();

    const filterGames = (games: Game[]) => {
        return games.filter((g) => g.name.toLowerCase().includes(searchText.toLowerCase()));
    };

    const renderGameList = (games: Game[]) => {
        if (loading && games.length === 0) {
            return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <GameCardSkeleton key={i} />
                    ))}
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
                {games.map((game, index) => (
                    <GameCard key={game.id} game={game} index={index} activeTab={activeTab} />
                ))}
            </div>
        );
    };

    return (
        <Layout className="h-screen overflow-hidden bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-500">
            <SiteHeader />

            {/* Main Scrollable Area */}
            <Content className="flex-1 overflow-y-auto scroll-smooth">
                {/* Hero Section */}
                <div className="relative bg-white dark:bg-slate-900/20 border-b border-slate-200/60 dark:border-white/5 pt-12 pb-16 px-6 overflow-hidden">
                    {/* Background Decor */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                        <div className="absolute -top-[50%] -right-[20%] w-[800px] h-[800px] bg-gradient-to-br from-blue-100/50 to-purple-100/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full blur-3xl opacity-60" />
                        <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-orange-100/40 to-yellow-100/40 dark:from-orange-900/10 dark:to-yellow-900/10 rounded-full blur-3xl opacity-60" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-40 mix-blend-soft-light" />
                    </div>

                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">
                            <FireFilled className="text-orange-500" />
                            2024-2025 Official Rankings
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
                            PC 游戏
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-cyan-400 dark:to-blue-500">
                                风云榜
                            </span>
                        </h1>
                        <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            汇集全网最热门的 3A 大作与竞技网游，为您提供最权威的装机性能参考。
                            <br className="hidden md:block" />
                            实时更新，掌握游戏前沿。
                        </p>

                        {/* Search Bar - Floating & Large */}
                        <div className="max-w-xl mx-auto relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500" />
                            <Input
                                prefix={<SearchOutlined className="text-slate-400 text-xl mr-2" />}
                                placeholder="搜索游戏名称..."
                                className="w-full h-14 text-lg rounded-xl border-0 shadow-xl shadow-blue-900/5 dark:shadow-none bg-white/90 dark:bg-slate-900/50 backdrop-blur-xl hover:bg-white dark:hover:bg-slate-900/80 focus:bg-white dark:focus:bg-slate-900/80 transition-all dark:text-white dark:placeholder:text-slate-500"
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto w-full p-6 md:p-10">
                    {/* Custom Tabs */}
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="custom-tabs-modern mb-8"
                        items={[
                            {
                                key: 'online',
                                label: (
                                    <span className="flex items-center gap-2 px-2 text-base font-bold">
                                        <GlobalOutlined />
                                        热门网游 TOP 20
                                    </span>
                                ),
                                children: renderGameList(filterGames(onlineGames)),
                            },
                            {
                                key: 'single',
                                label: (
                                    <span className="flex items-center gap-2 px-2 text-base font-bold">
                                        <DesktopOutlined />
                                        热门单机 TOP 20
                                    </span>
                                ),
                                children: renderGameList(filterGames(singleGames)),
                            },
                        ]}
                    />
                </div>
            </Content>
        </Layout>
    );
}
