/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';
import { PricingConfig, Product, ProductQueryParams } from './types';

/**
 * 获取产品列表
 */
export const fetchProductsService = (params: ProductQueryParams) => {
    return api.get<any, Product[]>('/products', { params });
};

/**
 * 获取定价配置
 */
export const fetchPricingConfigService = () => {
    return api.get<any, PricingConfig>('/pricing');
};

/**
 * 保存定价配置
 */
export const savePricingConfigService = (config: PricingConfig) => {
    return api.post<any, void>('/pricing', config);
};

/**
 * 保存产品 (新增或更新)
 */
export const saveProductService = (product: Partial<Product>, isEdit: boolean) => {
    const url = isEdit ? `/products/${product.id}` : '/products';
    const method = isEdit ? 'put' : 'post';

    return api.request<any, Product>({
        url,
        method,
        data: {
            category: product.category,
            name: product.name,
            price: product.price,
        },
    });
};

/**
 * 删除产品
 */
export const deleteProductService = (id: number) => {
    return api.delete<any, void>(`/products/${id}`);
};
