'use client';

import { PACKAGE_CATEGORIES_LIST, PricingConfig } from '@/const';
import { useRequest } from 'ahooks';
import { message, Select } from 'antd';
import React, { useState, useMemo } from 'react';
import { fetchPricingConfigService, savePricingConfigService } from '../config/services';
import {
    ThunderboltFilled,
    SettingFilled,
    SaveOutlined,
    CalculatorOutlined,
    BulbOutlined,
    ArrowRightOutlined,
    DownOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';

export default function PricingPage() {
    const [config, setConfig] = useState<PricingConfig>({
        unifiedPricing: true,
        unifiedRate: 0,
        roundingType: 'none',
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

    const [simCategory, setSimCategory] = useState<string>(PACKAGE_CATEGORIES_LIST[0].key);

    const { loading } = useRequest(fetchPricingConfigService, {
        onSuccess: (data) => {
            if (data) {
                setConfig({ ...data, roundingType: data.roundingType || 'none' });
            }
        },
        onError: (error) => {
            message.error('加载配置失败: ' + error.message);
        },
    });

    const { runAsync: saveConfig, loading: saving } = useRequest(savePricingConfigService, {
        manual: true,
        onSuccess: () => {
            message.success('✅ 配置保存成功');
        },
        onError: (error) => {
            message.error('❌ 保存失败: ' + (error.message || '未知错误'));
        },
    });

    const handleSave = async () => {
        await saveConfig(config);
    };

    const simulation = useMemo(() => {
        const basePrice = 1000;
        const rate = config.unifiedPricing
            ? config.unifiedRate
            : (config[simCategory as keyof PricingConfig] as number) || 0;

        const rawPrice = basePrice * (1 + rate / 100);
        let finalPrice = rawPrice;

        if (config.roundingType === 'integer') {
            finalPrice = Math.ceil(rawPrice);
        } else if (config.roundingType === 'ten') {
            finalPrice = Math.ceil(rawPrice / 10) * 10;
        }

        const currentCategoryName =
            PACKAGE_CATEGORIES_LIST.find((c) => c.key === simCategory)?.name || '未知品类';
        const roundingProfit = finalPrice - rawPrice;

        return {
            basePrice,
            rawPrice,
            finalPrice,
            profit: finalPrice - basePrice,
            rate,
            currentCategoryName,
            roundingProfit,
        };
    }, [config, simCategory]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-mono text-[10px] tracking-[0.3em] uppercase">
                    系统初始化中...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#050505] p-6 lg:p-12 transition-colors duration-500">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <SettingFilled className="text-sm" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                                定价引擎 / v2.1
                            </span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            溢价策略<span className="text-blue-600">配置</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:block text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                系统状态
                            </div>
                            <div className="flex items-center gap-2 text-xs font-black text-emerald-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                实时同步中
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`
                                group relative px-10 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all
                                ${
                                    saving
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/30 active:scale-95'
                                }
                            `}
                        >
                            <div className="relative z-10 flex items-center gap-3">
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <SaveOutlined />
                                )}
                                <span>{saving ? '正在保存...' : '保存配置'}</span>
                            </div>
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-10">
                    {/* Left: Configuration Panels */}
                    <div className="col-span-12 lg:col-span-7 space-y-10">
                        {/* Rounding Strategy */}
                        <section className="animate-in fade-in slide-in-from-left-8 duration-700">
                            <div className="flex items-center gap-3 mb-6">
                                <CalculatorOutlined className="text-blue-500 text-lg" />
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                                    价格取整策略
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    {
                                        id: 'none',
                                        label: '精确计算',
                                        example: '12.01 → 12.01',
                                        icon: '0.00',
                                    },
                                    {
                                        id: 'integer',
                                        label: '个位取整',
                                        example: '12.01 → 13.00',
                                        icon: '1.00',
                                    },
                                    {
                                        id: 'ten',
                                        label: '十位取整',
                                        example: '12.01 → 20.00',
                                        icon: '10.0',
                                    },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() =>
                                            setConfig({
                                                ...config,
                                                roundingType: item.id as
                                                    | 'none'
                                                    | 'integer'
                                                    | 'ten',
                                            })
                                        }
                                        className={`
                                            relative p-6 rounded-[2rem] border-2 text-left transition-all
                                            ${
                                                config.roundingType === item.id
                                                    ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10'
                                                    : 'border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10'
                                            }
                                        `}
                                    >
                                        <div
                                            className={`text-xl font-black mb-4 font-mono ${config.roundingType === item.id ? 'text-blue-500' : 'text-slate-300 dark:text-slate-700'}`}
                                        >
                                            {item.icon}
                                        </div>
                                        <div className="font-black text-xs text-slate-800 dark:text-white mb-1">
                                            {item.label}
                                        </div>
                                        <div
                                            className={`text-[10px] font-bold px-2 py-1 rounded-md inline-block ${config.roundingType === item.id ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
                                        >
                                            {item.example}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Pricing Mode */}
                        <section className="animate-in fade-in slide-in-from-left-8 duration-700 delay-150">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <BulbOutlined className="text-blue-500 text-lg" />
                                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                                        定价模式
                                    </h3>
                                </div>
                                <div className="p-1 bg-slate-100 dark:bg-white/5 rounded-xl flex gap-1">
                                    <button
                                        onClick={() =>
                                            setConfig({ ...config, unifiedPricing: true })
                                        }
                                        className={`px-6 py-2 rounded-lg text-[10px] font-black transition-all ${config.unifiedPricing ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                                    >
                                        统一溢价
                                    </button>
                                    <button
                                        onClick={() =>
                                            setConfig({ ...config, unifiedPricing: false })
                                        }
                                        className={`px-6 py-2 rounded-lg text-[10px] font-black transition-all ${!config.unifiedPricing ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                                    >
                                        分品类
                                    </button>
                                </div>
                            </div>

                            {config.unifiedPricing ? (
                                <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[2.5rem] p-10 animate-in fade-in zoom-in duration-500">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                                        全局利润率设定
                                    </label>
                                    <div className="flex items-center gap-6 mb-8">
                                        <input
                                            type="number"
                                            value={config.unifiedRate}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    unifiedRate: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="flex-grow bg-transparent text-6xl font-black text-slate-900 dark:text-white focus:outline-none font-mono w-40"
                                        />
                                        <span className="text-4xl font-black text-slate-200 dark:text-slate-800">
                                            %
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                        <InfoCircleOutlined className="text-blue-500" />
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            计算示例：成本{' '}
                                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                                ¥100
                                            </span>{' '}
                                            × (1 +{' '}
                                            <span className="font-bold text-blue-500">
                                                {config.unifiedRate}%
                                            </span>
                                            ) = 售价{' '}
                                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                                ¥{(100 * (1 + config.unifiedRate / 100)).toFixed(2)}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {PACKAGE_CATEGORIES_LIST.map((cat) => (
                                        <div
                                            key={cat.key}
                                            className="group bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cat.twColor} bg-opacity-10`}
                                                    >
                                                        {cat.icon}
                                                    </div>
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                                        {cat.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={
                                                        config[
                                                            cat.key as keyof PricingConfig
                                                        ] as number
                                                    }
                                                    onChange={(e) =>
                                                        setConfig({
                                                            ...config,
                                                            [cat.key]:
                                                                parseFloat(e.target.value) || 0,
                                                        })
                                                    }
                                                    className="w-full bg-slate-50 dark:bg-black/20 border-none rounded-xl px-4 py-3 text-xl font-black text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right: Live Dashboard */}
                    <div className="col-span-12 lg:col-span-5">
                        <div className="sticky top-12 space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
                            <div className="bg-slate-900 dark:bg-blue-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-10">
                                    <ThunderboltFilled style={{ fontSize: 160 }} />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-12">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 dark:text-blue-200">
                                            实时定价模拟器
                                        </h3>

                                        {/* Improved Category Switcher */}
                                        <div className="flex items-center gap-2 bg-white/10 dark:bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/30 transition-all cursor-pointer group">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                                品类
                                            </span>
                                            <Select
                                                size="small"
                                                value={simCategory}
                                                onChange={setSimCategory}
                                                className="w-24 pricing-sim-select-pro"
                                                variant="borderless"
                                                suffixIcon={
                                                    <DownOutlined
                                                        className="text-blue-400 group-hover:translate-y-0.5 transition-transform"
                                                        style={{ fontSize: 10 }}
                                                    />
                                                }
                                                popupClassName="dark:bg-slate-900"
                                                options={PACKAGE_CATEGORIES_LIST.map((c) => ({
                                                    label: c.name,
                                                    value: c.key,
                                                }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <div className="text-[10px] font-bold text-white/40 uppercase mb-2 tracking-widest">
                                                    成本基准 ({simulation.currentCategoryName})
                                                </div>
                                                <div className="text-3xl font-mono font-black">
                                                    ¥{simulation.basePrice.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-white/40 uppercase mb-2 tracking-widest">
                                                    当前溢价
                                                </div>
                                                <div className="text-xl font-mono font-black text-blue-400 dark:text-white">
                                                    {simulation.rate}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* Visual Price Bar */}
                                        <div className="space-y-2">
                                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                                                <div
                                                    className="h-full bg-white/40"
                                                    style={{ width: '70%' }}
                                                />
                                                <div
                                                    className="h-full bg-blue-400"
                                                    style={{
                                                        width: `${Math.min(simulation.rate, 30)}%`,
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-white/30">
                                                <span>成本</span>
                                                <span>溢价利润</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/10">
                                            <div className="text-[10px] font-bold text-blue-400 dark:text-blue-200 uppercase mb-2 tracking-widest">
                                                最终挂牌价
                                            </div>
                                            <div className="flex items-baseline gap-3">
                                                <div className="text-6xl font-mono font-black tracking-tighter">
                                                    ¥{simulation.finalPrice.toLocaleString()}
                                                </div>
                                                {simulation.roundingProfit > 0 && (
                                                    <div className="text-xs font-bold text-emerald-400">
                                                        +¥{simulation.roundingProfit.toFixed(2)}{' '}
                                                        (取整收益)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-white/5 rounded-2xl p-5 flex items-center justify-between">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                                预估总利润
                                            </div>
                                            <div className="text-2xl font-mono font-black text-emerald-400">
                                                +¥{simulation.profit.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pro Tip */}
                            <div className="p-8 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[2.5rem]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <ArrowRightOutlined />
                                    </div>
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">
                                        专业建议
                                    </h4>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                    对于 CPU 和显卡等价格透明度极高的配件，建议采用{' '}
                                    <span className="text-blue-500 font-bold">5% - 10%</span>{' '}
                                    的低溢价策略；而对于机箱、散热器等个性化配件，可适当提高至{' '}
                                    <span className="text-blue-500 font-bold">20% - 30%</span>{' '}
                                    以获取更高利润。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .animate-in {
                    animation-duration: 0.8s;
                    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
                    fill-mode: both;
                }
                .fade-in {
                    animation-name: fadeIn;
                }
                .zoom-in {
                    animation-name: zoomIn;
                }
                .slide-in-from-top-4 {
                    animation-name: slideInFromTop;
                }
                .slide-in-from-left-8 {
                    animation-name: slideInFromLeft;
                }
                .slide-in-from-right-8 {
                    animation-name: slideInFromRight;
                }
                .slide-in-from-bottom-4 {
                    animation-name: slideInFromBottom;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes zoomIn {
                    from {
                        opacity: 0;
                        transform: scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes slideInFromTop {
                    from {
                        transform: translateY(-1rem);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes slideInFromLeft {
                    from {
                        transform: translateX(-2rem);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideInFromRight {
                    from {
                        transform: translateX(2rem);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideInFromBottom {
                    from {
                        transform: translateY(1rem);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .pricing-sim-select-pro .ant-select-selection-item {
                    color: #60a5fa !important;
                    font-weight: 900 !important;
                    font-size: 11px !important;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
                .dark .pricing-sim-select-pro .ant-select-selection-item {
                    color: #fff !important;
                }
                .pricing-sim-select-pro .ant-select-arrow {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
