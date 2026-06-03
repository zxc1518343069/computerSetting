import api from '@/lib/request/axios';
import type { AdminRole } from '@/const/types';

export interface LoginParams {
    username: string;
    password?: string;
    remember?: boolean;
}

export interface CurrentAdminUser {
    id: number;
    username: string;
    role: AdminRole;
}

export const authService = {
    /**
     * 管理员登录
     */
    login: async (params: LoginParams) => {
        return api.post<unknown, CurrentAdminUser>('/auth/login', params);
    },

    /**
     * 当前登录账号
     */
    me: async () => {
        return api.get<unknown, CurrentAdminUser>('/auth/me');
    },

    /**
     * 退出登录
     */
    logout: async () => {
        return api.post('/auth/logout');
    },
};
