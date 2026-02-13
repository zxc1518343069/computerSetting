import { error, success } from '@/lib/request/apiResponse';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// GET - 获取产品列表
export async function GET(request: NextRequest) {
    try {
        const session = (await cookies()).get('admin_session');

        // 未登录用户禁止访问真实 API
        if (!session) {
            return error(401, '未授权访问');
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        let query = supabase.from('products').select('*').order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            throw fetchError;
        }

        return success(data, '获取产品列表成功');
    } catch (e) {
        console.error('Get products error:', e);
        return error(500, '获取产品列表失败');
    }
}

// POST - 创建新产品
export async function POST(request: NextRequest) {
    try {
        const { category, name, price, selling_price, is_use_premium } = await request.json();

        if (!category || !name || price === undefined) {
            return error(400, '产品类别、名称和价格不能为空');
        }

        const { data, error: insertError } = await supabase
            .from('products')
            .insert([{ category, name, price, selling_price, is_use_premium }])
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        return success(data, '产品创建成功');
    } catch (e) {
        console.error('Create product error:', e);
        return error(500, '创建产品失败');
    }
}
