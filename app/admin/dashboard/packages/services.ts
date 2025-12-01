/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';
import { Package, PackageFormValues, PackageQueryParams, Product, PricingConfig } from './types';

// ... existing package services ...

export const fetchPackagesService = async (params?: PackageQueryParams): Promise<Package[]> => {
    const data = await api.get<any, Package[]>('/packages');

    let filteredData = data;

    // Client-side filtering as before, since the API might not support all filters yet or for simplicity
    if (params) {
        if (params.search) {
            filteredData = filteredData.filter((p) =>
                p.name.toLowerCase().includes(params.search!.toLowerCase())
            );
        }
        if (params.id) {
            filteredData = filteredData.filter((p) => p.id.toString() === params.id);
        }
    }

    return filteredData;
};

export const deletePackageService = (id: number) => {
    return api.delete<any, void>(`/packages/${id}`);
};

export const savePackageService = (values: PackageFormValues, id?: number) => {
    const url = id ? `/packages/${id}` : '/packages';
    const method = id ? 'put' : 'post';

    return api.request<any, void>({
        url,
        method,
        data: values,
    });
};

// --- New Services for EditablePackageTable ---

export const fetchProductsService = () => {
    return api.get<any, Product[]>('/products');
};

export const fetchPricingConfigService = () => {
    return api.get<any, PricingConfig>('/pricing');
};
