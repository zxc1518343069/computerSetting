'use client';
import { Content, CustomRef } from '@/app/_components/PCPartsTable/Content';
import PackageRecomment from '@/app/_components/PCPartsTable/PackageRecomment';
import Time from '@/app/_components/Time';
import ContactInfo from './ContactInfo';

import React, { useRef } from 'react';
import { Layout } from 'antd';
import { ThunderboltFilled } from '@ant-design/icons';

const { Header, Sider, Content: AntContent } = Layout;

export function PCPartsTable() {
    const tableRef = useRef<CustomRef | null>(null);

    return (
        <Layout className="h-screen overflow-hidden bg-[#f8fafc]">
            {/* Sticky Header */}
            <Header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200/50 px-6 flex items-center justify-between h-14 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg shadow-slate-500/20">
                        <ThunderboltFilled style={{ fontSize: 18 }} />
                    </div>
                    <span className="font-black text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight drop-shadow-sm">
                        明远装机工坊
                    </span>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded ml-2">
                        PRO
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:block">
                        <Time />
                    </div>
                </div>
            </Header>

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
