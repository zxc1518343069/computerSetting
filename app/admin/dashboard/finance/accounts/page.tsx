'use client';

import { formatDate, formatPrice } from '@/utils';
import {
    CheckCircleOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
    UnorderedListOutlined,
    WalletOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Button,
    DatePicker,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Popconfirm,
    Segmented,
    Table,
    Tabs,
    Tag,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import {
    AccountsOverview,
    createPurchasePayment,
    createPurchaseRefund,
    fetchAccountsOverview,
    updateAccountPayment,
} from '../../services';

type Payable = AccountsOverview['payables'][number];
type Receivable = AccountsOverview['receivables'][number];
type SupplierAccount = AccountsOverview['supplier_accounts'][number];
type CustomerAccount = AccountsOverview['customer_accounts'][number];

export default function AccountsPage() {
    const [view, setView] = useState<'summary' | 'detail'>('summary');
    const [summaryType, setSummaryType] = useState<'supplier' | 'customer'>('supplier');
    const [detailType, setDetailType] = useState<'payables' | 'receivables'>('payables');
    const [supplierFilter, setSupplierFilter] = useState<number | null>(null);
    const [customerFilter, setCustomerFilter] = useState<number | null>(null);
    const [customerKeyFilter, setCustomerKeyFilter] = useState<string | null>(null);
    const [paymentTarget, setPaymentTarget] = useState<Payable | null>(null);
    const [refundTarget, setRefundTarget] = useState<Payable | null>(null);
    const [paymentForm] = Form.useForm();
    const [refundForm] = Form.useForm();

    const {
        data = {
            supplier_accounts: [],
            customer_accounts: [],
            payables: [],
            receivables: [],
            summary: emptySummary,
        },
        loading,
        refresh,
    } = useRequest(fetchAccountsOverview);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const nextView = params.get('view');
        const nextType = params.get('type');
        const supplierId = Number(params.get('supplier_id') || 0);
        const customerId = Number(params.get('customer_id') || 0);

        if (nextView === 'detail') setView('detail');
        if (nextView === 'summary') setView('summary');
        if (nextType === 'customer') {
            setSummaryType('customer');
            setDetailType('receivables');
        }
        if (nextType === 'supplier') {
            setSummaryType('supplier');
            setDetailType('payables');
        }
        if (supplierId) setSupplierFilter(supplierId);
        if (customerId) {
            setCustomerFilter(customerId);
            setCustomerKeyFilter(null);
        }
    }, []);

    const { runAsync: markPaid, loading: marking } = useRequest(updateAccountPayment, {
        manual: true,
        onSuccess: () => {
            message.success('账款状态已更新');
            refresh();
        },
        onError: (e) => message.error(e.message),
    });

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
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitPurchaseRefund, loading: refunding } = useRequest(
        async () => {
            if (!refundTarget) return;
            const values = await refundForm.validateFields();
            await createPurchaseRefund(refundTarget.id, {
                amount: values.amount,
                refund_account: values.refund_account || null,
                refunded_at: values.refunded_at?.toISOString(),
                note: values.note || null,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('退款记录已添加');
                setRefundTarget(null);
                refundForm.resetFields();
                refresh();
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

    const openRefund = (record: Payable) => {
        setRefundTarget(record);
        refundForm.resetFields();
        refundForm.setFieldsValue({
            amount: record.pending_refund,
            refunded_at: dayjs(),
        });
    };

    const filteredSupplierAccounts = useMemo(
        () =>
            supplierFilter
                ? data.supplier_accounts.filter((item) => item.supplier_id === supplierFilter)
                : data.supplier_accounts,
        [data.supplier_accounts, supplierFilter]
    );

    const filteredCustomerAccounts = useMemo(
        () =>
            customerFilter
                ? data.customer_accounts.filter((item) => item.customer_id === customerFilter)
                : customerKeyFilter
                  ? data.customer_accounts.filter((item) => item.customer_key === customerKeyFilter)
                : data.customer_accounts,
        [customerFilter, customerKeyFilter, data.customer_accounts]
    );

    const filteredPayables = useMemo(
        () =>
            supplierFilter
                ? data.payables.filter((item) => item.supplier_id === supplierFilter)
                : data.payables,
        [data.payables, supplierFilter]
    );

    const filteredReceivables = useMemo(
        () =>
            customerFilter
                ? data.receivables.filter((item) => item.customer_id === customerFilter)
                : customerKeyFilter
                  ? data.receivables.filter((item) => item.customer_key === customerKeyFilter)
                : data.receivables,
        [customerFilter, customerKeyFilter, data.receivables]
    );

    const supplierAccountColumns: ColumnsType<SupplierAccount> = [
        {
            title: '商家',
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
            title: '未结进货单',
            dataIndex: 'order_count',
            width: 130,
            render: (count) => `${count || 0} 单`,
        },
        {
            title: '应付/已付',
            width: 220,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>应付 {formatPrice(record.payable_amount)}</div>
                    <div>已付 {formatPrice(record.paid_amount)}</div>
                    <div>已退款 {formatPrice(record.refunded_amount)}</div>
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
                            退 {formatPrice(record.pending_refund)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: '最近下单',
            dataIndex: 'latest_ordered_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 200,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        type="link"
                        onClick={() => {
                            setSupplierFilter(record.supplier_id || null);
                            setView('detail');
                            setDetailType('payables');
                        }}
                    >
                        查看明细
                    </Button>
                    <Link href="/admin/dashboard/warehouse/purchase-orders">进货单</Link>
                </div>
            ),
        },
    ];

    const customerAccountColumns: ColumnsType<CustomerAccount> = [
        {
            title: '客户',
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
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        type="link"
                        onClick={() => {
                            setCustomerFilter(record.customer_id || null);
                            setCustomerKeyFilter(record.customer_id ? null : record.customer_key);
                            setView('detail');
                            setDetailType('receivables');
                        }}
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

    const payableColumns: ColumnsType<Payable> = [
        {
            title: '进货单',
            dataIndex: 'id',
            width: 100,
            render: (id) => <span className="font-mono text-gray-400">JH-{id}</span>,
        },
        {
            title: '商家',
            dataIndex: 'supplier_name',
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
                    <div>
                        退货扣减 {formatPrice(record.return_amount)} / 已退款{' '}
                        {formatPrice(record.refunded_amount)}
                    </div>
                </div>
            ),
        },
        {
            title: '待处理金额',
            width: 150,
            align: 'right',
            render: (_, record) =>
                record.pending_refund > 0 ? (
                    <span className="font-mono font-black text-orange-500">
                        退 {formatPrice(record.pending_refund)}
                    </span>
                ) : (
                    <span className="font-mono font-black text-red-500">
                        付 {formatPrice(record.pending_payment)}
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
            render: (_, record) =>
                record.pending_refund > 0 ? (
                    <Tag color="red">待退款</Tag>
                ) : (
                    <Tag color="orange">待付款</Tag>
                ),
        },
        {
            title: '操作',
            width: 150,
            align: 'center',
            render: (_, record) =>
                record.pending_refund > 0 ? (
                    <Button type="link" onClick={() => openRefund(record)}>
                        登记退款
                    </Button>
                ) : (
                    <Button type="link" onClick={() => openPayment(record)}>
                        登记付款
                    </Button>
                ),
        },
    ];

    const receivableColumns: ColumnsType<Receivable> = [
        {
            title: '订单号',
            dataIndex: 'order_no',
            width: 180,
            render: (text) => <span className="font-mono text-gray-500">{text}</span>,
        },
        {
            title: '客户',
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
                    {record.line_count} 条 / {record.total_quantity} 件
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
            title: '订单状态',
            dataIndex: 'status',
            width: 110,
            render: (status) => (
                <Tag color={status === 'completed' ? 'green' : 'orange'}>
                    {status === 'completed' ? '已结算' : '待结算'}
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
            width: 210,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Popconfirm
                        title="确认客户已付款？"
                        okText="确认"
                        cancelText="取消"
                        onConfirm={() => markPaid('receivable', record.id, true)}
                    >
                        <Button type="link" loading={marking} icon={<CheckCircleOutlined />}>
                            标记已收
                        </Button>
                    </Popconfirm>
                    {record.status === 'pending' && (
                        <Tooltip title="库存结算仍在订单列表处理">
                            <Link href="/admin/dashboard/sales/orders">去结算</Link>
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10 relative overflow-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <WalletOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Finance
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            账款管理
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            汇总进货待付款、供应商待退款和订单未收款。
                        </p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={refresh} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SummaryCard
                        icon={<WalletOutlined />}
                        label={`待付款 ${data.summary.payable_count} 笔`}
                        amount={data.summary.payable_amount}
                        tone="red"
                    />
                    <SummaryCard
                        icon={<WalletOutlined />}
                        label={`待退款 ${data.summary.refund_count} 笔`}
                        amount={data.summary.refund_amount}
                        tone="orange"
                    />
                    <SummaryCard
                        icon={<ShoppingCartOutlined />}
                        label={`待收款 ${data.summary.receivable_count} 笔`}
                        amount={data.summary.receivable_amount}
                        tone="blue"
                    />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <Segmented
                            value={view}
                            onChange={(value) => setView(value as 'summary' | 'detail')}
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
                        {(supplierFilter || customerFilter || customerKeyFilter) && (
                            <Button
                                size="small"
                                onClick={() => {
                                    setSupplierFilter(null);
                                    setCustomerFilter(null);
                                    setCustomerKeyFilter(null);
                                }}
                            >
                                清除筛选
                            </Button>
                        )}
                    </div>

                    {view === 'summary' ? (
                        <Tabs
                            activeKey={summaryType}
                            onChange={(key) => setSummaryType(key as 'supplier' | 'customer')}
                            items={[
                                {
                                    key: 'supplier',
                                    label: `应付商家 ${filteredSupplierAccounts.length}`,
                                    children: (
                                        <Table
                                            rowKey={(record) =>
                                                String(record.supplier_id || record.supplier_name)
                                            }
                                            loading={loading}
                                            columns={supplierAccountColumns}
                                            dataSource={filteredSupplierAccounts}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1100 }}
                                            expandable={{
                                                expandedRowRender: (record) => (
                                                    <Table
                                                        rowKey="id"
                                                        columns={payableColumns}
                                                        dataSource={record.orders}
                                                        pagination={false}
                                                        size="small"
                                                        scroll={{ x: 1100 }}
                                                    />
                                                ),
                                            }}
                                        />
                                    ),
                                },
                                {
                                    key: 'customer',
                                    label: `应收客户 ${filteredCustomerAccounts.length}`,
                                    children: (
                                        <Table
                                            rowKey="customer_key"
                                            loading={loading}
                                            columns={customerAccountColumns}
                                            dataSource={filteredCustomerAccounts}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1100 }}
                                            expandable={{
                                                expandedRowRender: (record) => (
                                                    <Table
                                                        rowKey="id"
                                                        columns={receivableColumns}
                                                        dataSource={record.orders}
                                                        pagination={false}
                                                        size="small"
                                                        scroll={{ x: 1100 }}
                                                    />
                                                ),
                                            }}
                                        />
                                    ),
                                },
                            ]}
                        />
                    ) : (
                        <Tabs
                            activeKey={detailType}
                            onChange={(key) => setDetailType(key as 'payables' | 'receivables')}
                            items={[
                                {
                                    key: 'payables',
                                    label: `进货应付/退款 ${filteredPayables.length}`,
                                    children: (
                                        <Table
                                            rowKey="id"
                                            loading={loading}
                                            columns={payableColumns}
                                            dataSource={filteredPayables}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1100 }}
                                        />
                                    ),
                                },
                                {
                                    key: 'receivables',
                                    label: `销售待收 ${filteredReceivables.length}`,
                                    children: (
                                        <Table
                                            rowKey="id"
                                            loading={loading}
                                            columns={receivableColumns}
                                            dataSource={filteredReceivables}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1100 }}
                                        />
                                    ),
                                },
                            ]}
                        />
                    )}
                </div>
            </div>

            <Modal
                title={paymentTarget ? `登记 JH-${paymentTarget.id} 付款` : '登记付款'}
                open={Boolean(paymentTarget)}
                onCancel={() => setPaymentTarget(null)}
                onOk={submitPurchasePayment}
                confirmLoading={paying}
                destroyOnHidden
                width={620}
            >
                <Form form={paymentForm} layout="vertical" className="pt-4">
                    {paymentTarget && (
                        <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-black/20">
                            <div className="grid grid-cols-2 gap-3">
                                <ReadonlyCell
                                    label="应付款"
                                    value={formatPrice(paymentTarget.payable_amount)}
                                    strong
                                />
                                <ReadonlyCell
                                    label="待付款"
                                    value={formatPrice(paymentTarget.pending_payment)}
                                    strong
                                />
                            </div>
                        </div>
                    )}
                    <Form.Item
                        name="amount"
                        label="本次付款金额"
                        rules={[{ required: true, message: '请输入本次付款金额' }]}
                    >
                        <InputNumber
                            min={0.01}
                            max={paymentTarget?.pending_payment}
                            precision={2}
                            prefix="¥"
                            className="w-full"
                        />
                    </Form.Item>
                    <Form.Item name="payment_account" label="付款账号">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="paid_at"
                        label="付款时间"
                        rules={[{ required: true, message: '请选择付款时间' }]}
                    >
                        <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={refundTarget ? `登记 JH-${refundTarget.id} 退款` : '登记退款'}
                open={Boolean(refundTarget)}
                onCancel={() => setRefundTarget(null)}
                onOk={submitPurchaseRefund}
                confirmLoading={refunding}
                destroyOnHidden
                width={620}
            >
                <Form form={refundForm} layout="vertical" className="pt-4">
                    {refundTarget && (
                        <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-black/20">
                            <div className="grid grid-cols-2 gap-3">
                                <ReadonlyCell
                                    label="净付款"
                                    value={formatPrice(refundTarget.net_paid)}
                                    strong
                                />
                                <ReadonlyCell
                                    label="待退款"
                                    value={formatPrice(refundTarget.pending_refund)}
                                    strong
                                />
                            </div>
                        </div>
                    )}
                    <Form.Item
                        name="amount"
                        label="本次退款金额"
                        rules={[{ required: true, message: '请输入本次退款金额' }]}
                    >
                        <InputNumber
                            min={0.01}
                            max={refundTarget?.pending_refund}
                            precision={2}
                            prefix="¥"
                            className="w-full"
                        />
                    </Form.Item>
                    <Form.Item name="refund_account" label="退款账号">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="refunded_at"
                        label="退款时间"
                        rules={[{ required: true, message: '请选择退款时间' }]}
                    >
                        <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

function ReadonlyCell({
    label,
    value,
    strong,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div>
            <div className="text-xs text-gray-400">{label}</div>
            <div
                className={`mt-1 font-mono font-black ${
                    strong ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                }`}
            >
                {value}
            </div>
        </div>
    );
}

const emptySummary = {
    payable_count: 0,
    refund_count: 0,
    receivable_count: 0,
    payable_amount: 0,
    refund_amount: 0,
    receivable_amount: 0,
};

function SummaryCard({
    icon,
    label,
    amount,
    tone,
}: {
    icon: React.ReactNode;
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
