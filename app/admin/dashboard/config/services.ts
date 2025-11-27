import { PricingConfig, Product, ProductQueryParams } from './types';

/**
 * 获取产品列表
 */
export const fetchProductsService = async (params: ProductQueryParams): Promise<Product[]> => {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.append('category', params.category);
    if (params.search) searchParams.append('search', params.search);

    const response = await fetch(`/api/products?${searchParams.toString()}`);
    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || '获取产品列表失败');
    }
    return result.data || [];
};

/**
 * 获取定价配置
 */
export const fetchPricingConfigService = async (): Promise<PricingConfig> => {
    const response = await fetch('/api/pricing');
    const result = await response.json();
    // 假设 API 直接返回对象或错误
    return result;
};

/**
 * 保存产品 (新增或更新)
 */
export const saveProductService = async (
    product: Partial<Product>,
    isEdit: boolean
): Promise<void> => {
    const url = isEdit ? `/api/products/${product.id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            category: product.category,
            name: product.name,
            price: product.price,
        }),
    });

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || '操作失败');
    }
};

/**
 * 删除产品
 */
export const deleteProductService = async (id: number): Promise<void> => {
    const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
    });
    const result = await response.json();

    if (!result.success) {
        if (result.inUse) {
            throw new Error('IN_USE'); // 特殊错误码
        }
        throw new Error(result.error || '删除失败');
    }
};
