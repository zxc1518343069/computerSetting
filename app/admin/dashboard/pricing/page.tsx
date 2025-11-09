'use client';
import React, { useState, useEffect } from 'react';

interface PricingConfig {
    unifiedPricing: boolean;
    unifiedRate: number;
    cpu: number;
    motherboard: number;
    ram: number;
    gpu: number;
    storage: number;
    psu: number;
    case: number;
    cooling: number;
}

const categoryConfig = [
    { key: 'cpu', name: '处理器 (CPU)', icon: '🔲', color: 'blue' },
    { key: 'motherboard', name: '主板 (Motherboard)', icon: '🔌', color: 'purple' },
    { key: 'ram', name: '内存 (RAM)', icon: '💾', color: 'green' },
    { key: 'gpu', name: '显卡 (GPU)', icon: '🎮', color: 'red' },
    { key: 'storage', name: '存储 (Storage)', icon: '💿', color: 'yellow' },
    { key: 'psu', name: '电源 (PSU)', icon: '⚡', color: 'orange' },
    { key: 'case', name: '机箱 (Case)', icon: '📦', color: 'gray' },
    { key: 'cooling', name: '散热 (Cooling)', icon: '❄️', color: 'cyan' },
];

export default function PricingPage() {
    const [config, setConfig] = useState<PricingConfig>({
        unifiedPricing: true,
        unifiedRate: 0,
        cpu: 0,
        motherboard: 0,
        ram: 0,
        gpu: 0,
        storage: 0,
        psu: 0,
        case: 0,
        cooling: 0,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/pricing');
            const data = await response.json();
            if (data) {
                setConfig(data);
            }
        } catch (error) {
            console.error('加载溢价配置失败:', error);
            alert('加载溢价配置失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ 溢价配置保存成功！');
            } else {
                alert('❌ ' + (result.error || '保存失败'));
            }
        } catch (error) {
            console.error('保存溢价配置失败:', error);
            alert('❌ 保存溢价配置失败，请稍后重试');
        } finally {
            setSaving(false);
        }
    };

    const handleUnifiedChange = (checked: boolean) => {
        setConfig({
            ...config,
            unifiedPricing: checked,
        });
    };

    const handleUnifiedRateChange = (value: string) => {
        const rate = parseFloat(value) || 0;
        setConfig({
            ...config,
            unifiedRate: rate,
        });
    };

    const handleCategoryRateChange = (category: string, value: string) => {
        const rate = parseFloat(value) || 0;
        setConfig({
            ...config,
            [category]: rate,
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 font-medium">加载溢价配置中...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* 页面标题 */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <span className="text-4xl">💰</span>
                    溢价配置管理
                </h1>
                <p className="text-gray-600">
                    设置产品的溢价策略，支持统一溢价和按类型溢价两种模式
                </p>
            </div>

            {/* 主要配置区域 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* 统一溢价开关 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
                    <label className="flex items-center cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={config.unifiedPricing}
                                onChange={(e) => handleUnifiedChange(e.target.checked)}
                            />
                            <div className="w-14 h-7 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                            <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-7"></div>
                        </div>
                        <div className="ml-4">
                            <span className="text-lg font-semibold text-gray-800 block">
                                统一溢价模式
                            </span>
                            <span className="text-sm text-gray-600">
                                {config.unifiedPricing
                                    ? '所有类型使用相同溢价比例'
                                    : '每个类型使用独立溢价比例'}
                            </span>
                        </div>
                    </label>
                </div>

                {/* 配置内容 */}
                <div className="p-6">
                    {config.unifiedPricing ? (
                        // 统一溢价配置
                        <div className="max-w-md">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                统一溢价比例
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    className="w-full px-4 py-3 text-lg font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={config.unifiedRate}
                                    onChange={(e) => handleUnifiedRateChange(e.target.value)}
                                />
                                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-blue-600">
                                    %
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                                示例：设置为 20%，原价 $100 的商品售价为 $120
                            </p>
                        </div>
                    ) : (
                        // 分类溢价配置
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                <svg
                                    className="w-5 h-5 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                    />
                                </svg>
                                分类溢价配置
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categoryConfig.map((cat) => (
                                    <div
                                        key={cat.key}
                                        className="group bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                                    >
                                        <label className="block">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="text-2xl">{cat.icon}</span>
                                                <span className="font-semibold text-gray-800">
                                                    {cat.name}
                                                </span>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-3 py-2 pr-10 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                                                    value={config[cat.key as keyof PricingConfig] as number}
                                                    onChange={(e) =>
                                                        handleCategoryRateChange(cat.key, e.target.value)
                                                    }
                                                />
                                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-lg font-bold text-blue-600">
                                                    %
                                                </span>
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部操作栏 */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        <svg
                            className="w-4 h-4 inline mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        溢价配置将实时应用到所有产品价格计算
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                保存中...
                            </>
                        ) : (
                            <>
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                                    />
                                </svg>
                                保存配置
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 使用说明 */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                    </svg>
                    使用说明
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>
                            <strong>统一溢价模式：</strong>所有类型的产品使用相同的溢价比例，设置简单快捷
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>
                            <strong>分类溢价模式：</strong>
                            为不同类型的产品设置独立的溢价比例，灵活控制利润
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>
                            <strong>计算公式：</strong>售价 = 原价 × (1 + 溢价比例/100)
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>配置保存后立即生效，所有套餐和报价将使用新的溢价配置</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
