/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Supplier } from '@/const/types';
import api from '@/lib/request/axios';

export { fetchAccountsOverview } from '../../_services/accounts';
export { fetchSuppliers } from '../_services/suppliers';

export const saveSupplier = (data: Partial<Supplier>, id?: number) => {
    if (id) {
        return api.put<any, Supplier>(`/suppliers/${id}`, data);
    }
    return api.post<any, Supplier>('/suppliers', data);
};

export const deleteSupplier = (id: number) => {
    return api.delete<any, void>(`/suppliers/${id}`);
};
