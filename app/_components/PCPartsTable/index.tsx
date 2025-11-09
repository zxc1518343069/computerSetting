// components/PCPartsTable.tsx
"use client"
import React, {useState, useEffect} from 'react';

// 定义配件类别枚举
enum PartCategory {
    CPU = 'CPU',
    Motherboard = 'Motherboard',
    RAM = 'RAM',
    GPU = 'GPU',
    Storage = 'Storage',
    PSU = 'PSU',
    Case = 'Case',
    Cooling = 'Cooling'
}

// 定义类别显示名称映射
const categoryDisplayNames: Record<PartCategory, string> = {
    [PartCategory.CPU]: '处理器',
    [PartCategory.Motherboard]: '主板',
    [PartCategory.RAM]: '内存',
    [PartCategory.GPU]: '显卡',
    [PartCategory.Storage]: '存储',
    [PartCategory.PSU]: '电源',
    [PartCategory.Case]: '机箱',
    [PartCategory.Cooling]: '散热'
};

// 定义产品接口
interface Product {
    id: number;
    name: string;
    price: number;
}

// 定义配件行数据接口
interface PartRow {
    id: number;
    category: PartCategory;
    productId: number | null;
    name: string;
    price: number;
    quantity: number;
}

// 定义所有产品数据接口
type AllProducts = Record<PartCategory, Product[]>;

// 定义溢价配置接口
interface PricingConfig {
    unifiedPricing: boolean;
    unifiedRate: number;
    cpu: number;
    motherboard: number;
    ram: number;
    gpu: number;
    storage: number;
    psu: number;
    case: number;
    cooling: number;
}

// 类别到localStorage key的映射
const categoryToStorageKey: Record<PartCategory, string> = {
    [PartCategory.CPU]: 'cpu',
    [PartCategory.Motherboard]: 'motherboard',
    [PartCategory.RAM]: 'ram',
    [PartCategory.GPU]: 'gpu',
    [PartCategory.Storage]: 'storage',
    [PartCategory.PSU]: 'psu',
    [PartCategory.Case]: 'case',
    [PartCategory.Cooling]: 'cooling',
};

// 所有可选产品数据（默认数据）
const initProducts: AllProducts = {
    [PartCategory.CPU]: [
        {id: 1, name: 'Intel Core i9-13900K', price: 589.99},
        {id: 2, name: 'AMD Ryzen 9 7950X', price: 549.99},
        {id: 3, name: 'Intel Core i7-13700K', price: 419.99},
    ],
    [PartCategory.Motherboard]: [
        {id: 4, name: 'ASUS ROG Maximus Z790 Hero', price: 599.99},
        {id: 5, name: 'MSI MEG X670E ACE', price: 499.99},
        {id: 6, name: 'Gigabyte B650 AORUS Elite AX', price: 229.99},
    ],
    [PartCategory.RAM]: [
        {id: 7, name: 'Corsair Dominator Platinum RGB 32GB DDR5 6000MHz', price: 249.99},
        {id: 8, name: 'G.Skill Trident Z5 RGB 32GB DDR5 6000MHz', price: 219.99},
        {id: 9, name: 'Kingston Fury Beast 32GB DDR5 5200MHz', price: 149.99},
    ],
    [PartCategory.GPU]: [
        {id: 10, name: 'NVIDIA GeForce RTX 4090 Founders Edition', price: 1599.99},
        {id: 11, name: 'AMD Radeon RX 7900 XTX', price: 999.99},
        {id: 12, name: 'NVIDIA GeForce RTX 4080', price: 1199.99},
    ],
    [PartCategory.Storage]: [
        {id: 13, name: 'Samsung 990 Pro 2TB NVMe SSD', price: 249.99},
        {id: 14, name: 'WD Black SN850X 2TB NVMe SSD', price: 229.99},
        {id: 15, name: 'Crucial P5 Plus 2TB NVMe SSD', price: 199.99},
    ],
    [PartCategory.PSU]: [
        {id: 16, name: 'Corsair HX1200 Platinum 1200W', price: 299.99},
        {id: 17, name: 'Seasonic PRIME TX-1000 1000W', price: 279.99},
        {id: 18, name: 'EVGA SuperNOVA 850 G6 850W', price: 159.99},
    ],
    [PartCategory.Case]: [
        {id: 19, name: 'Lian Li PC-O11 Dynamic', price: 149.99},
        {id: 20, name: 'Fractal Design Torrent', price: 199.99},
        {id: 21, name: 'NZXT H7 Flow', price: 129.99},
    ],
    [PartCategory.Cooling]: [
        {id: 22, name: 'NZXT Kraken Z73 RGB 360mm', price: 279.99},
        {id: 23, name: 'Corsair iCUE H150i ELITE LCD', price: 249.99},
        {id: 24, name: 'Noctua NH-D15 chromax.black', price: 109.99},
    ],
};

const initialParts: PartRow[] = Object.values(PartCategory).map((category, index) => ({
    id: index + 1,
    category,
    productId: null,
    name: '',
    price: 0,
    quantity: 1,
}));

