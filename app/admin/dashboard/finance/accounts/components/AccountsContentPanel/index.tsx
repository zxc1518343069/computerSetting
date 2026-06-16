import { UnorderedListOutlined, WalletOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AccountsDetailTabs, type AccountsDetailTabsRef } from './components/AccountsDetailTabs';
import type { AccountDetailNavigationIntent } from './components/AccountsDetailTabs/types';
import { AccountsSummaryTabs, type AccountsSummaryTabsRef } from './components/AccountsSummaryTabs';

type AccountView = 'summary' | 'detail';

interface AccountsContentPanelProps {
    onSettled: () => void;
}

export interface AccountsContentPanelRef {
    refresh: () => void;
}

export const AccountsContentPanel = forwardRef<AccountsContentPanelRef, AccountsContentPanelProps>(
    function AccountsContentPanel({ onSettled }, ref) {
        const [view, setView] = useState<AccountView>('summary');
        const [detailNavigationIntent, setDetailNavigationIntent] =
            useState<AccountDetailNavigationIntent | null>(null);
        const summaryTabsRef = useRef<AccountsSummaryTabsRef>(null);
        const detailTabsRef = useRef<AccountsDetailTabsRef>(null);

        useImperativeHandle(ref, () => ({
            refresh: () => {
                summaryTabsRef.current?.refresh();
                detailTabsRef.current?.refresh();
            },
        }));

        useEffect(() => {
            const params = new URLSearchParams(window.location.search);
            const nextView = params.get('view');

            if (nextView === 'detail') setView('detail');
            if (nextView === 'summary') setView('summary');
        }, []);

        const showSupplierDetails = (supplierId?: number | null) => {
            setDetailNavigationIntent({ kind: 'supplier', supplierId: supplierId || null });
            setView('detail');
        };

        const showLogisticsDetails = (companyId?: number | null) => {
            setDetailNavigationIntent({ kind: 'logistics', companyId: companyId || null });
            setView('detail');
        };

        const showCustomerDetails = (customerId?: number | null, customerKey?: string | null) => {
            setDetailNavigationIntent({
                kind: 'customer',
                customerId: customerId || null,
                customerKey: customerId ? null : customerKey || null,
            });
            setView('detail');
        };

        const navigationActions = {
            showSupplierDetails,
            showLogisticsDetails,
            showCustomerDetails,
        };

        return (
            <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <Segmented
                        value={view}
                        onChange={(value) => setView(value as AccountView)}
                        options={[
                            {
                                label: (
                                    <span className="inline-flex items-center gap-2">
                                        <WalletOutlined />
                                        汇总视图
                                    </span>
                                ),
                                value: 'summary',
                            },
                            {
                                label: (
                                    <span className="inline-flex items-center gap-2">
                                        <UnorderedListOutlined />
                                        分笔明细
                                    </span>
                                ),
                                value: 'detail',
                            },
                        ]}
                    />
                </div>

                {view === 'summary' ? (
                    <AccountsSummaryTabs
                        ref={summaryTabsRef}
                        navigationActions={navigationActions}
                        onSettled={onSettled}
                    />
                ) : (
                    <AccountsDetailTabs
                        ref={detailTabsRef}
                        navigationIntent={detailNavigationIntent}
                        onSettled={onSettled}
                    />
                )}
            </div>
        );
    }
);
