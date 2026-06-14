'use client';

import {
    AfterSalesCategoryPayload,
    AfterSalesNoticePayload,
    AfterSalesServicePayload,
    createAfterSalesCategory,
    createAfterSalesNotice,
    createAfterSalesService,
    deleteAfterSalesCategory,
    deleteAfterSalesNotice,
    deleteAfterSalesService,
    fetchAdminAfterSalesCategories,
    fetchAdminAfterSalesNotices,
    fetchAdminAfterSalesServices,
    updateAfterSalesCategory,
    updateAfterSalesNotice,
    updateAfterSalesService,
} from '@/app/services/afterSales';
import type {
    AfterSalesCategory,
    AfterSalesNotice,
    AfterSalesPriceType,
    AfterSalesService,
} from '@/const/types';
import { formatDate } from '@/utils';
import {
    CustomerServiceOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Button,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Popconfirm,
    Select,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';

type ServiceFormValues = Omit<AfterSalesServicePayload, 'category_id'> & {
    category_id?: number;
};

type CategoryFormValues = AfterSalesCategoryPayload;
type NoticeFormValues = AfterSalesNoticePayload;

const PRICE_TYPE_OPTIONS: Array<{ label: string; value: AfterSalesPriceType }> = [
    { label: '固定价', value: 'fixed' },
    { label: '区间价', value: 'range' },
    { label: '多价格', value: 'multi' },
    { label: '自定义', value: 'custom' },
];

const PRICE_TYPE_LABELS: Record<AfterSalesPriceType, string> = {
    fixed: '固定价',
    range: '区间价',
    multi: '多价格',
    custom: '自定义',
};

export default function AfterSalesAdminPage() {
    const [serviceQuery, setServiceQuery] = useState<{
        keyword: string;
        categoryId?: number;
        status?: 'active' | 'inactive';
    }>({ keyword: '' });
    const [serviceModalVisible, setServiceModalVisible] = useState(false);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [noticeModalVisible, setNoticeModalVisible] = useState(false);
    const [editingService, setEditingService] = useState<AfterSalesService | null>(null);
    const [editingCategory, setEditingCategory] = useState<AfterSalesCategory | null>(null);
    const [editingNotice, setEditingNotice] = useState<AfterSalesNotice | null>(null);
    const [serviceForm] = Form.useForm<ServiceFormValues>();
    const [categoryForm] = Form.useForm<CategoryFormValues>();
    const [noticeForm] = Form.useForm<NoticeFormValues>();

    const {
        data: categories = [],
        loading: categoriesLoading,
        refresh: refreshCategories,
    } = useRequest(() => fetchAdminAfterSalesCategories({ includeInactive: true }));

    const {
        data: services = [],
        loading: servicesLoading,
        refresh: refreshServices,
    } = useRequest(
        () =>
            fetchAdminAfterSalesServices({
                includeInactive: true,
                keyword: serviceQuery.keyword || undefined,
                categoryId: serviceQuery.categoryId,
                status: serviceQuery.status,
            }),
        {
            refreshDeps: [serviceQuery],
            debounceWait: 300,
        }
    );

    const {
        data: notices = [],
        loading: noticesLoading,
        refresh: refreshNotices,
    } = useRequest(() => fetchAdminAfterSalesNotices({ includeInactive: true }));

    const refreshAll = () => {
        refreshServices();
        refreshCategories();
        refreshNotices();
    };

    const stats = useMemo(
        () => ({
            serviceCount: services.length,
            activeServiceCount: services.filter((item) => item.is_active).length,
            categoryCount: categories.length,
            noticeCount: notices.length,
        }),
        [categories.length, notices.length, services]
    );

    const openServiceModal = (service?: AfterSalesService) => {
        setEditingService(service || null);
        serviceForm.resetFields();
        if (service) {
            serviceForm.setFieldsValue({
                category_id: service.category_id,
                name: service.name,
                description: service.description || undefined,
                price_type: service.price_type,
                price: service.price ?? undefined,
                price_label: service.price_label,
                unit: service.unit || undefined,
                includes: service.includes || undefined,
                excludes: service.excludes || undefined,
                sort_order: service.sort_order,
                is_featured: service.is_featured,
                is_active: service.is_active,
            });
        } else {
            serviceForm.setFieldsValue({
                category_id: categories.find((item) => item.is_active)?.id || categories[0]?.id,
                price_type: 'fixed',
                is_active: true,
                is_featured: false,
            });
        }
        setServiceModalVisible(true);
    };

    const openCategoryModal = (category?: AfterSalesCategory) => {
        setEditingCategory(category || null);
        categoryForm.resetFields();
        if (category) {
            categoryForm.setFieldsValue({
                name: category.name,
                description: category.description || undefined,
                sort_order: category.sort_order,
                is_active: category.is_active,
            });
        } else {
            categoryForm.setFieldsValue({ is_active: true });
        }
        setCategoryModalVisible(true);
    };

    const openNoticeModal = (notice?: AfterSalesNotice) => {
        setEditingNotice(notice || null);
        noticeForm.resetFields();
        if (notice) {
            noticeForm.setFieldsValue({
                content: notice.content,
                sort_order: notice.sort_order,
                is_active: notice.is_active,
            });
        } else {
            noticeForm.setFieldsValue({ is_active: true });
        }
        setNoticeModalVisible(true);
    };

    const closeServiceModal = () => {
        setServiceModalVisible(false);
        setEditingService(null);
        serviceForm.resetFields();
    };

    const closeCategoryModal = () => {
        setCategoryModalVisible(false);
        setEditingCategory(null);
        categoryForm.resetFields();
    };

    const closeNoticeModal = () => {
        setNoticeModalVisible(false);
        setEditingNotice(null);
        noticeForm.resetFields();
    };

    const { runAsync: submitService, loading: serviceSubmitting } = useRequest(
        async () => {
            const values = await serviceForm.validateFields();
            if (!values.category_id) throw new Error('请选择服务分类');
            const payload: AfterSalesServicePayload = {
                category_id: values.category_id,
                name: values.name?.trim() || '',
                description: values.description?.trim() || null,
                price_type: values.price_type || 'fixed',
                price: values.price ?? null,
                price_label: values.price_label?.trim() || '',
                unit: values.unit?.trim() || null,
                includes: values.includes?.trim() || null,
                excludes: values.excludes?.trim() || null,
                sort_order: values.sort_order,
                is_featured: Boolean(values.is_featured),
                is_active: values.is_active !== false,
            };
            if (editingService) {
                await updateAfterSalesService(editingService.id, payload);
                return;
            }
            await createAfterSalesService(payload);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingService ? '服务项目已更新' : '服务项目已创建');
                closeServiceModal();
                refreshServices();
                refreshCategories();
            },
            onError: (e) => message.error(e.message || '服务项目保存失败'),
        }
    );

    const { runAsync: submitCategory, loading: categorySubmitting } = useRequest(
        async () => {
            const values = await categoryForm.validateFields();
            const payload: AfterSalesCategoryPayload = {
                name: values.name.trim(),
                description: values.description?.trim() || null,
                sort_order: values.sort_order,
                is_active: values.is_active !== false,
            };
            if (editingCategory) {
                await updateAfterSalesCategory(editingCategory.id, payload);
                return;
            }
            await createAfterSalesCategory(payload);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingCategory ? '分类已更新' : '分类已创建');
                closeCategoryModal();
                refreshCategories();
                refreshServices();
            },
            onError: (e) => message.error(e.message || '分类保存失败'),
        }
    );

    const { runAsync: submitNotice, loading: noticeSubmitting } = useRequest(
        async () => {
            const values = await noticeForm.validateFields();
            const payload: AfterSalesNoticePayload = {
                content: values.content.trim(),
                sort_order: values.sort_order,
                is_active: values.is_active !== false,
            };
            if (editingNotice) {
                await updateAfterSalesNotice(editingNotice.id, payload);
                return;
            }
            await createAfterSalesNotice(payload);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingNotice ? '提示已更新' : '提示已创建');
                closeNoticeModal();
                refreshNotices();
            },
            onError: (e) => message.error(e.message || '提示保存失败'),
        }
    );

    const removeService = async (id: number) => {
        try {
            await deleteAfterSalesService(id);
            message.success('服务项目已删除');
            refreshServices();
            refreshCategories();
        } catch (e) {
            message.error((e as { message?: string }).message || '删除失败');
        }
    };

    const removeCategory = async (id: number) => {
        try {
            await deleteAfterSalesCategory(id);
            message.success('分类已删除');
            refreshCategories();
        } catch (e) {
            message.error((e as { message?: string }).message || '删除失败');
        }
    };

    const removeNotice = async (id: number) => {
        try {
            await deleteAfterSalesNotice(id);
            message.success('提示已删除');
            refreshNotices();
        } catch (e) {
            message.error((e as { message?: string }).message || '删除失败');
        }
    };

    const toggleService = async (service: AfterSalesService) => {
        await updateAfterSalesService(service.id, {
            category_id: service.category_id,
            name: service.name,
            description: service.description,
            price_type: service.price_type,
            price: service.price,
            price_label: service.price_label,
            unit: service.unit,
            includes: service.includes,
            excludes: service.excludes,
            sort_order: service.sort_order,
            is_featured: service.is_featured,
            is_active: !service.is_active,
        });
        refreshServices();
    };

    const toggleCategory = async (category: AfterSalesCategory) => {
        await updateAfterSalesCategory(category.id, {
            name: category.name,
            description: category.description,
            sort_order: category.sort_order,
            is_active: !category.is_active,
        });
        refreshCategories();
        refreshServices();
    };

    const toggleNotice = async (notice: AfterSalesNotice) => {
        await updateAfterSalesNotice(notice.id, {
            content: notice.content,
            sort_order: notice.sort_order,
            is_active: !notice.is_active,
        });
        refreshNotices();
    };

    const serviceColumns: ColumnsType<AfterSalesService> = [
        {
            title: '服务项目',
            dataIndex: 'name',
            width: 300,
            render: (_, record) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {record.name}
                        </span>
                        {record.is_featured && <Tag color="gold">重点</Tag>}
                    </div>
                    {record.description && (
                        <span className="line-clamp-2 text-xs text-gray-400">
                            {record.description}
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: '分类',
            dataIndex: 'category_name',
            width: 140,
            render: (value) => <Tag color="blue">{value || '未分类'}</Tag>,
        },
        {
            title: '价格',
            dataIndex: 'price_label',
            width: 150,
            render: (value, record) => (
                <div className="flex flex-col">
                    <span className="font-mono font-bold text-emerald-600">{value}</span>
                    <span className="text-xs text-gray-400">{PRICE_TYPE_LABELS[record.price_type]}</span>
                </div>
            ),
        },
        {
            title: '包含内容',
            dataIndex: 'includes',
            ellipsis: true,
            render: (value) => value || <span className="text-gray-300">-</span>,
        },
        {
            title: '排序',
            dataIndex: 'sort_order',
            width: 90,
            align: 'center',
            render: (value) => <span className="font-mono">{value}</span>,
        },
        {
            title: '启用',
            dataIndex: 'is_active',
            width: 90,
            render: (_, record) => (
                <Switch checked={record.is_active} onChange={() => toggleService(record)} />
            ),
        },
        {
            title: '更新时间',
            dataIndex: 'updated_at',
            width: 170,
            render: (value) => <span className="text-xs text-gray-500">{formatDate(value)}</span>,
        },
        {
            title: '操作',
            width: 140,
            fixed: 'right',
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Tooltip title="编辑">
                        <Button type="text" icon={<EditOutlined />} onClick={() => openServiceModal(record)} />
                    </Tooltip>
                    <Popconfirm
                        title="删除此服务项目?"
                        description="删除后前台不再展示该服务。"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => removeService(record.id)}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const categoryColumns: ColumnsType<AfterSalesCategory> = [
        {
            title: '分类',
            dataIndex: 'name',
            width: 260,
            render: (_, record) => (
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {record.name}
                    </span>
                    <span className="text-xs text-gray-400">{record.description || '-'}</span>
                </div>
            ),
        },
        {
            title: '服务数',
            dataIndex: 'service_count',
            width: 100,
            align: 'center',
            render: (value) => <span className="font-mono font-bold">{value || 0}</span>,
        },
        {
            title: '排序',
            dataIndex: 'sort_order',
            width: 90,
            align: 'center',
            render: (value) => <span className="font-mono">{value}</span>,
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
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Button type="text" icon={<EditOutlined />} onClick={() => openCategoryModal(record)} />
                    <Popconfirm
                        title="删除此分类?"
                        description="分类下没有服务项目时才可删除。"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => removeCategory(record.id)}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const noticeColumns: ColumnsType<AfterSalesNotice> = [
        {
            title: '提示内容',
            dataIndex: 'content',
            render: (value) => <span className="text-gray-700 dark:text-gray-200">{value}</span>,
        },
        {
            title: '排序',
            dataIndex: 'sort_order',
            width: 90,
            align: 'center',
            render: (value) => <span className="font-mono">{value}</span>,
        },
        {
            title: '启用',
            dataIndex: 'is_active',
            width: 90,
            render: (_, record) => (
                <Switch checked={record.is_active} onChange={() => toggleNotice(record)} />
            ),
        },
        {
            title: '操作',
            width: 140,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Button type="text" icon={<EditOutlined />} onClick={() => openNoticeModal(record)} />
                    <Popconfirm
                        title="删除此提示?"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => removeNotice(record.id)}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const priceType = Form.useWatch('price_type', serviceForm);

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 dark:bg-black md:p-10">
            <div className="mx-auto max-w-[1600px] space-y-8">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <CustomerServiceOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                After Sales
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            售后服务
                        </h1>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            管理前台售后服务价目表、服务分类与温馨提示。
                        </p>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={refreshAll}>
                            刷新
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openServiceModal()}>
                            新增服务
                        </Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <StatCard label="全部服务" value={stats.serviceCount} />
                    <StatCard label="启用服务" value={stats.activeServiceCount} />
                    <StatCard label="服务分类" value={stats.categoryCount} />
                    <StatCard label="温馨提示" value={stats.noticeCount} />
                </div>

                <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/90">
                    <Tabs
                        items={[
                            {
                                key: 'services',
                                label: '服务项目',
                                children: (
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <Input
                                                    allowClear
                                                    prefix={<SearchOutlined className="text-gray-400" />}
                                                    placeholder="搜索服务名称、说明或价格..."
                                                    className="w-72"
                                                    value={serviceQuery.keyword}
                                                    onChange={(e) =>
                                                        setServiceQuery((prev) => ({
                                                            ...prev,
                                                            keyword: e.target.value,
                                                        }))
                                                    }
                                                />
                                                <Select
                                                    allowClear
                                                    placeholder="分类"
                                                    className="w-44"
                                                    value={serviceQuery.categoryId}
                                                    options={categories.map((item) => ({
                                                        label: item.name,
                                                        value: item.id,
                                                    }))}
                                                    onChange={(value) =>
                                                        setServiceQuery((prev) => ({
                                                            ...prev,
                                                            categoryId: value,
                                                        }))
                                                    }
                                                />
                                                <Select
                                                    allowClear
                                                    placeholder="状态"
                                                    className="w-36"
                                                    value={serviceQuery.status}
                                                    options={[
                                                        { label: '启用', value: 'active' },
                                                        { label: '停用', value: 'inactive' },
                                                    ]}
                                                    onChange={(value) =>
                                                        setServiceQuery((prev) => ({
                                                            ...prev,
                                                            status: value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <Button icon={<PlusOutlined />} type="primary" onClick={() => openServiceModal()}>
                                                新增服务
                                            </Button>
                                        </div>
                                        <Table
                                            rowKey="id"
                                            columns={serviceColumns}
                                            dataSource={services}
                                            loading={servicesLoading}
                                            scroll={{ x: 1180 }}
                                            pagination={{ pageSize: 10 }}
                                        />
                                    </div>
                                ),
                            },
                            {
                                key: 'categories',
                                label: '服务分类',
                                children: (
                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <Button icon={<PlusOutlined />} type="primary" onClick={() => openCategoryModal()}>
                                                新增分类
                                            </Button>
                                        </div>
                                        <Table
                                            rowKey="id"
                                            columns={categoryColumns}
                                            dataSource={categories}
                                            loading={categoriesLoading}
                                            pagination={false}
                                        />
                                    </div>
                                ),
                            },
                            {
                                key: 'notices',
                                label: '温馨提示',
                                children: (
                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <Button icon={<PlusOutlined />} type="primary" onClick={() => openNoticeModal()}>
                                                新增提示
                                            </Button>
                                        </div>
                                        <Table
                                            rowKey="id"
                                            columns={noticeColumns}
                                            dataSource={notices}
                                            loading={noticesLoading}
                                            pagination={false}
                                        />
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            </div>

            <Modal
                title={editingService ? '编辑服务项目' : '新增服务项目'}
                open={serviceModalVisible}
                onCancel={closeServiceModal}
                onOk={() => submitService()}
                confirmLoading={serviceSubmitting}
                width={760}
                destroyOnClose
            >
                <Form form={serviceForm} layout="vertical" className="mt-4">
                    <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                        <Form.Item name="name" label="服务名称" rules={[{ required: true, message: '请输入服务名称' }]}>
                            <Input placeholder="例如：电脑系统安装/重装服务（精装）" />
                        </Form.Item>
                        <Form.Item
                            name="category_id"
                            label="所属分类"
                            rules={[{ required: true, message: '请选择分类' }]}
                        >
                            <Select
                                placeholder="选择分类"
                                options={categories.map((item) => ({ label: item.name, value: item.id }))}
                            />
                        </Form.Item>
                        <Form.Item name="price_type" label="价格类型" rules={[{ required: true }]}>
                            <Select options={PRICE_TYPE_OPTIONS} />
                        </Form.Item>
                        {priceType === 'fixed' ? (
                            <Form.Item
                                name="price"
                                label="服务价格（元）"
                                rules={[{ required: true, message: '请输入服务价格' }]}
                            >
                                <InputNumber min={0} precision={2} className="w-full" placeholder="30" />
                            </Form.Item>
                        ) : (
                            <Form.Item
                                name="price_label"
                                label="展示价格"
                                rules={[{ required: true, message: '请输入展示价格' }]}
                            >
                                <Input placeholder="例如：120元/150元/200元" />
                            </Form.Item>
                        )}
                        {priceType === 'fixed' && (
                            <Form.Item name="price_label" label="展示价格">
                                <Input placeholder="不填时按价格自动生成，例如 30元" />
                            </Form.Item>
                        )}
                        <Form.Item name="unit" label="计价单位">
                            <Input placeholder="次 / 台 / 套" />
                        </Form.Item>
                        <Form.Item name="sort_order" label="排序值">
                            <InputNumber className="w-full" placeholder="越小越靠前" />
                        </Form.Item>
                    </div>
                    <Form.Item name="description" label="服务说明">
                        <Input.TextArea rows={2} placeholder="展示在服务名称下方的补充说明" />
                    </Form.Item>
                    <Form.Item name="includes" label="包含内容">
                        <Input.TextArea rows={2} placeholder="例如：包含屏幕清洁、外观清洁、主板清洁..." />
                    </Form.Item>
                    <Form.Item name="excludes" label="不包含内容">
                        <Input.TextArea rows={2} placeholder="例如：不含配件费" />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                        <Form.Item name="is_featured" label="重点展示" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                        <Form.Item name="is_active" label="启用" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={editingCategory ? '编辑服务分类' : '新增服务分类'}
                open={categoryModalVisible}
                onCancel={closeCategoryModal}
                onOk={() => submitCategory()}
                confirmLoading={categorySubmitting}
                destroyOnClose
            >
                <Form form={categoryForm} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
                        <Input placeholder="例如：清洁保养" />
                    </Form.Item>
                    <Form.Item name="description" label="分类说明">
                        <Input.TextArea rows={2} placeholder="分类展示说明" />
                    </Form.Item>
                    <Form.Item name="sort_order" label="排序值">
                        <InputNumber className="w-full" placeholder="越小越靠前" />
                    </Form.Item>
                    <Form.Item name="is_active" label="启用" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={editingNotice ? '编辑温馨提示' : '新增温馨提示'}
                open={noticeModalVisible}
                onCancel={closeNoticeModal}
                onOk={() => submitNotice()}
                confirmLoading={noticeSubmitting}
                destroyOnClose
            >
                <Form form={noticeForm} layout="vertical" className="mt-4">
                    <Form.Item name="content" label="提示内容" rules={[{ required: true, message: '请输入提示内容' }]}>
                        <Input.TextArea rows={4} placeholder="请输入展示在前台底部的温馨提示" />
                    </Form.Item>
                    <Form.Item name="sort_order" label="排序值">
                        <InputNumber className="w-full" placeholder="越小越靠前" />
                    </Form.Item>
                    <Form.Item name="is_active" label="启用" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/80">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-2 text-3xl font-black text-gray-900 dark:text-gray-100">{value}</div>
        </div>
    );
}

