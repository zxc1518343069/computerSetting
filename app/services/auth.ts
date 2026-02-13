import api from '@/lib/request/axios';

export interface LoginParams {
    username: string;
    password?: string;
    remember?: boolean;
}

export const authService = {
    /**
     * 管理员登录
     */
    login: async (params: LoginParams) => {
        return api.post('/auth/login', params);
    },

    /**
     * 退出登录
     */
    logout: async () => {
        return api.post('/auth/logout');
    },
};
