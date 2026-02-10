'use client';

import React, { useState } from 'react';
import { Layout, Input, Tabs, Tag } from 'antd';
import { SearchOutlined, FireFilled, GlobalOutlined, DesktopOutlined } from '@ant-design/icons';
import SiteHeader from '@/app/_components/SiteHeader';

const { Content } = Layout;

// --- Image Helpers ---
const getSteamImg = (appId: number) =>
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

// --- Data ---
const INITIAL_ONLINE_GAMES = [
    {
        id: 1,
        name: '英雄联盟 (League of Legends)',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/League_of_Legends_2019_vector.svg/1200px-League_of_Legends_2019_vector.svg.png',
        type: 'custom',
    },
    { id: 2, name: '反恐精英 2 (CS2)', icon: getSteamImg(730), type: 'steam' },
    {
        id: 3,
        name: '无畏契约 (Valorant)',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/1200px-Valorant_logo_-_pink_color_version.svg.png',
        type: 'custom',
    },
    { id: 4, name: '绝地求生 (PUBG)', icon: getSteamImg(578080), type: 'steam' },
    { id: 5, name: 'Dota 2', icon: getSteamImg(570), type: 'steam' },
    { id: 6, name: 'Apex 英雄', icon: getSteamImg(1172470), type: 'steam' },
    { id: 7, name: '永劫无间', icon: getSteamImg(240720), type: 'steam' },
    { id: 8, name: '守望先锋 2', icon: getSteamImg(2357570), type: 'steam' },
    {
        id: 9,
        name: '堡垒之夜 (Fortnite)',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Fortnite_F_lettermark_logo.png',
        type: 'custom',
    },
    { id: 10, name: '原神', icon: getSteamImg(2358720), type: 'steam' },
    { id: 11, name: '使命召唤：现代战争 III', icon: getSteamImg(2355180), type: 'steam' },
    { id: 12, name: 'GTA 在线模式', icon: getSteamImg(271590), type: 'steam' },
    { id: 13, name: '彩虹六号：围攻', icon: getSteamImg(359550), type: 'steam' },
    { id: 14, name: '命运 2 (Destiny 2)', icon: getSteamImg(1085660), type: 'steam' },
    { id: 15, name: '战雷 (War Thunder)', icon: getSteamImg(236390), type: 'steam' },
    { id: 16, name: '星际战甲 (Warframe)', icon: getSteamImg(230410), type: 'steam' },
    { id: 17, name: 'Rust', icon: getSteamImg(252490), type: 'steam' },
    { id: 18, name: '军团要塞 2', icon: getSteamImg(440), type: 'steam' },
    { id: 19, name: 'Dead by Daylight', icon: getSteamImg(381210), type: 'steam' },
    { id: 20, name: '幻兽帕鲁 (Palworld)', icon: getSteamImg(1623730), type: 'steam' },
];

const INITIAL_SINGLE_GAMES = [
    {
        id: 101,
        name: '黑神话：悟空',
        icon: 'https://upload.wikimedia.org/wikipedia/zh/a/a3/Black_Myth_Wukong_cover_art.jpg',
        type: 'custom',
    },
    { id: 102, name: '艾尔登法环 (Elden Ring)', icon: getSteamImg(1245620), type: 'steam' },
    { id: 103, name: '赛博朋克 2077', icon: getSteamImg(1091500), type: 'steam' },
    { id: 104, name: '巫师 3：狂猎', icon: getSteamImg(292030), type: 'steam' },
    { id: 105, name: '博德之门 3', icon: getSteamImg(1086940), type: 'steam' },
    { id: 106, name: '荒野大镖客 2', icon: getSteamImg(1174180), type: 'steam' },
    { id: 107, name: '战神 (God of War)', icon: getSteamImg(1593500), type: 'steam' },
    { id: 108, name: '只狼：影逝二度', icon: getSteamImg(814380), type: 'steam' },
    { id: 109, name: '生化危机 4 重制版', icon: getSteamImg(2050650), type: 'steam' },
    { id: 110, name: '霍格沃茨之遗', icon: getSteamImg(990080), type: 'steam' },
    { id: 111, name: '星空 (Starfield)', icon: getSteamImg(1716740), type: 'steam' },
    { id: 112, name: '最后生还者 第一部', icon: getSteamImg(1888930), type: 'steam' },
    { id: 113, name: '漫威蜘蛛侠：重制版', icon: getSteamImg(1817070), type: 'steam' },
    { id: 114, name: '女神异闻录 5 皇家版', icon: getSteamImg(1687950), type: 'steam' },
    { id: 115, name: '怪物猎人：世界', icon: getSteamImg(582010), type: 'steam' },
    { id: 116, name: '文明 6', icon: getSteamImg(289070), type: 'steam' },
    { id: 117, name: '星露谷物语', icon: getSteamImg(413150), type: 'steam' },
    { id: 118, name: '泰拉瑞亚', icon: getSteamImg(105600), type: 'steam' },
    { id: 119, name: '哈迪斯 (Hades)', icon: getSteamImg(1145360), type: 'steam' },
    { id: 120, name: '空洞骑士', icon: getSteamImg(367520), type: 'steam' },
];

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
