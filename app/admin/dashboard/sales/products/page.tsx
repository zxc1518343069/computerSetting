'use client';

import { getCategoryTagClass, useProductCategories } from '@/app/hooks/useProductCategories';
import { formatDate, formatPrice } from '@/utils';
import {
    InfoCircleOutlined,
    ReloadOutlined,
    SearchOutlined,
    TagsOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Input, Modal, Select, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';
import { fetchSalesProducts, SalesProduct } from '../../services';

export default function SalesProductsPage() {
    const [query, setQuery] = useState({
        search: '',
        category_id: undefined as number | undefined,
    });
    const [detailProduct, setDetailProduct] = useState<SalesProduct | null>(null);
    const { activeCategories, categoryMap, categoryCodeMap } = useProductCategories({
        includeInactive: true,
    });

    const {
        data: products = [],
        loading,
        refresh,
    } = useRequest(() => fetchSalesProducts(query), {
        refreshDeps: [query],
        debounceWait: 300,
    });

    const stats = useMemo(() => {
        const stockProducts = products.filter((product) => product.has_stock).length;
        const totalStock = products.reduce(
            (sum, product) => sum + Number(product.stock_quantity || 0),
            0
        );
        return { stockProducts, totalStock };
    }, [products]);

    const columns: ColumnsType<SalesProduct> = [
        {
            title: '商品类目',
            dataIndex: 'category',
            width: 150,
            render: (category, record) => {
                const config =
                    (record.category_id ? categoryMap[record.category_id] : undefined) ||
                    categoryCodeMap[category];
                return (
                    <div className="flex items-center">
                        <span
                            className={`inline-flex rounded border px-2.5 py-1 text-xs font-bold ${getCategoryTagClass(
                                config?.tag_color
                            )}`}
                        >
                            {config?.name || category}
                        </span>
                    </div>
                );
            },
        },
        {
            title: '产品名称',
            dataIndex: 'name',
            render: (text, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">{text}</div>
                    <div className="mt-1 font-mono text-xs text-gray-400">
                        条形码 {record.barcode || '-'}
                    </div>
                </div>
            ),
        },
        {
            title: '库存数量',
            dataIndex: 'stock_quantity',
            width: 110,
            align: 'center',
            sorter: (a, b) => (a.stock_quantity || 0) - (b.stock_quantity || 0),
            render: (stock) => (
                <span
                    className={
                        Number(stock || 0) > 0
                            ? 'text-emerald-500 font-bold'
                            : 'text-rose-500 font-bold'
                    }
                >
                    {stock || 0}
                </span>
            ),
        },
        {
            title: '成本区间',
            width: 190,
            align: 'right',
            render: (_, record) => {
                if (!record.has_stock) {
                    return <span className="text-gray-300">暂无库存成本</span>;
                }
                const min = formatPrice(record.min_cost_price || 0);
                const max = formatPrice(record.max_cost_price || 0);
                return (
                    <span className="font-mono text-gray-600 dark:text-gray-300">
                        {min === max ? min : `${min} - ${max}`}
                    </span>
                );
            },
        },
        {
            title: (
                <div className="flex items-center justify-end gap-1">
                    <span>报价基准</span>
                    <Tooltip title="有库存取最高库存成本；无库存取参考价格。">
                        <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                </div>
            ),
            dataIndex: 'quote_base_price',
            width: 140,
            align: 'right',
            render: (price) => <span className="font-mono">{formatPrice(Number(price || 0))}</span>,
        },
        {
            title: '建议售价',
            dataIndex: 'suggested_price',
            width: 140,
            align: 'right',
            render: (price) => (
                <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                    {formatPrice(Number(price || 0))}
                </span>
            ),
        },
        {
            title: '操作',
            width: 110,
            align: 'center',
            render: (_, record) => (
                <Button type="link" onClick={() => setDetailProduct(record)}>
                    详情
                </Button>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10 relative overflow-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <TagsOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Sales
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            销售列表
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            按产品型号聚合库存价格，辅助销售判断库存状态、成本区间和建议售价。
                        </p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={refresh} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                        <div className="text-sm text-gray-400 mb-2">可售型号</div>
                        <div className="text-3xl font-black text-emerald-500">
                            {stats.stockProducts}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                        <div className="text-sm text-gray-400 mb-2">总库存件数</div>
                        <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                            {stats.totalStock}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                        <div className="text-sm text-gray-400 mb-2">产品型号</div>
                        <div className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            {products.length}
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl rounded-2xl border border-white dark:border-white/10 p-3 flex flex-wrap items-center gap-3">
                    <Input
                        allowClear
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="搜索产品名称 / 条形码..."
                        value={query.search}
                        onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value }))}
                        className="max-w-md h-10 rounded-xl border-none bg-gray-100/60 dark:bg-[#141414]"
                    />
                    <Select
                        allowClear
                        placeholder="商品类目"
                        value={query.category_id}
                        onChange={(category_id) => setQuery((prev) => ({ ...prev, category_id }))}
                        className="w-52"
                        options={activeCategories.map((category) => ({
                            label: category.label,
                            value: category.id,
                        }))}
                    />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={products}
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                        scroll={{ x: 1200 }}
                    />
                </div>
            </div>

            <Modal
                title={detailProduct?.name || '库存详情'}
                open={!!detailProduct}
                onCancel={() => setDetailProduct(null)}
                footer={null}
                width={900}
                destroyOnHidden
            >
                <div className="pt-4 space-y-4">
                    <div className="flex flex-wrap gap-3">
                        <Tag color={detailProduct?.has_stock ? 'green' : 'red'}>
                            {detailProduct?.has_stock ? '有库存' : '无库存'}
                        </Tag>
                        <Tag>参考价格 {formatPrice(detailProduct?.price || 0)}</Tag>
                        <Tag color="blue">
                            建议售价 {formatPrice(detailProduct?.suggested_price || 0)}
                        </Tag>
                        <Tag>条形码 {detailProduct?.barcode || '-'}</Tag>
                    </div>
                    <Table
                        rowKey="id"
                        size="small"
                        pagination={false}
                        dataSource={detailProduct?.inventory_items || []}
                        columns={[
                            {
                                title: '库存ID',
                                dataIndex: 'id',
                                width: 90,
                                render: (id) => <span className="font-mono">#{id}</span>,
                            },
                            {
                                title: '序列号',
                                dataIndex: 'serial_number',
                                render: (value) => value || '-',
                            },
                            {
                                title: '成本价',
                                dataIndex: 'cost_price',
                                align: 'right',
                                render: (value) => (
                                    <span className="font-mono font-bold">
                                        {formatPrice(Number(value || 0))}
                                    </span>
                                ),
                            },
                            {
                                title: '商家',
                                dataIndex: 'supplier_name',
                                render: (value) => value || '-',
                            },
                            {
                                title: '质保',
                                dataIndex: 'warranty_enabled',
                                render: (value, record) =>
                                    value ? (
                                        <span>
                                            {record.warranty_until
                                                ? formatDate(record.warranty_until)
                                                : '质保'}
                                        </span>
                                    ) : (
                                        '-'
                                    ),
                            },
                            {
                                title: '入库时间',
                                dataIndex: 'inbound_at',
                                render: (value) => formatDate(value),
                            },
                        ]}
                        locale={{ emptyText: '暂无库存明细' }}
                    />
                </div>
            </Modal>
        </div>
    );
}
