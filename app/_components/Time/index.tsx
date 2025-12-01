'use client';

import React, { useEffect, useState } from 'react';

function Time() {
    const [currentTime, setCurrentTime] = useState('');

    // 更新中国时区当前时间
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const chinaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
            const year = chinaTime.getFullYear();
            const month = String(chinaTime.getMonth() + 1).padStart(2, '0');
            const day = String(chinaTime.getDate()).padStart(2, '0');
            const hours = String(chinaTime.getHours()).padStart(2, '0');
            const minutes = String(chinaTime.getMinutes()).padStart(2, '0');
            const seconds = String(chinaTime.getSeconds()).padStart(2, '0');
            setCurrentTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <>
            <div className="flex justify-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm shadow-md">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    {currentTime}
                </span>
            </div>
        </>
    );
}
export default Time;
