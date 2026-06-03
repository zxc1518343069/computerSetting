'use client';

import { authService } from '@/app/services';
import type { AdminRole, AdminUser, AdminUserStatus } from '@/const/types';
import { formatDate } from '@/utils';
import {
    EditOutlined,
    LockOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Form, Input, message, Modal, Select, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useState } from 'react';
import { fetchAdminUsers, saveAdminUser } from './services';

interface AccountFormValues {
    username: string;
    password?: string;
    role: AdminRole;
    status: AdminUserStatus;
}

export default function AdminAccountsPage() {
    const [query, setQuery] = useState<{
        search: string;
        role?: AdminRole;
        status?: AdminUserStatus;
    }>({ search: '' });
    const [modalVisible, setModalVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
    const [form] = Form.useForm<AccountFormValues>();

    const { data: me, loading: meLoading } = useRequest(authService.me, {
        onError: () => undefined,
    });

    const isSuperAdmin = me?.role === 'admin';

    const {
        data: users = [],
        loading,
        refresh,
    } = useRequest(() => fetchAdminUsers(query), {
        ready: isSuperAdmin,
        refreshDeps: [query, isSuperAdmin],
        debounceWait: 300,
    });

    const { runAsync: submitAccount, loading: saving } = useRequest(
        async () => {
            const values = await form.validateFields();
            await saveAdminUser(
                {
                    username: values.username.trim(),
                    password: values.password?.trim() || undefined,
                    role: values.role,
                    status: values.status,
                },
                currentUser?.id
            );
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(currentUser ? '账号已更新' : '账号已创建');
                setModalVisible(false);
                setCurrentUser(null);
                form.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message || '账号保存失败'),
        }
    );

    const openCreate = () => {
        setCurrentUser(null);
        form.resetFields();
        form.setFieldsValue({ role: 'staff', status: 'active' });
        setModalVisible(true);
    };

    const openEdit = (user: AdminUser) => {
        setCurrentUser(user);
        form.resetFields();
        form.setFieldsValue({
            username: user.username,
            role: user.role,
            status: user.status,
            password: '',
        });
        setModalVisible(true);
    };

    const toggleStatus = async (user: AdminUser) => {
        try {
            await saveAdminUser(
                {
                    username: user.username,
                    role: user.role,
                    status: user.status === 'active' ? 'disabled' : 'active',
                },
                user.id
            );
            message.success(user.status === 'active' ? '账号已禁用' : '账号已启用');
            refresh();
        } catch (e) {
            message.error((e as { message?: string }).message || '账号状态更新失败');
        }
    };

    const columns: ColumnsType<AdminUser> = [
        {
            title: '账号',
            dataIndex: 'username',
            render: (username) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                        <TeamOutlined />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {username}
                    </span>
                </div>
            ),
        },
        {
            title: '角色',
            dataIndex: 'role',
            width: 140,
            render: (role: AdminRole) => (
                <Tag color={role === 'admin' ? 'blue' : 'default'}>
                    {role === 'admin' ? '超级管理员' : '普通账号'}
                </Tag>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 120,
            render: (status: AdminUserStatus) => (
                <Tag color={status === 'active' ? 'green' : 'red'}>
                    {status === 'active' ? '启用' : '禁用'}
                </Tag>
            ),
        },
        {
            title: '最近登录',
            dataIndex: 'last_login_at',
            width: 180,
            render: (value) => (value ? formatDate(value) : '-'),
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 180,
            render: (value) => formatDate(value),
        },
        {
            title: '操作',
            width: 190,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Tooltip title="编辑账号">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(record)}
                        />
                    </Tooltip>
                    <Button type="link" onClick={() => toggleStatus(record)}>
                        {record.status === 'active' ? '禁用' : '启用'}
                    </Button>
                </div>
            ),
        },
    ];

    if (!meLoading && !isSuperAdmin) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] p-6 dark:bg-black md:p-10">
                <div className="mx-auto max-w-[960px] rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-[#1f1f1f]">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-500 dark:bg-red-900/20">
                        <LockOutlined />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                        无权访问账号管理
                    </h1>
                    <p className="mt-3 text-gray-500 dark:text-gray-400">
                        该页面仅超级管理员可见。
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 dark:bg-black md:p-10">
            <div className="mx-auto max-w-[1600px] space-y-8">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <TeamOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                System
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            账号管理
                        </h1>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            管理后台登录账号，并用于记录订单保存人等操作信息。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button icon={<ReloadOutlined />} onClick={refresh} />
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            新增账号
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white bg-white/80 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/80">
                    <Input
                        allowClear
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="搜索账号..."
                        value={query.search}
                        onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value }))}
                        className="max-w-md"
                    />
                    <Select
                        allowClear
                        placeholder="角色"
                        value={query.role}
                        onChange={(role) => setQuery((prev) => ({ ...prev, role }))}
                        className="w-40"
                        options={[
                            { value: 'admin', label: '超级管理员' },
                            { value: 'staff', label: '普通账号' },
                        ]}
                    />
                    <Select
                        allowClear
                        placeholder="状态"
                        value={query.status}
                        onChange={(status) => setQuery((prev) => ({ ...prev, status }))}
                        className="w-40"
                        options={[
                            { value: 'active', label: '启用' },
                            { value: 'disabled', label: '禁用' },
                        ]}
                    />
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1f1f1f]">
                    <Table
                        rowKey="id"
                        loading={loading || meLoading}
                        columns={columns}
                        dataSource={users}
                        pagination={{ pageSize: 10 }}
                    />
                </div>
            </div>

            <Modal
                title={currentUser ? '编辑账号' : '新增账号'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={submitAccount}
                confirmLoading={saving}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" className="pt-4">
                    <Form.Item
                        name="username"
                        label="账号"
                        rules={[{ required: true, message: '请输入账号' }]}
                    >
                        <Input placeholder="例如: zhangsan" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label={currentUser ? '新密码' : '密码'}
                        extra={currentUser ? '留空表示不修改密码' : undefined}
                        rules={
                            currentUser
                                ? []
                                : [
                                      { required: true, message: '请输入密码' },
                                      { min: 6, message: '密码至少需要 6 位' },
                                  ]
                        }
                    >
                        <Input.Password placeholder={currentUser ? '留空不修改' : '至少 6 位'} />
                    </Form.Item>
                    <Form.Item
                        name="role"
                        label="角色"
                        rules={[{ required: true, message: '请选择角色' }]}
                    >
                        <Select
                            options={[
                                { value: 'admin', label: '超级管理员' },
                                { value: 'staff', label: '普通账号' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        name="status"
                        label="状态"
                        rules={[{ required: true, message: '请选择状态' }]}
                    >
                        <Select
                            options={[
                                { value: 'active', label: '启用' },
                                { value: 'disabled', label: '禁用' },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

