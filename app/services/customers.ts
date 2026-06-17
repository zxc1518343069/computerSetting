/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Customer } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchCustomers = (params?: { search?: string }) => {
    return api.get<any, Customer[]>('/customers', { params });
};
