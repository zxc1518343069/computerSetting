import React from 'react';
import { InputNumber, Typography, Tooltip } from 'antd';
import { ArrowRightOutlined, InfoCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TableFooterProps {
    totalPrice: number;
    pricing: boolean;
    metrics?: {
        totalCost: number;
        totalProfit: number;
        profitRate: number;
    };
    discount?: {
        show: boolean;
        price?: number;
        onChange?: (price: number) => void;
    };
    disabled: boolean;
}

export const TableFooter: React.FC<TableFooterProps> = ({
    totalPrice,
    pricing,
    metrics,
    discount,
    disabled,
}) => {
    const {
        show: showDiscount,
        price: discountedPrice,
        onChange: onDiscountChange,
    } = discount || {};

    const colCount = pricing ? 5 : 4;
    const hasDiscount = showDiscount && typeof discountedPrice === 'number' && discountedPrice > 0;

    // Profit Logic
    const { totalCost = 0, totalProfit = 0, profitRate = 0 } = metrics || {};
    const isProfitable = totalProfit > 0;
    const profitBg = isProfitable ? 'bg-emerald-50' : 'bg-rose-50';

    return (
        <tfoot className="bg-slate-50/30 border-t border-gray-100/50">
            <tr>
                <td colSpan={colCount} className="p-0">
                    <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6 px-8 py-8">
                        {/* 左侧：成本与利润分析卡片 */}
                        {metrics && pricing && (
                            <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl border border-white p-6 flex items-center gap-10 shadow-sm">
                                <div className="space-y-1">
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                                        基础成本
                                    </Text>
                                    <div className="text-xl font-bold text-slate-500 tabular-nums">
                                        <span className="text-xs mr-1 font-medium">¥</span>
                                        {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div className="w-px h-10 bg-slate-100"></div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Text className={`text-[10px] font-black uppercase tracking-[0.2em] ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            预计毛利
                                        </Text>
                                        <Tooltip title="毛利率 = (售价 - 成本) / 售价">
                                            <InfoCircleOutlined className="text-[10px] text-slate-300 cursor-help" />
                                        </Tooltip>
                                    </div>
                                    <div className={`text-xl font-black flex items-baseline gap-3 tabular-nums ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        <span>
                                            <span className="text-xs mr-1 font-bold">¥</span>
                                            {totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-black ${profitBg} ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {(profitRate * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 右侧：最终结算卡片 */}
                        <div className={`flex-1 bg-white rounded-2xl border ${hasDiscount ? 'border-blue-100 shadow-blue-100/20' : 'border-slate-100'} p-6 flex items-center justify-between shadow-sm relative overflow-hidden`}>
                            {hasDiscount && (
                                <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-50 rounded-full blur-2xl opacity-50" />
                            )}
                            
                            <div className="flex items-center gap-8">
                                {/* 配置总价 */}
                                <div className={`flex flex-col transition-all duration-500 ${hasDiscount ? 'opacity-30 scale-90' : 'opacity-60'}`}>
                                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                                        配置总价
                                    </Text>
                                    <div className={`font-bold tracking-tight tabular-nums ${hasDiscount ? 'text-lg text-slate-400 line-through' : 'text-2xl text-slate-700'}`}>
                                        <span className="text-xs mr-1">¥</span>
                                        {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>

                                {hasDiscount && (
                                    <div className="text-slate-200 flex items-center animate-pulse">
                                        <ArrowRightOutlined style={{ fontSize: 18 }} />
                                    </div>
                                )}

                                {/* 最终成交价 */}
                                {showDiscount && (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Text className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                                                最终成交金额
                                            </Text>
                                            {hasDiscount && discountedPrice < totalPrice && (
                                                <span className="text-[9px] font-black text-white bg-emerald-500 px-1.5 py-0.5 rounded shadow-sm">
                                                    已省 ¥{(totalPrice - discountedPrice).toFixed(0)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center">
                                            <span className={`text-xl font-black mr-1 ${hasDiscount ? 'text-blue-600' : 'text-slate-300'}`}>¥</span>
                                            <InputNumber
                                                value={discountedPrice || undefined}
                                                onChange={(val) => onDiscountChange?.(val || 0)}
                                                variant="borderless"
                                                className={`
                                                    w-40 !font-black !bg-transparent tabular-nums
                                                    ${hasDiscount ? '!text-3xl !text-blue-600' : '!text-2xl !text-slate-900'}
                                                `}
                                                placeholder="0.00"
                                                disabled={disabled}
                                                min={0}
                                                controls={false}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {hasDiscount && (
                                <div className="hidden md:block">
                                    <SafetyCertificateOutlined className="text-3xl text-blue-500 opacity-20" />
                                </div>
                            )}
                        </div>
                    </div>
                </td>
            </tr>
        </tfoot>
    );
};
