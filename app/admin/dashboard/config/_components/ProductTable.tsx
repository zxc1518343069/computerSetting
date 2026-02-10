import React from 'react';
import { Table, Tag, Space, Typography, Tooltip, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Product } from '../types';
import { categoryColorMap, categoryDisplayMap, categoryOptions } from '@/const';
import { formatDate, formatPrice } from '@/utils';

const { Text } = Typography;

interface ProductTableProps {
    loading: boolean;
    products: Product[];
    getSellingPriceInfo: (product: Product) => { price: number; rate: number };
    onEdit: (product: Product) => void;
    onDelete: (id: number) => void;
    deleteLoading?: boolean;
}

export const ProductTable: React.FC<ProductTableProps> = ({
    loading,
    products,
    getSellingPriceInfo,
    onEdit,
    onDelete,
    deleteLoading,
}) => {
    const columns: ColumnsType<Product> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            sorter: (a, b) => a.id - b.id,
            render: (text) => <Text type="secondary">#{text}</Text>,
        },
        {
            title: '硬件类型',
            dataIndex: 'category',
            key: 'category',
            width: 150,
            filters: categoryOptions.map((c) => ({ text: c.label, value: c.value })),
            onFilter: (value, record) => record.category === value,
            render: (category) => (
                <Tag color={categoryColorMap[category] || 'default'}>
                    {categoryDisplayMap[category] || category}
                </Tag>
            ),
        },
        {
            title: '产品名称',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: '原价 (¥)',
            dataIndex: 'price',
            key: 'price',
            align: 'right',
            sorter: (a, b) => a.price - b.price,
            render: (price) => <Text>{formatPrice(price)}</Text>,
        },
        {
            title: (
                <div className="flex items-center justify-end gap-1 cursor-help">
                    <span>售价 (含溢价)</span>
                    <Tooltip title="优先级: 手动定价 > 溢价配置 > 基础价格">
                        <InfoCircleOutlined className="text-xs text-gray-400" />
                    </Tooltip>
                </div>
            ),
            key: 'sellingPrice',
            align: 'right',
            render: (_, record) => {
                // 1. 优先显示手动设置的售价
                if (record.selling_price !== undefined && record.selling_price !== null) {
                    return (
                        <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
                            <Text type="warning" strong>
                                {formatPrice(record.selling_price)}
                            </Text>
                            <Tag
                                color="orange"
                                style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}
                            >
                                手动
                            </Tag>
                        </Space>
                    );
                }

                // 2. 如果不使用溢价，显示原价
                if (record.is_use_premium === false) {
                    return (
                        <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
                            <Text strong>{formatPrice(record.price)}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                无溢价
                            </Text>
                        </Space>
                    );
                }

                // 3. 使用溢价计算逻辑
                const { price, rate } = getSellingPriceInfo(record);
                return (
                    <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
                        <Text type="success" strong>
                            {formatPrice(price)}
                        </Text>
                        {rate > 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                +{rate.toFixed(1)}%
                            </Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (date) => formatDate(date),
            responsive: ['lg'],
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            align: 'center',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="编辑">
                        <Button
                            type="primary"
                            ghost
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => onEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定删除此产品?"
                        description={`将删除: ${record.name}`}
                        onConfirm={() => onDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                        okButtonProps={{ danger: true, loading: deleteLoading }}
                    >
                        <Tooltip title="删除">
                            <Button danger size="small" icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={products}
            rowKey="id"
            loading={loading}
            pagination={{
                pageSize: 10,
                showTotal: (total) => `共 ${total} 条记录`,
                showSizeChanger: true,
            }}
            scroll={{ x: 1000 }}
            size="middle"
        />
    );
};
