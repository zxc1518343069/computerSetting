import { PricingConfig, Product, ProductCategory } from '@/const';

export type { Product, PricingConfig, ProductCategory };

// 合并后的搜索参数类型
export interface ProductQueryParams {
    category?: string;
    category_id?: number;
    search?: string;
}

export interface ProductModalRef {
    open: (product?: Product) => void;
    close: () => void;
}
