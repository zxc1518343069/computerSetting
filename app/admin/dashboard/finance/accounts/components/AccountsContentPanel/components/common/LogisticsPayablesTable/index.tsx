import { formatDate, formatPrice } from '@/utils';
import { useRequest } from 'ahooks';
import { Button, Form, message, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { payLogisticsRecord } from '../../../../../../../services';
import { LogisticsPaymentModal } from './LogisticsPaymentModal';
import type { LogisticsPayable } from '../../../../../types';

const logisticsTypeMap: Record<string, string> = {
    purchase: '进货物流',
    purchase_return: '采购退货物流',
    manual: '手工记录',
};

interface LogisticsPayablesTableProps {
    data: LogisticsPayable[];
    loading?: boolean;
    onSettled: () => void;
    pagination?: TableProps<LogisticsPayable>['pagination'];
    size?: TableProps<LogisticsPayable>['size'];
}

export function LogisticsPayablesTable({
    data,
    loading,
    onSettled,
    pagination = { pageSize: 10 },
    size,
}: LogisticsPayablesTableProps) {
    const [paymentTarget, setPaymentTarget] = useState<LogisticsPayable | null>(null);
    const [paymentForm] = Form.useForm();
    const { runAsync: submitLogisticsPayment, loading: paying } = useRequest(
        async () => {
            if (!paymentTarget) return;
            const values = await paymentForm.validateFields();
            await payLogisticsRecord(paymentTarget.id, {
                paid_at: values.paid_at?.toISOString(),
                payment_account: values.payment_account || null,
                note: values.note || null,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('物流付款已登记');
                setPaymentTarget(null);
                paymentForm.resetFields();
                onSettled();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const openPayment = (record: LogisticsPayable) => {
        setPaymentTarget(record);
        paymentForm.resetFields();
        paymentForm.setFieldsValue({
            paid_at: dayjs(),
        });
    };

    const columns: ColumnsType<LogisticsPayable> = [
        {
            title: '物流记录',
            dataIndex: 'id',
            width: 100,
            render: (id) => <span className="font-mono text-gray-400">WL-{id}</span>,
        },
        {
            title: '物流公司',
            width: 260,
            render: (_, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {record.company?.name || '未指定物流公司'}
                    </div>
                    <div className="font-mono text-xs text-gray-400">
                        {record.tracking_no || '无物流单号'}
                    </div>
                </div>
            ),
        },
        {
            title: '类型',
            dataIndex: 'type',
            width: 140,
            render: (type) => <Tag color="blue">{logisticsTypeMap[type] || type}</Tag>,
        },
        {
            title: '运费/我方承担',
            width: 190,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>运费 {formatPrice(record.shipping_fee)}</div>
                    <div>我方承担 {formatPrice(record.self_amount)}</div>
                </div>
            ),
        },
        {
            title: '待付款',
            width: 150,
            align: 'right',
            render: (_, record) => (
                <span className="font-mono font-black text-red-500">
                    {formatPrice(record.payable_amount)}
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
                <Button type="link" onClick={() => openPayment(record)}>
                    登记付款
                </Button>
            ),
        },
    ];

    return (
        <>
            <Table<LogisticsPayable>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={data}
                pagination={pagination}
                size={size}
                scroll={{ x: 1200 }}
            />
            <LogisticsPaymentModal
                target={paymentTarget}
                form={paymentForm}
                loading={paying}
                submit={submitLogisticsPayment}
                close={() => setPaymentTarget(null)}
            />
        </>
    );
}
