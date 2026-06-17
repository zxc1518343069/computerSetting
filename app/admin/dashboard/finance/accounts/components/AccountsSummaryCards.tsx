import { formatPrice } from '@/utils';
import { CarOutlined, ShoppingCartOutlined, WalletOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { fetchAccountsOverview } from '../services';
import { emptyAccountsOverview } from '../types';

export interface AccountsSummaryCardsRef {
    refresh: () => void;
}

export const AccountsSummaryCards = forwardRef<AccountsSummaryCardsRef>(
    function AccountsSummaryCards(_props, ref) {
        const { data = emptyAccountsOverview, refresh } = useRequest(fetchAccountsOverview);

        useImperativeHandle(ref, () => ({ refresh }), [refresh]);

        const { summary } = data;

        return (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                <SummaryCard
                    icon={<WalletOutlined />}
                    label={`商家待付款 ${summary.merchant_payable_count} 笔`}
                    amount={summary.merchant_payable_amount}
                    tone="red"
                />
                <SummaryCard
                    icon={<CarOutlined />}
                    label={`物流待付款 ${summary.logistics_payable_count} 笔`}
                    amount={summary.logistics_payable_amount}
                    tone="red"
                />
                <SummaryCard
                    icon={<WalletOutlined />}
                    label={`退货待收 ${summary.refund_count} 笔`}
                    amount={summary.refund_amount}
                    tone="orange"
                />
                <SummaryCard
                    icon={<WalletOutlined />}
                    label={`商家返款 ${summary.merchant_refund_count} 笔`}
                    amount={summary.merchant_refund_amount}
                    tone="blue"
                />
                <SummaryCard
                    icon={<ShoppingCartOutlined />}
                    label={`待收款 ${summary.receivable_count} 笔`}
                    amount={summary.receivable_amount}
                    tone="blue"
                />
            </div>
        );
    }
);

function SummaryCard({
    icon,
    label,
    amount,
    tone,
}: {
    icon: ReactNode;
    label: string;
    amount: number;
    tone: 'red' | 'blue' | 'orange';
}) {
    const colorClass =
        tone === 'red'
            ? 'text-red-500'
            : tone === 'orange'
              ? 'text-orange-500'
              : 'text-blue-600 dark:text-blue-400';

    return (
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                {icon}
                <span>{label}</span>
            </div>
            <div className={`text-3xl font-black ${colorClass}`}>{formatPrice(amount)}</div>
        </div>
    );
}
