import { formatDate, formatPrice } from '@/utils';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, message, Popconfirm, Table, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { updateAccountPayment } from '@/app/admin/dashboard/finance/accounts/services';
import { DeliveryStatusTag, SourceTypeTag } from './AccountTags';
import type { Receivable } from '../../../../../types';

interface ReceivablesTableProps {
    data: Receivable[];
    loading?: boolean;
    onSettled: () => void;
    pagination?: TableProps<Receivable>['pagination'];
    size?: TableProps<Receivable>['size'];
}

export function ReceivablesTable({
    data,
    loading,
    onSettled,
    pagination = { pageSize: 10 },
    size,
}: ReceivablesTableProps) {
    const { runAsync: markReceivablePaid, loading: marking } = useRequest(updateAccountPayment, {
        manual: true,
        onSuccess: () => {
            message.success('账款状态已更新');
            onSettled();
        },
        onError: (e) => message.error(e.message),
    });

    const columns: ColumnsType<Receivable> = [
        {
            title: '订单号',
            dataIndex: 'order_no',
            width: 180,
            render: (text, record) => (
                <div className="space-y-1">
                    <span className="font-mono text-gray-500">{text}</span>
                    <div>
                        <SourceTypeTag sourceType={record.source_type} />
                    </div>
                </div>
            ),
        },
        {
            title: '客户',
            width: 240,
            render: (_, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {record.customer_name}
                    </div>
                    <div className="text-xs text-gray-400">
                        {record.customer_phone || '未留手机号'}
                    </div>
                </div>
            ),
        },
        {
            title: '明细',
            width: 140,
            render: (_, record) => (
                <span className="text-gray-500 dark:text-gray-400">
                    {record.detail_summary ||
                        `${record.line_count} 条 / ${record.total_quantity} 件`}
                </span>
            ),
        },
        {
            title: '待收金额',
            dataIndex: 'amount',
            width: 140,
            align: 'right',
            render: (amount) => (
                <span className="font-mono font-black text-blue-600">{formatPrice(amount)}</span>
            ),
        },
        {
            title: '交付状态',
            dataIndex: 'delivery_status',
            width: 110,
            render: (_, record) => (
                <DeliveryStatusTag
                    status={record.delivery_status}
                    sourceType={record.source_type}
                />
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
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
                    <Popconfirm
                        title="确认客户已付款？"
                        okText="确认"
                        cancelText="取消"
                        onConfirm={() => markReceivablePaid('receivable', record.id, true)}
                    >
                        <Button type="link" loading={marking} icon={<CheckCircleOutlined />}>
                            标记已收
                        </Button>
                    </Popconfirm>
                    {record.delivery_status === 'undelivered' && (
                        <Tooltip title="交付和扣库存仍在订单列表处理">
                            <Link href="/admin/dashboard/sales/orders">
                                {record.source_type === 'after_sales' ? '去确认完成' : '去确认交付'}
                            </Link>
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Table<Receivable>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={data}
            pagination={pagination}
            size={size}
            scroll={{ x: 1220 }}
        />
    );
}
