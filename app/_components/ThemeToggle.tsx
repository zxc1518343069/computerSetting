'use client';

import React from 'react';
import { Button, Dropdown, MenuProps } from 'antd';
import { SunOutlined, MoonOutlined, DesktopOutlined, DownOutlined } from '@ant-design/icons';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const items: MenuProps['items'] = [
        {
            key: 'light',
            label: '浅色模式',
            icon: <SunOutlined />,
            onClick: () => setTheme('light'),
        },
        {
            key: 'dark',
            label: '深色模式',
            icon: <MoonOutlined />,
            onClick: () => setTheme('dark'),
        },
        {
            key: 'system',
            label: '跟随系统',
            icon: <DesktopOutlined />,
            onClick: () => setTheme('system'),
        },
    ];

    const getIcon = () => {
        switch (theme) {
            case 'light':
                return <SunOutlined />;
            case 'dark':
                return <MoonOutlined />;
            case 'system':
                return <DesktopOutlined />;
        }
    };

    return (
        <Dropdown
            menu={{ items, selectedKeys: [theme] }}
            placement="bottomRight"
            trigger={['click']}
        >
            <Button
                type="text"
                className="!flex !items-center !gap-2 !text-slate-500 hover:!text-blue-600 dark:!text-slate-400 dark:hover:!text-blue-400 transition-colors !px-2"
            >
                {getIcon()}
                <DownOutlined className="text-[10px]" />
            </Button>
        </Dropdown>
    );
}