const PCPartsTable: React.FC = () => {
    // 初始配件数据
    const [parts, setParts] = useState<PartRow[]>(initialParts);
    const [allProducts, setAllProducts] = useState<AllProducts>(initProducts);
    const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
        unifiedPricing: true,
        unifiedRate: 0,
        cpu: 0,
        motherboard: 0,
        ram: 0,
        gpu: 0,
        storage: 0,
        psu: 0,
        case: 0,
        cooling: 0,
    });

    // 从localStorage加载产品数据和溢价配置
    useEffect(() => {
        const loadedProducts: AllProducts = {...initProducts};
        let hasCustomProducts = false;

        // 加载每个类别的产品数据
        Object.values(PartCategory).forEach((category) => {
            const storageKey = categoryToStorageKey[category];
            const savedProducts = localStorage.getItem(`products_${storageKey}`);
            if (savedProducts) {
                try {
                    const parsed = JSON.parse(savedProducts);
                    if (parsed && parsed.length > 0) {
                        loadedProducts[category] = parsed;
                        hasCustomProducts = true;
                    }
                } catch (e) {
                    console.error(`Failed to parse products for ${category}:`, e);
                }
            }
        });

        if (hasCustomProducts) {
            setAllProducts(loadedProducts);
        }

        // 加载溢价配置
        const savedPricingConfig = localStorage.getItem('pricingConfig');
        if (savedPricingConfig) {
            try {
                setPricingConfig(JSON.parse(savedPricingConfig));
            } catch (e) {
                console.error('Failed to parse pricing config:', e);
            }
        }
    }, []);

    // 应用溢价到价格
    const applyPricing = (category: PartCategory, basePrice: number): number => {
        if (pricingConfig.unifiedPricing) {
            return basePrice * (1 + pricingConfig.unifiedRate / 100);
        } else {
            const categoryKey = categoryToStorageKey[category];
            const rate = pricingConfig[categoryKey as keyof PricingConfig] as number;
            return basePrice * (1 + rate / 100);
        }
    };

    // 处理Excel文件上传 (完整解析逻辑)


    // 处理产品选择变化
    const handleProductChange = (id: number, category: PartCategory, e: React.ChangeEvent<HTMLSelectElement>) => {
        const productId = e.target.value ? parseInt(e.target.value) : null;

        if (!productId) {
            // 清空选择
            setParts(parts.map(part =>
                part.id === id ? {...part, productId: null, name: '', price: 0} : part
            ));
            return;
        }

        const selectedProduct = allProducts[category].find(p => p.id === productId);
        if (!selectedProduct) return;

        // 应用溢价
        const finalPrice = applyPricing(category, selectedProduct.price);

        setParts(parts.map(part =>
            part.id === id ? {
                ...part,
                productId: selectedProduct.id,
                name: selectedProduct.name,
                price: finalPrice
            } : part
        ));
    };

    // 处理数量变化
    const handleQuantityChange = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const quantity = parseInt(e.target.value) || 0;
        setParts(parts.map(part =>
            part.id === id ? {...part, quantity} : part
        ));
    };

    // 计算总价
    const totalPrice = parts.reduce((sum, part) => sum + (part.price * part.quantity), 0);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">电脑配件报价单</h1>

            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="w-full text-sm text-left text-gray-500 table-fixed">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 w-[15%]">类型分类</th>
                        <th scope="col" className="px-6 py-3 w-[45%]">产品名称</th>
                        <th scope="col" className="px-6 py-3 w-[15%]">数量</th>
                        <th scope="col" className="px-6 py-3 w-[25%]">价格</th>
                    </tr>
                    </thead>
                    <tbody>
                    {parts.map((part) => (
                        <tr key={part.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                {categoryDisplayNames[part.category]}
                            </td>
                            <td className="px-6 py-4">
                                <select
                                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 w-full"
                                    value={part.productId || ''}
                                    onChange={(e) => handleProductChange(part.id, part.category, e)}
                                >
                                    <option value="">选择{categoryDisplayNames[part.category]}</option>
                                    {allProducts[part.category].map(product => {
                                        const displayPrice = applyPricing(part.category, product.price);
                                        return (
                                            <option key={product.id} value={product.id}>
                                                {product.name} (${displayPrice.toFixed(2)})
                                            </option>
                                        );
                                    })}
                                </select>
                            </td>
                            <td className="px-6 py-4">
                                <input
                                    type="number"
                                    min="1"
                                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 w-20"
                                    value={part.quantity}
                                    onChange={(e) => handleQuantityChange(part.id, e)}
                                />
                            </td>
                            <td className="px-6 py-4 font-medium text-nowrap overflow-x-auto">
                                ${(part.price * part.quantity).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                        <td className="px-6 py-4" colSpan={3}>总价</td>
                        <td className="px-6 py-4 text-nowrap overflow-x-auto">${totalPrice.toFixed(2)}</td>
                    </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-sm text-gray-500">
                <p>* 选择产品并设置数量后，价格会自动计算</p>
            </div>

            <div className="mt-6 flex justify-end gap-6">
                <button
                    onClick={() => setParts(initialParts)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    重置
                </button>
            </div>
        </div>
    );
};

export default PCPartsTable;