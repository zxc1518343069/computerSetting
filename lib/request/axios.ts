'use client';

import { ApiResponse, requestSuccess } from './apiResponse';
import axios, { AxiosResponse } from 'axios';
import { message } from 'antd';

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
    (response: AxiosResponse<ApiResponse>) => {
        const res = response.data;
        if (res.code === requestSuccess) {
            // 成功
            return response;
        } else {
            // 业务错误
            message.error(res.message || '请求失败');
            return Promise.reject(res);
        }
    },
    (error) => {
        // 网络错误或超时
        if (error.response) {
            message.error(`服务器错误：${error.response.status}`);
        } else if (error.request) {
            message.error('网络错误，请检查连接');
        } else {
            message.error(`请求错误：${error.message}`);
        }
        return Promise.reject(error);
    }
);

export default api;
