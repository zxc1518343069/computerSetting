/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';
import type { PricingConfig } from '@/const/types';

export const createPricing = (data: PricingConfig) => {
    return api.post<any, PricingConfig>(`/api/pricing`, data);
};

export const getPricing = (params?: any) => {
    return api.get<any, PricingConfig[]>(`/api/pricing`, { params });
};
