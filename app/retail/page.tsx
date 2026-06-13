'use client';

import SiteHeader from '@/app/_components/SiteHeader';
import RetailQuote from '@/app/retail/_components/RetailQuote';
import { Layout } from 'antd';

const { Content } = Layout;

export default function RetailPage() {
    return (
        <Layout className="h-screen overflow-hidden bg-[#f8fafc] transition-colors duration-500 dark:bg-[#141414]">
            <SiteHeader />
            <Content className="flex-1 overflow-y-auto px-6 py-8 md:px-10 lg:px-14">
                <RetailQuote />
            </Content>
        </Layout>
    );
}
