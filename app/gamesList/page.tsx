'use client';

import React, { useState } from 'react';
import { Layout, Input, Tabs, Tag } from 'antd';
import { SearchOutlined, FireFilled, GlobalOutlined, DesktopOutlined } from '@ant-design/icons';
import SiteHeader from '@/app/_components/SiteHeader';
import { INITIAL_ONLINE_GAMES, INITIAL_SINGLE_GAMES } from '@/const/games';

const { Content } = Layout;

export default function GamesListPage() {
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState('online');

    const filterGames = (games: typeof INITIAL_ONLINE_GAMES) => {
        return games.filter((g) => g.name.toLowerCase().includes(searchText.toLowerCase()));
    };

    const renderGameList = (games: typeof INITIAL_ONLINE_GAMES) => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
            {games.map((game, index) => (
                <div
                    key={game.id}
                    className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 flex flex-col"
                >
                    {/* Rank Badge - Metallic Look */}
                    <div className="absolute top-0 left-0 z-20 p-3">
                        <div
                            className={`
                            w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-lg backdrop-blur-md border border-white/20
                            ${
                                index === 0
                                    ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-white shadow-yellow-500/30'
                                    : index === 1
                                      ? 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white shadow-slate-500/30'
                                      : index === 2
                                        ? 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 text-white shadow-orange-500/30'
                                        : 'bg-slate-900/80 text-slate-300'
                            }
                        `}
                        >
                            {index + 1}
                        </div>
                    </div>

                    {/* Image Container with Zoom Effect */}
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                        <img
                            src={game.icon}
                            alt={game.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(game.name)}&background=1e293b&color=fff`;
                            }}
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />

                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col relative">
                        <h3 className="font-bold text-slate-800 text-base leading-tight line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
                            {game.name}
                        </h3>

                        <div className="mt-auto flex items-center justify-between">
                            <Tag
                                className={`
                                m-0 border-0 px-2.5 py-1 rounded-lg font-medium text-xs
                                ${
                                    activeTab === 'online'
                                        ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                                        : 'bg-purple-50 text-purple-600 group-hover:bg-purple-100'
                                }
                                transition-colors
                            `}
                            >
                                {activeTab === 'online' ? '多人竞技' : '沉浸剧情'}
                            </Tag>

                            {/* Decorative Dot */}
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors delay-75" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors delay-150" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <Layout className="h-screen overflow-hidden bg-[#f8fafc]">
            <SiteHeader />

            {/* Main Scrollable Area */}
            <Content className="flex-1 overflow-y-auto scroll-smooth">
                {/* Hero Section */}
                <div className="relative bg-white border-b border-slate-200/60 pt-12 pb-16 px-6 overflow-hidden">
                    {/* Background Decor */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                        <div className="absolute -top-[50%] -right-[20%] w-[800px] h-[800px] bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-full blur-3xl opacity-60" />
                        <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-orange-100/40 to-yellow-100/40 rounded-full blur-3xl opacity-60" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light" />
                    </div>

                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 border border-slate-900/10 text-slate-600 text-xs font-bold uppercase tracking-wider mb-6">
                            <FireFilled className="text-orange-500" />
                            2024-2025 Official Rankings
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                            PC 游戏
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                风云榜
                            </span>
                        </h1>
                        <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
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
                                className="w-full h-14 text-lg rounded-xl border-0 shadow-xl shadow-blue-900/5 bg-white/90 backdrop-blur-xl hover:bg-white focus:bg-white transition-all"
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
                                children: renderGameList(filterGames(INITIAL_ONLINE_GAMES)),
                            },
                            {
                                key: 'single',
                                label: (
                                    <span className="flex items-center gap-2 px-2 text-base font-bold">
                                        <DesktopOutlined />
                                        热门单机 TOP 20
                                    </span>
                                ),
                                children: renderGameList(filterGames(INITIAL_SINGLE_GAMES)),
                            },
                        ]}
                    />
                </div>
            </Content>
        </Layout>
    );
}
