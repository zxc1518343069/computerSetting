'use client';

import { OperatingCost, SalesOrder } from '@/const/types';
import { formatPrice } from '@/utils';
import { LineChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, DatePicker, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { fetchOperatingCosts, fetchOrders } from '../../services';

export default function FinanceSalesPage() {
    const [month, setMonth] = useState(dayjs().format('YYYY-MM'));

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
        const operatingCost = (costs as OperatingCost[]).reduce(
            (sum, cost) => sum + Number(cost.amount || 0),
            0
        );
        const netProfit = grossProfit - operatingCost;

        return {
            orderCount: filteredOrders.length,
            salesAmount,
            productCost,
            grossProfit,
            operatingCost,
            netProfit,
        };
    }, [filteredOrders, costs]);

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
            title: '毛利',
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
                            按月份汇总已交付订单、商品成本、经营成本和净利润。
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

                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
                    <MetricCard label="订单数" value={`${metrics.orderCount}`} />
                    <MetricCard label="销售额" value={formatPrice(metrics.salesAmount)} />
                    <MetricCard label="商品成本" value={formatPrice(metrics.productCost)} />
                    <MetricCard label="毛利" value={formatPrice(metrics.grossProfit)} positive />
                    <MetricCard
                        label="经营成本"
                        value={formatPrice(metrics.operatingCost)}
                        negative
                    />
                    <MetricCard
                        label="净利润"
                        value={formatPrice(metrics.netProfit)}
                        positive={metrics.netProfit >= 0}
                        negative={metrics.netProfit < 0}
                    />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={ordersLoading || costsLoading}
                        columns={columns}
                        dataSource={filteredOrders}
                        pagination={{ pageSize: 10 }}
                    />
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    positive,
    negative,
}: {
    label: string;
    value: string;
    positive?: boolean;
    negative?: boolean;
}) {
    return (
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="text-xs text-gray-400 font-bold mb-2">{label}</div>
            <div
                className={`text-2xl font-black font-mono ${
                    positive
                        ? 'text-emerald-500'
                        : negative
                          ? 'text-red-500'
                          : 'text-gray-900 dark:text-gray-100'
                }`}
            >
                {value}
            </div>
        </div>
    );
}
