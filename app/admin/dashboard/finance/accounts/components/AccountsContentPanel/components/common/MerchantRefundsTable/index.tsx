import { formatDate, formatPrice } from '@/utils';
import { useRequest } from 'ahooks';
import { Button, Form, message, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { createPurchaseMerchantRefundSettlement } from '../../../../../../../services';
import { MerchantRefundSettlementModal } from './MerchantRefundSettlementModal';
import type { MerchantRefund } from '../../../../../types';

interface MerchantRefundsTableProps {
    data: MerchantRefund[];
    loading?: boolean;
    onSettled: () => void;
    pagination?: TableProps<MerchantRefund>['pagination'];
    size?: TableProps<MerchantRefund>['size'];
}

export function MerchantRefundsTable({
    data,
    loading,
    onSettled,
    pagination = { pageSize: 10 },
    size,
}: MerchantRefundsTableProps) {
    const [refundTarget, setRefundTarget] = useState<MerchantRefund | null>(null);
    const [refundForm] = Form.useForm();
    const { runAsync: submitSettlement, loading: settling } = useRequest(
        async () => {
            if (!refundTarget) return;
            const values = await refundForm.validateFields();
            await createPurchaseMerchantRefundSettlement(
                refundTarget.purchase_order_id,
                refundTarget.id,
                {
                    settlement_type: values.settlement_type,
                    amount: values.amount,
                    account: values.account || null,
                    settled_at: values.settled_at?.toISOString(),
                    note: values.note || null,
                }
            );
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('商家返款结算已登记');
                setRefundTarget(null);
                refundForm.resetFields();
                onSettled();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const openSettlement = (record: MerchantRefund) => {
        setRefundTarget(record);
        refundForm.resetFields();
        refundForm.setFieldsValue({
            settlement_type: 'cash',
            amount: record.pending_amount,
            settled_at: dayjs(),
        });
    };

    const columns: ColumnsType<MerchantRefund> = [
        {
            title: '返款单',
            dataIndex: 'id',
            width: 100,
            render: (id) => <span className="font-mono text-gray-400">FK-{id}</span>,
        },
        {
            title: '进货单',
            dataIndex: 'purchase_order_id',
            width: 110,
            render: (id) => <Tag color="blue">JH-{id}</Tag>,
        },
        {
            title: '商家',
            dataIndex: 'supplier_name',
            width: 220,
            render: (text) => (
                <span className="font-bold text-gray-900 dark:text-gray-100">{text}</span>
            ),
        },
        {
            title: '类型',
            dataIndex: 'type',
            width: 120,
            render: (type: MerchantRefund['type']) => (
                <Tag color={type === 'price_protection' ? 'cyan' : 'purple'}>
                    {type === 'price_protection' ? '价格保护' : '返利'}
                </Tag>
            ),
        },
        {
            title: '返款/已结算',
            width: 210,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>返款 {formatPrice(record.amount)}</div>
                    <div>已结算 {formatPrice(record.settled_amount)}</div>
                    {record.offset_amount > 0 && (
                        <div>已抵扣 {formatPrice(record.offset_amount)}</div>
                    )}
                </div>
            ),
        },
        {
            title: '待结算',
            width: 150,
            align: 'right',
            render: (_, record) => (
                <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">
                    {formatPrice(record.pending_amount)}
                </span>
            ),
        },
        {
            title: '发生时间',
            dataIndex: 'occurred_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 170,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Button type="link" onClick={() => openSettlement(record)}>
                    登记结算
                </Button>
            ),
        },
    ];

    return (
        <>
            <Table<MerchantRefund>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                size={size}
                scroll={{ x: 1260 }}
            />
            <MerchantRefundSettlementModal
                target={refundTarget}
                form={refundForm}
                loading={settling}
                submit={submitSettlement}
                close={() => setRefundTarget(null)}
            />
        </>
    );
}
