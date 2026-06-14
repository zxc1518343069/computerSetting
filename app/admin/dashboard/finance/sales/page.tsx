'use client';

import { OperatingCost, SalesOrder } from '@/const/types';
import { formatPrice } from '@/utils';
import {
    BarChartOutlined,
    CarOutlined,
    LineChartOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
    WalletOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, DatePicker, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { fetchLogisticsStats, fetchOperatingCosts, fetchOrders } from '../../services';

export default function FinanceSalesPage() {
    const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
    const monthRange = useMemo(
        () => ({
            date_from: dayjs(month).startOf('month').startOf('day').toISOString(),
            date_to: dayjs(month).endOf('month').endOf('day').toISOString(),
        }),
        [month]
    );

    const {
        data: orders = [],
        loading: ordersLoading,
        refresh: refreshOrders,
    } = useRequest(() => fetchOrders({ delivery_status: 'delivered' }), {
        refreshDeps: [month],
    });

    const {
        data: costs = [],
        loading: costsLoading,
        refresh: refreshCosts,
    } = useRequest(() => fetchOperatingCosts({ month }), {
        refreshDeps: [month],
    });

    const {
        data: logisticsStats,
        loading: logisticsLoading,
        refresh: refreshLogistics,
    } = useRequest(() => fetchLogisticsStats(monthRange), {
        refreshDeps: [monthRange],
    });

    const filteredOrders = useMemo(
        () =>
            (orders as SalesOrder[]).filter((order) => {
                const soldAt =
                    order.delivered_at || order.sold_at || order.updated_at || order.created_at;
                return soldAt ? dayjs(soldAt).format('YYYY-MM') === month : false;
            }),
        [orders, month]
    );

    const metrics = useMemo(() => {
        const salesAmount = filteredOrders.reduce(
            (sum, order) => sum + Number(order.final_amount || 0),
            0
        );
        const productCost = filteredOrders.reduce(
            (sum, order) => sum + Number(order.cost_amount || 0),
            0
        );
        const grossProfit = salesAmount - productCost;
        const logisticsCost = Number(logisticsStats?.summary.self_amount || 0);
        const operatingCost = (costs as OperatingCost[]).reduce(
            (sum, cost) => sum + Number(cost.amount || 0),
            0
        );
        const totalCost = productCost + logisticsCost + operatingCost;
        const netProfit = salesAmount - totalCost;
        const averageOrderAmount = filteredOrders.length ? salesAmount / filteredOrders.length : 0;
        const grossMargin = salesAmount ? (grossProfit / salesAmount) * 100 : 0;
        const netMargin = salesAmount ? (netProfit / salesAmount) * 100 : 0;
        const costRatio = salesAmount ? (totalCost / salesAmount) * 100 : 0;

        return {
            orderCount: filteredOrders.length,
            salesAmount,
            productCost,
            grossProfit,
            logisticsCost,
            logisticsRecordCount: Number(logisticsStats?.summary.record_count || 0),
            operatingCost,
            operatingCostCount: (costs as OperatingCost[]).length,
            totalCost,
            netProfit,
            averageOrderAmount,
            grossMargin,
            netMargin,
            costRatio,
        };
    }, [filteredOrders, costs, logisticsStats]);

    const columns: ColumnsType<SalesOrder> = [
        {
            title: '订单号',
            dataIndex: 'order_no',
            render: (text) => <span className="font-mono text-gray-500">{text}</span>,
        },
        {
            title: '客户',
            dataIndex: 'customer_name',
        },
        {
            title: '成交金额',
            dataIndex: 'final_amount',
            align: 'right',
            render: (amount) => formatPrice(Number(amount)),
        },
        {
            title: '商品成本',
            dataIndex: 'cost_amount',
            align: 'right',
            render: (amount) => formatPrice(Number(amount || 0)),
        },
        {
            title: '商品毛利',
            dataIndex: 'profit_amount',
            align: 'right',
            render: (amount) => (
                <span className="text-emerald-500 font-bold">
                    {formatPrice(Number(amount || 0))}
                </span>
            ),
        },
        {
            title: '交付状态',
            dataIndex: 'delivery_status',
            render: () => <Tag color="green">已交付</Tag>,
        },
    ];

    const refresh = () => {
        refreshOrders();
        refreshCosts();
        refreshLogistics();
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10 relative overflow-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <LineChartOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Finance
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            销售数据
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            按月份汇总已交付订单、商品成本、物流成本、经营成本和净利润。
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <DatePicker
                            picker="month"
                            value={dayjs(month)}
                            onChange={(date) =>
                                setMonth(date ? date.format('YYYY-MM') : dayjs().format('YYYY-MM'))
                            }
                        />
                        <Button icon={<ReloadOutlined />} onClick={refresh} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                    <ProfitOverviewCard
                        month={month}
                        netProfit={metrics.netProfit}
                        netMargin={metrics.netMargin}
                        grossProfit={metrics.grossProfit}
                        logisticsCost={metrics.logisticsCost}
                        operatingCost={metrics.operatingCost}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-8 xl:grid-cols-4">
                        <MetricCard
                            icon={<ShoppingCartOutlined />}
                            label="销售收入"
                            value={formatPrice(metrics.salesAmount)}
                            helper={`${metrics.orderCount} 笔 | 客单 ${formatPrice(metrics.averageOrderAmount)}`}
                            tone="blue"
                        />
                        <MetricCard
                            icon={<WalletOutlined />}
                            label="商品成本"
                            value={formatPrice(metrics.productCost)}
                            helper={`商品毛利 ${formatPrice(metrics.grossProfit)}`}
                            tone="red"
                        />
                        <MetricCard
                            icon={<CarOutlined />}
                            label="物流成本"
                            value={formatPrice(metrics.logisticsCost)}
                            helper={`${metrics.logisticsRecordCount} 条物流记录`}
                            tone="orange"
                            href="/admin/dashboard/warehouse/logistics"
                        />
                        <MetricCard
                            icon={<BarChartOutlined />}
                            label="经营成本"
                            value={formatPrice(metrics.operatingCost)}
                            helper={`${metrics.operatingCostCount} 条成本 | 总成本 ${formatPercent(metrics.costRatio)}`}
                            tone="red"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={ordersLoading || costsLoading || logisticsLoading}
                        columns={columns}
                        dataSource={filteredOrders}
                        pagination={{ pageSize: 10 }}
                    />
                </div>
            </div>
        </div>
    );
}

function ProfitOverviewCard({
    month,
    netProfit,
    netMargin,
    grossProfit,
    logisticsCost,
    operatingCost,
}: {
    month: string;
    netProfit: number;
    netMargin: number;
    grossProfit: number;
    logisticsCost: number;
    operatingCost: number;
}) {
    const isPositive = netProfit >= 0;

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1f1f1f] xl:col-span-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                        <LineChartOutlined />
                        <span>{month} 净利润</span>
                    </div>
                    <div
                        className={`mt-4 break-all font-mono text-4xl font-black leading-tight tracking-normal ${
                            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                        }`}
                    >
                        {formatPrice(netProfit)}
                    </div>
                </div>
                <Tag color={isPositive ? 'green' : 'red'} className="m-0 rounded-full px-3 py-1">
                    净利率 {formatPercent(netMargin)}
                </Tag>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 text-sm dark:border-gray-800 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <ProfitFormulaItem label="商品毛利" value={formatPrice(grossProfit)} tone="green" />
                <ProfitFormulaItem label="物流成本" value={formatPrice(logisticsCost)} tone="red" />
                <ProfitFormulaItem label="经营成本" value={formatPrice(operatingCost)} tone="red" />
            </div>
        </div>
    );
}

