import { createClient } from '@supabase/supabase-js';

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Please set SUPABASE_PROJECT_URL and SUPABASE_ANON_KEY in .env.local'
    );
}

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库类型定义
export interface Product {
    id: number;
    category: string;
    name: string;
    price: number;
    created_at?: string;
    updated_at?: string;
}

export interface Package {
    id: number;
    name: string;
    description?: string;
    total_price: number;
    created_at?: string;
    updated_at?: string;
}

export interface PackageItem {
    id: number;
    package_id: number;
    product_id: number;
    quantity: number;
    created_at?: string;
}

export interface PricingConfig {
    id: number;
    unified_pricing: boolean;
    unified_rate: number;
    cpu_rate: number;
    motherboard_rate: number;
    ram_rate: number;
    gpu_rate: number;
    storage_rate: number;
    psu_rate: number;
    case_rate: number;
    cooling_rate: number;
    created_at?: string;
    updated_at?: string;
}

export interface AdminUser {
    id: number;
    username: string;
    password_hash: string;
    created_at?: string;
    updated_at?: string;
}
