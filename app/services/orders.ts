/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';

export const saveDiyOrder = (data: any) => {
    return api.post<any, { id: number; source_type: 'diy' }>('/diy/orders', data);
};

export const saveRetailOrder = (data: any) => {
    return api.post<any, { id: number; source_type: 'retail' }>('/retail/orders', data);
};
