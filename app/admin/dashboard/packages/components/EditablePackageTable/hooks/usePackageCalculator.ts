import { useMemo, useCallback } from 'react';
import { Product, PricingConfig, EditablePartRow } from '../../../types';

export const usePackageCalculator = (
    products: Product[],
    pricingConfig: PricingConfig | undefined,
    items: EditablePartRow[]
) => {
    // Helper to get rate for a category
    const getPricingRate = useCallback(
        (category: string): number => {
            if (!pricingConfig) return 1;

            if (pricingConfig.unifiedPricing) {
                return 1 + (pricingConfig.unifiedRate || 0) / 100;
            }

            const rateMap: Record<string, number> = {
                cpu: pricingConfig.cpu,
                motherboard: pricingConfig.motherboard,
                ram: pricingConfig.ram,
                gpu: pricingConfig.gpu,
                storage: pricingConfig.storage,
                psu: pricingConfig.psu,
                case: pricingConfig.case,
                cooling: pricingConfig.cooling,
                monitor: pricingConfig.monitor || 0,
            };

            const rate = rateMap[category] || 0;
            return 1 + rate / 100;
        },
        [pricingConfig]
    );

    const getProductPrice = useCallback(
        (product: Product): number => {
            return product.price * getPricingRate(product.category);
        },
        [getPricingRate]
    );

    const getItemPrice = useCallback(
        (item: EditablePartRow): number => {
            if (item.product_id === 0 && item.custom_price !== undefined) {
                return item.custom_price * item.quantity;
            }
            if (!item.product_id) return 0;
            const product = products.find((p) => p.id === item.product_id);
            return product ? getProductPrice(product) * item.quantity : 0;
        },
        [products, getProductPrice]
    );

    const totalPrice = useMemo(() => {
        return items.reduce((sum, item) => sum + getItemPrice(item), 0);
    }, [items, getItemPrice]);

    return {
        getProductPrice,
        getItemPrice,
        totalPrice,
    };
};
