import { useMemo } from 'react';
import { Product, PricingConfigData, EditablePartRow } from '../types';

export function usePricing(
    products: Product[],
    pricingConfig: PricingConfigData | null,
    items: EditablePartRow[]
) {
    const getPricingRate = (category: string): number => {
        if (!pricingConfig) return 1;

        if (pricingConfig.unifiedPricing) {
            return pricingConfig.unifiedRate;
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
            monitor: pricingConfig.monitor,
        };
        return rateMap[category] || 1;
    };

    const getProductPrice = (product: Product): number => {
        return product.price * getPricingRate(product.category);
    };

    const getItemPrice = (item: EditablePartRow): number => {
        if (item.product_id === 0 && item.custom_price !== undefined) {
            return item.custom_price * item.quantity;
        }
        if (!item.product_id) return 0;
        const product = products.find((p) => p.id === item.product_id);
        return product ? getProductPrice(product) * item.quantity : 0;
    };

    const totalPrice = useMemo(() => {
        return items.reduce((sum, item) => sum + getItemPrice(item), 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, products, pricingConfig]);

    return { getProductPrice, getItemPrice, totalPrice };
}
