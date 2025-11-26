import { InputNumber, Tag } from 'antd';

interface TableFooterProps {
    pricing: boolean;
    totalPrice: number;
    discount?: {
        show: boolean;
        price?: number;
        onChange?: (price: number) => void;
    };
    disabled: boolean;
}

export function TableFooter({ pricing, totalPrice, discount, disabled }: TableFooterProps) {
    const {
        show: showDiscountedPrice,
        price: discountedPrice,
        onChange: onDiscountedPriceChange,
    } = discount || {};
    return (
        <tfoot>
            {/* 总价行 */}
            <tr className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-t-4 border-indigo-200">
                <td className="px-4 py-4" colSpan={pricing ? 4 : 5}>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                            <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 mb-0.5">配置</p>
                            <p className="text-base font-bold text-gray-800">总价</p>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-4 text-right">
                    <div className="inline-flex flex-col items-end gap-1">
                        <div
                            className={`inline-flex items-baseline px-5 py-2.5 rounded-xl ${
                                discountedPrice && discountedPrice > 0
                                    ? 'bg-gray-400 text-white'
                                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
                            } transition-all`}
                        >
                            <span className="text-sm font-medium mr-1">¥</span>
                            <span
                                className={`text-2xl font-bold tracking-tight ${
                                    discountedPrice && discountedPrice > 0 ? 'line-through' : ''
                                }`}
                            >
                                {totalPrice.toFixed(2)}
                            </span>
                        </div>
                        {discountedPrice && discountedPrice > 0 && (
                            <span className="text-xs text-gray-500 font-medium">原价</span>
                        )}
                    </div>
                </td>
            </tr>

            {/* 优惠后价格行 */}
            {showDiscountedPrice && (
                <tr className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-t-2 border-green-200">
                    <td className="px-4 py-4" colSpan={pricing ? 4 : 5}>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-0.5">优惠</p>
                                <p className="text-base font-bold text-gray-800">实付价格</p>
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                        <div className="inline-flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">¥</span>
                                <InputNumber
                                    min={0}
                                    step={0.01}
                                    value={discountedPrice || undefined}
                                    onChange={(value) => onDiscountedPriceChange?.(value || 0)}
                                    placeholder="输入优惠价"
                                    disabled={disabled}
                                    className="w-40"
                                    size="large"
                                    style={{
                                        borderRadius: '12px',
                                        borderWidth: '2px',
                                        borderColor: '#86efac',
                                    }}
                                />
                            </div>
                            {!!discountedPrice && discountedPrice > 0 && totalPrice > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Tag color="red">
                                        优惠 ¥{(totalPrice - discountedPrice).toFixed(2)}
                                    </Tag>
                                    <Tag color="green">
                                        {((1 - discountedPrice / totalPrice) * 100).toFixed(1)}% OFF
                                    </Tag>
                                </div>
                            )}
                            {(!discountedPrice || discountedPrice === 0) && (
                                <span className="text-xs text-gray-500">可选:输入优惠后价格</span>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </tfoot>
    );
}
