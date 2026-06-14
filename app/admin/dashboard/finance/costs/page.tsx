'use client';

import { OperatingCost } from '@/const/types';
import { formatDate, formatPrice } from '@/utils';
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    WalletOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Button,
    DatePicker,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Popconfirm,
    Select,
    Table,
    Tag,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { deleteOperatingCost, fetchOperatingCosts, saveOperatingCost } from '../../services';

const costTypeOptions = [
    { value: 'rent', label: '房租', color: 'blue' },
    { value: 'salary', label: '人工工资', color: 'purple' },
    { value: 'utilities', label: '水电费', color: 'cyan' },
    { value: 'misc', label: '杂费', color: 'orange' },
    { value: 'shipping', label: '运费', color: 'green' },
    { value: 'purchase_misc', label: '入库杂费', color: 'gold' },
];

const getCostType = (type: string) =>
    costTypeOptions.find((item) => item.value === type) || costTypeOptions[3];

export default function FinanceCostsPage() {
    const [query, setQuery] = useState({
        search: '',
        type: undefined as string | undefined,
        month: dayjs().format('YYYY-MM'),
    });
    const [visible, setVisible] = useState(false);
    const [editingCost, setEditingCost] = useState<OperatingCost | null>(null);
    const [form] = Form.useForm();

    const {
        data: costs = [],
        loading,
        refresh,
    } = useRequest(() => fetchOperatingCosts(query), {
        refreshDeps: [query],
        debounceWait: 300,
    });

    const totalAmount = useMemo(
        () => costs.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        [costs]
    );

    const { runAsync: submitCost, loading: saving } = useRequest(
        async () => {
            const values = await form.validateFields();
            await saveOperatingCost(
                {
                    ...values,
                    cost_date: values.cost_date.format('YYYY-MM-DD'),
                },
                editingCost?.id
            );
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingCost ? '成本已更新' : '成本已创建');
                setVisible(false);
                setEditingCost(null);
                form.resetFields();
                refresh();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: removeCost, loading: deleting } = useRequest(deleteOperatingCost, {
        manual: true,
        onSuccess: () => {
            message.success('成本已删除');
            refresh();
        },
        onError: (e) => message.error(e.message),
    });

    const openModal = (cost?: OperatingCost) => {
        setEditingCost(cost || null);
        if (cost) {
            form.setFieldsValue({
                ...cost,
                cost_date: dayjs(cost.cost_date),
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ type: 'misc', cost_date: dayjs() });
        }
        setVisible(true);
    };

    const columns: ColumnsType<OperatingCost> = [
        {
            title: '类型',
            dataIndex: 'type',
            width: 120,
            render: (type) => {
                const config = getCostType(type);
                return <Tag color={config.color}>{config.label}</Tag>;
            },
        },
        {
            title: '成本名称',
            dataIndex: 'name',
            width: 220,
            render: (text) => (
                <span className="font-bold text-gray-900 dark:text-gray-100">{text}</span>
            ),
        },
        {
            title: '金额',
            dataIndex: 'amount',
            align: 'right',
            width: 140,
            render: (amount) => (
                <span className="font-mono font-bold text-red-500">
                    {formatPrice(Number(amount))}
                </span>
            ),
        },
        {
            title: '日期',
            dataIndex: 'cost_date',
            width: 140,
            render: (text) => dayjs(text).format('YYYY-MM-DD'),
        },
        {
            title: '备注',
            dataIndex: 'note',
            width: 280,
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
            fixed: 'right',
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
                        title="确定删除该成本？"
                        okButtonProps={{ danger: true, loading: deleting }}
                        onConfirm={() => removeCost(record.id)}
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
            <div className="max-w-[1500px] mx-auto space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <WalletOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Finance
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            成本管理
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            维护房租、工资、水电、运费、入库杂费等经营成本。
                        </p>
                    </div>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => openModal()}
                        className="h-12 px-6 rounded-xl bg-blue-600 border-none shadow-lg shadow-blue-600/20"
                    >
                        新增成本
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                        <div className="text-sm text-gray-400 mb-2">当前筛选成本</div>
                        <div className="text-3xl font-black text-red-500">
                            {formatPrice(totalAmount)}
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-xl rounded-2xl border border-white dark:border-white/10 p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        <Input
                            allowClear
                            prefix={<SearchOutlined className="text-gray-400" />}
                            placeholder="搜索成本名称或备注..."
                            value={query.search}
                            onChange={(e) =>
                                setQuery((prev) => ({ ...prev, search: e.target.value }))
                            }
                            className="max-w-md h-10 rounded-xl border-none bg-gray-100/60 dark:bg-[#141414]"
                        />
                        <Select
                            allowClear
                            placeholder="成本类型"
                            value={query.type}
                            onChange={(type) => setQuery((prev) => ({ ...prev, type }))}
                            className="w-40"
                            options={costTypeOptions}
                        />
                        <DatePicker
                            picker="month"
                            value={dayjs(query.month)}
                            onChange={(date) =>
                                setQuery((prev) => ({
                                    ...prev,
                                    month: date ? date.format('YYYY-MM') : '',
                                }))
                            }
                            className="h-10 rounded-xl"
                        />
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={refresh} />
                </div>

                <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <Table
                        rowKey="id"
                        loading={loading}
                        columns={columns}
                        dataSource={costs}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 1200 }}
                    />
                </div>
            </div>

            <Modal
                title={editingCost ? '编辑成本' : '新增成本'}
                open={visible}
                onCancel={() => setVisible(false)}
                onOk={submitCost}
                confirmLoading={saving}
                destroyOnHidden
                width={680}
            >
                <Form form={form} layout="vertical" className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="type"
                            label="成本类型"
                            rules={[{ required: true, message: '请选择成本类型' }]}
                        >
                            <Select options={costTypeOptions} />
                        </Form.Item>
                        <Form.Item
                            name="cost_date"
                            label="成本日期"
                            rules={[{ required: true, message: '请选择成本日期' }]}
                        >
                            <DatePicker className="w-full" />
                        </Form.Item>
                    </div>
                    <Form.Item
                        name="name"
                        label="成本名称"
                        rules={[{ required: true, message: '请输入成本名称' }]}
                    >
                        <Input placeholder="例如：五月房租" />
                    </Form.Item>
                    <Form.Item
                        name="amount"
                        label="金额"
                        rules={[{ required: true, message: '请输入金额' }]}
                    >
                        <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                    </Form.Item>
                    <Form.Item name="note" label="备注">
                        <Input.TextArea rows={3} placeholder="备注" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
