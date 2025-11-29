import { Product, PricingConfig } from '@/const';

export type { Product, PricingConfig };

// 合并后的搜索参数类型
export interface ProductQueryParams {
    category?: string;
    search?: string;
}

export interface ProductModalRef {
    open: (product?: Product) => void;
    close: () => void;
}