function ProfitFormulaItem({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: 'green' | 'red';
}) {
    const toneClass = tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500';

    return (
        <div>
            <div className="text-xs text-gray-400">{label}</div>
            <div className={`mt-1 break-all font-mono text-base font-black ${toneClass}`}>
                {value}
            </div>
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
    helper,
    tone,
    href,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    helper: string;
    tone: 'blue' | 'red' | 'orange' | 'green';
    href?: string;
}) {
    const toneClass = {
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
        red: 'text-red-500 bg-red-50 dark:bg-red-500/10',
        orange: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10',
        green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    }[tone];
    const valueClass = {
        blue: 'text-gray-900 dark:text-gray-100',
        red: 'text-red-500',
        orange: 'text-orange-500',
        green: 'text-emerald-600 dark:text-emerald-400',
    }[tone];
    const content = (
        <>
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-gray-400">{label}</div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
                    {icon}
                </div>
            </div>
            <div
                className={`mt-4 min-h-8 break-all font-mono text-2xl font-black leading-tight ${valueClass}`}
            >
                {value}
            </div>
            <div className="mt-3 break-words text-xs font-medium text-gray-500 dark:text-gray-400">
                {helper}
            </div>
        </>
    );

    const className =
        'block h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-[#1f1f1f] dark:hover:border-blue-500/40';

    return href ? (
        <Link href={href} className={className}>
            {content}
        </Link>
    ) : (
        <div className={className}>{content}</div>
    );
}

function formatPercent(value: number) {
    if (!Number.isFinite(value)) {
        return '0.0%';
    }
    return `${value.toFixed(1)}%`;
}
