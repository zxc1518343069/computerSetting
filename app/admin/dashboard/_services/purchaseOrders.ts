/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PurchaseMerchantRefund, PurchaseOrder } from '@/const/types';
import api from '@/lib/request/axios';

export const createPurchasePayment = (id: number, data: any) => {
    return api.post<any, PurchaseOrder>(`/purchase-orders/${id}/payments`, data);
};

export const createPurchaseMerchantRefundSettlement = (id: number, refundId: number, data: any) => {
    return api.post<any, PurchaseMerchantRefund>(
        `/purchase-orders/${id}/merchant-refunds/${refundId}/settlements`,
        data
    );
};
