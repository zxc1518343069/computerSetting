/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LogisticsCompany, LogisticsRecord } from '@/const/types';
import api from '@/lib/request/axios';

export { fetchLogisticsStats, payLogisticsRecord } from '../../_services/logistics';
export {
    fetchInboundOrders,
    fetchLogisticsCompanies,
    fetchPurchaseOrders,
    fetchPurchaseReturns,
} from '../_services';

export const disableLogisticsCompany = (id: number) => {
    return api.delete<any, void>(`/logistics/companies/${id}`);
};

export const saveLogisticsCompany = (data: Partial<LogisticsCompany>, id?: number) => {
    if (id) {
        return api.put<any, LogisticsCompany>(`/logistics/companies/${id}`, data);
    }
    return api.post<any, LogisticsCompany>('/logistics/companies', data);
};

export const fetchLogisticsRecords = (params?: {
    search?: string;
    type?: string;
    company_id?: number;
    payment_status?: string;
    settlement_target?: string;
    related_type?: string;
    related_id?: number;
    date_from?: string;
    date_to?: string;
}) => {
    return api.get<any, LogisticsRecord[]>('/logistics/records', { params });
};

export const saveLogisticsRecord = (data: Partial<LogisticsRecord>, id?: number) => {
    if (id) {
        return api.put<any, LogisticsRecord>(`/logistics/records/${id}`, data);
    }
    return api.post<any, LogisticsRecord>('/logistics/records', data);
};

export const voidLogisticsRecord = (id: number, note?: string | null) => {
    return api.post<any, LogisticsRecord>(`/logistics/records/${id}/void`, { note });
};
