'use client';

import SiteHeader from '@/app/_components/SiteHeader';
import { useAuth } from '@/app/_components/AuthProvider';
import { fetchActiveAdminUsers } from '@/app/services/adminUsers';
import { fetchPublicAfterSalesServices, submitAfterSalesCheckout } from '@/app/services/afterSales';
import type { AfterSalesCategory, AfterSalesService } from '@/const/types';
import {
    CheckCircleOutlined,
    CustomerServiceOutlined,
    InfoCircleOutlined,
    MinusOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Alert,
    Button,
    Checkbox,
    Empty,
    Form,
    Input,
    InputNumber,
    Layout,
    message,
    Modal,
    Select,
    Skeleton,
    Tag,
} from 'antd';
import React, { useMemo, useState } from 'react';

const { Content } = Layout;

interface SelectedService {
    service: AfterSalesService;
    quantity: number;
}

export default function AfterSalesPage() {
    const [activeCategory, setActiveCategory] = useState('all');
    const [keyword, setKeyword] = useState('');
    const [selectedServices, setSelectedServices] = useState<Record<number, SelectedService>>({});
    const [checkoutVisible, setCheckoutVisible] = useState(false);
    const [checkoutForm] = Form.useForm();
    const { isLoggedIn, currentUser } = useAuth();
    const { data, loading, error, refresh } = useRequest(fetchPublicAfterSalesServices);
    const { data: handlerUsers = [], loading: loadingHandlerUsers } = useRequest(
        fetchActiveAdminUsers,
        {
            ready: isLoggedIn,
        }
    );

    const categories = useMemo(() => data?.categories || [], [data?.categories]);
    const notices = useMemo(() => data?.notices || [], [data?.notices]);

    const visibleCategories = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        const filtered =
            activeCategory === 'all'
                ? categories
                : categories.filter((category) => category.code === activeCategory);

        if (!normalizedKeyword) return filtered;

        return filtered
            .map((category) => ({
                ...category,
                services: (category.services || []).filter((service) =>
                    [
                        service.name,
                        service.description,
                        service.price_label,
                        service.includes,
                        service.excludes,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase()
                        .includes(normalizedKeyword)
                ),
            }))
            .filter((category) => (category.services || []).length > 0);
    }, [activeCategory, categories, keyword]);

    const categoryOptions = [
        { label: '全部', value: 'all' },
        ...categories.map((category) => ({
            label: category.name,
            value: category.code || String(category.id),
        })),
    ];

    const serviceCount = categories.reduce(
        (sum, category) => sum + (category.services?.length || 0),
        0
    );
    const selectedList = useMemo(() => Object.values(selectedServices), [selectedServices]);
    const selectedCount = selectedList.reduce((sum, item) => sum + item.quantity, 0);
    const checkoutTotal = selectedList.reduce(
        (sum, item) => sum + getServiceCheckoutPrice(item.service) * item.quantity,
        0
    );
    const defaultHandlerUserId = handlerUsers.find((user) => user.id === currentUser?.id)?.id;

    const toggleServiceSelection = (service: AfterSalesService) => {
        setSelectedServices((prev) => {
            if (prev[service.id]) {
                const next = { ...prev };
                delete next[service.id];
                return next;
            }
            return {
                ...prev,
                [service.id]: { service, quantity: 1 },
            };
        });
    };

    const updateServiceQuantity = (serviceId: number, quantity: number) => {
        setSelectedServices((prev) => {
            const current = prev[serviceId];
            if (!current) return prev;
            return {
                ...prev,
                [serviceId]: {
                    ...current,
                    quantity: Math.max(1, quantity),
                },
            };
        });
    };

    const { runAsync: submitCheckout, loading: checkoutSubmitting } = useRequest(
        async () => {
            const values = await checkoutForm.validateFields();
            const result = await submitAfterSalesCheckout({
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                save_customer: Boolean(values.save_customer),
                handler_user_id: values.handler_user_id,
                device_model: values.device_model,
                fault_description: values.fault_description,
                service_note: values.service_note,
                note: values.note,
                final_amount: values.final_amount,
                services: selectedList.map((item) => ({
                    service_id: item.service.id,
                    quantity: item.quantity,
                    sale_price: getServiceCheckoutPrice(item.service) || null,
                })),
                total_amount: checkoutTotal,
            });
            return result;
        },
        {
            manual: true,
            onSuccess: (result) => {
                message.success(`售后服务订单已创建：${result.order_no}`);
                setCheckoutVisible(false);
                checkoutForm.resetFields();
                setSelectedServices({});
            },
            onError: (e) => message.error(e.message || '下单请求提交失败'),
        }
    );

    return (
        <Layout className="min-h-screen bg-[#f8fafc] transition-colors duration-500 dark:bg-[#141414]">
            <SiteHeader />
            <Content className="flex-1 px-4 py-6 md:px-8 lg:px-12">
                <div className="mx-auto max-w-6xl space-y-6">
                    <section className="rounded-2xl border border-white bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/85 md:p-8">
                        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <CustomerServiceOutlined />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                        After Sales Service
                                    </span>
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-gray-100 md:text-4xl">
                                    售后服务价目表
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                                    价格仅含服务费，不含配件费。涉及硬盘清理、系统重装等服务时，请提前备份重要数据。
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center md:min-w-72">
                                <Summary label="分类" value={categories.length} />
                                <Summary label="服务" value={serviceCount} />
                                <Summary label="提示" value={notices.length} />
                            </div>
                        </div>
                    </section>

                    {error && (
                        <Alert
                            type="error"
                            showIcon
                            message="售后服务加载失败"
                            description="请稍后重试，或联系管理员检查服务配置。"
                            action={
                                <Button size="small" icon={<ReloadOutlined />} onClick={refresh}>
                                    重试
                                </Button>
                            }
                        />
                    )}

                    <div className="flex flex-col gap-3 rounded-2xl border border-white bg-white/85 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/85 md:flex-row md:items-center">
                        <Input
                            allowClear
                            prefix={<SearchOutlined />}
                            placeholder="搜索服务名称、说明或价格"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            className="md:max-w-md"
                        />
                        <Select
                            value={activeCategory}
                            onChange={setActiveCategory}
                            options={categoryOptions}
                            className="w-full md:hidden"
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <aside className="hidden lg:block">
                            <CategoryNav
                                categories={categories}
                                activeCategory={activeCategory}
                                onChange={setActiveCategory}
                            />
                        </aside>

                        <div className="min-w-0">
                            {loading ? (
                                <ServiceSkeleton />
                            ) : visibleCategories.length === 0 ? (
                                <div className="rounded-2xl border border-white bg-white/85 p-10 shadow-sm dark:border-white/10 dark:bg-[#1f1f1f]/85">
                                    <Empty description="暂无售后服务项目" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {visibleCategories.map((category) => (
                                        <CategorySection
                                            key={category.id}
                                            category={category}
                                            selectedServices={selectedServices}
                                            onToggleService={toggleServiceSelection}
                                            onQuantityChange={updateServiceQuantity}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {notices.length > 0 && (
                        <section className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
                            <div className="mb-3 flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
                                <InfoCircleOutlined />
                                <span>温馨提示</span>
                            </div>
                            <ol className="m-0 space-y-2 pl-5 text-sm leading-6 text-amber-900 dark:text-amber-100">
                                {notices.map((notice) => (
                                    <li key={notice.id}>{notice.content}</li>
                                ))}
                            </ol>
                        </section>
                    )}
                </div>
            </Content>
            {selectedList.length > 0 && (
                <CheckoutBar
                    selectedCount={selectedCount}
                    total={checkoutTotal}
                    onCheckout={() => {
                        if (!isLoggedIn) {
                            message.warning('请先登录后台后再提交售后服务订单');
                            return;
                        }
                        checkoutForm.resetFields();
                        checkoutForm.setFieldsValue({
                            save_customer: true,
                            final_amount: checkoutTotal,
                            handler_user_id: defaultHandlerUserId,
                        });
                        setCheckoutVisible(true);
                    }}
                    onClear={() => setSelectedServices({})}
                />
            )}
            <CheckoutModal
                form={checkoutForm}
                open={checkoutVisible}
                selectedList={selectedList}
                total={checkoutTotal}
                handlerUsers={handlerUsers}
                loadingHandlerUsers={loadingHandlerUsers}
                submitting={checkoutSubmitting}
                onCancel={() => setCheckoutVisible(false)}
                onConfirm={() => submitCheckout()}
            />
        </Layout>
    );
}

function CategoryNav({
    categories,
    activeCategory,
    onChange,
}: {
    categories: AfterSalesCategory[];
    activeCategory: string;
    onChange: (value: string) => void;
}) {
    const navItems = [
        {
            key: 'all',
            name: '全部服务',
            count: categories.reduce((sum, category) => sum + (category.services?.length || 0), 0),
        },
        ...categories.map((category) => ({
            key: category.code || String(category.id),
            name: category.name,
            count: category.services?.length || 0,
        })),
    ];

    return (
        <nav className="sticky top-24 rounded-2xl border border-white bg-white/85 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/85">
            <div className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">
                服务分类
            </div>
            <div className="space-y-1">
                {navItems.map((item) => {
                    const isActive = item.key === activeCategory;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onChange(item.key)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${
                                isActive
                                    ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/15 dark:text-blue-300'
                                    : 'text-gray-500 hover:bg-slate-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100'
                            }`}
                        >
                            <span className="min-w-0 truncate text-sm font-bold">{item.name}</span>
                            <span
                                className={`ml-3 rounded-full px-2 py-0.5 text-xs font-bold ${
                                    isActive
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
                                        : 'bg-slate-100 text-gray-400 dark:bg-white/10'
                                }`}
                            >
                                {item.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

function CategorySection({
    category,
    selectedServices,
    onToggleService,
    onQuantityChange,
}: {
    category: AfterSalesCategory;
    selectedServices: Record<number, SelectedService>;
    onToggleService: (service: AfterSalesService) => void;
    onQuantityChange: (serviceId: number, quantity: number) => void;
}) {
    const services = category.services || [];

    return (
        <section className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/90 md:p-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
                        {category.name}
                    </h2>
                    {category.description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {category.description}
                        </p>
                    )}
                </div>
                <Tag color="blue" className="w-fit font-bold">
                    {services.length} 项服务
                </Tag>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {services.map((service) => (
                    <ServiceItem
                        key={service.id}
                        service={service}
                        selected={Boolean(selectedServices[service.id])}
                        quantity={selectedServices[service.id]?.quantity || 1}
                        onToggle={() => onToggleService(service)}
                        onQuantityChange={(quantity) => onQuantityChange(service.id, quantity)}
                    />
                ))}
            </div>
        </section>
    );
}

function ServiceItem({
    service,
    selected,
    quantity,
    onToggle,
    onQuantityChange,
}: {
    service: AfterSalesService;
    selected: boolean;
    quantity: number;
    onToggle: () => void;
    onQuantityChange: (quantity: number) => void;
}) {
    const priceLabel = getDisplayPrice(service);

    return (
        <div
            className={`group rounded-xl border p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-sm dark:hover:border-blue-500/30 dark:hover:bg-white/10 ${
                selected
                    ? 'border-blue-300 bg-blue-50/80 dark:border-blue-500/40 dark:bg-blue-500/10'
                    : 'border-slate-100 bg-slate-50/80 dark:border-white/10 dark:bg-white/5'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                <Checkbox checked={selected} onChange={onToggle} className="mt-1" />
                <div className="min-w-0 flex-1 cursor-pointer" onClick={onToggle}>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="m-0 break-words text-base font-black text-gray-900 dark:text-gray-100">
                            {service.name}
                        </h3>
                        {service.is_featured && (
                            <Tag color="gold" className="mr-0">
                                推荐
                            </Tag>
                        )}
                    </div>
                    {service.description && (
                        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                            {service.description}
                        </p>
                    )}
                </div>
                <div className="shrink-0 text-right">
                    <div className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {priceLabel}
                    </div>
                    {service.unit && <div className="text-xs text-gray-400">/{service.unit}</div>}
                </div>
            </div>

            {selected && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 dark:bg-white/5">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">数量</span>
                    <div className="flex items-center gap-2">
                        <Button
                            size="small"
                            icon={<MinusOutlined />}
                            disabled={quantity <= 1}
                            onClick={() => onQuantityChange(quantity - 1)}
                        />
                        <span className="w-8 text-center font-mono font-bold text-gray-900 dark:text-gray-100">
                            {quantity}
                        </span>
                        <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => onQuantityChange(quantity + 1)}
                        />
                    </div>
                </div>
            )}

            {(service.includes || service.excludes) && (
                <div className="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3 text-sm dark:border-white/10">
                    {service.includes && (
                        <div className="flex gap-2 text-gray-600 dark:text-gray-300">
                            <CheckCircleOutlined className="mt-1 text-emerald-500" />
                            <span>{service.includes}</span>
                        </div>
                    )}
                    {service.excludes && (
                        <div className="flex gap-2 text-gray-500 dark:text-gray-400">
                            <InfoCircleOutlined className="mt-1 text-amber-500" />
                            <span>{service.excludes}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function CheckoutBar({
    selectedCount,
    total,
    onCheckout,
    onClear,
}: {
    selectedCount: number;
    total: number;
    onCheckout: () => void;
    onClear: () => void;
}) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/95">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <ShoppingCartOutlined />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            已选择 {selectedCount} 项服务
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            多价格服务将到店确认金额
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 md:justify-end">
                    <div className="text-right">
                        <div className="text-xs text-gray-400">固定价合计</div>
                        <div className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatYuan(total)}
                        </div>
                    </div>
                    <Button onClick={onClear}>清空</Button>
                    <Button type="primary" icon={<ShoppingCartOutlined />} onClick={onCheckout}>
                        下单
                    </Button>
                </div>
            </div>
        </div>
    );
}

function CheckoutModal({
    form,
    open,
    selectedList,
    total,
    handlerUsers,
    loadingHandlerUsers,
    submitting,
    onCancel,
    onConfirm,
}: {
    form: ReturnType<typeof Form.useForm>[0];
    open: boolean;
    selectedList: SelectedService[];
    total: number;
    handlerUsers: Array<{ id: number; username: string }>;
    loadingHandlerUsers: boolean;
    submitting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <Modal
            title="确认售后服务下单"
            open={open}
            onCancel={onCancel}
            onOk={onConfirm}
            okText="确认下单"
            cancelText="取消"
            confirmLoading={submitting}
            width={680}
        >
            <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                    {selectedList.map((item) => {
                        const price = getServiceCheckoutPrice(item.service);
                        return (
                            <div
                                key={item.service.id}
                                className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-white/10"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-gray-900 dark:text-gray-100">
                                        {item.service.name}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {getDisplayPrice(item.service)} × {item.quantity}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                                    {price > 0 ? formatYuan(price * item.quantity) : '到店确认'}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
                    <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">价格汇总</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            仅统计固定价服务，多价格服务以到店确认为准
                        </div>
                    </div>
                    <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {formatYuan(total)}
                    </div>
                </div>
                <Form
                    form={form}
                    layout="vertical"
                    className="grid grid-cols-1 gap-x-4 md:grid-cols-2"
                >
                    <Form.Item
                        name="customer_name"
                        label="客户姓名"
                        rules={[{ required: true, message: '请输入客户姓名' }]}
                    >
                        <Input placeholder="客户姓名" />
                    </Form.Item>
                    <Form.Item
                        name="customer_phone"
                        label="手机号"
                        rules={[
                            ({ getFieldValue }) => ({
                                validator: (_, value) => {
                                    if (!getFieldValue('save_customer') || value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('保存客户时请输入手机号'));
                                },
                            }),
                        ]}
                    >
                        <Input placeholder="可选" />
                    </Form.Item>
                    <Form.Item
                        name="handler_user_id"
                        label="经手人"
                        rules={[{ required: true, message: '请选择经手人' }]}
                    >
                        <Select
                            loading={loadingHandlerUsers}
                            placeholder="请选择经手人"
                            options={handlerUsers.map((user) => ({
                                label: user.username,
                                value: user.id,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="final_amount"
                        label="最终成交金额"
                        rules={[{ required: true, message: '请输入最终成交金额' }]}
                    >
                        <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                    </Form.Item>
                    <Form.Item
                        name="save_customer"
                        valuePropName="checked"
                        className="md:col-span-2"
                    >
                        <Checkbox>保存客户信息</Checkbox>
                    </Form.Item>
                    <Form.Item name="device_model" label="设备型号">
                        <Input placeholder="可选" />
                    </Form.Item>
                    <Form.Item name="fault_description" label="故障描述">
                        <Input placeholder="可选" />
                    </Form.Item>
                    <Form.Item name="service_note" label="服务备注" className="md:col-span-2">
                        <Input.TextArea rows={2} placeholder="可选" />
                    </Form.Item>
                    <Form.Item name="note" label="订单备注" className="md:col-span-2">
                        <Input.TextArea rows={2} placeholder="可选" />
                    </Form.Item>
                </Form>
            </div>
        </Modal>
    );
}

function getDisplayPrice(service: AfterSalesService) {
    return service.price_label || (service.price !== null ? `${service.price}元` : '到店咨询');
}

function getServiceCheckoutPrice(service: AfterSalesService) {
    return service.price_type === 'fixed' && service.price !== null ? service.price : 0;
}

function formatYuan(value: number) {
    return `¥${value.toFixed(2)}`;
}

function Summary({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
            <div className="text-xs text-gray-400">{label}</div>
            <div className="mt-1 font-mono text-2xl font-black text-gray-900 dark:text-gray-100">
                {value}
            </div>
        </div>
    );
}

function ServiceSkeleton() {
    return (
        <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
                <div
                    key={index}
                    className="rounded-2xl border border-white bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-[#1f1f1f]/85"
                >
                    <Skeleton active paragraph={{ rows: 4 }} />
                </div>
            ))}
        </div>
    );
}
