import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { success, error } from '@/lib/request/apiResponse';

interface ImportProduct {
    name: string;
    price: number;
    category: string;
    selling_price?: number | null;
    is_use_premium?: boolean;
}

// POST - 批量导入产品
export async function POST(request: NextRequest) {
    try {
        const { products } = await request.json();

        if (!products || !Array.isArray(products) || products.length === 0) {
            return error(400, '产品数据不能为空');
        }

        // 验证产品数据格式
        const validProducts: ImportProduct[] = [];
        const errors: string[] = [];

        products.forEach((product: ImportProduct, index: number) => {
            if (!product.category || !product.name || product.price === undefined) {
                errors.push(`第 ${index + 1} 条数据格式不正确`);
            } else {
                validProducts.push({
                    category: product.category,
                    name: product.name,
                    price: product.price,
                    selling_price: product.selling_price,
                    is_use_premium: product.is_use_premium,
                });
            }
        });

        if (errors.length > 0) {
            return Response.json(
                {
                    code: 400,
                    message: '部分数据格式不正确',
                    details: errors,
                },
                { status: 400 }
            );
        }
        await supabase.from('products').delete().neq('id', 0); // 清空表数据
        // 批量插入产品
        const { data, error: insertError } = await supabase.from('products').insert(validProducts).select();

        if (insertError) {
            throw insertError;
        }

        return success(data, `成功导入 ${data?.length || 0} 条产品数据`);
    } catch (e) {
        console.error('Import products error:', e);
        return error(500, '批量导入失败');
    }
}
