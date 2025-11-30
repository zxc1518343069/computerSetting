import { useMemo, useCallback } from 'react';
import { Product, PricingConfig, EditablePartRow } from '../../../types';
import { PricingCalculator } from '@/utils/pricing';

export const usePackageCalculator = (
    products: Product[],
    pricingConfig: PricingConfig | undefined,
    items: EditablePartRow[]
) => {
    const calculator = useMemo(() => new PricingCalculator(pricingConfig), [pricingConfig]);

    const getItemPrice = useCallback(
        (item: EditablePartRow): number => {
            return calculator.calculateItemPrice(item, products);
        },
        [calculator, products]
    );

    const getProductPrice = useCallback(
        (product: Product) => calculator.getProductPrice(product),
        [calculator]
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
