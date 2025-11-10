import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - 获取溢价配置
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('pricing_config')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 是 "no rows returned" 错误
            throw error;
        }

        if (!data) {
            // 如果没有配置,返回默认值
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
                monitor: 0,
            });
        }

        console.log('data', data);
        return NextResponse.json({
            unifiedPricing: data.unified_pricing,
            unifiedRate: parseFloat(data.unified_rate),
            cpu: parseFloat(data.cpu_rate),
            motherboard: parseFloat(data.motherboard_rate),
            ram: parseFloat(data.ram_rate),
            gpu: parseFloat(data.gpu_rate),
            storage: parseFloat(data.storage_rate),
            psu: parseFloat(data.psu_rate),
            case: parseFloat(data.case_rate),
            cooling: parseFloat(data.cooling_rate),
            monitor: parseFloat(data.monitor_rate),
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
        const { data: existingConfig } = await supabase
            .from('pricing_config')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        let result;
        if (existingConfig) {
            // 更新现有配置
            const { data, error } = await supabase
                .from('pricing_config')
                .update({
                    unified_pricing: unifiedPricing,
                    unified_rate: unifiedRate,
                    cpu_rate: cpu,
                    motherboard_rate: motherboard,
                    ram_rate: ram,
                    gpu_rate: gpu,
                    storage_rate: storage,
                    psu_rate: psu,
                    case_rate: caseRate,
                    cooling_rate: cooling,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingConfig.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // 创建新配置
            const { data, error } = await supabase
                .from('pricing_config')
                .insert([
                    {
                        unified_pricing: unifiedPricing,
                        unified_rate: unifiedRate,
                        cpu_rate: cpu,
                        motherboard_rate: motherboard,
                        ram_rate: ram,
                        gpu_rate: gpu,
                        storage_rate: storage,
                        psu_rate: psu,
                        case_rate: caseRate,
                        cooling_rate: cooling,
                    },
                ])
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return NextResponse.json({
            success: true,
            message: '溢价配置已保存',
            data: result,
        });
    } catch (error) {
        console.error('Update pricing config error:', error);
        return NextResponse.json({ error: '保存溢价配置失败' }, { status: 500 });
    }
}
