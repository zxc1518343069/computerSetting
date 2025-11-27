export interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    created_at?: string;
}

export interface PricingConfig {
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

// 合并后的搜索参数类型
export interface ProductQueryParams {
    category?: string;
    search?: string;
}

export interface ProductModalRef {
    open: (product?: Product) => void;
    close: () => void;
}
