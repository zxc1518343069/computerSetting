import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchBoxProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    resultCount: number;
}

export function SearchBox({ searchQuery, onSearchChange, resultCount }: SearchBoxProps) {
    return (
        <div className="relative">
            <Input
                placeholder="搜索套餐..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                prefix={<SearchOutlined className="text-gray-400" />}
                allowClear
                className="rounded-lg bg-gray-100 border-transparent hover:bg-white hover:border-blue-300 focus:bg-white focus:border-blue-500 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-200/50 px-1.5 rounded hidden sm:block">
                {resultCount}
            </div>
        </div>
    );
}
