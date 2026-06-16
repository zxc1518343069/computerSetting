import { formatDate, formatPrice } from '@/utils';
import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { MerchantRefundsTable } from '../../common/MerchantRefundsTable';
import { PayablesTable } from '../../common/PayablesTable';
import { ReturnRefundsTable } from '../../common/ReturnRefundsTable';
import type { SupplierAccount } from '../../../../../types';
import type { AccountNavigationActions } from '../types';

interface SupplierAccountsTableProps {
    data: SupplierAccount[];
    loading?: boolean;
    navigationActions: Pick<AccountNavigationActions, 'showSupplierDetails'>;
    onSettled: () => void;
}

export function SupplierAccountsTable({
    data,
    loading,
    navigationActions,
    onSettled,
}: SupplierAccountsTableProps) {
    const columns: ColumnsType<SupplierAccount> = [
        {
            title: '商家',
            width: 260,
            render: (_, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {record.supplier_name}
                    </div>
                    <div className="text-xs text-gray-400">
                        {[record.contact_name, record.phone].filter(Boolean).join(' / ') || '-'}
                    </div>
                </div>
            ),
        },
        {
            title: '未结单据',
            dataIndex: 'order_count',
            width: 130,
            render: (_, record) =>
                `${record.order_count || 0} 进货 / ${(record.returns || []).length} 退货 / ${(record.merchant_refunds || []).length} 返款`,
        },
        {
            title: '商家应付',
            width: 220,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>应付 {formatPrice(record.payable_amount)}</div>
                    <div>已付 {formatPrice(record.paid_amount)}</div>
                </div>
            ),
        },
        {
            title: '待处理金额',
            width: 180,
            align: 'right',
            render: (_, record) => (
                <div className="space-y-1 font-mono font-black">
                    {record.pending_payment > 0 && (
                        <div className="text-red-500">付 {formatPrice(record.pending_payment)}</div>
                    )}
                    {record.pending_refund > 0 && (
                        <div className="text-orange-500">
                            收 {formatPrice(record.pending_refund)}
                        </div>
                    )}
                    {record.merchant_refund_pending_amount > 0 && (
                        <div className="text-cyan-600 dark:text-cyan-400">
                            返 {formatPrice(record.merchant_refund_pending_amount)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: '最近业务',
            dataIndex: 'latest_ordered_at',
            width: 180,
            render: (_, record) =>
                formatDate(
                    [
                        record.latest_ordered_at,
                        record.latest_return_at,
                        record.latest_merchant_refund_at,
                    ]
                        .filter(Boolean)
                        .sort()
                        .pop()
                ),
        },
        {
            title: '操作',
            width: 200,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        type="link"
                        onClick={() =>
                            navigationActions.showSupplierDetails(record.supplier_id || null)
                        }
                    >
                        查看明细
                    </Button>
                    <Link href="/admin/dashboard/warehouse/purchase-orders">进货单</Link>
                </div>
            ),
        },
    ];

    return (
        <Table<SupplierAccount>
            rowKey={(record) => String(record.supplier_id || record.supplier_name)}
            loading={loading}
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
            expandable={{
                expandedRowRender: (record) => (
                    <SupplierExpandedTables record={record} onSettled={onSettled} />
                ),
            }}
        />
    );
}

function SupplierExpandedTables({
    record,
    onSettled,
}: {
    record: SupplierAccount;
    onSettled: () => void;
}) {
    return (
        <div className="space-y-4">
            <div>
                <div className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                    商家应付
                </div>
                <PayablesTable
                    data={record.orders}
                    onSettled={onSettled}
                    pagination={false}
                    size="small"
                />
            </div>
            <div>
                <div className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                    退货待收
                </div>
                <ReturnRefundsTable
                    data={record.returns}
                    onSettled={onSettled}
                    pagination={false}
                    size="small"
                />
            </div>
            <div>
                <div className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                    商家返款
                </div>
                <MerchantRefundsTable
                    data={record.merchant_refunds}
                    onSettled={onSettled}
                    pagination={false}
                    size="small"
                />
            </div>
        </div>
    );
}
