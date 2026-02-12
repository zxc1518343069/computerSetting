import { EditablePartRow, Product } from '@/app/admin/dashboard/packages/types';
import { CATEGORY_CONFIG } from '@/const';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, InputNumber, Tooltip } from 'antd';
import React from 'react';
import { ProductSelect } from './ProductSelect';

interface ProductRowProps {
    item: EditablePartRow;
    products: Product[];

    /** 行状态配置 */
    config: {
        categoryName: string;
        isFirst: boolean;
        canRemove: boolean;
        isMultiSelect: boolean;
        disabled: boolean;
        pricing: boolean;
        showProfit?: boolean;
    };

    /** 价格相关数据 */
    priceData: {
        getItemMetrics: (item: EditablePartRow) => {
            unitCost: number;
            unitSellPrice: number;
            totalCost: number;
            totalSellPrice: number;
            totalProfit: number;
            profitRate: number;
        };
        getProductPrice: (p: Product) => number;
    };

    /** 操作回调 */
    actions: {
        onUpdate: (id: string, changes: Partial<EditablePartRow>) => void;
        onAddRow?: (category: string) => void;
        onRemoveRow?: (id: string) => void;
    };
}

export const ProductRow: React.FC<ProductRowProps> = ({
    item,
    products,
    config,
    priceData,
    actions,
}) => {
    const { categoryName, isFirst, canRemove, isMultiSelect, disabled, pricing, showProfit } =
        config;
    const { getItemMetrics } = priceData;
    const { onUpdate, onAddRow, onRemoveRow } = actions;

    const metrics = getItemMetrics(item);
    const selectedProduct = products.find((p) => p.id === item.product_id);

    const options = products.map((p) => ({
        value: p.id,
        label: p.name,
        price: p.price,
    }));

    const categoryColor = CATEGORY_CONFIG[item.category]?.solidColor || 'bg-slate-400';

    return (
        <tr
            className={`group transition-all duration-300 ${disabled ? 'hover:bg-slate-50/50 dark:hover:bg-white/5' : 'hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20'} relative`}
        >
            {/* 类别标签 */}
            <td className="px-6 py-4 align-middle whitespace-nowrap">
                {isFirst && (
                    <div className="flex items-center gap-3">
                        <div className={`w-1 + h-5 rounded-full ${categoryColor} opacity-60`}></div>
                        <span className="text-sm font-bold text-slate-500 dark:text-gray-400 tracking-tight">
                            {categoryName}
                        </span>
                    </div>
                )}
            </td>

            {/* 产品选择 */}
            <td className="px-6 py-4 align-middle min-w-[280px]">
                <div className="flex items-center gap-4">
                    {!isFirst && (
                        <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-gray-700 ml-1"></div>
                    )}

                    <div className="flex-1">
                        <div className="relative group/select">
                            <ProductSelect
                                value={item.product_id}
                                onChange={(val) => onUpdate(item.id, { product_id: val })}
                                options={options}
                                disabled={disabled}
                                placeholder={
                                    isFirst ? `选择 ${categoryName} 配件...` : '添加额外配件...'
                                }
                                allowCustomInput
                                customInputValue={item.custom_name}
                                onCustomInputChange={(val) =>
                                    onUpdate(item.id, { custom_name: val })
                                }
                            />
                        </div>
                    </div>

                    {/* 操作按钮 */}
                    {!disabled && (
                        <div className="flex items-center gap-2">
                            {isMultiSelect && isFirst && onAddRow && (
                                <Tooltip title="添加模块">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<PlusOutlined />}
                                        onClick={() => onAddRow(item.category)}
                                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center border-none transition-all"
                                    />
                                </Tooltip>
                            )}
                            {canRemove && onRemoveRow && (
                                <Tooltip title="移除模块">
                                    <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => onRemoveRow(item.id)}
                                        className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center border-none transition-all opacity-0 group-hover:opacity-100"
                                    />
                                </Tooltip>
                            )}
                        </div>
                    )}
                </div>
            </td>

            {/* 数量控制 */}
            <td className="px-6 py-4 align-middle text-center w-24">
                <InputNumber
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(val) => onUpdate(item.id, { quantity: val || 1 })}
                    disabled={disabled || (!item.product_id && !item.custom_name)}
                    className={`w-full !rounded-xl !border-none !shadow-sm transition-all font-mono font-bold ${
                        item.quantity > 1
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-50 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700'
                    }`}
                    controls={false}
                />
            </td>

            {/* 价格信息 (单价列) */}
            {pricing && (
                <td className="px-6 py-4 align-middle text-right whitespace-nowrap tabular-nums">
                    {item.product_id === 0 ? (
                        <InputNumber
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={item.custom_price}
                            onChange={(val) => onUpdate(item.id, { custom_price: val || 0 })}
                            disabled={disabled}
                            className="w-32 !rounded-xl !bg-slate-50/50 dark:!bg-white/5 !border-none !shadow-sm font-mono font-bold text-right"
                            prefix={<span className="text-slate-300 dark:text-gray-600 text-xs">¥</span>}
                            controls={false}
                        />
                    ) : selectedProduct ? (
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="text-blue-600 dark:text-blue-400 text-sm font-bold tracking-tight">
                                ¥
                                {metrics.unitSellPrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                            {showProfit && (
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500">进</span>
                                    <span className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">
                                        ¥{metrics.unitCost.toFixed(0)}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-200 dark:text-gray-800 font-mono">---</span>
                    )}
                </td>
            )}

            {/* 小计列 - 翡翠绿标签化设计 */}
            <td className="px-6 py-4 align-middle text-right whitespace-nowrap tabular-nums">
                {metrics.totalSellPrice > 0 ? (
                    <div className="flex flex-col items-end gap-1">
                        <div className="inline-flex items-center px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30">
                            <span className="text-emerald-600 dark:text-emerald-400 text-base font-black tracking-tight">
                                ¥
                                {metrics.totalSellPrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        {showProfit && (
                            <div className="flex items-center gap-1.5 pr-1">
                                <span
                                    className={`text-[10px] font-bold ${metrics.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                                >
                                    利 ¥{metrics.totalProfit.toFixed(0)}
                                </span>
                                <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                        metrics.profitRate > 0.15
                                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                            : metrics.profitRate > 0.05
                                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                    }`}
                                >
                                    {(metrics.profitRate * 100).toFixed(0)}%
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-slate-200 dark:text-gray-800 font-mono">---</span>
                )}
            </td>
        </tr>
    );
};
