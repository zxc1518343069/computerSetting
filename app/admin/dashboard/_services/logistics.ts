/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LogisticsRecord, LogisticsStats } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchLogisticsStats = (params?: {
    type?: string;
    company_id?: number;
    payment_status?: string;
    settlement_target?: string;
    date_from?: string;
    date_to?: string;
}) => {
    return api.get<any, LogisticsStats>('/logistics/stats', { params });
};

export const payLogisticsRecord = (id: number, data: any) => {
    return api.post<any, LogisticsRecord>(`/logistics/records/${id}/pay`, data);
};
