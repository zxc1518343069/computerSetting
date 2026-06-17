/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OperatingCost } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchOperatingCosts = (params?: {
    search?: string;
    type?: string;
    month?: string;
}) => {
    return api.get<any, OperatingCost[]>('/operating-costs', { params });
};
