/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AdminRole } from '@/const/types';
import api from '@/lib/request/axios';

export interface OrderHandlerUser {
    id: number;
    username: string;
    role: AdminRole;
}

export const fetchActiveAdminUsers = () => {
    return api.get<any, OrderHandlerUser[]>('/admin-users/active');
};
