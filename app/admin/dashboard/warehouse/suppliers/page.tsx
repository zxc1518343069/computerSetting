'use client';

import { Supplier } from '@/const/types';
import { formatDate } from '@/utils';
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    ShopOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Form, Input, message, Modal, Popconfirm, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';
import { deleteSupplier, fetchSuppliers, saveSupplier } from '../../services';

export default function SuppliersPage() {
    const [search, setSearch] = useState('');
    const [visible, setVisible] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [form] = Form.useForm();

    const {
        data: suppliers = [],
        loading,
        refresh,
    } = useRequest(() => fetchSuppliers({ search }), {
        refreshDeps: [search],
        debounceWait: 300,
    });

    const { runAsync: submitSupplier, loading: saving } = useRequest(
        async () => {
            const values = await form.validateFields();
            await saveSupplier(values, editingSupplier?.id);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingSupplier ? '商家已更新' : '商家已创建');
                setVisible(false);
                setEditingSupplier(null);
                form.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: removeSupplier, loading: deleting } = useRequest(deleteSupplier, {
        manual: true,
        onSuccess: () => {
            message.success('商家已删除');
            refresh();
        },
        onError: (e) => message.error(e.message),
    });

    const openModal = (supplier?: Supplier) => {
        setEditingSupplier(supplier || null);
        if (supplier) {
            form.setFieldsValue(supplier);
        } else {
            form.resetFields();
        }
        setVisible(true);
    };

    const columns: ColumnsType<Supplier> = [
        {
            title: '商家名称',
            dataIndex: 'name',
            render: (text) => (
                <span className="font-bold text-gray-900 dark:text-gray-100">{text}</span>
            ),
        },
        {
            title: '联系人',
            dataIndex: 'contact_name',
            render: (text) => text || '-',
        },
        {
            title: '手机号',
            dataIndex: 'phone',
            render: (text) => text || '-',
        },
        {
            title: '地址',
            dataIndex: 'address',
            ellipsis: true,
            render: (text) => text || '-',
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openModal(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定删除该商家？"
                        description="已有入库单的商家不能删除"
                        okButtonProps={{ danger: true, loading: deleting }}
                        onConfirm={() => removeSupplier(record.id)}
                    >
                        <Tooltip title="删除">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10 relative overflow-hidden">
            <div className="max-w-[1400px] mx-auto space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <ShopOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Warehouse
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            进货商家
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            维护供应来源，用于物品入库和采购追溯。
                        </p>
                    </div>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => openModal()}
                        className="h-12 px-6 rounded-xl bg-blue-600 border-none shadow-lg shadow-blue-600/20"
                    >
                        新增商家
                    </Button>
                </div>

                <div className="bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl rounded-2xl border border-white dark:border-white/10 p-3 flex items-center justify-between gap-3">
                    <Input
                        allowClear
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="搜索商家名称、联系人、手机号..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-md h-10 rounded-xl border-none bg-gray-100/60 dark:bg-[#141414]"
                    />
                    <Button icon={<ReloadOutlined />} onClick={refresh} />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={suppliers}
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                    />
                </div>
            </div>

            <Modal
                title={editingSupplier ? '编辑进货商家' : '新增进货商家'}
                open={visible}
                onCancel={() => setVisible(false)}
                onOk={submitSupplier}
                confirmLoading={saving}
                destroyOnHidden
                width={680}
            >
                <Form form={form} layout="vertical" className="pt-4">
                    <Form.Item
                        name="name"
                        label="商家名称"
                        rules={[{ required: true, message: '请输入商家名称' }]}
                    >
                        <Input placeholder="请输入商家名称" />
                    </Form.Item>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item name="contact_name" label="联系人">
                            <Input placeholder="联系人" />
                        </Form.Item>
                        <Form.Item name="phone" label="手机号">
                            <Input placeholder="手机号" />
                        </Form.Item>
                    </div>
                    <Form.Item name="address" label="地址">
                        <Input placeholder="地址" />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} placeholder="备注" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
