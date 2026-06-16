import { formatDate, formatPrice } from '@/utils';
import { useRequest } from 'ahooks';
import { Button, Form, message, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { createPurchaseReturnRefund } from '../../../../../../../services';
import { ReturnRefundModal } from './ReturnRefundModal';
import type { ReturnRefund } from '../../../../../types';

interface ReturnRefundsTableProps {
    data: ReturnRefund[];
    loading?: boolean;
    onSettled: () => void;
    pagination?: TableProps<ReturnRefund>['pagination'];
    size?: TableProps<ReturnRefund>['size'];
}

export function ReturnRefundsTable({
    data,
    loading,
    onSettled,
    pagination = { pageSize: 10 },
    size,
}: ReturnRefundsTableProps) {
    const [refundTarget, setRefundTarget] = useState<ReturnRefund | null>(null);
    const [refundForm] = Form.useForm();
    const { runAsync: submitPurchaseRefund, loading: refunding } = useRequest(
        async () => {
            if (!refundTarget) return;
            const values = await refundForm.validateFields();
            await createPurchaseReturnRefund(refundTarget.id, {
                amount: values.amount,
                refund_account: values.refund_account || null,
                refunded_at: values.refunded_at?.toISOString(),
                note: values.note || null,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('退货收款记录已添加');
                setRefundTarget(null);
                refundForm.resetFields();
                onSettled();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const openRefund = (record: ReturnRefund) => {
        setRefundTarget(record);
        refundForm.resetFields();
        refundForm.setFieldsValue({
            amount: record.pending_refund,
            refunded_at: dayjs(),
        });
    };

    const columns: ColumnsType<ReturnRefund> = [
        {
            title: '退货单',
            dataIndex: 'id',
            width: 100,
            render: (id) => <span className="font-mono text-gray-400">TH-{id}</span>,
        },
        {
            title: '关联单号',
            width: 150,
            render: (_, record) => (
                <div className="space-y-1">
                    <Tag color="blue">JH-{record.purchase_order_id}</Tag>
                    <Tag color="purple">RK-{record.inbound_order_id}</Tag>
                </div>
            ),
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
            title: '退货/应收',
            width: 220,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>商品 {formatPrice(record.return_amount)}</div>
                    <div>商家运费 {formatPrice(record.merchant_shipping_fee)}</div>
                    <div>应收 {formatPrice(record.receivable_amount)}</div>
                </div>
            ),
        },
        {
            title: '已收/待收',
            width: 170,
            align: 'right',
            render: (_, record) => (
                <div className="space-y-1 font-mono font-black">
                    <div className="text-gray-500">{formatPrice(record.refunded_amount)}</div>
                    <div className="text-orange-500">{formatPrice(record.pending_refund)}</div>
                </div>
            ),
        },
        {
            title: '状态',
            width: 140,
            render: (_, record) => (
                <Tag color={record.refund_status === 'partial_refunded' ? 'blue' : 'orange'}>
                    {record.refund_status === 'partial_refunded' ? '部分退款' : '未退款'}
                </Tag>
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
            width: 170,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Button type="link" onClick={() => openRefund(record)}>
                    登记收款
                </Button>
            ),
        },
    ];

    return (
        <>
            <Table<ReturnRefund>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                size={size}
                scroll={{ x: 1400 }}
            />
            <ReturnRefundModal
                target={refundTarget}
                form={refundForm}
                loading={refunding}
                submit={submitPurchaseRefund}
                close={() => setRefundTarget(null)}
            />
        </>
    );
}
