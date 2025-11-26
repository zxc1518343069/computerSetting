import { Input, Tag } from 'antd';
import { PlusOutlined, GiftOutlined } from '@ant-design/icons';

interface ExtraRowsProps {
    pricing: boolean;
    disabled: boolean;
}

export function ExtraRows({ pricing, disabled }: ExtraRowsProps) {
    return (
        <>
            {/* 其他项目行 */}
            <tr className="hover:bg-amber-50 transition-colors duration-150 border-t-2 border-amber-200">
                <td className="px-4 py-3">
                    <Tag icon={<PlusOutlined />} color="orange">
                        其他
                    </Tag>
                </td>
                <td className="px-4 py-3" colSpan={pricing ? 4 : 5}>
                    <Input
                        placeholder="输入其他配件或服务(如:装机服务费、延保等)"
                        disabled={disabled}
                    />
                </td>
            </tr>

            {/* 赠品行 */}
            <tr className="hover:bg-pink-50 transition-colors duration-150">
                <td className="px-4 py-3">
                    <Tag icon={<GiftOutlined />} color="magenta">
                        赠品
                    </Tag>
                </td>
                <td className="px-4 py-3" colSpan={pricing ? 4 : 5}>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="输入赠品信息(如:鼠标垫、清洁套装、游戏激活码等)"
                            disabled={disabled}
                            className="flex-1"
                        />
                        <Tag color="pink">免费</Tag>
                    </div>
                </td>
            </tr>
        </>
    );
}
