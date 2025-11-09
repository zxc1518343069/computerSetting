// API 请求辅助函数

const API_BASE_URL = '/api';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// 通用请求函数
async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }

        return data;
    } catch (error) {
        console.error('API request error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '请求失败',
        };
    }
}

// Pricing API
export const pricingApi = {
    get: () => request('/pricing'),
    update: (config: Record<string, unknown>) =>
        request('/pricing', {
            method: 'POST',
            body: JSON.stringify(config),
        }),
};

// Products API
export const productsApi = {
    getAll: (category?: string, search?: string) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (search) params.append('search', search);
        const query = params.toString();
        return request(`/products${query ? `?${query}` : ''}`);
    },
    getById: (id: number) => request(`/products/${id}`),
    create: (product: { category: string; name: string; price: number }) =>
        request('/products', {
            method: 'POST',
            body: JSON.stringify(product),
        }),
    update: (id: number, product: { category: string; name: string; price: number }) =>
        request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(product),
        }),
    delete: (id: number) =>
        request(`/products/${id}`, {
            method: 'DELETE',
        }),
};

// Packages API
export const packagesApi = {
    getAll: (search?: string) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        const query = params.toString();
        return request(`/packages${query ? `?${query}` : ''}`);
    },
    getById: (id: number) => request(`/packages/${id}`),
    create: (pkg: {
        name: string;
        description?: string;
        items: Array<{ product_id: number; quantity: number }>;
    }) =>
        request('/packages', {
            method: 'POST',
            body: JSON.stringify(pkg),
        }),
    update: (
        id: number,
        pkg: {
            name: string;
            description?: string;
            items: Array<{ product_id: number; quantity: number }>;
        }
    ) =>
        request(`/packages/${id}`, {
            method: 'PUT',
            body: JSON.stringify(pkg),
        }),
    delete: (id: number) =>
        request(`/packages/${id}`, {
            method: 'DELETE',
        }),
};
