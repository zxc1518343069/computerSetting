import React from 'react';
import { InputNumber, Typography, Tooltip } from 'antd';
import { ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons';

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
    const hasDiscount = showDiscount && discountedPrice && discountedPrice > 0;

    // Profit Logic
    const { totalCost = 0, totalProfit = 0, profitRate = 0 } = metrics || {};
    const isProfitable = totalProfit > 0;
    const profitColor = isProfitable ? 'text-emerald-600' : 'text-rose-500';
    const profitBg = isProfitable ? 'bg-emerald-50' : 'bg-rose-50';

    return (
        <tfoot className="bg-gray-50/30 border-t border-gray-100">
            <tr>
                <td colSpan={colCount} className="p-0">
                    <div className="flex items-center justify-end gap-8 px-8 py-5">
                        {/* Profit Dashboard (Admin Only - if metrics provided) */}
                        {metrics && pricing && (
                            <div className="flex gap-6 mr-auto pl-4 opacity-90">
                                <div className="flex flex-col">
                                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                        总成本 (Base)
                                    </Text>
                                    <div className="text-lg font-bold text-gray-600">
                                        <span className="text-xs mr-0.5">¥</span>
                                        {totalCost.toFixed(2)}
                                    </div>
                                </div>

                                <div className="w-px bg-gray-200 h-8 self-center mx-2"></div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <Text
                                            className={`text-[10px] font-bold uppercase tracking-wider ${isProfitable ? 'text-emerald-600' : 'text-rose-500'}`}
                                        >
                                            预计利润
                                        </Text>
                                        <Tooltip
                                            title={
                                                <div className="text-xs space-y-2">
                                                    <p className="font-bold mb-1">
                                                        📈 利润率 (Margin) 计算说明
                                                    </p>
                                                    <p>
                                                        系统展示的是<b>毛利率</b>，计算公式：
                                                        <br />
                                                        <code>(售价 - 进价) / 售价</code>
                                                    </p>
                                                    <div className="bg-white/10 p-2 rounded border border-white/20">
                                                        <p className="mb-1">💡 示例：</p>
                                                        <p>进价 ¥100，设置溢价 20% (Markup)</p>
                                                        <p>售价 = ¥120，利润 = ¥20</p>
                                                        <p>
                                                            利润率 = 20 / 120 ≈ <b>16.7%</b>
                                                        </p>
                                                    </div>
                                                    <p className="opacity-80">
                                                        区别于加价率 (20/100 = 20%)
                                                    </p>
                                                </div>
                                            }
                                            overlayInnerStyle={{ width: 260, padding: 12 }}
                                        >
                                            <InfoCircleOutlined className="text-[10px] text-gray-400 cursor-help hover:text-blue-500 transition-colors" />
                                        </Tooltip>
                                    </div>
                                    <div
                                        className={`text-lg font-black ${profitColor} flex items-baseline gap-2`}
                                    >
                                        <span>
                                            <span className="text-xs mr-0.5">¥</span>
                                            {totalProfit.toFixed(2)}
                                        </span>
                                        <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${profitBg}`}
                                        >
                                            {(profitRate * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Configuration Total Price */}
                        <div
                            className={`flex flex-col items-end transition-all duration-300 ${hasDiscount ? 'opacity-60 grayscale' : ''}`}
                        >
                            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                配置总价
                            </Text>
                            <div
                                className={`font-black tracking-tight ${hasDiscount ? 'text-xl text-gray-500 line-through decoration-gray-300' : 'text-3xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'}`}
                            >
                                <span
                                    className={`${hasDiscount ? 'text-sm' : 'text-lg'} font-bold mr-1`}
                                >
                                    ¥
                                </span>
                                {totalPrice.toFixed(2)}
                            </div>
                        </div>

                        {/* Arrow Indicator */}
                        {hasDiscount && (
                            <div className="text-gray-300 flex items-center pt-4 animate-pulse-slow">
                                <ArrowRightOutlined style={{ fontSize: 20 }} />
                            </div>
                        )}

                        {/* Final Price Input Area */}
                        {showDiscount && (
                            <div className="flex flex-col items-end relative group">
                                <div className="flex items-center gap-2 mb-1">
                                    <Text className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                                        最终成交价
                                    </Text>
                                    {!!discountedPrice && discountedPrice < totalPrice && (
                                        <span className="text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full shadow-sm shadow-emerald-200 animate-bounce-subtle">
                                            省 ¥{(totalPrice - discountedPrice).toFixed(2)}
                                        </span>
                                    )}
                                </div>

                                <div
                                    className={`
                                    relative flex items-center bg-white rounded-xl border shadow-sm transition-all duration-200
                                    ${hasDiscount ? 'border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100 pl-4 pr-1 py-1' : 'border-gray-200 hover:border-blue-300 pl-3 pr-1 py-1'}
                                `}
                                >
                                    <span
                                        className={`text-xl font-bold mr-1 ${hasDiscount ? 'text-emerald-600' : 'text-gray-400'}`}
                                    >
                                        ¥
                                    </span>
                                    <InputNumber
                                        value={discountedPrice}
                                        onChange={(val) => onDiscountChange?.(val || 0)}
                                        variant="borderless"
                                        className={`
                                            w-40 text-right !font-black !bg-transparent
                                            ${hasDiscount ? '!text-3xl !text-emerald-600' : '!text-2xl !text-gray-700'}
                                        `}
                                        placeholder="输入金额"
                                        disabled={disabled}
                                        min={0}
                                        controls={false}
                                        formatter={(value) => `${value}`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        </tfoot>
    );
};
