import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { success, error } from '@/lib/request/apiResponse';

interface PackageItem {
    product_id: number;
    quantity: number;
}

// PUT - 更新套餐
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const { name, description, items } = await request.json();

        if (!name || !items || items.length === 0) {
            return error(400, '套餐名称和配件不能为空');
        }

        // 计算总价
        let totalPrice = 0;
        for (const item of items) {
            const { data: product, error: prodError } = await supabase
                .from('products')
                .select('price')
                .eq('id', item.product_id)
                .single();

            if (prodError) {
                throw new Error(`获取产品价格失败: ${prodError.message}`);
            }

            if (product) {
                totalPrice += parseFloat(product.price) * item.quantity;
            }
        }

        // 更新套餐基本信息
        const { error: packageError } = await supabase
            .from('packages')
            .update({
                name,
                description: description || null,
                total_price: totalPrice,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (packageError) {
            throw packageError;
        }

        // 删除旧的套餐明细
        const { error: deleteError } = await supabase
            .from('package_items')
            .delete()
            .eq('package_id', id);

        if (deleteError) {
            throw deleteError;
        }

        // 插入新的套餐明细
        const packageItems = items.map((item: PackageItem) => ({
            package_id: id,
            product_id: item.product_id,
            quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase.from('package_items').insert(packageItems);

        if (itemsError) {
            throw itemsError;
        }

        return success(null, '套餐更新成功');
    } catch (e) {
        console.error('Update package error:', e);
        return error(500, '更新套餐失败');
    }
}

// DELETE - 删除套餐
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);

        // 先删除套餐明细
        const { error: itemsError } = await supabase
            .from('package_items')
            .delete()
            .eq('package_id', id);

        if (itemsError) {
            throw itemsError;
        }

        // 再删除套餐
        const { error: packageError } = await supabase.from('packages').delete().eq('id', id);

        if (packageError) {
            throw packageError;
        }

        return success(null, '套餐删除成功');
    } catch (e) {
        console.error('Delete package error:', e);
        return error(500, '删除套餐失败');
    }
}
