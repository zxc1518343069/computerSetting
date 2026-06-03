/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AdminRole, AdminUser, AdminUserStatus } from '@/const/types';
import api from '@/lib/request/axios';

export interface AdminUserQueryParams {
    search?: string;
    role?: AdminRole;
    status?: AdminUserStatus;
}

export interface AdminUserPayload {
    username: string;
    password?: string;
    role: AdminRole;
    status: AdminUserStatus;
}

export const fetchAdminUsers = (params?: AdminUserQueryParams) => {
    return api.get<any, AdminUser[]>('/admin-users', { params });
};

export const saveAdminUser = (data: AdminUserPayload, id?: number) => {
    if (id) {
        return api.put<any, AdminUser>(`/admin-users/${id}`, data);
    }
    return api.post<any, AdminUser>('/admin-users', data);
};

