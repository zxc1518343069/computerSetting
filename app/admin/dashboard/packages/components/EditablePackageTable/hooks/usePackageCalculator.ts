import { useMemo, useCallback } from 'react';
import { Product, PricingConfig, EditablePartRow } from '../../../types';
import { PricingCalculator } from '@/utils/pricing';

export const usePackageCalculator = (
    products: Product[],
    pricingConfig: PricingConfig | undefined,
    items: EditablePartRow[]
) => {
    const calculator = useMemo(() => new PricingCalculator(pricingConfig), [pricingConfig]);

    // Helper to find product safely
    const getProduct = useCallback(
        (id: number) => products.find((p) => p.id === id),
        [products]
    );

    // 1. Get Cost (Base Price)
    const getCostPrice = useCallback(
        (item: EditablePartRow): number => {
            if (item.product_id === 0) return item.custom_price || 0; // Custom items: cost = price (assumed 0 profit unless logic changes)
            const product = getProduct(item.product_id);
            return product ? product.price : 0;
        },
        [getProduct]
    );

    // 2. Get Selling Price (Calculated with Premium)
    const getItemPrice = useCallback(
        (item: EditablePartRow): number => {
            return calculator.calculateItemPrice(item, products); // This returns Total Price for the Item (Unit Price * Qty)
        },
        [calculator, products]
    );

    const getProductPrice = useCallback(
        (product: Product) => calculator.getProductPrice(product),
        [calculator]
    );

    // 3. Detailed Metrics per Item
    const getItemMetrics = useCallback(
        (item: EditablePartRow) => {
            const quantity = item.quantity || 1;
            
            // Unit Cost
            const unitCost = getCostPrice(item);
            // Unit Sell Price (calculated from total item price / quantity to handle custom logic if any)
            const totalSellPrice = getItemPrice(item);
            const unitSellPrice = totalSellPrice / quantity;

            // Totals
            const totalCost = unitCost * quantity;
            const totalProfit = totalSellPrice - totalCost;
            const profitRate = totalSellPrice > 0 ? totalProfit / totalSellPrice : 0;

            return {
                unitCost,
                unitSellPrice,
                totalCost,
                totalSellPrice,
                totalProfit,
                profitRate,
            };
        },
        [getCostPrice, getItemPrice]
    );

    // 4. Aggregates
    const totals = useMemo(() => {
        return items.reduce(
            (acc, item) => {
                const metrics = getItemMetrics(item);
                return {
                    totalCost: acc.totalCost + metrics.totalCost,
                    totalPrice: acc.totalPrice + metrics.totalSellPrice,
                    totalProfit: acc.totalProfit + metrics.totalProfit,
                };
            },
            { totalCost: 0, totalPrice: 0, totalProfit: 0 }
        );
    }, [items, getItemMetrics]);

    const profitRate =
        totals.totalPrice > 0 ? totals.totalProfit / totals.totalPrice : 0;

    return {
        getProductPrice,
        getItemPrice,
        getItemMetrics,
        totalPrice: totals.totalPrice,
        totalCost: totals.totalCost,
        totalProfit: totals.totalProfit,
        profitRate,
    };
};
