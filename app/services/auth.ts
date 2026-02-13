import api from '@/lib/request/axios';

export interface LoginParams {
    username: string;
    password?: string;
}

export const authService = {
    /**
     * 管理员登录
     */
    login: async (params: LoginParams) => {
        return api.post('/auth/login', params);
    },
};
