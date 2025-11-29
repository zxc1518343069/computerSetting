/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';
import type { Product } from '@/const/types';

export const createProduct = (data: Partial<Product>) => {
    return api.post<any, Product>(`/api/products`, data);
};

export const deleteProduct = (id: string | number) => {
    return api.delete<any, any>(`/api/products/${id}`);
};

export const getProduct = (id: string | number, params?: any) => {
    return api.get<any, Product>(`/api/products/${id}`, { params });
};

export const getProducts = (params?: any) => {
    return api.get<any, Product[]>(`/api/products`, { params });
};

export const importProducts = (data: Partial<Product>) => {
    return api.post<any, Product>(`/api/products/import`, data);
};

export const updateProduct = (id: string | number, data: Partial<Product>) => {
    return api.put<any, Product>(`/api/products/${id}`, data);
};
