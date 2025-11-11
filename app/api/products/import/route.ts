import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface ImportProduct {
    name: string;
    price: number;
    category: string;
}

// POST - 批量导入产品
export async function POST(request: NextRequest) {
    try {
        const { products } = await request.json();

        if (!products || !Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: '产品数据不能为空' }, { status: 400 });
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
                });
            }
        });

        if (errors.length > 0) {
            return NextResponse.json(
                {
                    error: '部分数据格式不正确',
                    details: errors,
                },
                { status: 400 }
            );
        }
        await supabase.from('products').delete().neq('id', 0); // 清空表数据
        // 批量插入产品
        const { data, error } = await supabase.from('products').insert(validProducts).select();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: `成功导入 ${data?.length || 0} 条产品数据`,
            data: data,
            count: data?.length || 0,
        });
    } catch (error) {
        console.error('Import products error:', error);
        return NextResponse.json({ error: '批量导入失败' }, { status: 500 });
    }
}
