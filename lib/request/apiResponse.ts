export const requestSuccess = 200;

export function success<T>(data?: T, message = '成功') {
    return Response.json({
        code: requestSuccess,
        message,
        data,
    });
}

export interface ApiResponse<T = any> {
    code: number;
    message: string;
    data?: T;
}

export function error(code: number, message: string) {
    return Response.json({
        code,
        message,
    });
}
