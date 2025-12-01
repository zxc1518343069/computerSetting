/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';
import type { Package } from '@/app/admin/dashboard/packages/types';

export const createPackage = (data: Partial<Package>) => {
    return api.post<any, Package>(`/api/packages`, data);
};

export const deletePackage = (id: string | number) => {
    return api.delete<any, any>(`/api/packages/${id}`);
};

export const getPackages = (params?: any) => {
    return api.get<any, Package[]>(`/api/packages`, { params });
};

export const updatePackage = (id: string | number, data: Partial<Package>) => {
    return api.put<any, Package>(`/api/packages/${id}`, data);
};
