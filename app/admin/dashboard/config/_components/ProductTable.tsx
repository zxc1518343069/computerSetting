import { getCategoryTagClass, useProductCategories } from '@/app/hooks/useProductCategories';
import { formatPrice } from '@/utils';
import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    InfoCircleOutlined,
    RiseOutlined,
} from '@ant-design/icons';
import { Button, Popconfirm, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React from 'react';
import { Product } from '../types';

const { Text } = Typography;

interface ProductTableProps {
    loading: boolean;
    products: Product[];
    getSellingPriceInfo: (product: Product) => { price: number; rate: number };
    onViewDetail: (product: Product) => void;
    onEdit: (product: Product) => void;
    onDelete: (id: number) => void;
    deleteLoading?: boolean;
}

export const ProductTable: React.FC<ProductTableProps> = ({
    loading,
    products,
    getSellingPriceInfo,
    onViewDetail,
    onEdit,
    onDelete,
    deleteLoading,
}) => {
    const { categoryMap, categoryCodeMap } = useProductCategories({ includeInactive: true });

    const columns: ColumnsType<Product> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            sorter: (a, b) => a.id - b.id,
            render: (text) => <span className="text-gray-400 font-mono text-xs">#{text}</span>,
        },
        {
            title: '商品类目',
            dataIndex: 'category',
            key: 'category',
            width: 160,
            filters: Object.values(categoryMap).map((c) => ({ text: c.label, value: c.id })),
            onFilter: (value, record) => record.category_id === value,
            render: (category, record) => {
                const config =
                    (record?.category_id ? categoryMap[record.category_id] : undefined) ||
                    categoryCodeMap[category];
                return (
                    <div className="flex items-center">
                        <span
                            className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-bold ${getCategoryTagClass(
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
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (text) => (
                <Text strong className="text-gray-800 dark:text-gray-100 text-[15px]">
                    {text}
                </Text>
            ),
        },
        {
            title: '条形码',
            dataIndex: 'barcode',
            key: 'barcode',
            width: 180,
            render: (barcode) =>
                barcode ? (
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {barcode}
                    </span>
                ) : (
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                ),
        },
        {
            title: '参考价格',
            dataIndex: 'price',
            key: 'price',
            align: 'right',
            width: 140,
            sorter: (a, b) => a.price - b.price,
            render: (price) => (
                <div className="font-mono text-gray-500 dark:text-gray-400 font-medium">
                    {formatPrice(price)}
                </div>
            ),
        },
        {
            title: '当前库存',
            dataIndex: ['inventory_summary', 'in_stock'],
            key: 'stock_quantity',
            align: 'center',
            width: 110,
            sorter: (a, b) =>
                (a.inventory_summary?.in_stock ?? a.stock_quantity ?? 0) -
                (b.inventory_summary?.in_stock ?? b.stock_quantity ?? 0),
            render: (_, record) => {
                const stock = record.inventory_summary?.in_stock ?? record.stock_quantity ?? 0;
                return (
                    <span
                        className={`font-mono font-bold ${
                            Number(stock || 0) > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-500 dark:text-rose-400'
                        }`}
                    >
                        {stock || 0}
                    </span>
                );
            },
        },
        {
            title: '在库成本区间',
            key: 'inventoryCostRange',
            align: 'right',
            width: 170,
            render: (_, record) => {
                const min = record.inventory_summary?.min_cost_price;
                const max = record.inventory_summary?.max_cost_price;

                if (min === null || min === undefined || max === null || max === undefined) {
                    return <span className="text-gray-300 dark:text-gray-600">暂无在库成本</span>;
                }

                return (
                    <span className="font-mono text-gray-600 dark:text-gray-300">
                        {min === max
                            ? formatPrice(min)
                            : `${formatPrice(min)} - ${formatPrice(max)}`}
                    </span>
                );
            },
        },
        {
            title: (
                <div className="flex items-center justify-end gap-1 cursor-help group">
                    <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        最终售价
                    </span>
                    <Tooltip title="优先级: 手动定价 > 溢价配置 > 参考价格">
                        <InfoCircleOutlined className="text-xs text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </Tooltip>
                </div>
            ),
            key: 'sellingPrice',
            align: 'right',
            width: 180,
            render: (_, record) => {
                // 1. 优先显示手动设置的售价
                if (record.selling_price !== undefined && record.selling_price !== null) {
                    return (
                        <div className="flex flex-col items-end">
                            <span className="text-orange-600 dark:text-orange-400 font-bold font-mono text-lg">
                                {formatPrice(record.selling_price)}
                            </span>
                            <Tag
                                color="orange"
                                bordered={false}
                                className="mr-0 text-[10px] px-1 leading-tight bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                            >
                                手动定价
                            </Tag>
                        </div>
                    );
                }

                // 2. 如果不使用溢价，显示原价
                if (record.is_use_premium === false) {
                    return (
                        <div className="flex flex-col items-end opacity-60">
                            <span className="text-gray-700 dark:text-gray-200 font-bold font-mono text-lg">
                                {formatPrice(record.price)}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                无溢价
                            </span>
                        </div>
                    );
                }

                // 3. 使用溢价计算逻辑
                const { price, rate } = getSellingPriceInfo(record);
                return (
                    <div className="flex flex-col items-end">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-lg">
                            {formatPrice(price)}
                        </span>
                        {rate > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">
                                <RiseOutlined />
                                <span>+{rate.toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Tooltip title="详情">
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => onViewDetail(record)}
                            className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                        />
                    </Tooltip>
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => onEdit(record)}
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300"
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定删除此产品?"
                        description="此操作不可恢复"
                        onConfirm={() => onDelete(record.id)}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true, loading: deleteLoading }}
                    >
                        <Tooltip title="删除">
                            <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                className="hover:bg-red-50 dark:hover:bg-red-900/20"
                            />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
            <Table
                columns={columns}
                dataSource={products}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showTotal: (total) => (
                        <span className="text-gray-400 dark:text-gray-500">共 {total} 条记录</span>
                    ),
                    showSizeChanger: true,
                    position: ['bottomRight'],
                    className: '!mb-0 !mt-4',
                }}
                scroll={{ x: 1450 }}
                size="middle"
                rowClassName="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-default"
                className="custom-table"
            />
            <style jsx global>{`
                .custom-table .ant-table-thead > tr > th {
                    background: #f9fafb;
                    color: #6b7280;
                    font-weight: 600;
                    font-size: 13px;
                    border-bottom: 1px solid #f3f4f6;
                    padding: 16px 16px;
                }
                .dark .custom-table .ant-table-thead > tr > th {
                    background: #141414;
                    color: #9ca3af;
                    border-bottom: 1px solid #374151;
                }
                .custom-table .ant-table-tbody > tr > td {
                    padding: 16px 16px;
                    border-bottom: 1px solid #f9fafb;
                }
                .dark .custom-table .ant-table-tbody > tr > td {
                    border-bottom: 1px solid #1f2937;
                }
                .custom-table .ant-table-tbody > tr:last-child > td {
                    border-bottom: none;
                }
                /* 修复分页样式 */
                .custom-table .ant-pagination {
                    margin-right: 0 !important;
                }
                .dark .ant-pagination-item-active {
                    background: #1f2937;
                    border-color: #3b82f6;
                }
                .dark .ant-pagination-item-active a {
                    color: #3b82f6;
                }
            `}</style>
        </div>
    );
};
