import { Package } from '../types';
import { CATEGORY_CONFIG } from '@/const';

export function getCoreSpecs(pkg: Package) {
    const coreCategories = ['cpu', 'gpu', 'motherboard'];
    const coreItems = pkg.items.filter((item) => coreCategories.includes(item.product_category));

    return coreItems.map((item) => ({
        ...item,
        icon: CATEGORY_CONFIG[item.product_category]?.icon || '•',
    }));
}
