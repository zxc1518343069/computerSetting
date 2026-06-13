import { AntdGlobalRegistry } from '@/lib/AntdGlobal';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App } from 'antd';
import type { Metadata } from 'next';
import './globals.css';
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from '@/app/_components/ThemeProvider';
import { AuthProvider } from '@/app/_components/AuthProvider';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
    title: '电脑配件报价系统',
    description: '电脑配件报价与后台管理系统',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const theme = cookieStore.get('theme')?.value as 'light' | 'dark' | 'system' | undefined;
    const isDark = theme === 'dark';

    return (
        <html lang="en" className={isDark ? 'dark' : ''} suppressHydrationWarning>
            <head>
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                            .dark { background-color: #141414 !important; color: #ededed; }
                            .dark body { background-color: #141414 !important; }
                        `,
                    }}
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var localTheme = localStorage.getItem('theme');
                                    var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                                    if (!localTheme || localTheme === 'system') {
                                        if (supportDarkMode) {
                                            document.documentElement.classList.add('dark');
                                        }
                                    } else if (localTheme === 'dark') {
                                        document.documentElement.classList.add('dark');
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body className="font-sans antialiased">
                <NextTopLoader
                    color="#4f46e5"
                    initialPosition={0.08}
                    crawlSpeed={200}
                    height={3}
                    crawl={true}
                    showSpinner={false}
                    easing="ease"
                    speed={200}
                    shadow="0 0 10px #4f46e5,0 0 5px #4f46e5"
                />
                <AntdRegistry>
                    <ThemeProvider initialTheme={theme}>
                        <AuthProvider>
                            <App>
                                <AntdGlobalRegistry />
                                {children}
                            </App>
                        </AuthProvider>
                    </ThemeProvider>
                </AntdRegistry>
            </body>
        </html>
    );
}
