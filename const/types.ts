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
    id: number;
    unified_pricing: boolean;
    unified_rate: number;
    rounding_type: 'none' | 'integer' | 'ten';
    cpu_rate: number;
    motherboard_rate: number;
    ram_rate: number;
    gpu_rate: number;
    storage_rate: number;
    psu_rate: number;
    case_rate: number;
    cooling_rate: number;
    monitor_rate: number;
    created_at?: string;
    updated_at?: string;
}

// 前端使用的 PricingConfig 接口 (camelCase)
export interface PricingConfigFrontend {
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
}

export interface Package {
    id: number;
    name: string;
    description?: string;
    total_price: number;
    created_at?: string;
    updated_at?: string;
}

export interface PackageItem {
    id: number;
    package_id: number;
    product_id: number;
    quantity: number;
    created_at?: string;
}

export interface AdminUser {
    id: number;
    username: string;
    password_hash: string;
    created_at?: string;
    updated_at?: string;
}

// 带category字段的Product接口 (兼容旧代码)
export interface ProductWithCategory extends Product {
    category: string;
}
