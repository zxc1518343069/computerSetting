import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - 获取溢价配置
export async function GET() {
    try {
        const result = await pool.query('SELECT * FROM pricing_config ORDER BY id DESC LIMIT 1');

        if (result.rows.length === 0) {
            // 如果没有配置，返回默认值
            return NextResponse.json({
                unifiedPricing: true,
                unifiedRate: 0,
                cpu: 0,
                motherboard: 0,
                ram: 0,
                gpu: 0,
                storage: 0,
                psu: 0,
                case: 0,
                cooling: 0,
            });
        }

        const config = result.rows[0];

        return NextResponse.json({
            unifiedPricing: config.unified_pricing,
            unifiedRate: parseFloat(config.unified_rate),
            cpu: parseFloat(config.cpu_rate),
            motherboard: parseFloat(config.motherboard_rate),
            ram: parseFloat(config.ram_rate),
            gpu: parseFloat(config.gpu_rate),
            storage: parseFloat(config.storage_rate),
            psu: parseFloat(config.psu_rate),
            case: parseFloat(config.case_rate),
            cooling: parseFloat(config.cooling_rate),
        });
    } catch (error) {
        console.error('Get pricing config error:', error);
        return NextResponse.json({ error: '获取溢价配置失败' }, { status: 500 });
    }
}

// POST/PUT - 更新溢价配置
export async function POST(request: NextRequest) {
    try {
        const config = await request.json();

        const {
            unifiedPricing,
            unifiedRate,
            cpu,
            motherboard,
            ram,
            gpu,
            storage,
            psu,
            case: caseRate,
            cooling,
        } = config;

        // 检查是否已存在配置
        const existingConfig = await pool.query(
            'SELECT id FROM pricing_config ORDER BY id DESC LIMIT 1'
        );

        let result;
        if (existingConfig.rows.length > 0) {
            // 更新现有配置
            result = await pool.query(
                `UPDATE pricing_config
                 SET unified_pricing = $1,
                     unified_rate = $2,
                     cpu_rate = $3,
                     motherboard_rate = $4,
                     ram_rate = $5,
                     gpu_rate = $6,
                     storage_rate = $7,
                     psu_rate = $8,
                     case_rate = $9,
                     cooling_rate = $10,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $11
                 RETURNING *`,
                [
                    unifiedPricing,
                    unifiedRate,
                    cpu,
                    motherboard,
                    ram,
                    gpu,
                    storage,
                    psu,
                    caseRate,
                    cooling,
                    existingConfig.rows[0].id,
                ]
            );
        } else {
            // 创建新配置
            result = await pool.query(
                `INSERT INTO pricing_config
                 (unified_pricing, unified_rate, cpu_rate, motherboard_rate, ram_rate, gpu_rate, storage_rate, psu_rate, case_rate, cooling_rate)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *`,
                [
                    unifiedPricing,
                    unifiedRate,
                    cpu,
                    motherboard,
                    ram,
                    gpu,
                    storage,
                    psu,
                    caseRate,
                    cooling,
                ]
            );
        }

        return NextResponse.json({
            success: true,
            message: '溢价配置已保存',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Update pricing config error:', error);
        return NextResponse.json({ error: '保存溢价配置失败' }, { status: 500 });
    }
}
