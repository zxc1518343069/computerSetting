'use client';

import { Customer } from '@/const/types';
import { formatDate, formatPrice } from '@/utils';
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    ShoppingCartOutlined,
    UserOutlined,
    WalletOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Empty, Form, Input, message, Modal, Popconfirm, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import React, { useState } from 'react';
import {
    CustomerOrderSummary,
    deleteCustomer,
    fetchCustomerOrders,
    fetchCustomers,
    saveCustomer,
} from '../../services';

export default function CustomersPage() {
    const [search, setSearch] = useState('');
    const [visible, setVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [form] = Form.useForm();

    const {
        data: customers = [],
        loading,
        refresh,
    } = useRequest(() => fetchCustomers({ search }), {
        refreshDeps: [search],
        debounceWait: 300,
    });

    const { runAsync: submitCustomer, loading: saving } = useRequest(
        async () => {
            const values = await form.validateFields();
            await saveCustomer(values, editingCustomer?.id);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingCustomer ? '客户已更新' : '客户已创建');
                setVisible(false);
                setEditingCustomer(null);
                form.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: removeCustomer, loading: deleting } = useRequest(deleteCustomer, {
        manual: true,
        onSuccess: () => {
            message.success('客户已删除');
            refresh();
        },
        onError: (e) => message.error(e.message),
    });

    const openModal = (customer?: Customer) => {
        setEditingCustomer(customer || null);
        form.resetFields();
        if (customer) {
            form.setFieldsValue(customer);
        }
        setVisible(true);
    };

    const columns: ColumnsType<Customer> = [
        {
            title: '客户',
            render: (_, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {record.name}
                    </div>
                    <div className="text-xs text-gray-400">{record.phone}</div>
                </div>
            ),
        },
        {
            title: '微信',
            dataIndex: 'wechat',
            render: (text) => text || '-',
        },
        {
            title: '待收金额',
            dataIndex: 'receivable_amount',
            align: 'right',
            width: 140,
            render: (amount) => (
                <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                    {formatPrice(Number(amount || 0))}
                </span>
            ),
        },
        {
            title: '已关联订单',
            dataIndex: 'order_count',
            width: 120,
            render: (count) => `${count || 0} 单`,
        },
        {
            title: '最近订单',
            dataIndex: 'latest_order_at',
            width: 180,
            render: (text) => (text ? formatDate(text) : '-'),
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 180,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Tooltip title="查看账款">
                        <Link
                            href={`/admin/dashboard/finance/accounts?view=summary&type=customer&customer_id=${record.id}`}
                        >
                            <Button type="text" icon={<WalletOutlined />} />
                        </Link>
                    </Tooltip>
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openModal(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定删除该客户？"
                        description="已有订单的客户不能删除"
                        okButtonProps={{ danger: true, loading: deleting }}
                        onConfirm={() => removeCustomer(record.id)}
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
                            <UserOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Sales
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            客户信息
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            维护客户档案、已关联订单和待收账款入口。
                        </p>
                    </div>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => openModal()}
                        className="h-12 px-6 rounded-xl bg-blue-600 border-none shadow-lg shadow-blue-600/20"
                    >
                        新增客户
                    </Button>
                </div>

                <div className="bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl rounded-2xl border border-white dark:border-white/10 p-3 flex items-center justify-between gap-3">
                    <Input
                        allowClear
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="搜索客户名称、手机号、微信、备注..."
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
                        dataSource={customers}
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                        expandable={{
                            expandedRowRender: (record) => <CustomerOrders customer={record} />,
                        }}
                    />
                </div>
            </div>

            <Modal
                title={editingCustomer ? '编辑客户' : '新增客户'}
                open={visible}
                onCancel={() => setVisible(false)}
                onOk={submitCustomer}
                confirmLoading={saving}
                destroyOnHidden
                width={680}
            >
                <Form form={form} layout="vertical" className="pt-4">
                    <Form.Item
                        name="name"
                        label="客户名称"
                        rules={[{ required: true, message: '请输入客户名称' }]}
                    >
                        <Input placeholder="请输入客户名称" />
                    </Form.Item>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="phone"
                            label="手机号"
                            rules={[{ required: true, message: '请输入手机号' }]}
                        >
                            <Input placeholder="手机号不可重复" />
                        </Form.Item>
                        <Form.Item name="wechat" label="微信">
                            <Input placeholder="微信" />
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

function CustomerOrders({ customer }: { customer: Customer }) {
    const { data: orders = [], loading } = useRequest(() => fetchCustomerOrders(customer.id), {
        refreshDeps: [customer.id],
    });

    const columns: ColumnsType<CustomerOrderSummary> = [
        {
            title: '订单号',
            dataIndex: 'order_no',
            width: 180,
            render: (text) => <span className="font-mono text-gray-500">{text}</span>,
        },
        {
            title: '明细',
            width: 140,
            render: (_, record) => `${record.line_count} 条 / ${record.total_quantity} 件`,
        },
        {
            title: '成交金额',
            dataIndex: 'final_amount',
            align: 'right',
            width: 140,
            render: (amount) => (
                <span className="font-mono font-bold">{formatPrice(Number(amount || 0))}</span>
            ),
        },
        {
            title: '收款',
            dataIndex: 'is_paid',
            width: 100,
            render: (paid) => <Tag color={paid ? 'green' : 'orange'}>{paid ? '已收' : '未收'}</Tag>,
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (status) => (
                <Tag color={status === 'completed' ? 'green' : 'orange'}>
                    {status === 'completed' ? '已结算' : '待结算'}
                </Tag>
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 180,
            render: (text) => formatDate(text),
        },
    ];

    if (!loading && orders.length === 0) {
        return (
            <div className="py-8">
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无已关联订单" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                <ShoppingCartOutlined />
                <span>{customer.name} 的已关联订单</span>
            </div>
            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={orders}
                pagination={false}
                size="small"
            />
        </div>
    );
}
