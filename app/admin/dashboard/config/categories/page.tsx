'use client';

import { CATEGORY_TAG_COLORS } from '@/app/hooks/useProductCategories';
import {
    createProductCategory,
    deleteProductCategory,
    ProductCategoryPayload,
    updateProductCategory,
} from '@/app/services/categories';
import { ProductCategory } from '@/const/types';
import {
    AppstoreOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Button,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Switch,
    Table,
    Tag,
    Tooltip,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';
import { fetchProductCategories } from '@/app/services/categories';

export default function ProductCategoriesPage() {
    const [visible, setVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
    const [form] = Form.useForm<ProductCategoryPayload>();

    const {
        data: categories = [],
        loading,
        refresh,
    } = useRequest(() => fetchProductCategories({ includeInactive: true }));

    const openModal = (category?: ProductCategory) => {
        setEditingCategory(category || null);
        form.resetFields();
        if (category) {
            form.setFieldsValue({
                name: category.name,
                label: category.label,
                tag_color: category.tag_color,
                is_active: category.is_active,
            });
        } else {
            form.setFieldsValue({
                is_active: true,
            });
        }
        setVisible(true);
    };

    const closeModal = () => {
        setVisible(false);
        setEditingCategory(null);
        form.resetFields();
    };

    const { runAsync: submitCategory, loading: submitting } = useRequest(
        async () => {
            const values = await form.validateFields();
            const maxSort = categories.reduce(
                (max, item) => Math.max(max, Number(item.sort_order || 0)),
                0
            );
            const payload = {
                ...values,
                sort_order: editingCategory?.sort_order ?? maxSort + 10,
            };
            if (editingCategory) {
                await updateProductCategory(editingCategory.id, payload);
                return;
            }
            await createProductCategory(payload);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingCategory ? '类目已更新' : '类目已创建');
                closeModal();
                refresh();
            },
            onError: (e) => message.error(e.message || '操作失败'),
        }
    );

    const { runAsync: removeCategory, loading: deleting } = useRequest(deleteProductCategory, {
        manual: true,
        onSuccess: () => {
            message.success('类目已删除');
            refresh();
        },
        onError: (e) => message.error(e.message || '删除失败'),
    });

    const { runAsync: toggleCategory } = useRequest(
        async (category: ProductCategory) => {
            await updateProductCategory(category.id, {
                name: category.name,
                label: category.label,
                tag_color: category.tag_color,
                sort_order: category.sort_order,
                is_active: !category.is_active,
            });
        },
        {
            manual: true,
            onSuccess: refresh,
            onError: (e) => message.error(e.message || '状态更新失败'),
        }
    );

    const stats = useMemo(
        () => ({
            total: categories.length,
            active: categories.filter((item) => item.is_active).length,
            productCount: categories.reduce((sum, item) => sum + Number(item.product_count || 0), 0),
        }),
        [categories]
    );

    const columns: ColumnsType<ProductCategory> = [
        {
            title: '类目',
            dataIndex: 'name',
            width: 260,
            render: (_, record) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Tag color={record.tag_color || 'blue'} className="mr-0 font-bold">
                            {record.label || record.name}
                        </Tag>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{record.code}</span>
                </div>
            ),
        },
        {
            title: 'Tag 颜色',
            dataIndex: 'tag_color',
            width: 130,
            render: (color) => <ColorTag color={color} />,
        },
        {
            title: '产品数',
            dataIndex: 'product_count',
            align: 'center',
            width: 100,
            render: (value) => <span className="font-mono font-bold">{value || 0}</span>,
        },
        {
            title: '溢价',
            dataIndex: 'pricing_rate',
            align: 'right',
            width: 120,
            render: (value) =>
                value === null || value === undefined ? (
                    <span className="text-gray-300">未配置</span>
                ) : (
                    <span className="font-mono font-bold text-emerald-600">+{value}%</span>
                ),
        },
        {
            title: '启用',
            dataIndex: 'is_active',
            width: 90,
            render: (_, record) => (
                <Switch checked={record.is_active} onChange={() => toggleCategory(record)} />
            ),
        },
        {
            title: '操作',
            width: 140,
            fixed: 'right',
            align: 'center',
            render: (_, record) => {
                const hasProducts = Number(record.product_count || 0) > 0;
                const deleteButton = (
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={hasProducts}
                    />
                );

                return (
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openModal(record)}
                        />
                        {hasProducts ? (
                            <Tooltip title="该类目下已有商品，无法删除；可以先停用，或迁移商品后再删除。">
                                <span>{deleteButton}</span>
                            </Tooltip>
                        ) : (
                            <Popconfirm
                                title="删除此类目?"
                                description="删除后对应溢价规则也会删除"
                                onConfirm={() => removeCategory(record.id)}
                                okButtonProps={{ danger: true, loading: deleting }}
                                okText="删除"
                                cancelText="取消"
                            >
                                {deleteButton}
                            </Popconfirm>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50/30 dark:bg-black p-6 md:p-10">
            <div className="max-w-[1400px] mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <AppstoreOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Categories
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            商品类目
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            管理产品归类、展示颜色和类目状态。装机配置结构不在这里维护。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button icon={<ReloadOutlined />} onClick={refresh}>
                            刷新
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                            新增类目
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard label="全部类目" value={stats.total} />
                    <StatCard label="启用类目" value={stats.active} />
                    <StatCard label="关联产品" value={stats.productCount} />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={categories}
                        pagination={false}
                        scroll={{ x: 840 }}
                    />
                </div>
            </div>

            <Modal
                title={editingCategory ? '编辑商品类目' : '新增商品类目'}
                open={visible}
                onCancel={closeModal}
                onOk={submitCategory}
                confirmLoading={submitting}
                destroyOnHidden
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ is_active: true }}
                    className="pt-4"
                >
                    <Form.Item
                        name="name"
                        label="类目名称"
                        rules={[{ required: true, message: '请输入类目名称' }]}
                    >
                        <Input placeholder="例如：鼠标" />
                    </Form.Item>
                    <Form.Item name="label" label="展示标签">
                        <Input placeholder="例如：鼠标 / Mouse" />
                    </Form.Item>
                    <Form.Item name="tag_color" label="Tag 颜色">
                        <Select
                            allowClear
                            placeholder="不选则自动分配"
                            options={CATEGORY_TAG_COLORS.map((color) => ({
                                label: <ColorTag color={color} />,
                                value: color,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="is_active" label="是否启用" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

function ColorTag({ color }: { color?: string | null }) {
    return (
        <Tag color={color || 'blue'} className="mr-0 font-bold">
            {color || 'blue'}
        </Tag>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <div className="text-sm text-gray-400 mb-2">{label}</div>
            <div className="text-3xl font-black text-gray-900 dark:text-gray-100">{value}</div>
        </div>
    );
}
