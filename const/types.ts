export interface Product {
    id: number;
    name: string;
    price: number;
    selling_price?: number | null;
    is_use_premium?: boolean;
    category: string;
    created_at?: string;
}

export interface PricingConfig {
    unifiedPricing: boolean;
    unifiedRate: number;
    roundingType?: 'none' | 'integer' | 'ten';
    cpu: number;
    motherboard: number;
    ram: number;
    gpu: number;
    storage: number;
    psu: number;
    case: number;
    cooling: number;
    monitor: number;
}

// 带category字段的Product接口 (兼容旧代码)
export interface ProductWithCategory extends Product {
    category: string;
}
