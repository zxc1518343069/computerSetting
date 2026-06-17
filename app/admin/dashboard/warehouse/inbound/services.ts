/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InboundOrder } from '@/const/types';
import api from '@/lib/request/axios';

export {
    fetchDashboardProducts,
    fetchInboundOrders,
    fetchLogisticsCompanies,
    fetchPurchaseOrders,
    fetchSuppliers,
    receivePurchaseOrder,
} from '../_services';

export const saveInboundOrder = (data: any) => {
    return api.post<any, InboundOrder>('/inbound-orders', data);
};

export const updateInboundOrder = (id: number, data: Partial<InboundOrder>) => {
    return api.put<any, InboundOrder>(`/inbound-orders/${id}`, data);
};
