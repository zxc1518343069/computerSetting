import { PricingConfig, Product } from '@/const/types';
import { PricingCalculator } from '@/utils/pricing';
import { CopyOutlined, DesktopOutlined, RocketFilled, ThunderboltFilled } from '@ant-design/icons';
import { Button } from 'antd';
import { useMemo } from 'react';
import { Package } from '../types';
import { getCoreSpecs } from '../utils';

interface PackageCardProps {
    pkg: Package;
    onApply: () => void;
    pricingConfig?: PricingConfig;
}

export function PackageCard({ pkg, onApply, pricingConfig }: PackageCardProps) {
    const coreSpecs = getCoreSpecs(pkg);
    const calculator = useMemo(() => new PricingCalculator(pricingConfig), [pricingConfig]);

    const displayedPrice = useMemo(() => {
        if (!pricingConfig) return pkg.total_price;

        return pkg.items.reduce((sum, item) => {
            const product: Product = {
                id: item.product_id,
                name: item.product_name,
                price: item.product_price,
                category: item.product_category,
            };
            return sum + calculator.getProductPrice(product) * item.quantity;
        }, 0);
    }, [pkg, pricingConfig, calculator]);

    // 提取关键配置用于展示
    const findSpec = (category: string) => coreSpecs.find((s) => s.product_category === category);
    const cpu = findSpec('cpu');
    const gpu = findSpec('gpu');
    const motherboard = findSpec('motherboard');

    // 辅助渲染行
    const SpecRow = ({
        icon,
        label,
        value,
        colorClass,
    }: {
        icon: React.ReactNode;
        label: string;
        value?: string;
        colorClass: string;
    }) => (
        <div className="flex items-center gap-3 group/row">
            <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClass} text-white flex-shrink-0 shadow-sm transition-transform group-hover/row:scale-110`}
            >
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-none mb-0.5">
                    {label}
                </div>
                <div
                    className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate"
                    title={value}
                >
                    {value || '-'}
                </div>
            </div>
        </div>
    );

    return (
        <div
            className="group relative bg-white dark:bg-[#1f1f1f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 transition-all duration-300 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-1 cursor-pointer overflow-hidden"
            onClick={onApply}
        >
            {/* 顶部：名称与价格 */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex-1 pr-4 overflow-hidden">
                    <div className="font-bold text-gray-800 dark:text-gray-100 text-base truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {pkg.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                        {pkg.description || '暂无描述'}
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="text-blue-600 dark:text-blue-400 font-black text-lg leading-none tracking-tight">
                        <span className="text-xs font-bold mr-0.5 opacity-80">¥</span>
                        {displayedPrice.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {pkg.items.length} 配件
                    </div>
                </div>
            </div>

            {/* 核心配置列表 */}
            <div className="space-y-3 mb-5 relative z-10">
                <SpecRow
                    icon={<ThunderboltFilled style={{ fontSize: 12 }} />}
                    label="处理器"
                    value={cpu?.product_name}
                    colorClass="bg-gradient-to-br from-blue-400 to-blue-600"
                />
                <SpecRow
                    icon={<DesktopOutlined style={{ fontSize: 12 }} />}
                    label="显卡"
                    value={gpu?.product_name}
                    colorClass="bg-gradient-to-br from-purple-400 to-purple-600"
                />
                <SpecRow
                    icon={<RocketFilled style={{ fontSize: 12 }} />}
                    label="主板"
                    value={motherboard?.product_name}
                    colorClass="bg-gradient-to-br from-indigo-400 to-indigo-600"
                />
            </div>

            {/* 底部操作 */}
            <div className="relative z-10 pt-3 border-t border-gray-50 dark:border-gray-800 flex justify-end">
                <Button
                    type="primary"
                    size="small"
                    icon={<CopyOutlined />}
                    className="bg-gray-900 dark:bg-blue-600 hover:bg-blue-600 border-none shadow-lg shadow-gray-200 dark:shadow-none hover:shadow-blue-200 text-xs h-8 px-4 rounded-lg transition-all duration-300 transform group-hover:translate-x-0 translate-x-2 opacity-0 group-hover:opacity-100"
                >
                    应用此方案
                </Button>
                <span className="text-xs text-gray-300 dark:text-gray-600 absolute left-0 top-1/2 -translate-y-1/2 group-hover:opacity-0 transition-opacity duration-200">
                    点击查看详情
                </span>
            </div>

            {/* 悬浮光效装饰 */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500 opacity-50" />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </div>
    );
}
