'use client';

import { getCategoryTagClass, useProductCategories } from '@/app/hooks/useProductCategories';
import { PricingConfig } from '@/const';
import {
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
    SaveOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Button,
    Empty,
    Form,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Segmented,
    Switch,
    Table,
    Tag,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';
import {
    createPricingRateService,
    deletePricingRateService,
    fetchPricingConfigService,
    savePricingConfigService,
} from '../config/services';

const DEFAULT_CONFIG: PricingConfig = {
    unifiedPricing: true,
    unifiedRate: 0,
    roundingType: 'none',
    categoryRates: {},
    rates: [],
};

type PricingRateItem = NonNullable<PricingConfig['rates']>[number];

export default function PricingPage() {
    const [config, setConfig] = useState<PricingConfig>(DEFAULT_CONFIG);
    const [rateModalOpen, setRateModalOpen] = useState(false);
    const [rateForm] = Form.useForm<{ category_id: number; rate: number }>();
    const { activeCategories, refresh: refreshCategories } = useProductCategories({
        includeInactive: true,
    });

    const { loading, refresh } = useRequest(fetchPricingConfigService, {
        onSuccess: (data) => {
            setConfig({
                ...DEFAULT_CONFIG,
                ...data,
                categoryRates: data.categoryRates || {},
                rates: data.rates || [],
            });
        },
        onError: (error) => {
            message.error('加载配置失败: ' + error.message);
        },
    });

    const { runAsync: saveConfig, loading: saving } = useRequest(savePricingConfigService, {
        manual: true,
        onSuccess: (data) => {
            if (data) {
                setConfig({
                    ...DEFAULT_CONFIG,
                    ...data,
                    categoryRates: data.categoryRates || {},
                    rates: data.rates || [],
                });
            }
            message.success('配置保存成功');
        },
        onError: (error) => {
            message.error('保存失败: ' + (error.message || '未知错误'));
        },
    });

    const { runAsync: createRate, loading: creatingRate } = useRequest(createPricingRateService, {
        manual: true,
        onSuccess: (data) => {
            setConfig({
                ...DEFAULT_CONFIG,
                ...data,
                categoryRates: data.categoryRates || {},
                rates: data.rates || [],
            });
            setRateModalOpen(false);
            rateForm.resetFields();
            message.success('类目溢价已新增');
        },
        onError: (error) => message.error(error.message || '新增溢价失败'),
    });

    const { runAsync: deleteRate, loading: deletingRate } = useRequest(deletePricingRateService, {
        manual: true,
        onSuccess: (data) => {
            setConfig({
                ...DEFAULT_CONFIG,
                ...data,
                categoryRates: data.categoryRates || {},
                rates: data.rates || [],
            });
            message.success('类目溢价已删除');
        },
        onError: (error) => message.error(error.message || '删除溢价失败'),
    });

    const configuredCategoryIds = useMemo(
        () => new Set((config.rates || []).map((item) => item.categoryId)),
        [config.rates]
    );

    const availableCategories = useMemo(
        () => activeCategories.filter((category) => !configuredCategoryIds.has(category.id)),
        [activeCategories, configuredCategoryIds]
    );

    const simulation = useMemo(() => {
        const basePrice = 1000;
        const firstRate = config.rates?.[0];
        const rate = config.unifiedPricing
            ? config.unifiedRate
            : firstRate
              ? config.categoryRates[firstRate.categoryId] || 0
              : 0;
        const rawPrice = basePrice * (1 + rate / 100);
        const finalPrice =
            config.roundingType === 'integer'
                ? Math.ceil(rawPrice)
                : config.roundingType === 'ten'
                  ? Math.ceil(rawPrice / 10) * 10
                  : rawPrice;

        return {
            basePrice,
            rate,
            finalPrice,
            profit: finalPrice - basePrice,
            categoryName: firstRate?.categoryName || '未配置类目',
        };
    }, [config]);

    const updateRateValue = (categoryId: number, rate: number | null) => {
        setConfig((prev) => ({
            ...prev,
            categoryRates: {
                ...(prev.categoryRates || {}),
                [categoryId]: Number(rate || 0),
            },
            rates: (prev.rates || []).map((item) =>
                item.categoryId === categoryId ? { ...item, rate: Number(rate || 0) } : item
            ),
        }));
    };

    const handleSave = async () => {
        await saveConfig(config);
    };

    const handleRefresh = () => {
        refresh();
        refreshCategories();
    };

    const handleCreateRate = async () => {
        const values = await rateForm.validateFields();
        await createRate(values);
    };

    const columns: ColumnsType<PricingRateItem> = [
        {
            title: '商品类目',
            dataIndex: 'categoryName',
            render: (_, record) => (
                <div className="flex flex-col gap-1">
                    <Tag
                        bordered={false}
                        className={`mr-0 w-fit font-bold ${getCategoryTagClass(record.tagColor)}`}
                    >
                        {record.categoryLabel || record.categoryName}
                    </Tag>
                    <span className="text-xs text-gray-400 font-mono">
                        {record.categoryCode || `#${record.categoryId}`}
                    </span>
                </div>
            ),
        },
        {
            title: '溢价比例',
            dataIndex: 'rate',
            width: 220,
            align: 'right',
            render: (_, record) => (
                <InputNumber
                    min={0}
                    max={999}
                    precision={2}
                    value={config.categoryRates?.[record.categoryId] ?? record.rate}
                    addonAfter="%"
                    onChange={(value) => updateRateValue(record.categoryId, value)}
                    className="w-36"
                    disabled={config.unifiedPricing}
                />
            ),
        },
        {
            title: '状态',
            dataIndex: 'isActive',
            width: 100,
            render: (isActive) => <Tag color={isActive ? 'green' : 'default'}>{isActive ? '启用' : '停用'}</Tag>,
        },
        {
            title: '操作',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Popconfirm
                    title="删除此溢价规则?"
                    description="删除后该类目按 0% 计算，类目本身不会删除。"
                    onConfirm={() => deleteRate(record.id)}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true, loading: deletingRate }}
                >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10">
            <div className="max-w-[1400px] mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <SettingOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Pricing
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            溢价策略配置
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            统一配置全局溢价和按商品类目配置的专属溢价规则。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                            刷新
                        </Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            onClick={handleSave}
                        >
                            保存配置
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="lg:col-span-2 bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ControlBlock label="取整策略">
                                <Segmented
                                    block
                                    value={config.roundingType}
                                    onChange={(value) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            roundingType: value as PricingConfig['roundingType'],
                                        }))
                                    }
                                    options={[
                                        { label: '精确', value: 'none' },
                                        { label: '个位', value: 'integer' },
                                        { label: '十位', value: 'ten' },
                                    ]}
                                />
                            </ControlBlock>
                            <ControlBlock label="定价模式">
                                <div className="h-10 flex items-center justify-between px-3 bg-gray-50 dark:bg-[#141414] rounded-lg">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                        统一溢价
                                    </span>
                                    <Switch
                                        checked={config.unifiedPricing}
                                        onChange={(checked) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                unifiedPricing: checked,
                                            }))
                                        }
                                    />
                                </div>
                            </ControlBlock>
                            <ControlBlock label="全局溢价">
                                <InputNumber
                                    min={0}
                                    max={999}
                                    precision={2}
                                    addonAfter="%"
                                    value={config.unifiedRate}
                                    onChange={(value) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            unifiedRate: Number(value || 0),
                                        }))
                                    }
                                    className="w-full"
                                />
                            </ControlBlock>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">
                                    分类溢价规则
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    未配置规则的类目按 0% 处理；统一溢价开启时这些规则暂不生效。
                                </p>
                            </div>
                            <Button
                                icon={<PlusOutlined />}
                                onClick={() => setRateModalOpen(true)}
                                disabled={availableCategories.length === 0}
                            >
                                新增溢价
                            </Button>
                        </div>

                        <Table
                            rowKey="id"
                            loading={loading}
                            columns={columns}
                            dataSource={config.rates || []}
                            pagination={false}
                            locale={{
                                emptyText: (
                                    <Empty description="暂无分类溢价规则，新增后可按类目设置比例" />
                                ),
                            }}
                        />
                    </section>

                    <aside className="bg-slate-900 dark:bg-blue-600 rounded-2xl p-8 text-white h-fit">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 mb-8">
                            实时模拟
                        </div>
                        <div className="space-y-6">
                            <Metric label="成本基准" value={`¥${simulation.basePrice}`} />
                            <Metric
                                label={
                                    config.unifiedPricing
                                        ? '当前全局溢价'
                                        : `当前分类溢价 (${simulation.categoryName})`
                                }
                                value={`${simulation.rate}%`}
                            />
                            <div className="pt-6 border-t border-white/10">
                                <div className="text-xs text-white/40 mb-2">最终售价</div>
                                <div className="text-5xl font-black font-mono">
                                    ¥{simulation.finalPrice.toFixed(2)}
                                </div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
                                <span className="text-xs text-white/50">预估利润</span>
                                <span className="text-2xl font-black text-emerald-300">
                                    +¥{simulation.profit.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <Modal
                title="新增分类溢价"
                open={rateModalOpen}
                onCancel={() => setRateModalOpen(false)}
                onOk={handleCreateRate}
                confirmLoading={creatingRate}
                destroyOnHidden
            >
                <Form form={rateForm} layout="vertical" className="pt-4" initialValues={{ rate: 0 }}>
                    <Form.Item
                        name="category_id"
                        label="商品类目"
                        rules={[{ required: true, message: '请选择商品类目' }]}
                    >
                        <Select
                            placeholder="选择尚未配置溢价的启用类目"
                            options={availableCategories.map((category) => ({
                                label: category.label,
                                value: category.id,
                                color: category.tag_color,
                            }))}
                            optionRender={(option) => (
                                <Tag
                                    bordered={false}
                                    className={`mr-0 ${getCategoryTagClass(
                                        String(option.data.color)
                                    )}`}
                                >
                                    {option.label}
                                </Tag>
                            )}
                        />
                    </Form.Item>
                    <Form.Item
                        name="rate"
                        label="溢价比例"
                        rules={[{ required: true, message: '请输入溢价比例' }]}
                    >
                        <InputNumber min={0} max={999} precision={2} addonAfter="%" className="w-full" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

function ControlBlock({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-xs font-bold text-gray-400 mb-2">{label}</div>
            {children}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs text-white/40 mb-2">{label}</div>
            <div className="text-2xl font-black font-mono">{value}</div>
        </div>
    );
}
