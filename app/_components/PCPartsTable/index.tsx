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
        <Layout className="h-screen overflow-hidden bg-[#f8fafc]">
            {/* Sticky Header */}
            <SiteHeader />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Custom Sidebar */}
                <div
                    className={`relative flex flex-col border-r border-gray-200 bg-white/80 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-all duration-300 ease-in-out ${
                        collapsed ? 'w-[72px]' : 'w-[340px]'
                    }`}
                >
                    <div className="flex-1">
                        <PackageRecomment
                            collapsed={collapsed}
                            onToggle={() => setCollapsed(!collapsed)}
                            onApplyPackage={(pkg) => {
                                tableRef.current?.processPkgToTableData(pkg);
                            }}
                        />
                    </div>
                    {/* Contact Info - Hide in mini mode or show icon only */}
                    <div
                        className={`border-t border-gray-100 bg-gray-50/50 transition-all duration-300 ${collapsed ? 'p-2' : 'p-4'}`}
                    >
                        <div className={collapsed ? 'hidden' : 'block'}>
                            <ContactInfo />
                        </div>
                    </div>
                </div>

                {/* Main Workspace Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 relative">
                    {/* Decorative Background */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px]"></div>
                        <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px]"></div>
                    </div>

                    <div className="max-w-5xl mx-auto relative z-10">
                        <Content customRef={tableRef} />
                    </div>
                </div>
            </div>
        </Layout>
    );
}
