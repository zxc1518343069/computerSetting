import React from 'react';
import { Table, Tag, Space, Typography, Tooltip, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
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
            title: '售价 (含溢价)',
            key: 'sellingPrice',
            align: 'right',
            render: (_, record) => {
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
