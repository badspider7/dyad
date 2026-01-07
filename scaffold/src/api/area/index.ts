//库区相关接口

import { httpClient } from '@/utils/request';
import type { LocationResponse } from '../location';

interface Response<T> {
    status: number;
    code: number;
    msg: string;
    data: T;
}

interface PageParams {
    page: number;
    perPage: number;
}

interface AreaResponse {
    page: number;
    per_page: number;
    total: number;
    total_page: number;
    current_total: number;
    list: AreaItem[]
}

interface AreaItem {
    id: number;
    created_at: string;
    updated_at: string;
    name: string; //库区的名称
    code: string; //库区的编码
    is_disable: boolean; //是否禁用
    state: number; //库区状态
}



interface AreaBody {
    name?: string;  //库区名称
    code?: string;  //库区编码
}

/**
 * 查询所有库区或指定库区
 */
export const getAllAreas = async (params: PageParams, data: AreaBody): Promise<Response<AreaResponse>> => {
    const response = await httpClient.post('/area/query', data, { params });
    return response.data;
}


interface LocationBody {
    area_name: string; //库区名称
    state?: number; //库位状态
}
/**
 * 查询指定库区下的所有库位或指定状态的库位
 */
export const getAreaLocations = async (params: PageParams, data: LocationBody): Promise<Response<LocationResponse>> => {
    const response = await httpClient.post(`/location/query`, data, { params });
    return response.data;
}