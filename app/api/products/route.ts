import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 测试产品数据 (用于数据库连接失败或没有数据时的fallback)
const MOCK_PRODUCTS = [
    // CPU
    { id: 1, name: 'Intel Core i9-13900K', price: 589.99, category: 'cpu' },
    { id: 2, name: 'AMD Ryzen 9 7950X', price: 549.99, category: 'cpu' },
    { id: 3, name: 'Intel Core i7-13700K', price: 419.99, category: 'cpu' },
    // Motherboard
    { id: 4, name: 'ASUS ROG Maximus Z790 Hero', price: 599.99, category: 'motherboard' },
    { id: 5, name: 'MSI MEG X670E ACE', price: 499.99, category: 'motherboard' },
    { id: 6, name: 'Gigabyte B650 AORUS Elite AX', price: 229.99, category: 'motherboard' },
    // RAM
    {
        id: 7,
        name: 'Corsair Dominator Platinum RGB 32GB DDR5 6000MHz',
        price: 249.99,
        category: 'ram',
    },
    { id: 8, name: 'G.Skill Trident Z5 RGB 32GB DDR5 6000MHz', price: 219.99, category: 'ram' },
    { id: 9, name: 'Kingston Fury Beast 32GB DDR5 5200MHz', price: 149.99, category: 'ram' },
    // GPU
    { id: 10, name: 'NVIDIA GeForce RTX 4090 Founders Edition', price: 1599.99, category: 'gpu' },
    { id: 11, name: 'AMD Radeon RX 7900 XTX', price: 999.99, category: 'gpu' },
    { id: 12, name: 'NVIDIA GeForce RTX 4080', price: 1199.99, category: 'gpu' },
    // Storage
    { id: 13, name: 'Samsung 990 Pro 2TB NVMe SSD', price: 249.99, category: 'storage' },
    { id: 14, name: 'WD Black SN850X 2TB NVMe SSD', price: 229.99, category: 'storage' },
    { id: 15, name: 'Crucial P5 Plus 2TB NVMe SSD', price: 199.99, category: 'storage' },
    // PSU
    { id: 16, name: 'Corsair HX1200 Platinum 1200W', price: 299.99, category: 'psu' },
    { id: 17, name: 'Seasonic PRIME TX-1000 1000W', price: 279.99, category: 'psu' },
    { id: 18, name: 'EVGA SuperNOVA 850 G6 850W', price: 159.99, category: 'psu' },
    // Case
    { id: 19, name: 'Lian Li PC-O11 Dynamic', price: 149.99, category: 'case' },
    { id: 20, name: 'Fractal Design Torrent', price: 199.99, category: 'case' },
    { id: 21, name: 'NZXT H7 Flow', price: 129.99, category: 'case' },
    // Cooling
    { id: 22, name: 'NZXT Kraken Z73 RGB 360mm', price: 279.99, category: 'cooling' },
    { id: 23, name: 'Corsair iCUE H150i ELITE LCD', price: 249.99, category: 'cooling' },
    { id: 24, name: 'Noctua NH-D15 chromax.black', price: 109.99, category: 'cooling' },
];

// GET - 获取产品列表
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        let query = 'SELECT * FROM products WHERE 1=1';
        const params: (string | number)[] = [];
        let paramCount = 1;

        if (category) {
            query += ` AND category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }

        if (search) {
            query += ` AND name ILIKE $${paramCount}`;
            params.push(`%${search}%`);
            paramCount++;
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Get products error:', error);

        // 数据库连接失败时返回测试数据
        let filteredData = MOCK_PRODUCTS;

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        if (category) {
            filteredData = filteredData.filter((p) => p.category === category);
        }

        if (search) {
            filteredData = filteredData.filter((p) =>
                p.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        return NextResponse.json({
            success: true,
            data: filteredData,
            fallback: true, // 标记为fallback数据
        });
    }
}

// POST - 创建新产品
export async function POST(request: NextRequest) {
    try {
        const { category, name, price } = await request.json();

        if (!category || !name || price === undefined) {
            return NextResponse.json({ error: '产品类别、名称和价格不能为空' }, { status: 400 });
        }

        const result = await pool.query(
            `INSERT INTO products (category, name, price)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [category, name, price]
        );

        return NextResponse.json({
            success: true,
            message: '产品创建成功',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Create product error:', error);
        return NextResponse.json({ error: '创建产品失败' }, { status: 500 });
    }
}
