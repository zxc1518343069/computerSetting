import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchBoxProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    resultCount: number;
}

export function SearchBox({ searchQuery, onSearchChange, resultCount }: SearchBoxProps) {
    return (
        <div className="mb-4">
            <Input
                placeholder="搜索套餐或产品..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                prefix={<SearchOutlined className="text-gray-400" />}
                allowClear
                size="large"
                style={{
                    borderRadius: '8px',
                }}
            />
            <p className="text-xs text-gray-500 mt-2">找到 {resultCount} 个套餐</p>
        </div>
    );
}
