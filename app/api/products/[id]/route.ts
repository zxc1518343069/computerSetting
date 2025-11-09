import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - 获取单个产品详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id);

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: '产品不存在' }, { status: 404 });
            }
            throw error;
        }

        return NextResponse.json({
            success: true,
            data: data,
        });
    } catch (error) {
        console.error('Get product error:', error);
        return NextResponse.json({ error: '获取产品详情失败' }, { status: 500 });
    }
}

// PUT - 更新产品
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id);
        const { category, name, price } = await request.json();

        if (!category || !name || price === undefined) {
            return NextResponse.json({ error: '产品类别、名称和价格不能为空' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('products')
            .update({
                category,
                name,
                price,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: '产品不存在' }, { status: 404 });
            }
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: '产品更新成功',
            data: data,
        });
    } catch (error) {
        console.error('Update product error:', error);
        return NextResponse.json({ error: '更新产品失败' }, { status: 500 });
    }
}

// DELETE - 删除产品
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = parseInt(params.id);

        // 检查产品是否存在
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name')
            .eq('id', id)
            .single();

        if (productError) {
            if (productError.code === 'PGRST116') {
                return NextResponse.json({ error: '产品不存在' }, { status: 404 });
            }
            throw productError;
        }

        // 检查是否有套餐使用了该产品
        const { data: packageItems, error: checkError } = await supabase
            .from('package_items')
            .select('id, package_id, packages(id, name)')
            .eq('product_id', id)
            .limit(5); // 只查询前5个，用于显示

        if (checkError) {
            throw checkError;
        }

        // 如果有套餐使用了该产品，则不允许删除
        if (packageItems && packageItems.length > 0) {
            // Supabase 返回的关联数据类型
            type PackageItemData = {
                id: number;
                package_id: number;
                packages: { id: number; name: string } | { id: number; name: string }[] | null;
            };

            const packageNames = (packageItems as PackageItemData[])
                .map((item) => {
                    // 处理 packages 可能是对象或数组的情况
                    if (Array.isArray(item.packages)) {
                        return item.packages[0]?.name;
                    }
                    return item.packages?.name;
                })
                .filter((name): name is string => Boolean(name))
                .slice(0, 3) // 最多显示3个套餐名称
                .join('、');

            const moreCount = packageItems.length > 3 ? packageItems.length - 3 : 0;
            const message = moreCount > 0
                ? `无法删除产品"${product.name}"，该产品正在被 ${packageItems.length} 个套餐使用（${packageNames} 等${moreCount}个）。请先删除或修改相关套餐后再试。`
                : `无法删除产品"${product.name}"，该产品正在被以下套餐使用：${packageNames}。请先删除或修改相关套餐后再试。`;

            return NextResponse.json(
                {
                    error: message,
                    inUse: true,
                    usedByPackages: packageItems.length,
                },
                { status: 400 }
            );
        }

        // 如果没有被使用，则执行删除
        const { error: deleteError } = await supabase.from('products').delete().eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({
            success: true,
            message: '产品删除成功',
        });
    } catch (error) {
        console.error('Delete product error:', error);
        return NextResponse.json({ error: '删除产品失败' }, { status: 500 });
    }
}
