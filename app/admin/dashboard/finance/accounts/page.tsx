'use client';

import { formatDate, formatPrice } from '@/utils';
import {
    CarOutlined,
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
    createPurchaseReturnRefund,
    fetchAccountsOverview,
    payLogisticsRecord,
    updateAccountPayment,
} from '../../services';

const logisticsTypeMap: Record<string, string> = {
    purchase: '进货物流',
    purchase_return: '采购退货物流',
    manual: '手工记录',
};

type Payable = AccountsOverview['payables'][number];
type ReturnRefund = AccountsOverview['purchase_return_refunds'][number];
type Receivable = AccountsOverview['receivables'][number];
type LogisticsPayable = AccountsOverview['logistics_payables'][number];
type SupplierAccount = AccountsOverview['supplier_accounts'][number];
type LogisticsAccount = AccountsOverview['logistics_accounts'][number];
type CustomerAccount = AccountsOverview['customer_accounts'][number];

export default function AccountsPage() {
    const [view, setView] = useState<'summary' | 'detail'>('summary');
    const [summaryType, setSummaryType] = useState<'supplier' | 'logistics' | 'customer'>(
        'supplier'
    );
    const [detailType, setDetailType] = useState<
        'payables' | 'logistics_payables' | 'return_refunds' | 'receivables'
    >('payables');
    const [supplierFilter, setSupplierFilter] = useState<number | null>(null);
    const [logisticsCompanyFilter, setLogisticsCompanyFilter] = useState<number | null>(null);
    const [customerFilter, setCustomerFilter] = useState<number | null>(null);
    const [customerKeyFilter, setCustomerKeyFilter] = useState<string | null>(null);
    const [paymentTarget, setPaymentTarget] = useState<Payable | null>(null);
    const [logisticsPaymentTarget, setLogisticsPaymentTarget] = useState<LogisticsPayable | null>(
        null
    );
    const [refundTarget, setRefundTarget] = useState<ReturnRefund | null>(null);
    const [paymentForm] = Form.useForm();
    const [logisticsPaymentForm] = Form.useForm();
    const [refundForm] = Form.useForm();

    const {
        data = {
            supplier_accounts: [],
            logistics_accounts: [],
            customer_accounts: [],
            payables: [],
            logistics_payables: [],
            purchase_return_refunds: [],
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
        if (nextType === 'logistics') {
            setSummaryType('logistics');
            setDetailType('logistics_payables');
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

    const { runAsync: submitLogisticsPayment, loading: payingLogistics } = useRequest(
        async () => {
            if (!logisticsPaymentTarget) return;
            const values = await logisticsPaymentForm.validateFields();
            await payLogisticsRecord(logisticsPaymentTarget.id, {
                paid_at: values.paid_at?.toISOString(),
                payment_account: values.payment_account || null,
                note: values.note || null,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('物流付款已登记');
                setLogisticsPaymentTarget(null);
                logisticsPaymentForm.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

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

    const openLogisticsPayment = (record: LogisticsPayable) => {
        setLogisticsPaymentTarget(record);
        logisticsPaymentForm.resetFields();
        logisticsPaymentForm.setFieldsValue({
            paid_at: dayjs(),
        });
    };

    const openReturnRefund = (record: ReturnRefund) => {
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

    const filteredLogisticsAccounts = useMemo(
        () =>
            logisticsCompanyFilter
                ? data.logistics_accounts.filter(
                      (item) => item.company_id === logisticsCompanyFilter
                  )
                : data.logistics_accounts,
        [data.logistics_accounts, logisticsCompanyFilter]
    );

    const filteredPayables = useMemo(
        () =>
            supplierFilter
                ? data.payables.filter((item) => item.supplier_id === supplierFilter)
                : data.payables,
        [data.payables, supplierFilter]
    );

    const filteredLogisticsPayables = useMemo(
        () =>
            logisticsCompanyFilter
                ? data.logistics_payables.filter(
                      (item) => item.company_id === logisticsCompanyFilter
                  )
                : data.logistics_payables,
        [data.logistics_payables, logisticsCompanyFilter]
    );

    const filteredReturnRefunds = useMemo(
        () =>
            supplierFilter
                ? data.purchase_return_refunds.filter((item) => item.supplier_id === supplierFilter)
                : data.purchase_return_refunds,
        [data.purchase_return_refunds, supplierFilter]
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
                `${record.order_count || 0} 进货 / ${(record.returns || []).length} 退货`,
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
                </div>
            ),
        },
        {
            title: '最近业务',
            dataIndex: 'latest_ordered_at',
            width: 180,
            render: (_, record) =>
                formatDate(
                    [record.latest_ordered_at, record.latest_return_at].filter(Boolean).sort().pop()
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

    const logisticsAccountColumns: ColumnsType<LogisticsAccount> = [
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
                        onClick={() => {
                            setLogisticsCompanyFilter(record.company_id || null);
                            setView('detail');
                            setDetailType('logistics_payables');
                        }}
                    >
                        查看明细
                    </Button>
                    <Link href="/admin/dashboard/warehouse/logistics">物流管理</Link>
                </div>
            ),
        },
    ];

    const customerAccountColumns: ColumnsType<CustomerAccount> = [
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

    const logisticsPayableColumns: ColumnsType<LogisticsPayable> = [
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
                <Button type="link" onClick={() => openLogisticsPayment(record)}>
                    登记付款
                </Button>
            ),
        },
    ];

    const returnRefundColumns: ColumnsType<ReturnRefund> = [
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
                <Button type="link" onClick={() => openReturnRefund(record)}>
                    登记收款
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
            title: '交付状态',
            dataIndex: 'delivery_status',
            width: 110,
            render: (status) => {
                const map = {
                    undelivered: { label: '未交付', color: 'orange' },
                    delivered: { label: '已交付', color: 'green' },
                    cancelled: { label: '已取消', color: 'default' },
                } as const;
                const config = map[status as keyof typeof map] || map.undelivered;
                return <Tag color={config.color}>{config.label}</Tag>;
            },
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
                        onConfirm={() => markPaid('receivable', record.id, true)}
                    >
                        <Button type="link" loading={marking} icon={<CheckCircleOutlined />}>
                            标记已收
                        </Button>
                    </Popconfirm>
                    {record.delivery_status === 'undelivered' && (
                        <Tooltip title="交付和扣库存仍在订单列表处理">
                            <Link href="/admin/dashboard/sales/orders">去确认交付</Link>
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
                            汇总商家待付款、物流待付款、退货待收退款和销售未收款。
                        </p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={refresh} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <SummaryCard
                        icon={<WalletOutlined />}
                        label={`商家待付款 ${data.summary.merchant_payable_count} 笔`}
                        amount={data.summary.merchant_payable_amount}
                        tone="red"
                    />
                    <SummaryCard
                        icon={<CarOutlined />}
                        label={`物流待付款 ${data.summary.logistics_payable_count} 笔`}
                        amount={data.summary.logistics_payable_amount}
                        tone="red"
                    />
                    <SummaryCard
                        icon={<WalletOutlined />}
                        label={`退货待收 ${data.summary.refund_count} 笔`}
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
                        {(supplierFilter ||
                            logisticsCompanyFilter ||
                            customerFilter ||
                            customerKeyFilter) && (
                            <Button
                                size="small"
                                onClick={() => {
                                    setSupplierFilter(null);
                                    setLogisticsCompanyFilter(null);
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
                            onChange={(key) =>
                                setSummaryType(key as 'supplier' | 'logistics' | 'customer')
                            }
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
                                            scroll={{ x: 1200 }}
                                            expandable={{
                                                expandedRowRender: (record) => (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                商家应付
                                                            </div>
                                                            <Table
                                                                rowKey="id"
                                                                columns={payableColumns}
                                                                dataSource={record.orders}
                                                                pagination={false}
                                                                size="small"
                                                                scroll={{ x: 1280 }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                退货待收
                                                            </div>
                                                            <Table
                                                                rowKey="id"
                                                                columns={returnRefundColumns}
                                                                dataSource={record.returns}
                                                                pagination={false}
                                                                size="small"
                                                                scroll={{ x: 1400 }}
                                                            />
                                                        </div>
                                                    </div>
                                                ),
                                            }}
                                        />
                                    ),
                                },
                                {
                                    key: 'logistics',
                                    label: `应付物流 ${filteredLogisticsAccounts.length}`,
                                    children: (
                                        <Table
                                            rowKey={(record) =>
                                                String(record.company_id || record.company_name)
                                            }
                                            loading={loading}
                                            columns={logisticsAccountColumns}
                                            dataSource={filteredLogisticsAccounts}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1000 }}
                                            expandable={{
                                                expandedRowRender: (record) => (
                                                    <Table
                                                        rowKey="id"
                                                        columns={logisticsPayableColumns}
                                                        dataSource={record.records}
                                                        pagination={false}
                                                        size="small"
                                                        scroll={{ x: 1200 }}
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
                                                        scroll={{ x: 1220 }}
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
                            onChange={(key) =>
                                setDetailType(
                                    key as
                                        | 'payables'
                                        | 'logistics_payables'
                                        | 'return_refunds'
                                        | 'receivables'
                                )
                            }
                            items={[
                                {
                                    key: 'payables',
                                    label: `商家应付 ${filteredPayables.length}`,
                                    children: (
                                        <Table
                                            rowKey="id"
                                            loading={loading}
                                            columns={payableColumns}
                                            dataSource={filteredPayables}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1280 }}
                                        />
                                    ),
                                },
                                {
                                    key: 'logistics_payables',
                                    label: `物流待付款 ${filteredLogisticsPayables.length}`,
                                    children: (
                                        <Table
                                            rowKey="id"
                                            loading={loading}
                                            columns={logisticsPayableColumns}
                                            dataSource={filteredLogisticsPayables}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1200 }}
                                        />
                                    ),
                                },
                                {
                                    key: 'return_refunds',
                                    label: `退货待收 ${filteredReturnRefunds.length}`,
                                    children: (
                                        <Table
                                            rowKey="id"
                                            loading={loading}
                                            columns={returnRefundColumns}
                                            dataSource={filteredReturnRefunds}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 1400 }}
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
                                            scroll={{ x: 1220 }}
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
                                    label="商家应付款"
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
                title={
                    logisticsPaymentTarget
                        ? `登记 WL-${logisticsPaymentTarget.id} 付款`
                        : '登记物流付款'
                }
                open={Boolean(logisticsPaymentTarget)}
                onCancel={() => setLogisticsPaymentTarget(null)}
                onOk={submitLogisticsPayment}
                confirmLoading={payingLogistics}
                destroyOnHidden
                width={620}
            >
                <Form form={logisticsPaymentForm} layout="vertical" className="pt-4">
                    {logisticsPaymentTarget && (
                        <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-black/20">
                            <div className="grid grid-cols-2 gap-3">
                                <ReadonlyCell
                                    label="物流公司"
                                    value={logisticsPaymentTarget.company?.name || '未指定物流公司'}
                                />
                                <ReadonlyCell
                                    label="待付款"
                                    value={formatPrice(logisticsPaymentTarget.payable_amount)}
                                    strong
                                />
                            </div>
                        </div>
                    )}
                    <Form.Item
                        name="paid_at"
                        label="付款时间"
                        rules={[{ required: true, message: '请选择付款时间' }]}
                    >
                        <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="payment_account" label="付款账号">
                        <Input />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={refundTarget ? `登记 TH-${refundTarget.id} 收款` : '登记退货收款'}
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
                                    label="应收退款"
                                    value={formatPrice(refundTarget.receivable_amount)}
                                    strong
                                />
                                <ReadonlyCell
                                    label="已收退款"
                                    value={formatPrice(refundTarget.refunded_amount)}
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
                        label="本次收款金额"
                        rules={[{ required: true, message: '请输入本次收款金额' }]}
                    >
                        <InputNumber
                            min={0.01}
                            max={refundTarget?.pending_refund}
                            precision={2}
                            prefix="¥"
                            className="w-full"
                        />
                    </Form.Item>
                    <Form.Item name="refund_account" label="收款账号">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="refunded_at"
                        label="收款时间"
                        rules={[{ required: true, message: '请选择收款时间' }]}
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
    merchant_payable_count: 0,
    merchant_payable_amount: 0,
    logistics_payable_count: 0,
    logistics_payable_amount: 0,
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
