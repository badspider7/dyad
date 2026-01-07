import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

const BaseURL = import.meta.env.PROD ? window.location.origin : import.meta.env.VITE_APP_API_BASEURL;

/**
 * 请求选项
 */
export interface RequestOptions extends AxiosRequestConfig {
    timeout?: number;
    baseURL?: string;
}

/**
 * 请求响应
 */
export interface RequestResponse<T = any> extends AxiosResponse<T> { }

/**
 * HTTP 请求错误
 */
export interface RequestError extends Error {
    status?: number;
    data?: any;
}

/**
 * 基础 HTTP 客户端类
 */
class HttpClient {
    private baseURL: string;
    private defaultHeaders: Record<string, string>;
    private defaultTimeout: number;

    constructor(baseURL: string = '', defaultHeaders: Record<string, string> = {}) {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...defaultHeaders,
        };
        this.defaultTimeout = 30000; // 默认 30 秒超时
    }

    /**
     * 合并请求配置
     */
    private mergeConfig(
        url: string,
        options: AxiosRequestConfig = {},
        requestOptions?: RequestOptions
    ): AxiosRequestConfig {
        const baseURL = requestOptions?.baseURL ?? this.baseURL;
        return {
            url: this.buildURL(url, baseURL),
            method: options.method,
            baseURL,
            headers: this.mergeHeaders(options.headers as Record<string, string>),
            timeout: requestOptions?.timeout || this.defaultTimeout,
            data: options.data,
            params: options.params,
            ...options,
        };
    }

    /**
     * 构建完整的请求 URL
     */
    private buildURL(url: string, baseURL?: string): string {
        const finalBaseURL = baseURL ?? this.baseURL;
        if (finalBaseURL && !url.startsWith('http')) {
            return `${finalBaseURL}${url.startsWith('/') ? '' : '/'}${url}`;
        }
        return url;
    }

    /**
     * 合并请求头
     */
    private mergeHeaders(headers?: Record<string, string>): Record<string, string> {
        return {
            ...this.defaultHeaders,
            ...headers,
        };
    }

    /**
     * 处理响应
     */
    private handleResponse<T>(response: AxiosResponse<T>): RequestResponse<T> {
        return response;
    }

    /**
     * 处理错误
     */
    private handleError(error: any): never {
        const requestError: RequestError = new Error(
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            '请求失败'
        );

        requestError.status = error.response?.status;
        requestError.data = error.response?.data;

        throw requestError;
    }

    /**
     * 发送请求的通用方法
     */
    private async request<T>(
        url: string,
        config: AxiosRequestConfig = {},
        requestOptions?: RequestOptions
    ): Promise<RequestResponse<T>> {
        try {
            const mergedConfig = this.mergeConfig(url, config, requestOptions);
            const response = await axios.request<T>(mergedConfig);
            return this.handleResponse<T>(response);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * GET 请求
     */
    public async get<T = any>(
        url: string,
        params?: Record<string, any>,
        options?: RequestOptions
    ): Promise<RequestResponse<T>> {
        return this.request<T>(url, {
            method: 'GET',
            params,
        }, options);
    }

    /**
     * POST 请求
     */
    public async post<T = any>(
        url: string,
        data?: any,
        options?: RequestOptions
    ): Promise<RequestResponse<T>> {
        return this.request<T>(url, {
            method: 'POST',
            data,
        }, options);
    }

    /**
     * PUT 请求
     */
    public async put<T = any>(
        url: string,
        data?: any,
        options?: RequestOptions
    ): Promise<RequestResponse<T>> {
        return this.request<T>(url, {
            method: 'PUT',
            data,
        }, options);
    }

    /**
     * DELETE 请求
     */
    public async delete<T = any>(
        url: string,
        data?: any,
        options?: RequestOptions
    ): Promise<RequestResponse<T>> {
        return this.request<T>(url, {
            method: 'DELETE',
            data,
        }, options);
    }

    /**
     * PATCH 请求
     */
    public async patch<T = any>(
        url: string,
        data?: any,
        options?: RequestOptions
    ): Promise<RequestResponse<T>> {
        return this.request<T>(url, {
            method: 'PATCH',
            data,
        }, options);
    }

    /**
     * 更新默认的基础 URL
     */
    public setBaseURL(baseURL: string): void {
        this.baseURL = baseURL;
    }

    /**
     * 更新默认请求头
     */
    public setDefaultHeaders(headers: Record<string, string>): void {
        this.defaultHeaders = {
            ...this.defaultHeaders,
            ...headers,
        };
    }

    /**
     * 更新默认超时时间
     */
    public setDefaultTimeout(timeout: number): void {
        this.defaultTimeout = timeout;
    }
}

// 创建默认的 HTTP 客户端实例
export const httpClient = new HttpClient(BaseURL);


// 导出类型和方法
export { HttpClient };
export default httpClient;
