import { createClient } from '@supabase/supabase-js';
import { Product, Package, PackageItem, PricingConfig, AdminUser } from '@/const/types';

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

// 重新导出类型以便其他地方使用
export type { Product, Package, PackageItem, PricingConfig, AdminUser };
