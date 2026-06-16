import { formatDate, formatPrice } from '@/utils';
import { Button, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { ReceivablesTable } from '../../common/ReceivablesTable';
import type { CustomerAccount } from '../../../../../types';
import type { AccountNavigationActions } from '../types';

interface CustomerAccountsTableProps {
    data: CustomerAccount[];
    loading?: boolean;
    navigationActions: Pick<AccountNavigationActions, 'showCustomerDetails'>;
    onSettled: () => void;
}

export function CustomerAccountsTable({
    data,
    loading,
    navigationActions,
    onSettled,
}: CustomerAccountsTableProps) {
    const columns: ColumnsType<CustomerAccount> = [
        {
            title: '客户',
            width: 260,
            render: (_, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {record.customer_name}
                    </div>
                    <div className="text-xs text-gray-400">
                        {record.customer_phone || '未留手机号'}
                    </div>
                    {!record.customer_id && (
                        <Tag className="mt-1" color="default">
                            未关联客户档案
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            title: '未收订单',
            dataIndex: 'order_count',
            width: 120,
            render: (count) => `${count || 0} 单`,
        },
        {
            title: '明细',
            width: 150,
            render: (_, record) => `${record.line_count} 条 / ${record.total_quantity} 件`,
        },
        {
            title: '待收金额',
            dataIndex: 'receivable_amount',
            width: 150,
            align: 'right',
            render: (amount) => (
                <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                    {formatPrice(Number(amount || 0))}
                </span>
            ),
        },
        {
            title: '最近订单',
            dataIndex: 'latest_order_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 210,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        type="link"
                        onClick={() =>
                            navigationActions.showCustomerDetails(
                                record.customer_id || null,
                                record.customer_key
                            )
                        }
                    >
                        查看明细
                    </Button>
                    {record.customer_id ? (
                        <Link href="/admin/dashboard/sales/customers">客户信息</Link>
                    ) : (
                        <span className="text-xs text-gray-400">未建档</span>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Table<CustomerAccount>
            rowKey="customer_key"
            loading={loading}
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1100 }}
            expandable={{
                expandedRowRender: (record) => (
                    <ReceivablesTable
                        data={record.orders}
                        onSettled={onSettled}
                        pagination={false}
                        size="small"
                    />
                ),
            }}
        />
    );
}
