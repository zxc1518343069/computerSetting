export interface Product {
    id: number;
    category: string;
    name: string;
    price: number;
    selling_price?: number | null;
    is_use_premium?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PricingConfig {
    id?: number;
    unifiedPricing: boolean;
    unifiedRate: number;
    roundingType: 'none' | 'integer' | 'ten';
    cpu: number;
    motherboard: number;
    ram: number;
    gpu: number;
    storage: number;
    psu: number;
    case: number;
    cooling: number;
    monitor: number;
    created_at?: string;
    updated_at?: string;
}

// 兼容旧代码的别名
export type PricingConfigFrontend = PricingConfig;

export interface Package {
    id: number;
    name: string;
    description?: string;
    total_price: number;
    items: PackageItem[];
    created_at: string;
    updated_at: string;
}

export interface PackageItem {
    id?: number;
    package_id?: number;
    product_id: number;
    quantity: number;
    product_name: string;
    product_price: number;
    product_category: string;
    custom_name?: string;
    custom_price?: number;
    created_at?: string;
}

export interface AdminUser {
    id: number;
    username: string;
    password_hash: string;
    created_at?: string;
    updated_at?: string;
}

export interface Game {
    id: string | number;
    name: string;
    icon: string;
    type: 'online' | 'single';
}

// 带category字段的Product接口 (兼容旧代码)
export interface ProductWithCategory extends Product {
    category: string;
}
