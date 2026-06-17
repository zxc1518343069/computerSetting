/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LogisticsCompany } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchLogisticsCompanies = (params?: { search?: string; status?: string }) => {
    return api.get<any, LogisticsCompany[]>('/logistics/companies', { params });
};
