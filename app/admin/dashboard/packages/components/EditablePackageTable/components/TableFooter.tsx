import React from 'react';
import { InputNumber, Typography } from 'antd';

const { Text } = Typography;

interface TableFooterProps {
    totalPrice: number;
    pricing: boolean;
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
    discount,
    disabled,
}) => {
    const {
        show: showDiscount,
        price: discountedPrice,
        onChange: onDiscountChange,
    } = discount || {};

    // Calculate spans dynamically if needed, but here we'll use a cleaner flex layout inside the footer row
    // or just span all for a card-like footer.
    const colCount = pricing ? 5 : 4;

    return (
        <tfoot className="bg-white border-t border-gray-100">
            <tr>
                <td colSpan={colCount} className="p-0">
                    <div className="flex flex-col items-end gap-4 p-6 bg-gradient-to-b from-gray-50/30 to-white">
                        {/* Subtotal Row */}
                        <div className="flex items-center justify-between w-full max-w-sm p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 shadow-sm">
                            <Text className="text-gray-500 font-bold uppercase tracking-wider text-xs">
                                配置总价
                            </Text>
                            <div
                                className={`text-3xl font-black tracking-tight ${showDiscount && discountedPrice ? 'text-gray-400 line-through decoration-gray-300 text-xl font-bold' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'}`}
                            >
                                <span
                                    className={`${showDiscount && discountedPrice ? 'text-gray-400' : 'text-blue-600'} text-lg font-bold mr-1`}
                                >
                                    ¥
                                </span>
                                {totalPrice.toFixed(2)}
                            </div>
                        </div>

                        {/* Discount Input Row */}
                        {showDiscount && (
                            <div className="flex items-center justify-between w-full max-w-sm relative group mt-2 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 shadow-sm ring-1 ring-emerald-100/50">
                                <div className="flex flex-col">
                                    <Text className="text-emerald-600 font-bold uppercase tracking-wider text-xs">
                                        最终成交价
                                    </Text>
                                    {discountedPrice && discountedPrice < totalPrice && (
                                        <span className="text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full mt-1 inline-block w-fit shadow-sm shadow-emerald-200">
                                            省 ¥{(totalPrice - discountedPrice).toFixed(2)}
                                        </span>
                                    )}
                                </div>

                                <div className="relative">
                                    <InputNumber
                                        value={discountedPrice}
                                        onChange={(val) => onDiscountChange?.(val || 0)}
                                        variant="borderless"
                                        className="w-48 text-right !text-4xl !font-black !text-emerald-600 placeholder:text-emerald-200/50 !bg-transparent"
                                        placeholder="0.00"
                                        disabled={disabled}
                                        min={0}
                                        controls={false}
                                        formatter={(value) => `¥ ${value}`}
                                    />
                                    {/* Animated underline */}
                                    <div className="absolute bottom-1 right-0 w-full h-1 bg-emerald-200/30 rounded-full overflow-hidden">
                                        <div className="w-full h-full bg-emerald-400/50 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        </tfoot>
    );
};
