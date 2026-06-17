/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OperatingCost } from '@/const/types';
import api from '@/lib/request/axios';

export { fetchOperatingCosts } from '../_services/operatingCosts';

export const saveOperatingCost = (data: Partial<OperatingCost>, id?: number) => {
    if (id) {
        return api.put<any, OperatingCost>(`/operating-costs/${id}`, data);
    }
    return api.post<any, OperatingCost>('/operating-costs', data);
};

export const deleteOperatingCost = (id: number) => {
    return api.delete<any, void>(`/operating-costs/${id}`);
};
