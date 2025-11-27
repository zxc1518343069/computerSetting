// _components/PCPartsTable.tsx
'use client';
import { Content, CustomRef } from '@/app/_components/PCPartsTable/Content';
import PackageRecomment from '@/app/_components/PCPartsTable/PackageRecomment';
import Time from '@/app/_components/Time';
import ContactInfo from './ContactInfo';

import React, { useRef } from 'react';

export function PCPartsTable() {
    const exportRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<CustomRef | null>(null);

    return (
        <div
            className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 relative overflow-hidden"
            ref={exportRef}
        >
            {/* 背景装饰 - 现代抽象图形 */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-100/60 to-indigo-100/60 blur-3xl opacity-70 animate-blob" />
                <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-purple-100/60 to-pink-100/60 blur-3xl opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-emerald-100/60 to-teal-100/60 blur-3xl opacity-70 animate-blob animation-delay-4000" />
            </div>

            <div className="max-w-[1920px] mx-auto relative z-10">
                {/* 页面标题 */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 mb-4 animate-fadeIn">
                    <div className="flex flex-col items-center space-y-6">
                        {/* 标题 */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 tracking-tight drop-shadow-sm text-center">
                            巩义明远 DIY装机报价
                        </h1>
                        {/* 装饰线 */}
                        <div className="w-24 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full" />
                        {/* 时间显示 */}
                        <div className="bg-white/50 backdrop-blur-sm px-6 py-2 rounded-full border border-white/50 shadow-sm">
                            <Time />
                        </div>
                    </div>
                </div>

                {/* 主要内容区域：响应式布局 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 px-2 sm:px-4">
                    {/* 左侧：推荐套餐区域 */}
                    <PackageRecomment
                        onApplyPackage={(pkg) => {
                            tableRef.current?.processPkgToTableData(pkg);
                        }}
                    />

                    {/* 中间：配件选择表格 */}
                    <div className={'lg:col-span-7 xl:col-span-7 order-1 lg:order-2'}>
                        <Content customRef={tableRef} />
                    </div>

                    {/* 右侧：联系方式 */}
                    <div className="lg:col-span-2 xl:col-span-2 order-3">
                        <ContactInfo />
                    </div>
                </div>
            </div>
        </div>
    );
}
