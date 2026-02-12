'use client';

import { Tag } from 'antd';
import React from 'react';

interface GameCardProps {
    game: {
        id: string | number;
        name: string;
        icon: string;
    };
    index: number;
    activeTab: string;
}

export default function GameCard({ game, index, activeTab }: GameCardProps) {
    const isTopThree = index < 3;

    return (
        <div className="group relative bg-white dark:bg-slate-900/40 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/20 transition-all duration-500 hover:-translate-y-2 flex flex-col backdrop-blur-xl">
            {/* Rank Badge - Metallic/Cyber Look */}
            <div className="absolute top-0 left-0 z-20 p-3">
                <div
                    className={`
                    w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-lg shadow-lg backdrop-blur-md border border-white/20
                    ${
                        index === 0
                            ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-white shadow-yellow-500/30'
                            : index === 1
                              ? 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white shadow-slate-500/30'
                              : index === 2
                                ? 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 text-white shadow-orange-500/30'
                                : 'bg-slate-900/80 dark:bg-black/60 text-slate-300 dark:text-slate-400'
                    }
                `}
                >
                    {index + 1}
                </div>
            </div>

            {/* Image Container with Zoom & Dark Overlay */}
            <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                <img
                    src={game.icon}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out dark:opacity-80"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src =
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(game.name)}&background=1e293b&color=fff`;
                    }}
                />
                {/* Gradient Overlay - Deeper in Dark Mode */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 dark:from-slate-950 via-slate-900/20 dark:via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />

                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col relative">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight line-clamp-2 mb-3 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                    {game.name}
                </h3>

                <div className="mt-auto flex items-center justify-between">
                    <Tag
                        className={`
                        m-0 border-0 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider
                        ${
                            activeTab === 'online'
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20'
                                : 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20'
                        }
                        transition-colors
                    `}
                    >
                        {activeTab === 'online' ? 'Multiplayer' : 'Immersive'}
                    </Tag>

                    {/* Decorative Dots - Neon in Dark Mode */}
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-400 dark:group-hover:bg-cyan-400 transition-colors" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-400 dark:group-hover:bg-cyan-400 transition-colors delay-75" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-400 dark:group-hover:bg-cyan-400 transition-colors delay-150" />
                    </div>
                </div>
            </div>
        </div>
    );
}
