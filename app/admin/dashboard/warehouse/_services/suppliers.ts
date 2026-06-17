/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Supplier } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchSuppliers = (params?: { search?: string }) => {
    return api.get<any, Supplier[]>('/suppliers', { params });
};
