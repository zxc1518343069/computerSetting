import QuoteProductSelect from '@/app/_components/QuoteProductSelect';
import { EditablePartRow, Product } from '@/app/admin/dashboard/packages/types';
import { ProductCategory } from '@/const/types';
import { DeleteOutlined } from '@ant-design/icons';
import { Button, Empty, InputNumber, Select, Tooltip } from 'antd';
import React, { useMemo } from 'react';

type ItemMetrics = {
    unitCost: number;
    unitSellPrice: number;
    totalCost: number;
    totalSellPrice: number;
    totalProfit: number;
    profitRate: number;
};

interface RetailQuoteTableProps {
    items: EditablePartRow[];
    products: Product[];
    categories: ProductCategory[];
    totalPrice: number;
    discountedPrice: number;
    disabled?: boolean;
    onRowUpdate: (id: string, changes: Partial<EditablePartRow>) => void;
    onRemoveRow: (id: string) => void;
    onDiscountedPriceChange: (price: number) => void;
    getItemMetrics: (item: EditablePartRow) => ItemMetrics;
}

const getCategoryValue = (category: ProductCategory) => category.code || String(category.id);

const productMatchesCategory = (product: Product, category?: ProductCategory, value?: string) => {
    if (!value) return false;
    if (category?.id && product.category_id === category.id) return true;
    if (category?.code && product.category === category.code) return true;
    return Boolean(value && product.category === value);
};

export function RetailQuoteTable({
    items,
    products,
    categories,
    totalPrice,
    discountedPrice,
    disabled,
    onRowUpdate,
    onRemoveRow,
    onDiscountedPriceChange,
    getItemMetrics,
}: RetailQuoteTableProps) {
    const categoryOptions = useMemo(
        () =>
            categories.map((category) => ({
                value: getCategoryValue(category),
                label: category.label || category.name,
            })),
        [categories]
    );

    const categoryMap = useMemo(
        () => new Map(categories.map((category) => [getCategoryValue(category), category])),
        [categories]
    );

    const hasDiscount = discountedPrice > 0;

    if (items.length === 0) {
        return (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/70 py-20 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#1f1f1f]/70">
                <Empty
                    description={
                        <span className="text-sm font-medium text-slate-400 dark:text-gray-500">
                            暂无零售商品
                        </span>
                    }
                />
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto rounded-[2rem] border border-white bg-white/70 shadow-md backdrop-blur-xl scrollbar-hide dark:border-white/10 dark:bg-[#1f1f1f]/70">
            <table className="w-full min-w-[920px] border-collapse table-auto">
                <thead className="bg-slate-50/70 dark:bg-white/[0.03]">
                    <tr>
                        <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                            硬件类别
                        </th>
                        <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                            产品
                        </th>
                        <th className="w-24 px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                            数量
                        </th>
                        <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                            单价 (¥)
                        </th>
                        <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                            小计 (¥)
                        </th>
                        <th className="w-20 px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                            操作
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70 dark:divide-gray-800/70">
                    {items.map((item) => {
                        const category = categoryMap.get(item.category);
                        const metrics = getItemMetrics(item);
                        const selectedProduct = products.find((product) => product.id === item.product_id);
                        const hasCategory = Boolean(item.category);
                        const productOptions = products
                            .filter((product) => productMatchesCategory(product, category, item.category))
                            .map((product) => ({
                                value: product.id,
                                label: product.name,
                                barcode: product.barcode,
                                price: product.price,
                                stock_quantity: product.stock_quantity,
                            }));

                        return (
                            <tr
                                key={item.id}
                                className="group transition-colors hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20"
                            >
                                <td className="px-6 py-4 align-middle">
                                    <Select
                                        className="w-44"
                                        value={item.category || undefined}
                                        options={categoryOptions}
                                        disabled={disabled}
                                        placeholder="选择类别"
                                        showSearch
                                        optionFilterProp="label"
                                        onChange={(value) => onRowUpdate(item.id, { category: value })}
                                    />
                                </td>
                                <td className="px-6 py-4 align-middle">
                                    <QuoteProductSelect
                                        value={item.product_id}
                                        options={productOptions}
                                        disabled={disabled || !hasCategory}
                                        placeholder={hasCategory ? '选择零售商品...' : '请先选择硬件类别'}
                                        onChange={(value) =>
                                            onRowUpdate(item.id, {
                                                product_id: value,
                                                custom_name: undefined,
                                                custom_price: undefined,
                                            })
                                        }
                                    />
                                    {selectedProduct?.barcode && (
                                        <div className="mt-1 font-mono text-[11px] text-slate-400">
                                            {selectedProduct.barcode}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center align-middle">
                                    <InputNumber
                                        min={1}
                                        max={99}
                                        value={item.quantity}
                                        disabled={disabled || (!item.product_id && !item.custom_name)}
                                        controls={false}
                                        onChange={(value) =>
                                            onRowUpdate(item.id, { quantity: value || 1 })
                                        }
                                        className="w-full !rounded-xl !border-none !bg-slate-50 !font-mono !font-bold !shadow-sm dark:!bg-gray-800"
                                    />
                                </td>
                                <td className="px-6 py-4 text-right align-middle tabular-nums">
                                    {item.product_id > 0 ? (
                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                            ¥{metrics.unitSellPrice.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="font-mono text-slate-300 dark:text-gray-700">
                                            ---
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right align-middle tabular-nums">
                                    <span className="inline-flex rounded-lg border border-emerald-100/60 bg-emerald-50 px-3 py-1 text-base font-black text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400">
                                        ¥{metrics.totalSellPrice.toFixed(2)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right align-middle">
                                    <Tooltip title="删除商品">
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            disabled={disabled}
                                            onClick={() => onRemoveRow(item.id)}
                                            className="h-8 w-8 rounded-lg bg-red-50 text-red-500 opacity-0 transition-all hover:bg-red-100 group-hover:opacity-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                        />
                                    </Tooltip>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="border-t border-slate-100 bg-slate-50/40 dark:border-gray-800 dark:bg-white/[0.02]">
                    <tr>
                        <td colSpan={6} className="px-8 py-7">
                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-6">
                                    <div>
                                        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                            零售总价
                                        </div>
                                        <div
                                            className={`tabular-nums ${hasDiscount ? 'text-lg font-bold text-slate-400 line-through' : 'text-2xl font-black text-slate-800 dark:text-gray-100'}`}
                                        >
                                            ¥{totalPrice.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="h-10 w-px bg-slate-200 dark:bg-gray-700" />
                                    <div>
                                        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                                            最终成交金额
                                        </div>
                                        <InputNumber
                                            min={0}
                                            precision={2}
                                            value={discountedPrice || undefined}
                                            disabled={disabled}
                                            controls={false}
                                            placeholder="0.00"
                                            prefix="¥"
                                            onChange={(value) => onDiscountedPriceChange(value || 0)}
                                            className="w-44 !rounded-xl !border-none !bg-white !text-xl !font-black !shadow-sm dark:!bg-[#141414]"
                                        />
                                    </div>
                                </div>
                                {hasDiscount && discountedPrice < totalPrice && (
                                    <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                        已优惠 ¥{(totalPrice - discountedPrice).toFixed(2)}
                                    </div>
                                )}
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
