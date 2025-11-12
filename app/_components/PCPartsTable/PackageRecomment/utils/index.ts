import { Package } from '../types';

export function getCoreSpecs(pkg: Package) {
    const coreCategories = ['cpu', 'gpu', 'motherboard'];
    const coreItems = pkg.items.filter((item) => coreCategories.includes(item.product_category));

    const categoryIcons: Record<string, string> = {
        cpu: '🖥️',
        gpu: '🎮',
        motherboard: '⚡',
    };

    return coreItems.map((item) => ({
        ...item,
        icon: categoryIcons[item.product_category] || '•',
    }));
}
