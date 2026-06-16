import { formatDate, formatPrice } from '@/utils';
import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { LogisticsPayablesTable } from '../../common/LogisticsPayablesTable';
import type { LogisticsAccount } from '../../../../../types';
import type { AccountNavigationActions } from '../types';

interface LogisticsAccountsTableProps {
    data: LogisticsAccount[];
    loading?: boolean;
    navigationActions: Pick<AccountNavigationActions, 'showLogisticsDetails'>;
    onSettled: () => void;
}

export function LogisticsAccountsTable({
    data,
    loading,
    navigationActions,
    onSettled,
}: LogisticsAccountsTableProps) {
    const columns: ColumnsType<LogisticsAccount> = [
        {
            title: '物流公司',
            width: 260,
            render: (_, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {record.company_name}
                    </div>
                    <div className="text-xs text-gray-400">
                        {record.contact || '未填写联系方式'}
                    </div>
                </div>
            ),
        },
        {
            title: '未付记录',
            dataIndex: 'record_count',
            width: 120,
            render: (count) => `${count || 0} 笔`,
        },
        {
            title: '物流待付款',
            dataIndex: 'payable_amount',
            width: 160,
            align: 'right',
            render: (amount) => (
                <span className="font-mono font-black text-red-500">
                    {formatPrice(Number(amount || 0))}
                </span>
            ),
        },
        {
            title: '最近发生',
            dataIndex: 'latest_occurred_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 190,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        type="link"
                        onClick={() =>
                            navigationActions.showLogisticsDetails(record.company_id || null)
                        }
                    >
                        查看明细
                    </Button>
                    <Link href="/admin/dashboard/warehouse/logistics">物流管理</Link>
                </div>
            ),
        },
    ];

    return (
        <Table<LogisticsAccount>
            rowKey={(record) => String(record.company_id || record.company_name)}
            loading={loading}
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
            expandable={{
                expandedRowRender: (record) => (
                    <LogisticsPayablesTable
                        data={record.records}
                        onSettled={onSettled}
                        pagination={false}
                        size="small"
                    />
                ),
            }}
        />
    );
}
