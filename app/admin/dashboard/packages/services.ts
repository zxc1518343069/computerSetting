import { Package, PackageFormValues, PackageQueryParams, Product, PricingConfig } from './types';

// ... existing package services ...

export const fetchPackagesService = async (params?: PackageQueryParams): Promise<Package[]> => {
    const response = await fetch('/api/packages');
    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || '获取套餐列表失败');
    }

    let data = result.data as Package[];

    if (params) {
        if (params.search) {
            data = data.filter((p) => p.name.toLowerCase().includes(params.search!.toLowerCase()));
        }
        if (params.id) {
            data = data.filter((p) => p.id.toString() === params.id);
        }
    }

    return data;
};

export const deletePackageService = async (id: number): Promise<void> => {
    const response = await fetch(`/api/packages/${id}`, {
        method: 'DELETE',
    });
    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || '删除失败');
    }
};

export const savePackageService = async (values: PackageFormValues, id?: number): Promise<void> => {
    const url = id ? `/api/packages/${id}` : '/api/packages';
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    });

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || '保存失败');
    }
};

// --- New Services for EditablePackageTable ---

export const fetchProductsService = async (): Promise<Product[]> => {
    const response = await fetch('/api/products');
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || '获取产品列表失败');
    }
    return result.data || [];
};

export const fetchPricingConfigService = async (): Promise<PricingConfig> => {
    const response = await fetch('/api/pricing');
    const result = await response.json();
    // Assuming API returns the config object directly or null
    return result;
};
