import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchBoxProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    resultCount: number;
}

export function SearchBox({ searchQuery, onSearchChange, resultCount }: SearchBoxProps) {
    return (
        <div className="relative group">
            <Input
                placeholder="搜索套餐..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                prefix={
                    <SearchOutlined className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                }
                allowClear
                className="rounded-xl bg-gray-100/80 border-transparent hover:bg-gray-100 focus:bg-white focus:shadow-sm focus:border-blue-200 transition-all h-9 text-sm"
            />
            {searchQuery && resultCount > 0 && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-medium animate-fade-in">
                    {resultCount}
                </div>
            )}
        </div>
    );
}
