'use client';

import { ApiResponse, requestSuccess } from './apiResponse';
import axios, { AxiosResponse } from 'axios';
import { message } from '@/lib/AntdGlobal';

// 创建 Axios 实例
const api = axios.create({
    baseURL: '/api', // 统一前缀
    timeout: 10000, // 超时时间
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        // 从 localStorage 或 Cookie 获取 token
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response: AxiosResponse) => {
        const res = response.data as ApiResponse;
        if (res.code === requestSuccess) {
            // 成功，直接返回 data 载荷
            console.log('API Response:', res);
            // 如果 data 为空（例如 void 响应），返回 null 或 undefined，避免调用端出错
            // message.success(res.message || '请求失败');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return res.data as any; // suppress any for axios interceptor unwrapping
        } else {
            // 业务错误
            // 如果是 401 且是获取定价配置，不弹出错误，由 Hook 处理
            const isPricingGet =
                response.config.url === '/pricing' && response.config.method === 'get';
            if (res.code !== 401 || !isPricingGet) {
                message.error(res.message || '请求失败');
            }
            return Promise.reject(res);
        }
    },
    (error) => {
        // 网络错误或超时
        if (error.response) {
            const res = error.response.data as ApiResponse;
            const isPricingGet = error.config.url === '/pricing' && error.config.method === 'get';

            // 同样逻辑：401 获取定价配置时不弹窗
            if (error.response.status !== 401 || !isPricingGet) {
                message.error(res?.message || `服务器错误：${error.response.status}`);
            }
        } else if (error.request) {
            message.error('网络错误，请检查连接');
        } else {
            message.error(`请求错误：${error.message}`);
        }
        return Promise.reject(error);
    }
);

export default api;
