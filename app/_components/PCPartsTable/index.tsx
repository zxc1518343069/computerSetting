'use client';
import { Content, CustomRef } from '@/app/_components/PCPartsTable/Content';
import PackageRecomment, { Package } from '@/app/_components/PCPartsTable/PackageRecomment';
import SiteHeader from '@/app/_components/SiteHeader';
import { message } from '@/lib/AntdGlobal';
import { Layout } from 'antd';

import React, { useCallback, useRef, useState } from 'react';
import ContactInfo from './ContactInfo';

export function PCPartsTable() {
    const tableRef = useRef<CustomRef | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [tempPackages, setTempPackages] = useState<Package[]>([]);
    const [sidebarMode, setSidebarMode] = useState<'popular' | 'temporary'>('popular');

    const handleSaveTempPackage = useCallback(
        (pkg: Package) => {
            if (tempPackages.length >= 3) {
                message.warning('临时方案最多保存3个，请先删除旧方案');
                return;
            }
            setTempPackages((prev) => [...prev, pkg]);
            setSidebarMode('temporary'); // 自动切换到临时方案
            message.success('方案已临时保存');
        },
        [tempPackages.length]
    );

    const handleDeleteTempPackage = useCallback((id: string | number) => {
        setTempPackages((prev) => prev.filter((p) => p.id !== id));
        message.info('临时方案已删除');
    }, []);

    return (
        <Layout className="h-screen overflow-hidden bg-[#F8FAFC] relative">
            {/* 极简背景装饰：营造数字化舞台感 */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* 扫描线与环境光：增加科技质感 */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(59,130,246,0.02)_50%,transparent_100%)] bg-[length:100%_8px] pointer-events-none" />

            {/* 多层环境光晕：增加视觉深度 */}
            <div
                className="absolute -top-[10%] -right-[5%] w-[1000px] h-[1000px] bg-blue-200/20 blur-[160px] rounded-full pointer-events-none animate-pulse"
                style={{ animationDuration: '8s' }}
            />
            <div
                className="absolute top-[10%] -left-[10%] w-[800px] h-[800px] bg-indigo-200/15 blur-[140px] rounded-full pointer-events-none animate-pulse"
                style={{ animationDuration: '12s' }}
            />
            <div className="absolute bottom-0 right-[10%] w-[600px] h-[600px] bg-purple-100/10 blur-[120px] rounded-full pointer-events-none" />

            {/* 顶部导航：悬浮感设计 */}
            <div className="relative z-30">
                <SiteHeader />
            </div>

            <div className="flex flex-1 overflow-hidden relative z-10">
                {/* 侧边栏：极致玻璃拟态 */}
                <div
                    className={`relative flex flex-col border-r border-white/40 bg-white/60 backdrop-blur-3xl shadow-[20px_0_50px_-20px_rgba(0,0,0,0.03)] z-20 transition-all duration-500 ease-in-out ${
                        collapsed ? 'w-[88px]' : 'w-[400px]'
                    }`}
                >
                    <div className="flex-1 overflow-visible">
                        <PackageRecomment
                            collapsed={collapsed}
                            onToggle={() => setCollapsed(!collapsed)}
                            tempPackages={tempPackages}
                            onDeleteTempPackage={handleDeleteTempPackage}
                            mode={sidebarMode}
                            onModeChange={setSidebarMode}
                            onApplyPackage={(pkg) => {
                                tableRef.current?.processPkgToTableData(pkg);
                            }}
                        />
                    </div>

                    {/* 联系信息：轻量化处理 */}
                    <div
                        className={`border-t border-gray-100/30 bg-white/20 backdrop-blur-md transition-all duration-300 ${collapsed ? 'p-4' : 'p-8'}`}
                    >
                        <div
                            className={
                                collapsed
                                    ? 'opacity-0 pointer-events-none'
                                    : 'opacity-100 transition-opacity duration-700'
                            }
                        >
                            <ContactInfo />
                        </div>
                    </div>
                </div>
                {/* 主工作区：舞台化陈列 */}
                <div className="flex-1 overflow-y-auto pt-5 px-6 pb-6 md:px-12 md:pb-12 lg:px-16 lg:pb-16 scrollbar-hide relative">
                    <div className="max-w-7xl mx-auto relative animate-fadeIn">
                        {/* 装饰性元素：科技感角落支架 */}
                        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-blue-500/20 rounded-tl-xl pointer-events-none" />
                        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-blue-500/20 rounded-tr-xl pointer-events-none" />
                        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-blue-500/20 rounded-bl-xl pointer-events-none" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-blue-500/20 rounded-br-xl pointer-events-none" />

                        {/* 核心内容容器：极致玻璃拟态与悬浮感 */}
                        <div className="relative group">
                            {/* 容器背后的动态光晕 */}
                            <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-[4rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

                            <div className="relative bg-white/70 backdrop-blur-3xl rounded-[3.5rem] border border-white/80 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-700 hover:shadow-[0_48px_96px_-12px_rgba(0,0,0,0.1)] hover:bg-white/85 ring-1 ring-white/50">
                                {/* 顶部装饰条 */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

                                {/* 内部增加充足的呼吸空间 */}
                                <div className="p-8 md:p-12 lg:p-14">
                                    <Content
                                        customRef={tableRef}
                                        tempPackages={tempPackages}
                                        onSaveTempPackage={handleSaveTempPackage}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 底部优雅留白与装饰 */}
                        <div className="h-24 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-blue-200 mx-1" />
                            <div className="w-1 h-1 rounded-full bg-blue-300 mx-1" />
                            <div className="w-1 h-1 rounded-full bg-blue-200 mx-1" />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
