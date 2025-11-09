import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

// Mock套餐数据 (用于数据库连接失败时的fallback)
const MOCK_PACKAGES = [
    {
        id: 1,
        name: '高性能游戏主机套餐',
        description: '适合3A大作和高帧率游戏的旗舰级配置,包含最新一代顶级CPU、显卡和主板,性能强劲',
        total_price: 4569.91,
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-01-15T08:00:00Z',
        items: [
            {
                id: 1,
                product_id: 1,
                quantity: 1,
                product_name: 'Intel Core i9-13900K',
                product_price: 589.99,
                product_category: 'cpu',
            },
            {
                id: 2,
                product_id: 4,
                quantity: 1,
                product_name: 'ASUS ROG Maximus Z790 Hero',
                product_price: 599.99,
                product_category: 'motherboard',
            },
            {
                id: 3,
                product_id: 7,
                quantity: 2,
                product_name: 'Corsair Dominator Platinum RGB 32GB DDR5 6000MHz',
                product_price: 249.99,
                product_category: 'ram',
            },
            {
                id: 4,
                product_id: 10,
                quantity: 1,
                product_name: 'NVIDIA GeForce RTX 4090 Founders Edition',
                product_price: 1599.99,
                product_category: 'gpu',
            },
            {
                id: 5,
                product_id: 13,
                quantity: 2,
                product_name: 'Samsung 990 Pro 2TB NVMe SSD',
                product_price: 249.99,
                product_category: 'storage',
            },
            {
                id: 6,
                product_id: 16,
                quantity: 1,
                product_name: 'Corsair HX1200 Platinum 1200W',
                product_price: 299.99,
                product_category: 'psu',
            },
            {
                id: 7,
                product_id: 20,
                quantity: 1,
                product_name: 'Fractal Design Torrent',
                product_price: 199.99,
                product_category: 'case',
            },
            {
                id: 8,
                product_id: 22,
                quantity: 1,
                product_name: 'NZXT Kraken Z73 RGB 360mm',
                product_price: 279.99,
                product_category: 'cooling',
            },
        ],
    },
    {
        id: 2,
        name: '性价比办公套餐',
        description: '满足日常办公和轻度娱乐需求的经济型配置',
        total_price: 1659.93,
        created_at: '2024-01-16T10:30:00Z',
        updated_at: '2024-01-16T10:30:00Z',
        items: [
            {
                id: 9,
                product_id: 3,
                quantity: 1,
                product_name: 'Intel Core i7-13700K',
                product_price: 419.99,
                product_category: 'cpu',
            },
            {
                id: 10,
                product_id: 6,
                quantity: 1,
                product_name: 'Gigabyte B650 AORUS Elite AX',
                product_price: 229.99,
                product_category: 'motherboard',
            },
            {
                id: 11,
                product_id: 9,
                quantity: 1,
                product_name: 'Kingston Fury Beast 32GB DDR5 5200MHz',
                product_price: 149.99,
                product_category: 'ram',
            },
            {
                id: 12,
                product_id: 11,
                quantity: 1,
                product_name: 'AMD Radeon RX 7900 XTX',
                product_price: 999.99,
                product_category: 'gpu',
            },
            {
                id: 13,
                product_id: 15,
                quantity: 1,
                product_name: 'Crucial P5 Plus 2TB NVMe SSD',
                product_price: 199.99,
                product_category: 'storage',
            },
            {
                id: 14,
                product_id: 18,
                quantity: 1,
                product_name: 'EVGA SuperNOVA 850 G6 850W',
                product_price: 159.99,
                product_category: 'psu',
            },
            {
                id: 15,
                product_id: 21,
                quantity: 1,
                product_name: 'NZXT H7 Flow',
                product_price: 129.99,
                product_category: 'case',
            },
            {
                id: 16,
                product_id: 24,
                quantity: 1,
                product_name: 'Noctua NH-D15 chromax.black',
                product_price: 109.99,
                product_category: 'cooling',
            },
        ],
    },
    {
        id: 3,
        name: 'AMD平台高端套餐',
        description: 'AMD顶级处理器配合高端显卡,适合内容创作和游戏',
        total_price: 3929.92,
        created_at: '2024-01-17T14:20:00Z',
        updated_at: '2024-01-17T14:20:00Z',
        items: [
            {
                id: 17,
                product_id: 2,
                quantity: 1,
                product_name: 'AMD Ryzen 9 7950X',
                product_price: 549.99,
                product_category: 'cpu',
            },
            {
                id: 18,
                product_id: 5,
                quantity: 1,
                product_name: 'MSI MEG X670E ACE',
                product_price: 499.99,
                product_category: 'motherboard',
            },
            {
                id: 19,
                product_id: 8,
                quantity: 2,
                product_name: 'G.Skill Trident Z5 RGB 32GB DDR5 6000MHz',
                product_price: 219.99,
                product_category: 'ram',
            },
            {
                id: 20,
                product_id: 12,
                quantity: 1,
                product_name: 'NVIDIA GeForce RTX 4080',
                product_price: 1199.99,
                product_category: 'gpu',
            },
            {
                id: 21,
                product_id: 14,
                quantity: 2,
                product_name: 'WD Black SN850X 2TB NVMe SSD',
                product_price: 229.99,
                product_category: 'storage',
            },
            {
                id: 22,
                product_id: 17,
                quantity: 1,
                product_name: 'Seasonic PRIME TX-1000 1000W',
                product_price: 279.99,
                product_category: 'psu',
            },
            {
                id: 23,
                product_id: 19,
                quantity: 1,
                product_name: 'Lian Li PC-O11 Dynamic',
                product_price: 149.99,
                product_category: 'case',
            },
            {
                id: 24,
                product_id: 23,
                quantity: 1,
                product_name: 'Corsair iCUE H150i ELITE LCD',
                product_price: 249.99,
                product_category: 'cooling',
            },
        ],
    },
];

// GET - 获取所有套餐
export async function GET(request: NextRequest) {
    try {
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

        return NextResponse.json({
            success: true,
            data: packagesWithItems,
        });
    } catch (error) {
        console.error('Get packages error:', error);

        // 数据库连接失败时返回测试数据
        let filteredData = MOCK_PACKAGES;

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        if (search) {
            filteredData = filteredData.filter(
                (pkg) =>
                    pkg.name.toLowerCase().includes(search.toLowerCase()) ||
                    pkg.description.toLowerCase().includes(search.toLowerCase())
            );
        }

        return NextResponse.json({
            success: true,
            data: filteredData,
            fallback: true, // 标记为fallback数据
        });
    }
}

// POST - 创建新套餐
export async function POST(request: NextRequest) {
    try {
        const { name, description, items } = await request.json();

        if (!name || !items || items.length === 0) {
            return NextResponse.json({ error: '套餐名称和配件不能为空' }, { status: 400 });
        }

        // 计算总价
        let totalPrice = 0;
        for (const item of items) {
            const { data: product, error } = await supabase
                .from('products')
                .select('price')
                .eq('id', item.product_id)
                .single();

            if (error) {
                throw new Error(`获取产品价格失败: ${error.message}`);
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

        return NextResponse.json({
            success: true,
            message: '套餐创建成功',
            data: packageData,
        });
    } catch (error) {
        console.error('Create package error:', error);
        return NextResponse.json({ error: '创建套餐失败' }, { status: 500 });
    }
}
