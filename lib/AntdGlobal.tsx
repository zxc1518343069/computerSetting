'use client';

import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';
import { App } from 'antd'; // This one is needed at runtime
import type { App as AppType } from 'antd'; // Use an alias for the type import

let message: MessageInstance;
let notification: NotificationInstance;
let modal: ReturnType<typeof AppType.useApp>['modal']; // Use AppType for the type utility

/**
 * 该组件用于在 App 上下文中捕获静态方法实例，
 * 并将其赋值给全局变量，以便在非 React 组件（如 axios 拦截器）中使用。
 */
export const AntdGlobalRegistry = () => {
    const staticFunction = App.useApp();
    message = staticFunction.message;
    modal = staticFunction.modal;
    notification = staticFunction.notification;
    return null;
};

export { message, notification, modal };
