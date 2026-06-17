import { formatDate, formatPrice } from '@/utils';
import { useRequest } from 'ahooks';
import { Button, Form, message, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { createPurchasePayment } from '@/app/admin/dashboard/finance/accounts/services';
import { PurchasePaymentModal } from './PurchasePaymentModal';
import type { Payable } from '../../../../../types';

interface PayablesTableProps {
    data: Payable[];
    loading?: boolean;
    onSettled: () => void;
    pagination?: TableProps<Payable>['pagination'];
    size?: TableProps<Payable>['size'];
}

export function PayablesTable({
    data,
    loading,
    onSettled,
    pagination = { pageSize: 10 },
    size,
}: PayablesTableProps) {
    const [paymentTarget, setPaymentTarget] = useState<Payable | null>(null);
    const [paymentForm] = Form.useForm();
    const { runAsync: submitPurchasePayment, loading: paying } = useRequest(
        async () => {
            if (!paymentTarget) return;
            const values = await paymentForm.validateFields();
            await createPurchasePayment(paymentTarget.id, {
                amount: values.amount,
                payment_account: values.payment_account || null,
                paid_at: values.paid_at?.toISOString(),
                note: values.note || null,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('付款记录已添加');
                setPaymentTarget(null);
                paymentForm.resetFields();
                onSettled();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const openPayment = (record: Payable) => {
        setPaymentTarget(record);
        paymentForm.resetFields();
        paymentForm.setFieldsValue({
            amount: record.pending_payment,
            paid_at: dayjs(),
        });
    };

    const columns: ColumnsType<Payable> = [
        {
            title: '进货单',
            dataIndex: 'id',
            width: 100,
            render: (id) => <span className="font-mono text-gray-400">JH-{id}</span>,
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
            title: '明细',
            width: 140,
            render: (_, record) => (
                <span className="text-gray-500 dark:text-gray-400">
                    {record.line_count} 条 / 订 {record.total_quantity} / 入{' '}
                    {record.received_quantity}
                </span>
            ),
        },
        {
            title: '应付/已付',
            width: 220,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>应付 {formatPrice(record.payable_amount)}</div>
                    <div>已付 {formatPrice(record.paid_amount)}</div>
                </div>
            ),
        },
        {
            title: '待付款',
            width: 150,
            align: 'right',
            render: (_, record) => (
                <span className="font-mono font-black text-red-500">
                    {formatPrice(record.pending_payment)}
                </span>
            ),
        },
        {
            title: '下单时间',
            dataIndex: 'ordered_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '状态',
            width: 100,
            render: () => <Tag color="orange">待付款</Tag>,
        },
        {
            title: '操作',
            width: 150,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <Button type="link" onClick={() => openPayment(record)}>
                    登记付款
                </Button>
            ),
        },
    ];

    return (
        <>
            <Table<Payable>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                size={size}
                scroll={{ x: 1280 }}
            />
            <PurchasePaymentModal
                target={paymentTarget}
                form={paymentForm}
                loading={paying}
                submit={submitPurchasePayment}
                close={() => setPaymentTarget(null)}
            />
        </>
    );
}
