import { error, success } from '@/lib/request/apiResponse';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

interface PackageItem {
    product_id: number;
    quantity: number;
}

interface PackageItemWithProduct {
    id: number;
    product_id: number;
    quantity: number;
    products?:
        | {
              name: string;
              price: number;
              category: string;
          }
        | {
              name: string;
              price: number;
              category: string;
          }[]
        | null;
}

// GET - 获取所有套餐
export async function GET(request: NextRequest) {
    try {
        const session = (await cookies()).get('admin_session');

        // 未登录用户禁止访问真实 API
        if (!session) {
            return error(401, '未授权访问');
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        // 获取套餐
        let query = supabase.from('packages').select('*').order('created_at', { ascending: false });

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data: packages, error: packagesError } = await query;

        if (packagesError) {
            throw packagesError;
        }

        // 为每个套餐获取其配件项
        const packagesWithItems = await Promise.all(
            (packages || []).map(async (pkg) => {
                const { data: items, error: itemsError } = await supabase
                    .from('package_items')
                    .select(
                        `
                        id,
                        product_id,
                        quantity,
                        products (
                            name,
                            price,
                            category
                        )
                    `
                    )
                    .eq('package_id', pkg.id);

                if (itemsError) {
                    console.error('Error fetching items for package', pkg.id, itemsError);
                    return { ...pkg, items: [] };
                }

                // 格式化items数据
                const formattedItems = (items || []).map((item: PackageItemWithProduct) => {
                    // 处理 products 可能是对象或数组的情况
                    let productData = null;
                    if (Array.isArray(item.products)) {
                        productData = item.products[0];
                    } else {
                        productData = item.products;
                    }

                    return {
                        id: item.id,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        product_name: productData?.name || '',
                        product_price: productData?.price || 0,
                        product_category: productData?.category || '',
                    };
                });

                return {
                    ...pkg,
                    items: formattedItems,
                };
            })
        );

        return success(packagesWithItems, '获取套餐列表成功');
    } catch (e) {
        console.error('Get packages error:', e);
        return error(500, '获取套餐列表失败');
    }
}

// POST - 创建新套餐
export async function POST(request: NextRequest) {
    try {
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

        // 创建套餐
        const { data: packageData, error: packageError } = await supabase
            .from('packages')
            .insert([{ name, description: description || null, total_price: totalPrice }])
            .select()
            .single();

        if (packageError) {
            throw packageError;
        }

        // 添加套餐配件
        const packageItems = items.map((item: PackageItem) => ({
            package_id: packageData.id,
            product_id: item.product_id,
            quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase.from('package_items').insert(packageItems);

        if (itemsError) {
            // 如果添加配件失败,删除刚创建的套餐
            await supabase.from('packages').delete().eq('id', packageData.id);
            throw itemsError;
        }

        return success(packageData, '套餐创建成功');
    } catch (e) {
        console.error('Create package error:', e);
        return error(500, '创建套餐失败');
    }
}
