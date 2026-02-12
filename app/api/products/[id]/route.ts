import { error, success } from '@/lib/request/apiResponse';
import { supabase } from '@/lib/supabase';
import { NextRequest } from 'next/server';

// GET - 获取单个产品详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);

        const { data, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return error(404, '产品不存在');
            }
            throw fetchError;
        }

        return success(data, '获取产品详情成功');
    } catch (e) {
        console.error('Get product error:', e);
        return error(500, '获取产品详情失败');
    }
}

// PUT - 更新产品
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const { category, name, price, selling_price, is_use_premium } = await request.json();

        if (!category || !name || price === undefined) {
            return error(400, '产品类别、名称和价格不能为空');
        }

        const { data, error: updateError } = await supabase
            .from('products')
            .update({
                category,
                name,
                price,
                selling_price,
                is_use_premium,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            if (updateError.code === 'PGRST116') {
                return error(404, '产品不存在');
            }
            throw updateError;
        }

        return success(data, '产品更新成功');
    } catch (e) {
        console.error('Update product error:', e);
        return error(500, '更新产品失败');
    }
}

// DELETE - 删除产品
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);

        // 检查产品是否存在
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name')
            .eq('id', id)
            .single();

        if (productError) {
            if (productError.code === 'PGRST116') {
                return error(404, '产品不存在');
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
            const message =
                moreCount > 0
                    ? `无法删除产品"${product.name}"，该产品正在被 ${packageItems.length} 个套餐使用（${packageNames} 等${moreCount}个）。请先删除或修改相关套餐后再试。`
                    : `无法删除产品"${product.name}"，该产品正在被以下套餐使用：${packageNames}。请先删除或修改相关套餐后再试。`;

            // Special error response for in-use constraint
            return Response.json(
                {
                    code: 400,
                    message: message,
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

        return success(null, '产品删除成功');
    } catch (e) {
        console.error('Delete product error:', e);
        return error(500, '删除产品失败');
    }
}
