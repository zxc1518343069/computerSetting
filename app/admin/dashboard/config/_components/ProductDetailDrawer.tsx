import { fetchInventoryItems } from '@/app/admin/dashboard/services';
import { InventoryItem } from '@/const/types';
import { formatDate, formatPrice } from '@/utils';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Descriptions, Drawer, Table, Tabs, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useMemo } from 'react';
import { Product } from '../types';

interface ProductDetailDrawerProps {
    open: boolean;
    product: Product | null;
    onClose: () => void;
}

export function ProductDetailDrawer({ open, product, onClose }: ProductDetailDrawerProps) {
    const {
        data: inventoryItems = [],
        loading,
        run,
    } = useRequest(fetchInventoryItems, {
        manual: true,
    });

    useEffect(() => {
        if (open && product) {
            run({ product_id: product.id });
        }
    }, [open, product, run]);

    const stockStats = useMemo(() => {
        const costs = inventoryItems.map((item) => Number(item.cost_price || 0));
        const latestInboundAt = inventoryItems
            .map((item) => item.inbound_at)
            .filter(Boolean)
            .sort((a, b) => new Date(b || '').getTime() - new Date(a || '').getTime())[0];

        return {
            count: inventoryItems.length,
            minCost: costs.length ? Math.min(...costs) : null,
            maxCost: costs.length ? Math.max(...costs) : null,
            latestInboundAt,
        };
    }, [inventoryItems]);

    const costRange =
        stockStats.minCost === null || stockStats.maxCost === null
            ? '-'
            : stockStats.minCost === stockStats.maxCost
              ? formatPrice(stockStats.minCost)
              : `${formatPrice(stockStats.minCost)} - ${formatPrice(stockStats.maxCost)}`;

    const columns: ColumnsType<InventoryItem> = [
        {
            title: '库存ID',
            dataIndex: 'id',
            width: 90,
            render: (id) => <span className="font-mono text-gray-400">#{id}</span>,
        },
        {
            title: '序列号',
            dataIndex: 'serial_number',
            render: (value) => <span className="font-mono text-gray-500">{value || '-'}</span>,
        },
        {
            title: '商家',
            dataIndex: 'supplier_name',
            width: 160,
            render: (value) => value || '-',
        },
        {
            title: '成本',
            dataIndex: 'cost_price',
            align: 'right',
            width: 120,
            sorter: (a, b) => Number(a.cost_price || 0) - Number(b.cost_price || 0),
            render: (value) => (
                <span className="font-mono font-bold">{formatPrice(Number(value || 0))}</span>
            ),
        },
        {
            title: '入库时间',
            dataIndex: 'inbound_at',
            width: 170,
            render: (value) => formatDate(value),
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
            title: '备注',
            dataIndex: 'note',
            render: (value) => value || '-',
        },
    ];

    return (
        <Drawer
            title={product?.name || '商品详情'}
            open={open}
            onClose={onClose}
            width={960}
            destroyOnHidden
        >
            {product && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SummaryTile
                            label="当前在库"
                            value={`${stockStats.count} 件`}
                            tone="green"
                        />
                        <SummaryTile label="在库成本区间" value={costRange} />
                        <SummaryTile
                            label="最近入库"
                            value={formatDate(stockStats.latestInboundAt)}
                        />
                    </div>

                    <Tabs
                        items={[
                            {
                                key: 'base',
                                label: '基础信息',
                                children: (
                                    <Descriptions bordered column={2} size="middle">
                                        <Descriptions.Item label="商品类目">
                                            {product.category_label ||
                                                product.category_name ||
                                                product.category}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="条形码">
                                            {product.barcode || '-'}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="参考价格">
                                            {formatPrice(product.price)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="最终售价">
                                            {product.selling_price !== null &&
                                            product.selling_price !== undefined ? (
                                                <span className="font-mono font-bold text-orange-600">
                                                    {formatPrice(product.selling_price)}
                                                </span>
                                            ) : product.is_use_premium === false ? (
                                                <span className="font-mono">
                                                    {formatPrice(product.price)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">
                                                    按溢价规则计算
                                                </span>
                                            )}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="自动溢价">
                                            <Tag
                                                color={
                                                    product.is_use_premium === false
                                                        ? 'default'
                                                        : 'green'
                                                }
                                            >
                                                {product.is_use_premium === false
                                                    ? '未启用'
                                                    : '已启用'}
                                            </Tag>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="当前库存">
                                            <span className="font-mono font-bold">
                                                {product.inventory_summary?.in_stock ??
                                                    product.stock_quantity ??
                                                    0}
                                            </span>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="创建时间">
                                            {formatDate(product.created_at)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="更新时间">
                                            {formatDate(product.updated_at)}
                                        </Descriptions.Item>
                                    </Descriptions>
                                ),
                            },
                            {
                                key: 'inventory',
                                label: (
                                    <span className="inline-flex items-center gap-1">
                                        在库明细
                                        <Tooltip title="这里只展示当前在库库存；已售和已退货请到订单或退货记录中追溯。">
                                            <InfoCircleOutlined className="text-gray-400" />
                                        </Tooltip>
                                    </span>
                                ),
                                children: (
                                    <Table
                                        rowKey="id"
                                        loading={loading}
                                        columns={columns}
                                        dataSource={inventoryItems}
                                        pagination={{ pageSize: 8, showSizeChanger: true }}
                                        scroll={{ x: 980 }}
                                        locale={{ emptyText: '暂无在库库存' }}
                                    />
                                ),
                            },
                        ]}
                    />
                </div>
            )}
        </Drawer>
    );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: 'green' }) {
    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414] p-4">
            <div className="text-xs text-gray-400 mb-2">{label}</div>
            <div
                className={`text-xl font-black ${
                    tone === 'green'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-900 dark:text-gray-100'
                }`}
            >
                {value}
            </div>
        </div>
    );
}
