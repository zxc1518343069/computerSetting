'use client';
import { Content, CustomRef } from '@/app/_components/PCPartsTable/Content';
import PackageRecomment from '@/app/_components/PCPartsTable/PackageRecomment';
import ContactInfo from './ContactInfo';
import SiteHeader from '@/app/_components/SiteHeader';

import React, { useRef } from 'react';
import { Layout } from 'antd';

const { Sider, Content: AntContent } = Layout;

export function PCPartsTable() {
    const tableRef = useRef<CustomRef | null>(null);

    return (
        <Layout className="h-screen overflow-hidden bg-[#f8fafc]">
            {/* Sticky Header */}
            <SiteHeader />

            <Layout className="overflow-hidden">
                {/* Fixed Sidebar for Recommendations */}
                <Sider
                    width={320}
                    theme="light"
                    className="border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20"
                    breakpoint="lg"
                    collapsedWidth="0"
                >
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-hidden">
                            <PackageRecomment
                                onApplyPackage={(pkg) => {
                                    tableRef.current?.processPkgToTableData(pkg);
                                }}
                            />
                        </div>
                        {/* Contact Info at Sidebar Bottom */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                            <ContactInfo />
                        </div>
                    </div>
                </Sider>

                {/* Main Workspace Area */}
                <AntContent className="flex-1 overflow-y-auto p-6 bg-slate-50/50 relative">
                    {/* Decorative Background */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px]"></div>
                        <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[100px]"></div>
                    </div>

                    <div className="max-w-5xl mx-auto relative z-10">
                        <Content customRef={tableRef} />
                    </div>
                </AntContent>
            </Layout>
        </Layout>
    );
}
