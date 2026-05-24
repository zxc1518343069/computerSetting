'use client';

import { formatDate, formatPrice } from '@/utils';
import {
    CheckCircleOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
    WalletOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, message, Popconfirm, Table, Tabs, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import React from 'react';
import { AccountsOverview, fetchAccountsOverview, updateAccountPayment } from '../../services';

type Payable = AccountsOverview['payables'][number];
type Receivable = AccountsOverview['receivables'][number];

export default function AccountsPage() {
    const {
        data = { payables: [], receivables: [], summary: emptySummary },
        loading,
        refresh,
    } = useRequest(fetchAccountsOverview);

    const { runAsync: markPaid, loading: marking } = useRequest(updateAccountPayment, {
        manual: true,
        onSuccess: () => {
            message.success('账款状态已更新');
            refresh();
        },
        onError: (e) => message.error(e.message),
    });

    const payableColumns: ColumnsType<Payable> = [
        {
            title: '入库单',
            dataIndex: 'id',
            width: 100,
            render: (id) => <span className="font-mono text-gray-400">#{id}</span>,
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
                    {record.line_count} 条 / {record.total_quantity} 件
                </span>
            ),
        },
        {
            title: '货款/费用',
            width: 180,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>货款 {formatPrice(record.goods_amount)}</div>
                    <div>
                        运费 {formatPrice(record.shipping_fee)} / 杂费{' '}
                        {formatPrice(record.misc_fee)}
                    </div>
                </div>
            ),
        },
        {
            title: '待付金额',
            dataIndex: 'amount',
            width: 140,
            align: 'right',
            render: (amount) => (
                <span className="font-mono font-black text-red-500">{formatPrice(amount)}</span>
            ),
        },
        {
            title: '入库时间',
            dataIndex: 'inbound_at',
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
            width: 130,
            align: 'center',
            render: (_, record) => (
                <Popconfirm
                    title="确认已向商家付款？"
                    okText="确认"
                    cancelText="取消"
                    onConfirm={() => markPaid('payable', record.id, true)}
                >
                    <Button type="link" loading={marking} icon={<CheckCircleOutlined />}>
                        标记已付
                    </Button>
                </Popconfirm>
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
                            汇总入库未付款和订单未收款；库存结算仍在订单列表中处理。
                        </p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={refresh} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SummaryCard
                        icon={<WalletOutlined />}
                        label={`待付款 ${data.summary.payable_count} 笔`}
                        amount={data.summary.payable_amount}
                        tone="red"
                    />
                    <SummaryCard
                        icon={<ShoppingCartOutlined />}
                        label={`待收款 ${data.summary.receivable_count} 笔`}
                        amount={data.summary.receivable_amount}
                        tone="blue"
                    />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Tabs
                        items={[
                            {
                                key: 'payables',
                                label: `待付 ${data.summary.payable_count}`,
                                children: (
                                    <Table
                                        rowKey="id"
                                        loading={loading}
                                        columns={payableColumns}
                                        dataSource={data.payables}
                                        pagination={{ pageSize: 10 }}
                                        scroll={{ x: 1100 }}
                                    />
                                ),
                            },
                            {
                                key: 'receivables',
                                label: `待收 ${data.summary.receivable_count}`,
                                children: (
                                    <Table
                                        rowKey="id"
                                        loading={loading}
                                        columns={receivableColumns}
                                        dataSource={data.receivables}
                                        pagination={{ pageSize: 10 }}
                                        scroll={{ x: 1100 }}
                                    />
                                ),
                            },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}

const emptySummary = {
    payable_count: 0,
    receivable_count: 0,
    payable_amount: 0,
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
    tone: 'red' | 'blue';
}) {
    const colorClass = tone === 'red' ? 'text-red-500' : 'text-blue-600 dark:text-blue-400';

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
