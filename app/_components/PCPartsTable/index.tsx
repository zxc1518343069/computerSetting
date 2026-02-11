'use client';
import { Content, CustomRef } from '@/app/_components/PCPartsTable/Content';
import PackageRecomment from '@/app/_components/PCPartsTable/PackageRecomment';
import ContactInfo from './ContactInfo';
import SiteHeader from '@/app/_components/SiteHeader';

import React, { useRef, useState } from 'react';
import { Layout } from 'antd';

export function PCPartsTable() {
    const tableRef = useRef<CustomRef | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Layout className="h-screen overflow-hidden bg-[#F8FAFC] relative">
            {/* 极简背景装饰：营造数字化舞台感 */}
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />

            {/* 多层环境光晕：增加视觉深度 */}
            <div className="absolute -top-[15%] -right-[10%] w-[800px] h-[800px] bg-blue-100/30 blur-[140px] rounded-full pointer-events-none" />
            <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-100/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-[10%] right-[20%] w-[500px] h-[500px] bg-emerald-100/10 blur-[100px] rounded-full pointer-events-none" />

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
                <div className="flex-1 overflow-y-auto p-8 md:p-16 lg:p-20 scrollbar-hide relative">
                    <div className="max-w-7xl mx-auto relative">
                        {/* 核心内容容器：参考 import 模块的大圆角与通透感 */}
                        <div className="bg-white/80 backdrop-blur-2xl rounded-[3.5rem] border border-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-500 hover:shadow-[0_48px_80px_-12px_rgba(0,0,0,0.08)]">
                            {/* 内部增加充足的呼吸空间 */}
                            <div className="p-10 md:p-14">
                                <Content customRef={tableRef} />
                            </div>
                        </div>

                        {/* 底部优雅留白 */}
                        <div className="h-24" />
                    </div>
                </div>
            </div>
        </Layout>
    );
}
