'use client';

import SiteHeader from '@/app/_components/SiteHeader';
import { ToolOutlined } from '@ant-design/icons';
import { Layout } from 'antd';

export default function SecondHandPage() {
    return (
        <Layout className="min-h-screen bg-slate-50 dark:bg-[#141414]">
            <SiteHeader />
            <main className="flex flex-1 items-center justify-center px-6 py-16">
                <section className="w-full max-w-2xl rounded-3xl border border-slate-200/80 bg-white/80 p-10 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#1f1f1f]/80">
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200 dark:bg-blue-600 dark:shadow-none">
                        <ToolOutlined className="text-2xl" />
                    </div>
                    <h1 className="mb-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        二手模块建设中
                    </h1>
                    <p className="m-0 text-sm leading-6 text-slate-500 dark:text-gray-400">
                        后续将支持二手库存、成色、回收来源、检测记录与售后信息管理。
                    </p>
                </section>
            </main>
        </Layout>
    );
}
