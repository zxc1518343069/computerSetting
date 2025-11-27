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
    monitor: number;
}

const categoryConfig = [
    { key: 'cpu', name: '处理器 (CPU)', icon: '🔲', color: 'bg-blue-100 text-blue-600' },
    {
        key: 'motherboard',
        name: '主板 (Motherboard)',
        icon: '🔌',
        color: 'bg-purple-100 text-purple-600',
    },
    { key: 'ram', name: '内存 (RAM)', icon: '💾', color: 'bg-green-100 text-green-600' },
    { key: 'gpu', name: '显卡 (GPU)', icon: '🎮', color: 'bg-red-100 text-red-600' },
    { key: 'storage', name: '存储 (Storage)', icon: '💿', color: 'bg-yellow-100 text-yellow-600' },
    { key: 'psu', name: '电源 (PSU)', icon: '⚡', color: 'bg-orange-100 text-orange-600' },
    { key: 'case', name: '机箱 (Case)', icon: '📦', color: 'bg-gray-100 text-gray-600' },
    { key: 'cooling', name: '散热 (Cooling)', icon: '❄️', color: 'bg-cyan-100 text-cyan-600' },
    {
        key: 'monitor',
        name: '显示器 (Monitor)',
        icon: '🖥️',
        color: 'bg-indigo-100 text-indigo-600',
    },
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
        monitor: 0,
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
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="text-slate-500 font-medium tracking-wide">配置加载中...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto relative p-4 sm:p-6">
            {/* 背景装饰 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob"></div>
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-2000"></div>
            </div>

            <div className="relative z-10">
                {/* 页面标题 */}
                <div className="mb-10 text-center sm:text-left">
                    <h1 className="text-4xl font-black text-slate-800 mb-3 tracking-tight">
                        溢价配置管理
                    </h1>
                    <p className="text-slate-500 text-lg font-light">
                        灵活配置产品溢价策略，支持统一或分品类精准控制利润
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 左侧配置主区域 */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                            {/* 模式切换 */}
                            <div className="p-6 sm:p-8 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-1">
                                            定价模式
                                        </h3>
                                        <p className="text-slate-500 text-sm">
                                            选择适合当前的定价策略
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.unifiedPricing}
                                            onChange={(e) => handleUnifiedChange(e.target.checked)}
                                        />
                                        <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                    </label>
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                            config.unifiedPricing
                                                ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                                                : 'border-transparent bg-slate-50 text-slate-500 opacity-50'
                                        }`}
                                        onClick={() => handleUnifiedChange(true)}
                                    >
                                        <div className="font-bold mb-1">统一溢价</div>
                                        <div className="text-xs opacity-80">全品类统一比例</div>
                                    </div>
                                    <div
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                            !config.unifiedPricing
                                                ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                                                : 'border-transparent bg-slate-50 text-slate-500 opacity-50'
                                        }`}
                                        onClick={() => handleUnifiedChange(false)}
                                    >
                                        <div className="font-bold mb-1">分品类溢价</div>
                                        <div className="text-xs opacity-80">独立控制各类目</div>
                                    </div>
                                </div>
                            </div>

                            {/* 具体配置表单 */}
                            <div className="p-6 sm:p-8 bg-white/40">
                                {config.unifiedPricing ? (
                                    <div className="max-w-lg">
                                        <label className="block text-sm font-bold text-slate-700 mb-4">
                                            设置统一溢价比例
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="100"
                                                className="w-full pl-6 pr-12 py-4 text-2xl font-bold text-slate-800 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm group-hover:border-blue-300"
                                                value={config.unifiedRate}
                                                onChange={(e) =>
                                                    handleUnifiedRateChange(e.target.value)
                                                }
                                                placeholder="0.0"
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                                                <span className="text-lg font-bold text-slate-400">
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-sm text-slate-500 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                            例如：设置为 20%，则 ¥100 的商品售价为 ¥120
                                        </p>
                                    </div>
                                ) : (
                                    <div className="animate-fadeIn">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
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
                                                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="font-bold text-slate-700">
                                                品类详细配置
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {categoryConfig.map((cat) => (
                                                <div
                                                    key={cat.key}
                                                    className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cat.color}`}
                                                            >
                                                                {cat.icon}
                                                            </div>
                                                            <span className="font-bold text-slate-700 text-sm">
                                                                {cat.name.split(' ')[0]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            max="100"
                                                            className="w-full px-4 py-2.5 pr-10 text-lg font-bold text-slate-800 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                                            value={
                                                                config[
                                                                    cat.key as keyof PricingConfig
                                                                ] as number
                                                            }
                                                            onChange={(e) =>
                                                                handleCategoryRateChange(
                                                                    cat.key,
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                            %
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 底部操作栏 */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 text-sm px-2">
                                <svg
                                    className="w-5 h-5 text-emerald-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <span>配置保存后实时生效</span>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-bold shadow-xl shadow-slate-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                        <span>保存中...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>保存配置</span>
                                        <svg
                                            className="w-5 h-5 opacity-80"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                                            />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* 右侧说明区域 */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-2xl shadow-blue-200 overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <svg
                                        className="w-6 h-6"
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
                                    配置指南
                                </h3>
                                <div className="space-y-6">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                        <h4 className="font-bold mb-2 text-blue-100">计算公式</h4>
                                        <p className="text-2xl font-bold tracking-wider">
                                            售价 = 原价 × (1 + 溢价%)
                                        </p>
                                    </div>

                                    <div className="space-y-4 text-blue-50">
                                        <div>
                                            <h4 className="font-bold text-white mb-1">
                                                统一溢价模式
                                            </h4>
                                            <p className="text-sm opacity-80 leading-relaxed">
                                                适用于简单的定价策略，所有商品类别使用同一个固定的利润比例。适合快速调整整体利润。
                                            </p>
                                        </div>
                                        <div className="w-full h-px bg-white/20"></div>
                                        <div>
                                            <h4 className="font-bold text-white mb-1">
                                                分类溢价模式
                                            </h4>
                                            <p className="text-sm opacity-80 leading-relaxed">
                                                适用于精细化运营。您可以为显卡、CPU
                                                等高价值配件设置较低溢价，而为机箱、散热等配件设置较高溢价，以平衡市场竞争力和利润。
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
