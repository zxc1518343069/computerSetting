export * from './categories';
export * from './types';

import { PartCategory } from './categories';
import { Product } from './types';

// Legacy Product type for exampleData (without category)
type SimpleProduct = Omit<Product, 'category'>;

export type AllProducts = Record<PartCategory, SimpleProduct[]>;

export const exampleData: AllProducts = {
    [PartCategory.CPU]: [
        { id: 1, name: 'Intel Core i9-13900K', price: 589.99 },
        { id: 2, name: 'AMD Ryzen 9 7950X', price: 549.99 },
        { id: 3, name: 'Intel Core i7-13700K', price: 419.99 },
    ],
    [PartCategory.Motherboard]: [
        { id: 4, name: 'ASUS ROG Maximus Z790 Hero', price: 599.99 },
        { id: 5, name: 'MSI MEG X670E ACE', price: 499.99 },
        { id: 6, name: 'Gigabyte B650 AORUS Elite AX', price: 229.99 },
    ],
    [PartCategory.RAM]: [
        { id: 7, name: 'Corsair Dominator Platinum RGB 32GB DDR5 6000MHz', price: 249.99 },
        { id: 8, name: 'G.Skill Trident Z5 RGB 32GB DDR5 6000MHz', price: 219.99 },
        { id: 9, name: 'Kingston Fury Beast 32GB DDR5 5200MHz', price: 149.99 },
    ],
    [PartCategory.GPU]: [
        { id: 10, name: 'NVIDIA GeForce RTX 4090 Founders Edition', price: 1599.99 },
        { id: 11, name: 'AMD Radeon RX 7900 XTX', price: 999.99 },
        { id: 12, name: 'NVIDIA GeForce RTX 4080', price: 1199.99 },
    ],
    [PartCategory.Storage]: [
        { id: 13, name: 'Samsung 990 Pro 2TB NVMe SSD', price: 249.99 },
        { id: 14, name: 'WD Black SN850X 2TB NVMe SSD', price: 229.99 },
        { id: 15, name: 'Crucial P5 Plus 2TB NVMe SSD', price: 199.99 },
    ],
    [PartCategory.PSU]: [
        { id: 16, name: 'Corsair HX1200 Platinum 1200W', price: 299.99 },
        { id: 17, name: 'Seasonic PRIME TX-1000 1000W', price: 279.99 },
        { id: 18, name: 'EVGA SuperNOVA 850 G6 850W', price: 159.99 },
    ],
    [PartCategory.Case]: [
        { id: 19, name: 'Lian Li PC-O11 Dynamic', price: 149.99 },
        { id: 20, name: 'Fractal Design Torrent', price: 199.99 },
        { id: 21, name: 'NZXT H7 Flow', price: 129.99 },
    ],
    [PartCategory.Cooling]: [
        { id: 22, name: 'NZXT Kraken Z73 RGB 360mm', price: 279.99 },
        { id: 23, name: 'Corsair iCUE H150i ELITE LCD', price: 249.99 },
        { id: 24, name: 'Noctua NH-D15 chromax.black', price: 109.99 },
    ],
    [PartCategory.Monitor]: [
        { id: 25, name: 'NZXT Kraken Z73 RGB 360mm', price: 279.99 },
        { id: 26, name: 'Corsair iCUE H150i ELITE LCD', price: 249.99 },
        { id: 27, name: 'Noctua NH-D15 chromax.black', price: 109.99 },
    ],
};

// Re-export deprecated constants for compatibility if needed, 
// or relying on category.ts exports which cover them.
// PACKAGE_CATEGORIES in categories.ts is named PACKAGE_CATEGORIES_LIST to avoid conflict if I kept the old one.
// But I should probably alias it back to PACKAGE_CATEGORIES to avoid breaking changes, 
// or just update the code to use PACKAGE_CATEGORIES_LIST (or rename it to PACKAGE_CATEGORIES).

// The old PACKAGE_CATEGORIES was: { key: string, name: string }[]
// The new PACKAGE_CATEGORIES_LIST is: CategoryConfigItem[] (which has key, name, etc.)
// So it is compatible structure-wise (superset).

export { PACKAGE_CATEGORIES_LIST as PACKAGE_CATEGORIES } from './categories';