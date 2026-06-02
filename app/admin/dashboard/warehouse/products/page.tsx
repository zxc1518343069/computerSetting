'use client';

import { CATEGORY_CONFIG, categoryOptions } from '@/const/categories';
import { InventoryItem } from '@/const/types';
import { formatDate, formatPrice } from '@/utils';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DatabaseOutlined,
    ReloadOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Input, Select, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';
import { fetchInventoryItems } from '../../services';

const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'in_stock', label: '在库' },
    { value: 'sold', label: '已售' },
    { value: 'returned', label: '已退货' },
];

const statusMap = {
    in_stock: { label: '在库', color: 'green', icon: <CheckCircleOutlined /> },
    sold: { label: '已售', color: 'blue', icon: <CheckCircleOutlined /> },
    returned: { label: '已退货', color: 'red', icon: <CloseCircleOutlined /> },
} as const;

export default function WarehouseProductsPage() {
    const [query, setQuery] = useState({
        search: '',
        category: undefined as string | undefined,
        status: 'all',
    });

    const {
        data: inventoryItems = [],
        loading,
        refresh,
    } = useRequest(() => fetchInventoryItems(query), {
        refreshDeps: [query],
        debounceWait: 300,
    });

    const stats = useMemo(() => {
        const inStock = inventoryItems.filter((item) => item.status === 'in_stock').length;
        const sold = inventoryItems.filter((item) => item.status === 'sold').length;
        const returned = inventoryItems.filter((item) => item.status === 'returned').length;
        const totalCost = inventoryItems.reduce(
            (sum, item) => sum + Number(item.cost_price || 0),
            0
        );
        return { inStock, sold, returned, totalCost };
    }, [inventoryItems]);

    const columns: ColumnsType<InventoryItem> = [
        {
            title: '库存ID',
            dataIndex: 'id',
            width: 100,
            render: (id) => <span className="font-mono text-gray-400">#{id}</span>,
        },
        {
            title: '硬件类型',
            dataIndex: ['product', 'category'],
            width: 140,
            render: (category) => {
                const config = CATEGORY_CONFIG[category];
                return (
                    <div className="flex items-center gap-2">
                        <span>{config?.icon || '📦'}</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                            {config?.name || category || '-'}
                        </span>
                    </div>
                );
            },
        },
        {
            title: '物品名称',
            dataIndex: ['product', 'name'],
            render: (text, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">{text || '-'}</div>
                    <div className="mt-1 font-mono text-xs text-gray-400">
                        条形码 {record.product?.barcode || '-'}
                    </div>
                </div>
            ),
        },
        {
            title: '商家名称',
            dataIndex: 'supplier_name',
            width: 180,
            render: (text) => text || '-',
        },
        {
            title: '序列号',
            dataIndex: 'serial_number',
            width: 180,
            render: (text) => <span className="font-mono text-gray-500">{text || '-'}</span>,
        },
        {
            title: '成本',
            dataIndex: 'cost_price',
            width: 130,
            align: 'right',
            sorter: (a, b) => Number(a.cost_price || 0) - Number(b.cost_price || 0),
            render: (price) => (
                <span className="font-mono font-black">{formatPrice(Number(price || 0))}</span>
            ),
        },
        {
            title: '入库时间',
            dataIndex: 'inbound_at',
            width: 180,
            render: (time) => formatDate(time),
        },
        {
            title: '质保',
            width: 140,
            render: (_, record) =>
                record.warranty_enabled ? (
                    <Tag color="green">
                        {record.warranty_until ? formatDate(record.warranty_until) : '质保'}
                    </Tag>
                ) : (
                    <Tag>无</Tag>
                ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (status) => {
                const config = statusMap[status as keyof typeof statusMap] || statusMap.in_stock;
                return (
                    <Tag icon={config.icon} color={config.color}>
                        {config.label}
                    </Tag>
                );
            },
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10 relative overflow-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <DatabaseOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Warehouse
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            物品列表
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            按单件库存展示物品，每件库存保留独立商家、序列号、成本和入库时间。
                        </p>
                    </div>
                    <Tooltip title="刷新列表">
                        <Button icon={<ReloadOutlined />} onClick={refresh} />
                    </Tooltip>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard label="当前列表" value={`${inventoryItems.length} 件`} />
                    <StatCard label="在库" value={`${stats.inStock} 件`} tone="green" />
                    <StatCard
                        label="已售/退货"
                        value={`${stats.sold} / ${stats.returned}`}
                        tone="blue"
                    />
                    <StatCard label="成本合计" value={formatPrice(stats.totalCost)} tone="red" />
                </div>

                <div className="bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl rounded-2xl border border-white dark:border-white/10 p-3 flex flex-wrap items-center gap-3">
                    <Input
                        allowClear
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="搜索物品、条形码、商家、序列号..."
                        value={query.search}
                        onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value }))}
                        className="max-w-md h-10 rounded-xl border-none bg-gray-100/60 dark:bg-[#141414]"
                    />
                    <Select
                        allowClear
                        placeholder="硬件类型"
                        value={query.category}
                        onChange={(category) => setQuery((prev) => ({ ...prev, category }))}
                        className="w-52"
                        options={categoryOptions}
                    />
                    <Select
                        value={query.status}
                        onChange={(status) => setQuery((prev) => ({ ...prev, status }))}
                        className="w-40"
                        options={statusOptions}
                    />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={inventoryItems}
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        scroll={{ x: 1300 }}
                    />
                </div>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: 'green' | 'blue' | 'red';
}) {
    const toneClass = {
        green: 'text-emerald-500',
        blue: 'text-blue-600 dark:text-blue-400',
        red: 'text-red-500',
    }[tone || 'blue'];

    return (
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <div className="text-sm text-gray-400 mb-2">{label}</div>
            <div className={`text-3xl font-black ${toneClass}`}>{value}</div>
        </div>
    );
}
