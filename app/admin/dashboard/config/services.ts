/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';
import { PricingConfig, Product, ProductCategory, ProductQueryParams } from './types';

/**
 * 获取产品列表
 */
export const fetchProductsService = (params: ProductQueryParams) => {
    return api.get<any, Product[]>('/products', { params });
};

export const fetchProductCategoriesService = (params?: { includeInactive?: boolean }) => {
    return api.get<any, ProductCategory[]>('/product-categories', { params });
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
    return api.post<any, PricingConfig>('/pricing', config);
};

export const createPricingRateService = (data: { category_id: number; rate: number }) => {
    return api.post<any, PricingConfig>('/pricing/rates', data);
};

export const updatePricingRateService = (id: number, data: { rate: number }) => {
    return api.put<any, PricingConfig>(`/pricing/rates/${id}`, data);
};

export const deletePricingRateService = (id: number) => {
    return api.delete<any, PricingConfig>(`/pricing/rates/${id}`);
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
            category_id: product.category_id,
            category: product.category,
            name: product.name,
            barcode: product.barcode,
            price: product.price,
            selling_price: product.selling_price,
            is_use_premium: product.is_use_premium,
        },
    });
};

/**
 * 删除产品
 */
export const deleteProductService = (id: number) => {
    return api.delete<any, void>(`/products/${id}`);
};
