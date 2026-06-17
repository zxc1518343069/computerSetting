/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PurchaseReturn } from '@/const/types';
import api from '@/lib/request/axios';

export const createPurchaseReturnRefund = (id: number, data: any) => {
    return api.post<any, PurchaseReturn>(`/purchase-returns/${id}/refunds`, data);
};
