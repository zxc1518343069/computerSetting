'use client';

import { ReloadOutlined, WalletOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useRef } from 'react';
import {
    AccountsContentPanel,
    type AccountsContentPanelRef,
} from './components/AccountsContentPanel';
import {
    AccountsSummaryCards,
    type AccountsSummaryCardsRef,
} from './components/AccountsSummaryCards';

export default function AccountsPage() {
    const summaryCardsRef = useRef<AccountsSummaryCardsRef>(null);
    const contentPanelRef = useRef<AccountsContentPanelRef>(null);

    const refreshAccounts = () => {
        summaryCardsRef.current?.refresh();
        contentPanelRef.current?.refresh();
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10 relative overflow-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <WalletOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Finance
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            账款管理
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            汇总商家待付款、物流待付款、退货待收退款和销售未收款。
                        </p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={refreshAccounts} />
                </div>

                <AccountsSummaryCards ref={summaryCardsRef} />

                <AccountsContentPanel ref={contentPanelRef} onSettled={refreshAccounts} />
            </div>
        </div>
    );
}
