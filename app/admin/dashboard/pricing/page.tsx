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

const categoryNames: Record<string, string> = {
    cpu: '处理器',
    motherboard: '主板',
    ram: '内存',
    gpu: '显卡',
    storage: '存储',
    psu: '电源',
    case: '机箱',
    cooling: '散热',
};

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

    useEffect(() => {
        // 从 localStorage 加载配置
        const savedConfig = localStorage.getItem('pricingConfig');
        if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('pricingConfig', JSON.stringify(config));
        alert('溢价配置已保存');
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

    return (
        <div className="max-w-4xl">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">溢价控制</h1>

            <div className="bg-white rounded-lg shadow-md p-6">
                {/* 统一溢价开关 */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            checked={config.unifiedPricing}
                            onChange={(e) => handleUnifiedChange(e.target.checked)}
                        />
                        <span className="ml-3 text-lg font-medium text-gray-700">是否统一溢价</span>
                    </label>
                </div>

                {/* 统一溢价比例 */}
                {config.unifiedPricing && (
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            溢价比例
                        </label>
                        <div className="flex items-center">
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="shadow appearance-none border rounded w-32 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={config.unifiedRate}
                                onChange={(e) => handleUnifiedRateChange(e.target.value)}
                            />
                            <span className="ml-2 text-gray-600">%</span>
                        </div>
                    </div>
                )}

                {/* 分类溢价配置 */}
                {!config.unifiedPricing && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">分类溢价配置</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.keys(categoryNames).map((category) => (
                                <div key={category}>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        {categoryNames[category]}
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            className="shadow appearance-none border rounded w-32 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={
                                                config[category as keyof PricingConfig] as number
                                            }
                                            onChange={(e) =>
                                                handleCategoryRateChange(category, e.target.value)
                                            }
                                        />
                                        <span className="ml-2 text-gray-600">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 保存按钮 */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
                    >
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    );
}
