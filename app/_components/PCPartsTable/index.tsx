// components/PCPartsTable.tsx
'use client';
import { Content, CustomRef } from '@/app/_components/PCPartsTable/Content';
import PackageRecomment from '@/app/_components/PCPartsTable/PackageRecomment';
import Time from '@/app/_components/Time';
import ContactInfo from '@/app/admin/dashboard/packages/_components/ContactInfo';

import React, { useRef } from 'react';

export function PCPartsTable() {
    const exportRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<CustomRef | null>(null);

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6"
            ref={exportRef}
        >
            <div className="max-w-[1800px] mx-auto">
                {/* 页面标题 */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fadeIn">
                    <div className="text-center space-y-4">
                        {/* 标题 */}
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight drop-shadow-lg">
                            巩义明远 DIY装机报价系统
                        </h1>
                        {/* 时间显示 */}
                        <Time />
                    </div>
                </div>

                {/* 主要内容区域：响应式布局 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
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
