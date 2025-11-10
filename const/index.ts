// 定义配件类别枚举
export enum PartCategory {
    CPU = 'CPU',
    Motherboard = 'Motherboard',
    RAM = 'RAM',
    GPU = 'GPU',
    Storage = 'Storage',
    PSU = 'PSU',
    Case = 'Case',
    Cooling = 'Cooling',
    Monitor = 'Monitor',
}
// 定义产品接口
export interface Product {
    id: number;
    name: string;
    price: number;
}

export type AllProducts = Record<PartCategory, Product[]>;

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

// 定义类别显示名称映射
export const categoryDisplayNames: Record<PartCategory, string> = {
    [PartCategory.CPU]: '处理器',
    [PartCategory.Motherboard]: '主板',
    [PartCategory.RAM]: '内存',
    [PartCategory.GPU]: '显卡',
    [PartCategory.Storage]: '存储',
    [PartCategory.PSU]: '电源',
    [PartCategory.Case]: '机箱',
    [PartCategory.Cooling]: '散热',
    [PartCategory.Monitor]: '显示器',
};

// Packages相关的常量
export const PACKAGE_CATEGORIES = [
    { key: 'cpu', name: '处理器' },
    { key: 'motherboard', name: '主板' },
    { key: 'ram', name: '内存' },
    { key: 'gpu', name: '显卡' },
    { key: 'storage', name: '存储' },
    { key: 'psu', name: '电源' },
    { key: 'case', name: '机箱' },
    { key: 'cooling', name: '散热' },
    { key: 'monitor', name: '显示器' },
] as const;

// 类别显示名称映射 (小写key版本，用于packages)
export const packageCategoryDisplayNames: Record<string, string> = {
    cpu: '处理器',
    motherboard: '主板',
    ram: '内存',
    gpu: '显卡',
    storage: '存储',
    psu: '电源',
    case: '机箱',
    cooling: '散热',
    monitor: '显示器',
};

// 带category字段的Product接口
export interface ProductWithCategory extends Product {
    category: string;
}
